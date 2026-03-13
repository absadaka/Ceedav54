import { Router } from "express";
import { db, tenantsTable, usersTable } from "@workspace/db";
import { eq, ilike, isNull, count, desc, and, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const router = Router();

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/tenants
   Query params: search, status, page (default 1), limit (default 50)
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/tenants", async (req, res) => {
  const search = (req.query.search as string | undefined)?.trim() ?? "";
  const status = (req.query.status as string | undefined)?.trim() ?? "";
  const page   = Math.max(1, parseInt(req.query.page as string ?? "1", 10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit as string ?? "50", 10)));
  const offset = (page - 1) * limit;

  const conditions: Parameters<typeof and>[0][] = [isNull(tenantsTable.deleted_at)];
  if (search) {
    conditions.push(
      or(
        ilike(tenantsTable.name, `%${search}%`),
        ilike(tenantsTable.slug, `%${search}%`),
        ilike(tenantsTable.email, `%${search}%`),
      )!
    );
  }
  if (status && status !== "all") {
    conditions.push(eq(tenantsTable.status, status as "trial" | "active" | "suspended" | "cancelled"));
  }

  const where = and(...conditions);

  const [tenantsRaw, [{ total }]] = await Promise.all([
    db
      .select({
        id:            tenantsTable.id,
        slug:          tenantsTable.slug,
        name:          tenantsTable.name,
        plan:          tenantsTable.plan,
        status:        tenantsTable.status,
        country:       tenantsTable.country,
        currency:      tenantsTable.currency,
        email:         tenantsTable.email,
        phone:         tenantsTable.phone,
        logo_url:      tenantsTable.logo_url,
        trial_ends_at: tenantsTable.trial_ends_at,
        created_at:    tenantsTable.created_at,
      })
      .from(tenantsTable)
      .where(where)
      .orderBy(desc(tenantsTable.created_at))
      .limit(limit)
      .offset(offset),

    db
      .select({ total: count() })
      .from(tenantsTable)
      .where(where),
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
        or(...tenantIds.map((id) => eq(usersTable.tenant_id, id)))
      )
    )
    .groupBy(usersTable.tenant_id);

  const countMap = new Map(userCounts.map((r) => [r.tenant_id, Number(r.count)]));

  const tenants = tenantsRaw.map((t) => ({
    ...t,
    user_count: countMap.get(t.id) ?? 0,
  }));

  return res.json({ tenants, total: Number(total), page, limit });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /admin/stats
───────────────────────────────────────────────────────────────────────── */
router.get("/admin/stats", async (_req, res) => {
  const [[tenantStats], [userStats]] = await Promise.all([
    db.select({
      total:     count(),
    }).from(tenantsTable).where(isNull(tenantsTable.deleted_at)),

    db.select({
      total: count(),
    }).from(usersTable).where(and(isNull(usersTable.deleted_at), eq(usersTable.is_active, true))),
  ]);

  return res.json({
    total_tenants: Number(tenantStats.total),
    active_users:  Number(userStats.total),
  });
});

export default router;
