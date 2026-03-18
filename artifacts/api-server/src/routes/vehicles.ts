import { Router } from "express";
import { sql, eq, and, or, desc, ilike } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db, tenantsTable, clientsTable, vehiclesTable,
  bookingsTable, quotationsTable, jobsTable, invoicesTable, usersTable,
} from "@workspace/db";

const router = Router();

async function resolveTenant(slug: string) {
  const [t] = await db
    .select({ id: tenantsTable.id, currency: tenantsTable.currency })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);
  return t ?? null;
}

/* ─── LIST ───────────────────────────────────────────────────────────────── */
router.get("/vehicles", async (req, res) => {
  try {
    const slug     = (req.query["tenant"]    as string) || "demo-workshop";
    const clientId = req.query["client_id"]  as string | undefined;
    const search   = (req.query["search"]    as string) || "";
    const page     = Math.max(1, parseInt((req.query["page"]  as string) || "1"));
    const limit    = Math.min(100, Math.max(1, parseInt((req.query["limit"] as string) || "50")));
    const offset   = (page - 1) * limit;

    const tenant = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const base = and(
      eq(vehiclesTable.tenant_id, tenant.id),
      clientId ? eq(vehiclesTable.client_id, clientId) : undefined,
      search
        ? or(
            ilike(vehiclesTable.plate, `%${search}%`),
            ilike(vehiclesTable.make,  `%${search}%`),
            ilike(vehiclesTable.model, `%${search}%`),
            ilike(vehiclesTable.vin,   `%${search}%`),
          )
        : undefined,
    );

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id:           vehiclesTable.id,
          plate:        vehiclesTable.plate,
          make:         vehiclesTable.make,
          model:        vehiclesTable.model,
          year:         vehiclesTable.year,
          color:        vehiclesTable.color,
          mileage:      vehiclesTable.mileage,
          fuel_type:    vehiclesTable.fuel_type,
          created_at:   vehiclesTable.created_at,
          client_id:    vehiclesTable.client_id,
          client_name:  clientsTable.name,
          client_phone: clientsTable.phone,
        })
        .from(vehiclesTable)
        .leftJoin(clientsTable, eq(clientsTable.id, vehiclesTable.client_id))
        .where(base)
        .orderBy(vehiclesTable.plate)
        .limit(limit)
        .offset(offset),

      db
        .select({ total: sql<number>`cast(count(*) as int)` })
        .from(vehiclesTable)
        .where(base),
    ]);

    res.json({ data: rows, total: countRows[0]?.total ?? 0, page, limit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── DETAIL ─────────────────────────────────────────────────────────────── */
router.get("/vehicles/:id", async (req, res) => {
  try {
    const slug      = (req.query["tenant"] as string) || "demo-workshop";
    const vehicleId = req.params["id"]!;

    const tenant = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const [vehicle] = await db
      .select()
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.tenant_id, tenant.id)))
      .limit(1);
    if (!vehicle) { res.status(404).json({ error: "Vehicle not found" }); return; }

    const advisorAlias    = alias(usersTable, "adv");
    const technicianAlias = alias(usersTable, "tech");

    const [client, bookings, quotations, jobs, invoices] = await Promise.all([
      /* linked customer */
      db.select({ id: clientsTable.id, name: clientsTable.name, phone: clientsTable.phone, email: clientsTable.email, type: clientsTable.type })
        .from(clientsTable)
        .where(eq(clientsTable.id, vehicle.client_id))
        .limit(1)
        .then(r => r[0] ?? null),

      /* bookings */
      db.select({
          id: bookingsTable.id, ref: bookingsTable.ref, status: bookingsTable.status,
          scheduled_at: bookingsTable.scheduled_at, source: bookingsTable.source,
          notes: bookingsTable.notes, created_at: bookingsTable.created_at,
          duration_min: bookingsTable.duration_min,
          advisor_name: advisorAlias.name,
        })
        .from(bookingsTable)
        .leftJoin(advisorAlias, eq(advisorAlias.id, bookingsTable.advisor_id))
        .where(and(eq(bookingsTable.vehicle_id, vehicleId), eq(bookingsTable.tenant_id, tenant.id)))
        .orderBy(desc(bookingsTable.scheduled_at))
        .limit(20),

      /* quotations */
      db.select({
          id: quotationsTable.id, ref: quotationsTable.ref, status: quotationsTable.status,
          total: quotationsTable.total, created_at: quotationsTable.created_at,
          expires_at: quotationsTable.expires_at, advisor_name: advisorAlias.name,
        })
        .from(quotationsTable)
        .leftJoin(advisorAlias, eq(advisorAlias.id, quotationsTable.advisor_id))
        .where(and(eq(quotationsTable.vehicle_id, vehicleId), eq(quotationsTable.tenant_id, tenant.id)))
        .orderBy(desc(quotationsTable.created_at))
        .limit(20),

      /* jobs */
      db.select({
          id: jobsTable.id, ref: jobsTable.ref, status: jobsTable.status, priority: jobsTable.priority,
          bay: jobsTable.bay, created_at: jobsTable.created_at, completed_at: jobsTable.completed_at,
          customer_concern: jobsTable.customer_concern,
          advisor_name: advisorAlias.name, technician_name: technicianAlias.name,
        })
        .from(jobsTable)
        .leftJoin(advisorAlias,    eq(advisorAlias.id,    jobsTable.advisor_id))
        .leftJoin(technicianAlias, eq(technicianAlias.id, jobsTable.technician_id))
        .where(and(eq(jobsTable.vehicle_id, vehicleId), eq(jobsTable.tenant_id, tenant.id)))
        .orderBy(desc(jobsTable.created_at))
        .limit(20),

      /* invoices */
      db.select({
          id: invoicesTable.id, ref: invoicesTable.ref, status: invoicesTable.status,
          total: invoicesTable.total, paid_amount: invoicesTable.paid_amount,
          due_at: invoicesTable.due_at, created_at: invoicesTable.created_at,
        })
        .from(invoicesTable)
        .where(and(eq(invoicesTable.vehicle_id, vehicleId), eq(invoicesTable.tenant_id, tenant.id)))
        .orderBy(desc(invoicesTable.created_at))
        .limit(20),
    ]);

    res.json({ vehicle, client, currency: tenant.currency, history: { bookings, quotations, jobs, invoices } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── CREATE ─────────────────────────────────────────────────────────────── */
router.post("/vehicles", async (req, res) => {
  try {
    const slug   = (req.query["tenant"] as string) || "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const { client_id, plate, make, model, year, vin, color, mileage, fuel_type, transmission, notes } =
      req.body as Record<string, string>;
    if (!plate?.trim())     { res.status(400).json({ error: "Plate is required" });     return; }
    if (!client_id?.trim()) { res.status(400).json({ error: "Client ID is required" }); return; }

    const [inserted] = await db.insert(vehiclesTable).values({
      tenant_id:    tenant.id,
      client_id:    client_id.trim(),
      plate:        plate.trim().toUpperCase(),
      make:         make?.trim()         || null,
      model:        model?.trim()        || null,
      year:         year?.trim()         || null,
      vin:          vin?.trim()          || null,
      color:        color?.trim()        || null,
      mileage:      mileage?.trim()      || null,
      fuel_type:    fuel_type?.trim()    || null,
      transmission: transmission?.trim() || null,
      notes:        notes?.trim()        || null,
    }).returning();

    res.status(201).json(inserted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── UPDATE ─────────────────────────────────────────────────────────────── */
router.put("/vehicles/:id", async (req, res) => {
  try {
    const slug      = (req.query["tenant"] as string) || "demo-workshop";
    const vehicleId = req.params["id"]!;
    const tenant    = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const { plate, make, model, year, vin, color, mileage, fuel_type, transmission, notes } =
      req.body as Record<string, string>;
    if (!plate?.trim()) { res.status(400).json({ error: "Plate is required" }); return; }

    const [updated] = await db.update(vehiclesTable)
      .set({
        plate:        plate.trim().toUpperCase(),
        make:         make?.trim()         || null,
        model:        model?.trim()        || null,
        year:         year?.trim()         || null,
        vin:          vin?.trim()          || null,
        color:        color?.trim()        || null,
        mileage:      mileage?.trim()      || null,
        fuel_type:    fuel_type?.trim()    || null,
        transmission: transmission?.trim() || null,
        notes:        notes?.trim()        || null,
        updated_at:   new Date(),
      })
      .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.tenant_id, tenant.id)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Vehicle not found" }); return; }
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── PATCH /vehicles/:id — partial update (only provided fields) ─────── */
router.patch("/vehicles/:id", async (req, res) => {
  try {
    const slug      = (req.query["tenant"] as string) || "demo-workshop";
    const vehicleId = req.params["id"]!;
    const tenant    = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const body = req.body as Record<string, string | undefined>;
    const patch: Record<string, unknown> = { updated_at: new Date() };
    if (body.vin     !== undefined) patch.vin     = body.vin?.trim()     || null;
    if (body.mileage !== undefined) patch.mileage = body.mileage?.trim() || null;
    if (body.plate   !== undefined) patch.plate   = body.plate?.trim().toUpperCase() || null;
    if (body.make    !== undefined) patch.make    = body.make?.trim()    || null;
    if (body.model   !== undefined) patch.model   = body.model?.trim()   || null;
    if (body.year    !== undefined) patch.year    = body.year?.trim()    || null;
    if (body.color   !== undefined) patch.color   = body.color?.trim()   || null;

    const [updated] = await db.update(vehiclesTable)
      .set(patch)
      .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.tenant_id, tenant.id)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Vehicle not found" }); return; }
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── DELETE ─────────────────────────────────────────────────────────────── */
router.delete("/vehicles/:id", async (req, res) => {
  try {
    const slug      = (req.query["tenant"] as string) || "demo-workshop";
    const vehicleId = req.params["id"]!;
    const tenant    = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    await db.delete(vehiclesTable).where(and(
      eq(vehiclesTable.id, vehicleId),
      eq(vehiclesTable.tenant_id, tenant.id),
    ));

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
