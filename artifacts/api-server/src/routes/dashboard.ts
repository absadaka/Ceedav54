import { Router } from "express";
import { sql, eq, and, gte, lte, inArray } from "drizzle-orm";
import {
  db,
  tenantsTable,
  usersTable,
  bookingsTable,
  clientsTable,
  vehiclesTable,
  jobsTable,
  jobStatusHistoryTable,
  quotationsTable,
  invoicesTable,
} from "@workspace/db";

const router = Router();

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/dashboard?tenant=<slug>

   Returns a single payload driving the tenant dashboard.
   Auth middleware will supply tenant_id from session once implemented.
   For now, accepts ?tenant=<slug> query param.
───────────────────────────────────────────────────────────────────────── */

router.get("/dashboard", async (req, res) => {
  try {
    const slug = (req.query["tenant"] as string) || "demo-workshop";

    /* ── Resolve tenant ─────────────────────────────────────────────── */
    const [tenant] = await db
      .select({ id: tenantsTable.id, name: tenantsTable.name, currency: tenantsTable.currency })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .limit(1);

    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const tid = tenant.id;

    /* ── Date ranges ────────────────────────────────────────────────── */
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    /* ── Active job statuses ────────────────────────────────────────── */
    const activeStatuses = ["waiting", "in_progress", "waiting_parts", "on_hold", "qc"] as const;
    const pendingQuoteStatuses = ["draft", "sent", "viewed"] as const;
    const unpaidInvoiceStatuses = ["sent", "partial", "overdue"] as const;

    /* ── Run all queries in parallel ────────────────────────────────── */
    const [
      bookingRows,
      activeJobRows,
      pendingQuoteRows,
      unpaidInvoiceRows,
      revenueRows,
      techWorkloadRows,
      activityRows,
    ] = await Promise.all([

      /* Today's bookings with client/vehicle/advisor ──────────────── */
      db.execute(sql`
        SELECT
          b.id, b.ref, b.status, b.scheduled_at, b.duration_min, b.source, b.notes,
          c.name AS client_name, c.phone AS client_phone,
          v.plate AS vehicle_plate, v.make AS vehicle_make, v.model AS vehicle_model,
          u.name AS advisor_name
        FROM bookings b
        LEFT JOIN clients  c ON c.id = b.client_id
        LEFT JOIN vehicles v ON v.id = b.vehicle_id
        LEFT JOIN users    u ON u.id = b.advisor_id
        WHERE b.tenant_id = ${tid}
          AND b.scheduled_at >= ${todayStart}
          AND b.scheduled_at <= ${todayEnd}
          AND b.deleted_at IS NULL
        ORDER BY b.scheduled_at ASC
        LIMIT 20
      `),

      /* Active job cards with client/vehicle/advisor/technician ────── */
      db.execute(sql`
        SELECT
          j.id, j.ref, j.status, j.priority, j.bay,
          j.started_at, j.created_at, j.customer_concern,
          c.name AS client_name,
          v.plate AS vehicle_plate, v.make AS vehicle_make, v.model AS vehicle_model,
          tech.name AS technician_name,
          adv.name  AS advisor_name
        FROM jobs j
        LEFT JOIN clients  c    ON c.id    = j.client_id
        LEFT JOIN vehicles v    ON v.id    = j.vehicle_id
        LEFT JOIN users    tech ON tech.id = j.technician_id
        LEFT JOIN users    adv  ON adv.id  = j.advisor_id
        WHERE j.tenant_id = ${tid}
          AND j.status IN ('waiting','in_progress','waiting_parts','on_hold','qc')
        ORDER BY
          CASE j.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          j.created_at DESC
        LIMIT 20
      `),

      /* Pending quotations with client/advisor ────────────────────── */
      db.execute(sql`
        SELECT
          q.id, q.ref, q.status, q.total, q.created_at, q.expires_at,
          c.name AS client_name, c.phone AS client_phone,
          u.name AS advisor_name
        FROM quotations q
        LEFT JOIN clients c ON c.id = q.client_id
        LEFT JOIN users   u ON u.id = q.advisor_id
        WHERE q.tenant_id = ${tid}
          AND q.status IN ('draft','sent','viewed')
        ORDER BY q.created_at DESC
        LIMIT 10
      `),

      /* Unpaid invoices with client ───────────────────────────────── */
      db.execute(sql`
        SELECT
          i.id, i.ref, i.status, i.total, i.paid_amount, i.due_at, i.sent_at, i.created_at,
          c.name AS client_name, c.phone AS client_phone
        FROM invoices i
        LEFT JOIN clients c ON c.id = i.client_id
        WHERE i.tenant_id = ${tid}
          AND i.status IN ('sent','partial','overdue')
        ORDER BY i.due_at ASC NULLS LAST, i.created_at DESC
        LIMIT 10
      `),

      /* Revenue: today / this week / this month (paid invoices) ────── */
      db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN paid_at >= ${todayStart}  THEN paid_amount::numeric ELSE 0 END), 0) AS today,
          COALESCE(SUM(CASE WHEN paid_at >= ${weekStart}   THEN paid_amount::numeric ELSE 0 END), 0) AS week,
          COALESCE(SUM(CASE WHEN paid_at >= ${monthStart}  THEN paid_amount::numeric ELSE 0 END), 0) AS month,
          COUNT(CASE WHEN status != 'paid' AND status != 'void' THEN 1 END) AS unpaid_count,
          COALESCE(SUM(CASE WHEN status != 'paid' AND status != 'void'
                            THEN (total::numeric - paid_amount::numeric) ELSE 0 END), 0) AS unpaid_total
        FROM invoices
        WHERE tenant_id = ${tid}
      `),

      /* Technician workload ────────────────────────────────────────── */
      db.execute(sql`
        SELECT
          u.id, u.name,
          COUNT(CASE WHEN j.status IN ('waiting','in_progress','waiting_parts','on_hold','qc') THEN 1 END) AS active_count,
          COUNT(CASE WHEN j.status = 'completed' AND j.completed_at >= ${todayStart} THEN 1 END) AS completed_today
        FROM users u
        LEFT JOIN jobs j ON j.technician_id = u.id AND j.tenant_id = ${tid}
        WHERE u.tenant_id = ${tid}
          AND u.role = 'technician'
          AND u.is_active = true
        GROUP BY u.id, u.name
        ORDER BY active_count DESC, u.name
      `),

      /* Recent activity (last 15 status changes) ──────────────────── */
      db.execute(sql`
        SELECT
          h.id, h.from_status, h.to_status, h.created_at,
          j.ref AS job_ref,
          u.name AS changed_by_name
        FROM job_status_history h
        JOIN jobs j ON j.id = h.job_id
        LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.tenant_id = ${tid}
        ORDER BY h.created_at DESC
        LIMIT 15
      `),
    ]);

    /* ── KPI aggregates ─────────────────────────────────────────────── */
    const rev = (revenueRows.rows[0] ?? {}) as Record<string, unknown>;
    const kpis = {
      bookings_today:       bookingRows.rows.length,
      active_jobs:          activeJobRows.rows.length,
      revenue_month:        Number(rev["month"] ?? 0).toFixed(2),
      unpaid_invoices_count: Number(rev["unpaid_count"] ?? 0),
      unpaid_invoices_total: Number(rev["unpaid_total"] ?? 0).toFixed(2),
    };

    const revenue = {
      today: Number(rev["today"] ?? 0).toFixed(2),
      week:  Number(rev["week"]  ?? 0).toFixed(2),
      month: Number(rev["month"] ?? 0).toFixed(2),
    };

    return res.json({
      currency:           tenant.currency,
      kpis,
      revenue,
      bookings_today:     bookingRows.rows,
      active_jobs:        activeJobRows.rows,
      pending_quotations: pendingQuoteRows.rows,
      unpaid_invoices:    unpaidInvoiceRows.rows,
      technician_workload: techWorkloadRows.rows,
      recent_activity:    activityRows.rows,
    });
  } catch (err) {
    console.error("[dashboard]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
