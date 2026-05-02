import { Router } from "express";
import { eq, and, ilike, or, isNull, desc, count, sql } from "drizzle-orm";
import {
  db, tenantsTable, usersTable,
  supportTicketsTable, supportTicketMessagesTable,
} from "@workspace/db";

const router = Router();

const REF_OFFSET = 1000;

/* ─── helpers ────────────────────────────────────────────────────────────── */

async function resolveTenantBySlug(slug: string) {
  if (!slug) return null;
  const [t] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name, slug: tenantsTable.slug })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);
  return t ?? null;
}

async function resolveTenantUser(userId: string, tenantId: string) {
  const [u] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, tenant_id: usersTable.tenant_id })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.tenant_id, tenantId)))
    .limit(1);
  return u ?? null;
}

async function requirePlatformAdmin(req: any, res: any, next: any) {
  const adminId = req.headers["x-admin-id"] as string | undefined;
  if (!adminId) return res.status(401).json({ error: "Not authenticated." });
  const [user] = await db
    .select({ id: usersTable.id, role: usersTable.role, name: usersTable.name, is_active: usersTable.is_active })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.id, adminId),
        isNull(usersTable.tenant_id),
        isNull(usersTable.deleted_at),
        sql`${usersTable.role} IN ('platform_admin','platform_support','platform_readonly','platform_finance')`,
      ),
    )
    .limit(1);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: "Session expired." });
  }
  req.adminUser = user;
  next();
}

function adminCanWrite(role: string | undefined) {
  return role === "platform_admin" || role === "platform_support";
}

/* ─────────────────────────────────────────────────────────────────────────
   POST /support/tickets   — tenant user opens a case
   Body: { tenant_slug, user_id, subject, description, priority?, category?,
           contact_name?, contact_email? }
───────────────────────────────────────────────────────────────────────── */
router.post("/support/tickets", async (req, res) => {
  const {
    tenant_slug, user_id,
    subject, description,
    priority = "medium", category = "general",
  } = req.body ?? {};

  if (!tenant_slug || typeof tenant_slug !== "string") {
    return res.status(400).json({ error: "tenant_slug is required." });
  }
  if (!user_id || typeof user_id !== "string") {
    return res.status(401).json({ error: "Sign in to open a support ticket." });
  }
  if (!subject || typeof subject !== "string" || subject.trim().length < 4) {
    return res.status(400).json({ error: "Subject must be at least 4 characters." });
  }
  if (!description || typeof description !== "string" || description.trim().length < 10) {
    return res.status(400).json({ error: "Please describe your issue in at least 10 characters." });
  }
  const validPriorities = ["low", "medium", "high", "urgent"];
  const validCategories = ["general", "billing", "technical", "feature_request", "bug", "account"];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: "Invalid priority." });
  }
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: "Invalid category." });
  }

  const tenant = await resolveTenantBySlug(tenant_slug);
  if (!tenant) return res.status(404).json({ error: "Workshop not found." });

  // Identity is server-derived from the authenticated tenant user — body
  // contact fields are intentionally ignored to prevent spoofing.
  const tenantUser = await resolveTenantUser(user_id, tenant.id);
  if (!tenantUser) {
    return res.status(403).json({ error: "User does not belong to this workshop." });
  }

  // Atomic create: insert with placeholder ref, patch ref to TK-{seq+offset},
  // and seed the thread with the original message — all in one transaction.
  const created = await db.transaction(async (tx) => {
    const tempRef = `tmp-${Math.random().toString(36).slice(2, 12)}`;
    const [inserted] = await tx
      .insert(supportTicketsTable)
      .values({
        ref: tempRef,
        tenant_id: tenant.id,
        created_by_id: tenantUser.id,
        contact_name: tenantUser.name,
        contact_email: tenantUser.email,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
      })
      .returning();

    const finalRef = `TK-${REF_OFFSET + inserted.seq}`;
    const [withRef] = await tx
      .update(supportTicketsTable)
      .set({ ref: finalRef, updated_at: new Date() })
      .where(eq(supportTicketsTable.id, inserted.id))
      .returning();

    await tx.insert(supportTicketMessagesTable).values({
      ticket_id: inserted.id,
      author_id: tenantUser.id,
      author_type: "tenant",
      author_name: tenantUser.name,
      body: description.trim(),
    });

    return withRef;
  });

  return res.status(201).json({
    ticket: {
      id: created.id,
      ref: created.ref,
      subject: created.subject,
      status: created.status,
      created_at: created.created_at,
    },
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/support/tickets   — paginated listing for platform support
   Query: status, priority, search, page, limit
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/support/tickets", requirePlatformAdmin, async (req, res) => {
  const status   = (req.query.status   as string | undefined)?.trim() ?? "";
  const priority = (req.query.priority as string | undefined)?.trim() ?? "";
  const search   = (req.query.search   as string | undefined)?.trim() ?? "";
  const page     = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
  const limit    = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? "50", 10)));
  const offset   = (page - 1) * limit;

  const conditions: any[] = [];
  if (status   && status   !== "all") conditions.push(eq(supportTicketsTable.status,   status as any));
  if (priority && priority !== "all") conditions.push(eq(supportTicketsTable.priority, priority as any));
  if (search) {
    conditions.push(
      or(
        ilike(supportTicketsTable.subject, `%${search}%`),
        ilike(supportTicketsTable.ref,     `%${search}%`),
        ilike(supportTicketsTable.contact_email, `%${search}%`),
        ilike(tenantsTable.name, `%${search}%`),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }], summary] = await Promise.all([
    db
      .select({
        id:              supportTicketsTable.id,
        ref:             supportTicketsTable.ref,
        subject:         supportTicketsTable.subject,
        status:          supportTicketsTable.status,
        priority:        supportTicketsTable.priority,
        category:        supportTicketsTable.category,
        contact_name:    supportTicketsTable.contact_name,
        contact_email:   supportTicketsTable.contact_email,
        reply_count:     supportTicketsTable.reply_count,
        acknowledged_at: supportTicketsTable.acknowledged_at,
        created_at:      supportTicketsTable.created_at,
        tenant_id:       supportTicketsTable.tenant_id,
        tenant_name:     tenantsTable.name,
        tenant_slug:     tenantsTable.slug,
      })
      .from(supportTicketsTable)
      .leftJoin(tenantsTable, eq(tenantsTable.id, supportTicketsTable.tenant_id))
      .where(where as any)
      .orderBy(desc(supportTicketsTable.created_at))
      .limit(limit)
      .offset(offset),

    db.select({ total: count() })
      .from(supportTicketsTable)
      .leftJoin(tenantsTable, eq(tenantsTable.id, supportTicketsTable.tenant_id))
      .where(where as any),

    db.select({ status: supportTicketsTable.status, cnt: count() })
      .from(supportTicketsTable)
      .groupBy(supportTicketsTable.status),
  ]);

  const counts = Object.fromEntries(summary.map((s) => [s.status, Number(s.cnt)]));

  return res.json({
    tickets: rows,
    total: Number(total),
    page,
    limit,
    counts: {
      open:                Number(counts.open ?? 0),
      in_progress:         Number(counts.in_progress ?? 0),
      waiting_on_customer: Number(counts.waiting_on_customer ?? 0),
      resolved:            Number(counts.resolved ?? 0),
      closed:              Number(counts.closed ?? 0),
    },
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/support/tickets/:id   — single ticket + thread
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/support/tickets/:id", requirePlatformAdmin, async (req: any, res) => {
  const { id } = req.params;
  const [ticket] = await db
    .select({
      id:              supportTicketsTable.id,
      ref:             supportTicketsTable.ref,
      subject:         supportTicketsTable.subject,
      description:     supportTicketsTable.description,
      status:          supportTicketsTable.status,
      priority:        supportTicketsTable.priority,
      category:        supportTicketsTable.category,
      contact_name:    supportTicketsTable.contact_name,
      contact_email:   supportTicketsTable.contact_email,
      reply_count:     supportTicketsTable.reply_count,
      acknowledged_at: supportTicketsTable.acknowledged_at,
      resolved_at:     supportTicketsTable.resolved_at,
      created_at:      supportTicketsTable.created_at,
      updated_at:      supportTicketsTable.updated_at,
      tenant_id:       supportTicketsTable.tenant_id,
      tenant_name:     tenantsTable.name,
      tenant_slug:     tenantsTable.slug,
    })
    .from(supportTicketsTable)
    .leftJoin(tenantsTable, eq(tenantsTable.id, supportTicketsTable.tenant_id))
    .where(eq(supportTicketsTable.id, id))
    .limit(1);

  if (!ticket) return res.status(404).json({ error: "Ticket not found." });

  // First admin to view it acknowledges (clears the dashboard "new" badge).
  // Conditional WHERE makes this idempotent under concurrent first-views.
  if (!ticket.acknowledged_at && adminCanWrite(req.adminUser?.role)) {
    const ackAt = new Date();
    await db
      .update(supportTicketsTable)
      .set({ acknowledged_at: ackAt })
      .where(and(
        eq(supportTicketsTable.id, id),
        isNull(supportTicketsTable.acknowledged_at),
      ));
    ticket.acknowledged_at = ackAt;
  }

  const messages = await db
    .select({
      id: supportTicketMessagesTable.id,
      author_type: supportTicketMessagesTable.author_type,
      author_name: supportTicketMessagesTable.author_name,
      body: supportTicketMessagesTable.body,
      created_at: supportTicketMessagesTable.created_at,
    })
    .from(supportTicketMessagesTable)
    .where(eq(supportTicketMessagesTable.ticket_id, id))
    .orderBy(supportTicketMessagesTable.created_at);

  return res.json({ ticket, messages });
});

/* ─────────────────────────────────────────────────────────────────────────
   POST /admin/support/tickets/:id/messages   — admin replies in the thread
───────────────────────────────────────────────────────────────────────── */
router.post("/admin/support/tickets/:id/messages", requirePlatformAdmin, async (req: any, res) => {
  if (!adminCanWrite(req.adminUser?.role)) {
    return res.status(403).json({ error: "Insufficient permissions." });
  }
  const { id } = req.params;
  const { body } = req.body ?? {};
  if (!body || typeof body !== "string" || body.trim().length === 0) {
    return res.status(400).json({ error: "Message body is required." });
  }

  const [ticket] = await db
    .select({ id: supportTicketsTable.id })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.id, id))
    .limit(1);
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });

  await db.transaction(async (tx) => {
    await tx.insert(supportTicketMessagesTable).values({
      ticket_id: id,
      author_id: req.adminUser.id,
      author_type: "platform",
      author_name: req.adminUser.name ?? "Platform support",
      body: body.trim(),
    });

    await tx
      .update(supportTicketsTable)
      .set({
        // Atomic SQL increment to avoid lost updates under concurrent replies.
        reply_count: sql`${supportTicketsTable.reply_count} + 1`,
        updated_at: new Date(),
        // Bumping the ticket out of "open" once support has responded.
        status: sql`CASE WHEN ${supportTicketsTable.status} = 'open' THEN 'in_progress'::support_ticket_status ELSE ${supportTicketsTable.status} END`,
      })
      .where(eq(supportTicketsTable.id, id));
  });

  return res.status(201).json({ ok: true });
});

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /admin/support/tickets/:id   — update status / priority / assignee
───────────────────────────────────────────────────────────────────────── */
router.patch("/admin/support/tickets/:id", requirePlatformAdmin, async (req: any, res) => {
  if (!adminCanWrite(req.adminUser?.role)) {
    return res.status(403).json({ error: "Insufficient permissions." });
  }
  const { id } = req.params;
  const { status, priority, assigned_to_id } = req.body ?? {};

  const patch: Record<string, unknown> = { updated_at: new Date() };
  if (status) {
    const validStatuses = ["open", "in_progress", "waiting_on_customer", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    patch.status = status;
    if (status === "resolved" || status === "closed") patch.resolved_at = new Date();
  }
  if (priority) {
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: "Invalid priority." });
    }
    patch.priority = priority;
  }
  if (assigned_to_id !== undefined) {
    patch.assigned_to_id = assigned_to_id || null;
  }

  const [updated] = await db
    .update(supportTicketsTable)
    .set(patch)
    .where(eq(supportTicketsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Ticket not found." });
  return res.json({ ticket: updated });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/support/notifications   — counts for the dashboard bell badge
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/support/notifications", requirePlatformAdmin, async (_req, res) => {
  const rows = await db
    .select({ status: supportTicketsTable.status, cnt: count() })
    .from(supportTicketsTable)
    .where(sql`${supportTicketsTable.status} IN ('open','in_progress','waiting_on_customer')`)
    .groupBy(supportTicketsTable.status);

  const [{ unack }] = await db
    .select({ unack: count() })
    .from(supportTicketsTable)
    .where(and(
      isNull(supportTicketsTable.acknowledged_at),
      sql`${supportTicketsTable.status} IN ('open','in_progress','waiting_on_customer')`,
    ));

  const counts = Object.fromEntries(rows.map((r) => [r.status, Number(r.cnt)]));
  return res.json({
    open:        Number(counts.open ?? 0),
    in_progress: Number(counts.in_progress ?? 0),
    waiting:     Number(counts.waiting_on_customer ?? 0),
    unread:      Number(unack),
  });
});

export default router;
