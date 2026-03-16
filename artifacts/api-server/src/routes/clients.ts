import { Router } from "express";
import { sql, eq, and, or, isNull, desc, ilike } from "drizzle-orm";
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
router.get("/clients", async (req, res) => {
  try {
    const slug   = (req.query["tenant"] as string) || "demo-workshop";
    const search = (req.query["search"] as string) || "";
    const type   = req.query["type"] as string | undefined;
    const page   = Math.max(1, parseInt((req.query["page"]  as string) || "1"));
    const limit  = Math.min(100, Math.max(1, parseInt((req.query["limit"] as string) || "50")));
    const offset = (page - 1) * limit;

    const tenant = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const base = and(
      eq(clientsTable.tenant_id, tenant.id),
      isNull(clientsTable.deleted_at),
      search
        ? or(
            ilike(clientsTable.name,    `%${search}%`),
            ilike(clientsTable.phone,   `%${search}%`),
            ilike(clientsTable.email,   `%${search}%`),
            ilike(clientsTable.company, `%${search}%`),
          )
        : undefined,
      type === "individual" || type === "company"
        ? eq(clientsTable.type, type)
        : undefined,
    );

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id:            clientsTable.id,
          type:          clientsTable.type,
          name:          clientsTable.name,
          company:       clientsTable.company,
          phone:         clientsTable.phone,
          email:         clientsTable.email,
          whatsapp:      clientsTable.whatsapp,
          notes:         clientsTable.notes,
          created_at:    clientsTable.created_at,
          vehicle_count: sql<number>`cast(count(distinct ${vehiclesTable.id}) as int)`,
          last_visit:    sql<string | null>`max(${bookingsTable.scheduled_at})`,
        })
        .from(clientsTable)
        .leftJoin(vehiclesTable, and(
          eq(vehiclesTable.client_id, clientsTable.id),
          eq(vehiclesTable.tenant_id, clientsTable.tenant_id),
        ))
        .leftJoin(bookingsTable, and(
          eq(bookingsTable.client_id, clientsTable.id),
          eq(bookingsTable.tenant_id, clientsTable.tenant_id),
          eq(bookingsTable.status, "completed"),
          isNull(bookingsTable.deleted_at),
        ))
        .where(base)
        .groupBy(clientsTable.id)
        .orderBy(clientsTable.name)
        .limit(limit)
        .offset(offset),

      db
        .select({ total: sql<number>`cast(count(*) as int)` })
        .from(clientsTable)
        .where(base),
    ]);

    res.json({ data: rows, total: countRows[0]?.total ?? 0, page, limit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── DETAIL ─────────────────────────────────────────────────────────────── */
router.get("/clients/:id", async (req, res) => {
  try {
    const slug     = (req.query["tenant"] as string) || "demo-workshop";
    const clientId = req.params["id"]!;

    const tenant = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(
        eq(clientsTable.id, clientId),
        eq(clientsTable.tenant_id, tenant.id),
        isNull(clientsTable.deleted_at),
      ))
      .limit(1);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    const advisorAlias    = alias(usersTable, "adv");
    const technicianAlias = alias(usersTable, "tech");

    const [vehicles, bookings, quotations, jobs, invoices] = await Promise.all([
      /* vehicles */
      db.select().from(vehiclesTable)
        .where(and(eq(vehiclesTable.client_id, clientId), eq(vehiclesTable.tenant_id, tenant.id)))
        .orderBy(desc(vehiclesTable.created_at)),

      /* bookings */
      db.select({
          id: bookingsTable.id, ref: bookingsTable.ref, status: bookingsTable.status,
          scheduled_at: bookingsTable.scheduled_at, source: bookingsTable.source,
          notes: bookingsTable.notes, created_at: bookingsTable.created_at,
          duration_min: bookingsTable.duration_min,
          vehicle_plate: vehiclesTable.plate, vehicle_make: vehiclesTable.make,
          vehicle_model: vehiclesTable.model,  vehicle_year:  vehiclesTable.year,
          advisor_name: advisorAlias.name,
        })
        .from(bookingsTable)
        .leftJoin(vehiclesTable,   eq(vehiclesTable.id,   bookingsTable.vehicle_id))
        .leftJoin(advisorAlias,    eq(advisorAlias.id,    bookingsTable.advisor_id))
        .where(and(
          eq(bookingsTable.client_id,  clientId),
          eq(bookingsTable.tenant_id,  tenant.id),
          isNull(bookingsTable.deleted_at),
        ))
        .orderBy(desc(bookingsTable.scheduled_at))
        .limit(30),

      /* quotations */
      db.select({
          id: quotationsTable.id, ref: quotationsTable.ref, status: quotationsTable.status,
          total: quotationsTable.total, created_at: quotationsTable.created_at,
          expires_at: quotationsTable.expires_at,
          vehicle_plate: vehiclesTable.plate, vehicle_make: vehiclesTable.make, vehicle_model: vehiclesTable.model,
          advisor_name: advisorAlias.name,
        })
        .from(quotationsTable)
        .leftJoin(vehiclesTable, eq(vehiclesTable.id, quotationsTable.vehicle_id))
        .leftJoin(advisorAlias,  eq(advisorAlias.id,  quotationsTable.advisor_id))
        .where(and(
          eq(quotationsTable.client_id, clientId),
          eq(quotationsTable.tenant_id, tenant.id),
        ))
        .orderBy(desc(quotationsTable.created_at))
        .limit(30),

      /* jobs */
      db.select({
          id: jobsTable.id, ref: jobsTable.ref, status: jobsTable.status, priority: jobsTable.priority,
          type: jobsTable.type,
          bay: jobsTable.bay, created_at: jobsTable.created_at, completed_at: jobsTable.completed_at,
          customer_concern: jobsTable.customer_concern,
          vehicle_id: jobsTable.vehicle_id,
          vehicle_plate: vehiclesTable.plate, vehicle_make: vehiclesTable.make, vehicle_model: vehiclesTable.model,
          advisor_name: advisorAlias.name, technician_name: technicianAlias.name,
        })
        .from(jobsTable)
        .leftJoin(vehiclesTable,    eq(vehiclesTable.id,    jobsTable.vehicle_id))
        .leftJoin(advisorAlias,     eq(advisorAlias.id,     jobsTable.advisor_id))
        .leftJoin(technicianAlias,  eq(technicianAlias.id,  jobsTable.technician_id))
        .where(and(eq(jobsTable.client_id, clientId), eq(jobsTable.tenant_id, tenant.id)))
        .orderBy(desc(jobsTable.created_at))
        .limit(30),

      /* invoices */
      db.select({
          id: invoicesTable.id, ref: invoicesTable.ref, status: invoicesTable.status,
          total: invoicesTable.total, paid_amount: invoicesTable.paid_amount,
          due_at: invoicesTable.due_at, created_at: invoicesTable.created_at,
          vehicle_plate: vehiclesTable.plate, vehicle_make: vehiclesTable.make, vehicle_model: vehiclesTable.model,
        })
        .from(invoicesTable)
        .leftJoin(vehiclesTable, eq(vehiclesTable.id, invoicesTable.vehicle_id))
        .where(and(eq(invoicesTable.client_id, clientId), eq(invoicesTable.tenant_id, tenant.id)))
        .orderBy(desc(invoicesTable.created_at))
        .limit(30),
    ]);

    res.json({ client, vehicles, currency: tenant.currency, history: { bookings, quotations, jobs, invoices } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── CREATE ─────────────────────────────────────────────────────────────── */
router.post("/clients", async (req, res) => {
  try {
    const slug = (req.query["tenant"] as string) || "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const { type, name, company, phone, email, whatsapp, id_number, notes } =
      req.body as Record<string, string>;
    if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }

    const [inserted] = await db.insert(clientsTable).values({
      tenant_id:  tenant.id,
      type:       (type === "company" ? "company" : "individual") as "individual" | "company",
      name:       name.trim(),
      company:    company?.trim()   || null,
      phone:      phone?.trim()     || null,
      email:      email?.trim()     || null,
      whatsapp:   whatsapp?.trim()  || null,
      id_number:  id_number?.trim() || null,
      notes:      notes?.trim()     || null,
    }).returning();

    res.status(201).json(inserted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── UPDATE ─────────────────────────────────────────────────────────────── */
router.put("/clients/:id", async (req, res) => {
  try {
    const slug     = (req.query["tenant"] as string) || "demo-workshop";
    const clientId = req.params["id"]!;
    const tenant   = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const { type, name, company, phone, email, whatsapp, id_number, notes } =
      req.body as Record<string, string>;
    if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }

    const [updated] = await db.update(clientsTable)
      .set({
        type:       (type === "company" ? "company" : "individual") as "individual" | "company",
        name:       name.trim(),
        company:    company?.trim()   || null,
        phone:      phone?.trim()     || null,
        email:      email?.trim()     || null,
        whatsapp:   whatsapp?.trim()  || null,
        id_number:  id_number?.trim() || null,
        notes:      notes?.trim()     || null,
        updated_at: new Date(),
      })
      .where(and(
        eq(clientsTable.id, clientId),
        eq(clientsTable.tenant_id, tenant.id),
        isNull(clientsTable.deleted_at),
      ))
      .returning();

    if (!updated) { res.status(404).json({ error: "Client not found" }); return; }
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── SOFT DELETE ────────────────────────────────────────────────────────── */
router.delete("/clients/:id", async (req, res) => {
  try {
    const slug     = (req.query["tenant"] as string) || "demo-workshop";
    const clientId = req.params["id"]!;
    const tenant   = await resolveTenant(slug);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    await db.update(clientsTable)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(and(
        eq(clientsTable.id, clientId),
        eq(clientsTable.tenant_id, tenant.id),
        isNull(clientsTable.deleted_at),
      ));

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
