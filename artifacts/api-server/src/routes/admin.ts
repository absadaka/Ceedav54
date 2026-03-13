import { Router } from "express";
import {
  db, tenantsTable, usersTable, auditLogsTable, featureFlagsTable,
} from "@workspace/db";
import {
  eq, ilike, isNull, count, desc, and, or, sql, ne,
} from "drizzle-orm";

const router = Router();

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

function resolveAdminUser(req: any) {
  return req.headers["x-admin-user"] ?? "platform-admin";
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
  const userCounts = await db
    .select({ tenant_id: usersTable.tenant_id, count: count() })
    .from(usersTable)
    .where(
      and(
        isNull(usersTable.deleted_at),
        or(...tenantIds.map((id) => eq(usersTable.tenant_id, id)))!,
      ),
    )
    .groupBy(usersTable.tenant_id);

  const countMap = new Map(userCounts.map((r) => [r.tenant_id, Number(r.count)]));

  return res.json({
    tenants: tenantsRaw.map((t) => ({ ...t, user_count: countMap.get(t.id) ?? 0 })),
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

  const users = await db
    .select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, is_active: usersTable.is_active,
      last_login_at: usersTable.last_login_at, created_at: usersTable.created_at,
    })
    .from(usersTable)
    .where(and(eq(usersTable.tenant_id, id), isNull(usersTable.deleted_at)))
    .orderBy(desc(usersTable.created_at));

  return res.json({ tenant, users });
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

export default router;
