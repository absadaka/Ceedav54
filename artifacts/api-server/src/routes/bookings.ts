import { Router } from "express";
import { sql, eq, and, or, desc, ilike, isNull, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db, tenantsTable, clientsTable, vehiclesTable, usersTable,
  bookingsTable,
} from "@workspace/db";

const router = Router();

async function resolveTenant(slug: string) {
  const [t] = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
  return t ?? null;
}

const VALID_STATUSES = [
  "pending", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show",
] as const;
type BookingStatus = typeof VALID_STATUSES[number];

/* ─── GET /bookings/meta/advisors ─────────────────────────────────────────── */
router.get("/meta/advisors", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const rows = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(and(
        eq(usersTable.tenant_id, tenant.id),
        isNull(usersTable.deleted_at),
        or(
          eq(usersTable.role, "service_advisor"),
          eq(usersTable.role, "admin"),
          eq(usersTable.role, "owner"),
        ),
      ))
      .orderBy(usersTable.name);

    res.json(rows);
  } catch (e: any) {
    console.error("GET /bookings/meta/advisors", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /bookings ───────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const page   = Math.max(1, parseInt((req.query.page as string) ?? "1"));
    const limit  = Math.min(100, parseInt((req.query.limit as string) ?? "50"));
    const offset = (page - 1) * limit;
    const q      = ((req.query.q as string) ?? "").trim();
    const status = req.query.status as string | undefined;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo   = req.query.date_to   as string | undefined;

    const advisorAlias = alias(usersTable, "adv");

    const conditions = [
      eq(bookingsTable.tenant_id, tenant.id),
      isNull(bookingsTable.deleted_at),
      ...(status && VALID_STATUSES.includes(status as BookingStatus)
        ? [eq(bookingsTable.status, status as BookingStatus)] : []),
      ...(dateFrom ? [gte(bookingsTable.scheduled_at, new Date(dateFrom))] : []),
      ...(dateTo   ? [lte(bookingsTable.scheduled_at, new Date(dateTo))]   : []),
      ...(q ? [or(
        ilike(clientsTable.name,    `%${q}%`),
        ilike(clientsTable.phone,   `%${q}%`),
        ilike(vehiclesTable.plate,  `%${q}%`),
        ilike(bookingsTable.ref,    `%${q}%`),
      )] : []),
    ].filter(Boolean);

    const base = and(...(conditions as any[]));

    const [rows, countRow] = await Promise.all([
      db
        .select({
          id:           bookingsTable.id,
          ref:          bookingsTable.ref,
          status:       bookingsTable.status,
          source:       bookingsTable.source,
          booking_type: bookingsTable.booking_type,
          scheduled_at: bookingsTable.scheduled_at,
          duration_min: bookingsTable.duration_min,
          notes:        bookingsTable.notes,
          mileage_in:   bookingsTable.mileage_in,
          created_at:   bookingsTable.created_at,
          client_id:    bookingsTable.client_id,
          client_name:  clientsTable.name,
          client_phone: clientsTable.phone,
          vehicle_id:   bookingsTable.vehicle_id,
          plate_number: vehiclesTable.plate,
          vehicle_make: vehiclesTable.make,
          vehicle_model:vehiclesTable.model,
          vehicle_year: vehiclesTable.year,
          advisor_id:   bookingsTable.advisor_id,
          advisor_name: advisorAlias.name,
        })
        .from(bookingsTable)
        .leftJoin(clientsTable, eq(clientsTable.id, bookingsTable.client_id))
        .leftJoin(vehiclesTable, eq(vehiclesTable.id, bookingsTable.vehicle_id))
        .leftJoin(advisorAlias, eq(advisorAlias.id, bookingsTable.advisor_id))
        .where(base)
        .orderBy(desc(bookingsTable.scheduled_at))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(bookingsTable)
        .leftJoin(clientsTable, eq(clientsTable.id, bookingsTable.client_id))
        .leftJoin(vehiclesTable, eq(vehiclesTable.id, bookingsTable.vehicle_id))
        .where(base),
    ]);

    // Status summary counts for today
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86400000);

    const summary = await db
      .select({
        status: bookingsTable.status,
        count:  sql<number>`cast(count(*) as int)`,
      })
      .from(bookingsTable)
      .where(and(
        eq(bookingsTable.tenant_id, tenant.id),
        isNull(bookingsTable.deleted_at),
        gte(bookingsTable.scheduled_at, todayStart),
        lte(bookingsTable.scheduled_at, todayEnd),
      ))
      .groupBy(bookingsTable.status);

    res.json({
      rows,
      total:    countRow[0]?.count ?? 0,
      page,
      limit,
      summary,
    });
  } catch (e: any) {
    console.error("GET /bookings", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /bookings/:id ───────────────────────────────────────────────────── */
router.get("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const advisorAlias = alias(usersTable, "adv");
    const creatorAlias = alias(usersTable, "creator");

    const [booking] = await db
      .select({
        id:           bookingsTable.id,
        ref:          bookingsTable.ref,
        seq:          bookingsTable.seq,
        status:       bookingsTable.status,
        source:       bookingsTable.source,
        booking_type: bookingsTable.booking_type,
        scheduled_at: bookingsTable.scheduled_at,
        duration_min: bookingsTable.duration_min,
        notes:        bookingsTable.notes,
        mileage_in:   bookingsTable.mileage_in,
        created_at:   bookingsTable.created_at,
        updated_at:   bookingsTable.updated_at,
        client_id:    bookingsTable.client_id,
        client_name:  clientsTable.name,
        client_phone: clientsTable.phone,
        client_email: clientsTable.email,
        vehicle_id:   bookingsTable.vehicle_id,
        plate_number: vehiclesTable.plate,
        vehicle_make: vehiclesTable.make,
        vehicle_model:vehiclesTable.model,
        vehicle_year: vehiclesTable.year,
        vehicle_color:vehiclesTable.color,
        vehicle_vin:  vehiclesTable.vin,
        advisor_id:   bookingsTable.advisor_id,
        advisor_name: advisorAlias.name,
        advisor_email:advisorAlias.email,
        created_by_name: creatorAlias.name,
      })
      .from(bookingsTable)
      .leftJoin(clientsTable, eq(clientsTable.id, bookingsTable.client_id))
      .leftJoin(vehiclesTable, eq(vehiclesTable.id, bookingsTable.vehicle_id))
      .leftJoin(advisorAlias, eq(advisorAlias.id, bookingsTable.advisor_id))
      .leftJoin(creatorAlias, eq(creatorAlias.id, bookingsTable.created_by))
      .where(and(eq(bookingsTable.id, req.params.id), eq(bookingsTable.tenant_id, tenant.id), isNull(bookingsTable.deleted_at)))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json({ booking });
  } catch (e: any) {
    console.error("GET /bookings/:id", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /bookings ──────────────────────────────────────────────────────── */
router.post("/", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const {
      client_id, vehicle_id, advisor_id,
      scheduled_at, duration_min = 60,
      source = "phone", notes, mileage_in,
      booking_type,
    } = req.body;

    if (!scheduled_at) return res.status(400).json({ error: "scheduled_at is required" });

    // Generate ref
    const [{ seq }] = await db
      .select({ seq: sql<number>`cast(coalesce(max(seq), 0) + 1 as int)` })
      .from(bookingsTable)
      .where(eq(bookingsTable.tenant_id, tenant.id));

    const year = new Date(scheduled_at).getFullYear();
    const ref  = `BK-${year}-${String(seq).padStart(4, "0")}`;

    const [booking] = await db
      .insert(bookingsTable)
      .values({
        tenant_id: tenant.id,
        seq,
        ref,
        client_id:    client_id    || null,
        vehicle_id:   vehicle_id   || null,
        advisor_id:   advisor_id   || null,
        scheduled_at: new Date(scheduled_at),
        duration_min: Number(duration_min),
        source,
        notes:        notes        || null,
        mileage_in:   mileage_in   || null,
        booking_type: booking_type || null,
        status: "pending",
      })
      .returning();

    res.status(201).json({ booking });
  } catch (e: any) {
    console.error("POST /bookings", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── PUT /bookings/:id ───────────────────────────────────────────────────── */
router.put("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const {
      client_id, vehicle_id, advisor_id,
      scheduled_at, duration_min, source, notes, mileage_in,
      booking_type,
    } = req.body;

    const updates: Record<string, any> = { updated_at: new Date() };
    if (client_id    !== undefined) updates.client_id    = client_id    || null;
    if (vehicle_id   !== undefined) updates.vehicle_id   = vehicle_id   || null;
    if (advisor_id   !== undefined) updates.advisor_id   = advisor_id   || null;
    if (scheduled_at !== undefined) updates.scheduled_at = new Date(scheduled_at);
    if (duration_min !== undefined) updates.duration_min = Number(duration_min);
    if (source       !== undefined) updates.source       = source;
    if (notes        !== undefined) updates.notes        = notes || null;
    if (mileage_in   !== undefined) updates.mileage_in   = mileage_in || null;
    if (booking_type !== undefined) updates.booking_type = booking_type || null;

    const [booking] = await db
      .update(bookingsTable)
      .set(updates)
      .where(and(eq(bookingsTable.id, req.params.id), eq(bookingsTable.tenant_id, tenant.id)))
      .returning();

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json({ booking });
  } catch (e: any) {
    console.error("PUT /bookings/:id", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /bookings/:id/status ───────────────────────────────────────────── */
router.post("/:id/status", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { status, cancellation_note } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status", valid: VALID_STATUSES });
    }

    const updateFields: Record<string, any> = { status, updated_at: new Date() };
    if (status === "cancelled" && cancellation_note !== undefined) {
      updateFields.cancellation_note = cancellation_note || null;
    }

    const [booking] = await db
      .update(bookingsTable)
      .set(updateFields)
      .where(and(eq(bookingsTable.id, req.params.id), eq(bookingsTable.tenant_id, tenant.id)))
      .returning();

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json({ booking });
  } catch (e: any) {
    console.error("POST /bookings/:id/status", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── DELETE /bookings/:id ────────────────────────────────────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await db
      .update(bookingsTable)
      .set({ deleted_at: new Date() })
      .where(and(eq(bookingsTable.id, req.params.id), eq(bookingsTable.tenant_id, tenant.id)));

    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /bookings/:id", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
