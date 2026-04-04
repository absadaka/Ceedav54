import { Router } from "express";
import { randomBytes, scryptSync, scrypt, timingSafeEqual } from "crypto";
import {
  db, tenantsTable, usersTable, auditLogsTable, featureFlagsTable,
  clientsTable, vehiclesTable, bookingsTable, jobsTable, invoicesTable,
} from "@workspace/db";
import {
  eq, ilike, isNull, count, desc, and, or, sql, ne, sum,
} from "drizzle-orm";

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const [salt, hash] = stored.split(":");
      if (!salt || !hash) return resolve(false);
      scrypt(password, salt, 64, (err, derived) => {
        if (err) return resolve(false);
        try {
          resolve(timingSafeEqual(Buffer.from(hash, "hex"), derived));
        } catch { resolve(false); }
      });
    } catch { resolve(false); }
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

function resolveAdminUser(req: any) {
  return req.headers["x-admin-user"] ?? "platform-admin";
}

async function requirePlatformAdmin(req: any, res: any, next: any) {
  const adminId = req.headers["x-admin-id"] as string | undefined;
  if (!adminId) return res.status(401).json({ error: "Not authenticated." });

  const user = await db
    .select({ id: usersTable.id, role: usersTable.role, is_active: usersTable.is_active })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.id, adminId),
        isNull(usersTable.tenant_id),
        isNull(usersTable.deleted_at),
        sql`${usersTable.role} IN ('platform_admin','platform_support','platform_readonly','platform_finance')`,
      )
    )
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!user || !user.is_active) {
    return res.status(401).json({ error: "Session expired." });
  }

  req.adminUser = user;
  next();
}

function resolveAdminIp(req: any) {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    ?? req.socket.remoteAddress
    ?? "unknown";
}

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/stats
   Platform-level KPIs (total tenants, active users, per-plan breakdown)
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/stats", async (_req, res) => {
  const [[tenantStats], [userStats], planRows, statusRows] = await Promise.all([
    db.select({ total: count() })
      .from(tenantsTable)
      .where(isNull(tenantsTable.deleted_at)),

    db.select({ total: count() })
      .from(usersTable)
      .where(and(isNull(usersTable.deleted_at), eq(usersTable.is_active, true))),

    db.select({ plan: tenantsTable.plan, cnt: count() })
      .from(tenantsTable)
      .where(isNull(tenantsTable.deleted_at))
      .groupBy(tenantsTable.plan),

    db.select({ status: tenantsTable.status, cnt: count() })
      .from(tenantsTable)
      .where(isNull(tenantsTable.deleted_at))
      .groupBy(tenantsTable.status),
  ]);

  const byPlan   = Object.fromEntries(planRows.map((r) => [r.plan, Number(r.cnt)]));
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.cnt)]));

  return res.json({
    total_tenants: Number(tenantStats.total),
    active_users:  Number(userStats.total),
    by_plan:       byPlan,
    by_status:     byStatus,
    mrr_estimate: (
      (byPlan.professional ?? 0) * 149 +
      (byPlan.enterprise    ?? 0) * 499
    ),
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/tenants
   Paginated tenant list with user counts
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/tenants", async (req, res) => {
  const search = (req.query.search as string | undefined)?.trim() ?? "";
  const status = (req.query.status as string | undefined)?.trim() ?? "";
  const plan   = (req.query.plan   as string | undefined)?.trim() ?? "";
  const page   = Math.max(1, parseInt(req.query.page  as string ?? "1",  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit as string ?? "50", 10)));
  const offset = (page - 1) * limit;

  const conditions: Parameters<typeof and>[0][] = [isNull(tenantsTable.deleted_at)];
  if (search) {
    conditions.push(
      or(
        ilike(tenantsTable.name,  `%${search}%`),
        ilike(tenantsTable.slug,  `%${search}%`),
        ilike(tenantsTable.email, `%${search}%`),
      )!,
    );
  }
  if (status && status !== "all") {
    conditions.push(eq(tenantsTable.status, status as "trial" | "active" | "suspended" | "cancelled"));
  }
  if (plan && plan !== "all") {
    conditions.push(eq(tenantsTable.plan, plan as "starter" | "professional" | "enterprise"));
  }

  const where = and(...conditions);

  const [tenantsRaw, [{ total }]] = await Promise.all([
    db
      .select({
        id: tenantsTable.id, slug: tenantsTable.slug, name: tenantsTable.name,
        plan: tenantsTable.plan, status: tenantsTable.status,
        country: tenantsTable.country, currency: tenantsTable.currency,
        email: tenantsTable.email, phone: tenantsTable.phone,
        logo_url: tenantsTable.logo_url, trial_ends_at: tenantsTable.trial_ends_at,
        created_at: tenantsTable.created_at,
      })
      .from(tenantsTable)
      .where(where)
      .orderBy(desc(tenantsTable.created_at))
      .limit(limit)
      .offset(offset),

    db.select({ total: count() }).from(tenantsTable).where(where),
  ]);

  if (tenantsRaw.length === 0) {
    return res.json({ tenants: [], total: Number(total), page, limit });
  }

  const tenantIds = tenantsRaw.map((t) => t.id);
  const tenantFilter = or(...tenantIds.map((id) => eq(usersTable.tenant_id, id)))!;

  const [
    userCounts, clientCounts, vehicleCounts,
    bookingCounts, inspectionCounts, completedJobCounts, revenueSums,
  ] = await Promise.all([
    db.select({ tenant_id: usersTable.tenant_id, n: count() })
      .from(usersTable)
      .where(and(isNull(usersTable.deleted_at), tenantFilter))
      .groupBy(usersTable.tenant_id),

    db.select({ tenant_id: clientsTable.tenant_id, n: count() })
      .from(clientsTable)
      .where(and(isNull(clientsTable.deleted_at), or(...tenantIds.map((id) => eq(clientsTable.tenant_id, id)))!))
      .groupBy(clientsTable.tenant_id),

    db.select({ tenant_id: vehiclesTable.tenant_id, n: count() })
      .from(vehiclesTable)
      .where(or(...tenantIds.map((id) => eq(vehiclesTable.tenant_id, id)))!)
      .groupBy(vehiclesTable.tenant_id),

    db.select({ tenant_id: bookingsTable.tenant_id, n: count() })
      .from(bookingsTable)
      .where(and(isNull(bookingsTable.deleted_at), or(...tenantIds.map((id) => eq(bookingsTable.tenant_id, id)))!))
      .groupBy(bookingsTable.tenant_id),

    db.select({ tenant_id: jobsTable.tenant_id, n: count() })
      .from(jobsTable)
      .where(and(eq(jobsTable.type, "inspection"), or(...tenantIds.map((id) => eq(jobsTable.tenant_id, id)))!))
      .groupBy(jobsTable.tenant_id),

    db.select({ tenant_id: jobsTable.tenant_id, n: count() })
      .from(jobsTable)
      .where(and(eq(jobsTable.status, "completed"), or(...tenantIds.map((id) => eq(jobsTable.tenant_id, id)))!))
      .groupBy(jobsTable.tenant_id),

    db.select({ tenant_id: invoicesTable.tenant_id, total: sql<string>`coalesce(sum(${invoicesTable.paid_amount}::numeric), 0)` })
      .from(invoicesTable)
      .where(or(...tenantIds.map((id) => eq(invoicesTable.tenant_id, id)))!)
      .groupBy(invoicesTable.tenant_id),
  ]);

  const m = <T extends { tenant_id: string | null; n: number }>(rows: T[]) =>
    new Map(rows.map((r) => [r.tenant_id, r.n]));

  const uMap  = m(userCounts);
  const cMap  = m(clientCounts);
  const vMap  = m(vehicleCounts);
  const bMap  = m(bookingCounts);
  const iMap  = m(inspectionCounts);
  const jMap  = m(completedJobCounts);
  const rMap  = new Map(revenueSums.map((r) => [r.tenant_id, parseFloat(r.total ?? "0")]));

  return res.json({
    tenants: tenantsRaw.map((t) => ({
      ...t,
      user_count:           uMap.get(t.id) ?? 0,
      client_count:         cMap.get(t.id) ?? 0,
      vehicle_count:        vMap.get(t.id) ?? 0,
      booking_count:        bMap.get(t.id) ?? 0,
      inspection_count:     iMap.get(t.id) ?? 0,
      completed_jobs_count: jMap.get(t.id) ?? 0,
      total_revenue:        rMap.get(t.id) ?? 0,
    })),
    total: Number(total),
    page,
    limit,
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/tenants/:id
   Full tenant detail with users
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/tenants/:id", async (req, res) => {
  const { id } = req.params;

  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(and(eq(tenantsTable.id, id), isNull(tenantsTable.deleted_at)));

  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const [users, stats] = await Promise.all([
    db.select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email,
        role: usersTable.role, is_active: usersTable.is_active,
        last_login_at: usersTable.last_login_at, created_at: usersTable.created_at,
      })
      .from(usersTable)
      .where(and(eq(usersTable.tenant_id, id), isNull(usersTable.deleted_at)))
      .orderBy(desc(usersTable.created_at)),

    Promise.all([
      db.select({ n: count() }).from(clientsTable)
        .where(and(eq(clientsTable.tenant_id, id), isNull(clientsTable.deleted_at))),
      db.select({ n: count() }).from(vehiclesTable)
        .where(eq(vehiclesTable.tenant_id, id)),
      db.select({ n: count() }).from(bookingsTable)
        .where(and(eq(bookingsTable.tenant_id, id), isNull(bookingsTable.deleted_at))),
      db.select({ n: count() }).from(jobsTable)
        .where(and(eq(jobsTable.tenant_id, id), eq(jobsTable.type, "inspection"))),
      db.select({ n: count() }).from(jobsTable)
        .where(and(eq(jobsTable.tenant_id, id), eq(jobsTable.status, "completed"))),
      db.select({ total: sql<string>`coalesce(sum(${invoicesTable.paid_amount}::numeric), 0)` })
        .from(invoicesTable).where(eq(invoicesTable.tenant_id, id)),
    ]),
  ]);

  const [clientRes, vehicleRes, bookingRes, inspectionRes, completedJobRes, revenueRes] = stats;

  return res.json({
    tenant,
    users,
    stats: {
      client_count:         Number(clientRes[0]?.n         ?? 0),
      vehicle_count:        Number(vehicleRes[0]?.n        ?? 0),
      booking_count:        Number(bookingRes[0]?.n        ?? 0),
      inspection_count:     Number(inspectionRes[0]?.n     ?? 0),
      completed_jobs_count: Number(completedJobRes[0]?.n   ?? 0),
      total_revenue:        parseFloat(revenueRes[0]?.total ?? "0"),
    },
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/tenants/:id
   Update plan / status / trial_ends_at
───────────────────────────────────────────────────────────────────────── */
router.patch("/admin/tenants/:id", async (req, res) => {
  const { id } = req.params;
  const { plan, status, trial_ends_at } = req.body as Record<string, string>;

  const patch: Record<string, unknown> = { updated_at: new Date() };
  if (plan)          patch.plan          = plan;
  if (status)        patch.status        = status;
  if (trial_ends_at) patch.trial_ends_at = new Date(trial_ends_at);

  if (Object.keys(patch).length === 1) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const [updated] = await db
    .update(tenantsTable)
    .set(patch as any)
    .where(and(eq(tenantsTable.id, id), isNull(tenantsTable.deleted_at)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Tenant not found" });

  await db.insert(auditLogsTable).values({
    tenant_id:   id,
    user_id:     null,
    action:      "platform.tenant_updated",
    resource:    "tenant",
    resource_id: id,
    meta:        JSON.stringify({ patch }),
    ip_address:  resolveAdminIp(req),
    user_agent:  req.headers["user-agent"] ?? "",
  }).catch(() => {});

  return res.json({ tenant: updated });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/flags
   List all feature flags (seeds defaults if table is empty)
───────────────────────────────────────────────────────────────────────── */
const DEFAULT_FLAGS = [
  {
    key: "whatsapp_integration",
    label: "WhatsApp Integration",
    description: "Enable WhatsApp Cloud API notifications for booking, job and invoice events",
  },
  {
    key: "online_payments",
    label: "Online Payments (Stripe)",
    description: "Allow tenants to send Stripe payment links on invoices",
  },
  {
    key: "ai_service_suggest",
    label: "AI Service Suggestions",
    description: "GPT-powered service recommendation engine on job cards",
  },
  {
    key: "multi_location",
    label: "Multi-location Support",
    description: "Enable multiple workshop branches per tenant account",
  },
  {
    key: "sms_notifications",
    label: "SMS Notifications",
    description: "Enable Twilio SMS for booking reminders and status updates",
  },
  {
    key: "public_site",
    label: "Public Booking Site",
    description: "Customer-facing public booking and quote request pages",
  },
];

router.get("/admin/flags", async (_req, res) => {
  const flags = await db.select().from(featureFlagsTable).orderBy(featureFlagsTable.key);

  if (flags.length === 0) {
    await db.insert(featureFlagsTable).values(
      DEFAULT_FLAGS.map((f) => ({ ...f, enabled: false, rollout_pct: "0" })),
    ).onConflictDoNothing();
    const seeded = await db.select().from(featureFlagsTable).orderBy(featureFlagsTable.key);
    return res.json({ flags: seeded });
  }

  return res.json({ flags });
});

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/flags/:key
   Toggle or update a feature flag
───────────────────────────────────────────────────────────────────────── */
router.patch("/admin/flags/:key", async (req, res) => {
  const { key } = req.params;
  const { enabled, rollout_pct } = req.body as { enabled?: boolean; rollout_pct?: string };

  const patch: Record<string, unknown> = { updated_at: new Date() };
  if (enabled     !== undefined) patch.enabled     = enabled;
  if (rollout_pct !== undefined) patch.rollout_pct = String(rollout_pct);

  const [updated] = await db
    .update(featureFlagsTable)
    .set(patch)
    .where(eq(featureFlagsTable.key, key))
    .returning();

  if (!updated) return res.status(404).json({ error: "Flag not found" });

  return res.json({ flag: updated });
});

/* ─────────────────────────────────────────────────────────────────────────
   POST /admin/impersonate
   Initiate an impersonation session for a tenant user.
   Body: { tenant_slug, reason }
───────────────────────────────────────────────────────────────────────── */
router.post("/admin/impersonate", async (req, res) => {
  const { tenant_slug, reason } = req.body as { tenant_slug?: string; reason?: string };
  if (!tenant_slug) return res.status(400).json({ error: "tenant_slug is required" });
  if (!reason?.trim()) return res.status(400).json({ error: "reason is required for audit trail" });

  const [tenant] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name, slug: tenantsTable.slug })
    .from(tenantsTable)
    .where(and(eq(tenantsTable.slug, tenant_slug), isNull(tenantsTable.deleted_at)));

  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  await db.insert(auditLogsTable).values({
    tenant_id:   tenant.id,
    user_id:     null,
    action:      "platform.impersonate",
    resource:    "tenant",
    resource_id: tenant.id,
    meta:        JSON.stringify({
      admin:  resolveAdminUser(req),
      reason: reason.trim(),
      target_tenant: tenant.slug,
    }),
    ip_address: resolveAdminIp(req),
    user_agent: req.headers["user-agent"] ?? "",
  });

  const redirect_url = `/dashboard?tenant=${tenant.slug}&__impersonated=1`;
  return res.json({ success: true, tenant, redirect_url });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/impersonation-log
   Last 50 impersonation audit events
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/impersonation-log", async (_req, res) => {
  const rows = await db
    .select({
      id:          auditLogsTable.id,
      tenant_id:   auditLogsTable.tenant_id,
      meta:        auditLogsTable.meta,
      ip_address:  auditLogsTable.ip_address,
      created_at:  auditLogsTable.created_at,
    })
    .from(auditLogsTable)
    .where(eq(auditLogsTable.action, "platform.impersonate"))
    .orderBy(desc(auditLogsTable.created_at))
    .limit(50);

  const tenantIds = [...new Set(rows.map((r) => r.tenant_id).filter(Boolean))];
  const tenants = tenantIds.length
    ? await db
        .select({ id: tenantsTable.id, name: tenantsTable.name, slug: tenantsTable.slug })
        .from(tenantsTable)
        .where(or(...tenantIds.map((id) => eq(tenantsTable.id, id!)))!)
    : [];
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  return res.json({
    log: rows.map((r) => ({
      ...r,
      tenant: r.tenant_id ? tenantMap.get(r.tenant_id) : null,
    })),
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   POST /admin/auth/login
   Body: { email, password }
   Admin console login — only platform_admin users
───────────────────────────────────────────────────────────────────────── */
router.post("/admin/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await db
    .select({
      id:            usersTable.id,
      name:          usersTable.name,
      email:         usersTable.email,
      role:          usersTable.role,
      is_active:     usersTable.is_active,
      password_hash: usersTable.password_hash,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.email, email.toLowerCase().trim()),
        isNull(usersTable.tenant_id),
        isNull(usersTable.deleted_at),
        sql`${usersTable.role} IN ('platform_admin','platform_support','platform_readonly','platform_finance')`,
      )
    )
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!user) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: "Account deactivated." });
  }

  if (!user.password_hash) {
    return res.json({ mustSetPassword: true, userId: user.id, email: user.email });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  await db.update(usersTable).set({ last_login_at: new Date() }).where(eq(usersTable.id, user.id));

  return res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   POST /admin/auth/set-password
   Body: { userId, email, password }
   First-time password set for admin users who have no password yet
───────────────────────────────────────────────────────────────────────── */
router.post("/admin/auth/set-password", async (req, res) => {
  const { userId, email, password } = req.body as { userId?: string; email?: string; password?: string };
  if (!userId || !email || !password) {
    return res.status(400).json({ error: "userId, email, and password are required." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const user = await db
    .select({ id: usersTable.id, password_hash: usersTable.password_hash, role: usersTable.role })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.id, userId),
        eq(usersTable.email, email.toLowerCase().trim()),
        isNull(usersTable.tenant_id),
        isNull(usersTable.deleted_at),
        sql`${usersTable.role} IN ('platform_admin','platform_support','platform_readonly','platform_finance')`,
      )
    )
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!user) {
    return res.status(404).json({ error: "Admin user not found." });
  }

  if (user.password_hash) {
    return res.status(400).json({ error: "Password already set. Use login instead." });
  }

  const hashed = hashPassword(password);
  await db.update(usersTable).set({ password_hash: hashed, last_login_at: new Date() }).where(eq(usersTable.id, user.id));

  return res.json({
    user: { id: user.id, email: email.toLowerCase().trim(), role: user.role },
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/auth/me
   Header: X-Admin-Id
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/auth/me", async (req, res) => {
  const userId = req.headers["x-admin-id"] as string | undefined;
  if (!userId) return res.status(401).json({ error: "Not authenticated." });

  const user = await db
    .select({
      id:        usersTable.id,
      name:      usersTable.name,
      email:     usersTable.email,
      role:      usersTable.role,
      is_active: usersTable.is_active,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.id, userId),
        isNull(usersTable.tenant_id),
        isNull(usersTable.deleted_at),
        sql`${usersTable.role} IN ('platform_admin','platform_support','platform_readonly','platform_finance')`,
      )
    )
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!user || !user.is_active) {
    return res.status(401).json({ error: "Session expired." });
  }

  return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/users — list all platform staff
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/users", requirePlatformAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id:            usersTable.id,
      name:          usersTable.name,
      email:         usersTable.email,
      role:          usersTable.role,
      is_active:     usersTable.is_active,
      last_login_at: usersTable.last_login_at,
      created_at:    usersTable.created_at,
    })
    .from(usersTable)
    .where(
      and(
        isNull(usersTable.tenant_id),
        isNull(usersTable.deleted_at),
        sql`${usersTable.role} IN ('platform_admin','platform_support','platform_readonly','platform_finance')`,
      )
    )
    .orderBy(desc(usersTable.created_at));

  return res.json({ users: rows });
});

/* ─────────────────────────────────────────────────────────────────────────
   POST /admin/users — invite / create a new platform user
   Body: { name, email, role }
───────────────────────────────────────────────────────────────────────── */
router.post("/admin/users", requirePlatformAdmin, async (req, res) => {
  const { name, email, role } = req.body as {
    name?: string; email?: string; role?: string;
  };

  if (!name || !email || !role) {
    return res.status(400).json({ error: "name, email, and role are required." });
  }

  const validRoles = ["platform_admin", "platform_support", "platform_readonly", "platform_finance"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (existing) {
    return res.status(409).json({ error: "A user with this email already exists." });
  }

  const [created] = await db.insert(usersTable).values({
    email:     email.toLowerCase().trim(),
    name,
    role:      role as any,
    is_active: true,
  }).returning({
    id: usersTable.id, name: usersTable.name,
    email: usersTable.email, role: usersTable.role,
    is_active: usersTable.is_active, created_at: usersTable.created_at,
  });

  return res.status(201).json({ user: created });
});

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/users/:id — update a platform user (role, is_active, name)
───────────────────────────────────────────────────────────────────────── */
router.patch("/admin/users/:id", requirePlatformAdmin, async (req, res) => {
  const { id } = req.params;
  const updates: Record<string, any> = {};

  if (req.body.name !== undefined)      updates.name = req.body.name;
  if (req.body.role !== undefined) {
    const validRoles = ["platform_admin", "platform_support", "platform_readonly", "platform_finance"];
    if (!validRoles.includes(req.body.role)) {
      return res.status(400).json({ error: "Invalid role." });
    }
    updates.role = req.body.role;
  }
  if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields to update." });
  }

  updates.updated_at = new Date();

  const [updated] = await db.update(usersTable).set(updates)
    .where(
      and(
        eq(usersTable.id, id),
        isNull(usersTable.tenant_id),
        isNull(usersTable.deleted_at),
      )
    )
    .returning({
      id: usersTable.id, name: usersTable.name,
      email: usersTable.email, role: usersTable.role,
      is_active: usersTable.is_active,
    });

  if (!updated) return res.status(404).json({ error: "User not found." });
  return res.json({ user: updated });
});

/* ─────────────────────────────────────────────────────────────────────────
   DELETE /admin/users/:id — soft-delete a platform user
───────────────────────────────────────────────────────────────────────── */
router.delete("/admin/users/:id", requirePlatformAdmin, async (req, res) => {
  const { id } = req.params;

  const [deleted] = await db.update(usersTable)
    .set({ deleted_at: new Date(), is_active: false, updated_at: new Date() })
    .where(
      and(
        eq(usersTable.id, id),
        isNull(usersTable.tenant_id),
        isNull(usersTable.deleted_at),
      )
    )
    .returning({ id: usersTable.id });

  if (!deleted) return res.status(404).json({ error: "User not found." });
  return res.json({ success: true });
});

/* ─────────────────────────────────────────────────────────────────────────
   POST /admin/seed-super-admin  (idempotent — creates if not exists)
───────────────────────────────────────────────────────────────────────── */
router.post("/admin/seed-super-admin", async (_req, res) => {
  const SUPER_EMAIL = "ab.sadaqa@gmail.com";

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, SUPER_EMAIL))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (existing) {
    return res.json({ message: "Super admin already exists.", id: existing.id });
  }

  const [created] = await db.insert(usersTable).values({
    email:     SUPER_EMAIL,
    name:      "Platform Admin",
    role:      "platform_admin",
    is_active: true,
  }).returning({ id: usersTable.id });

  return res.json({ message: "Super admin created. Must set password on first login.", id: created.id });
});

export default router;
