import { Router } from "express";
import { sql, eq, and, or, desc, ilike, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db, tenantsTable, clientsTable, vehiclesTable, usersTable,
  quotationsTable, quoteLineItemsTable, jobsTable,
  bookingsTable,
} from "@workspace/db";
import { quoteAdvancePaymentsTable } from "@workspace/db";

const router = Router();

async function resolveTenant(slug: string) {
  const [t] = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
  return t ?? null;
}

/* ─── Totals recalc helper ────────────────────────────────────────────────── */
async function recalcTotals(quotationId: string, overrideDiscount?: number, overrideTaxRate?: number) {
  const lines = await db
    .select({ line_total: quoteLineItemsTable.line_total })
    .from(quoteLineItemsTable)
    .where(eq(quoteLineItemsTable.quotation_id, quotationId));

  const [qt] = await db
    .select({ discount: quotationsTable.discount, tax_rate: quotationsTable.tax_rate })
    .from(quotationsTable)
    .where(eq(quotationsTable.id, quotationId))
    .limit(1);

  const subtotal   = lines.reduce((acc, l) => acc + parseFloat(l.line_total ?? "0"), 0);
  const discount   = overrideDiscount  ?? parseFloat(qt?.discount  ?? "0");
  const taxRate    = overrideTaxRate   ?? parseFloat(qt?.tax_rate  ?? "5");
  const taxable    = Math.max(0, subtotal - discount);
  const tax_amount = parseFloat((taxable * taxRate / 100).toFixed(2));
  const total      = parseFloat((taxable + tax_amount).toFixed(2));

  await db
    .update(quotationsTable)
    .set({
      subtotal:   subtotal.toFixed(2),
      tax_amount: tax_amount.toFixed(2),
      total:      total.toFixed(2),
      updated_at: new Date(),
    })
    .where(eq(quotationsTable.id, quotationId));

  return { subtotal, discount, tax_rate: taxRate, tax_amount, total };
}

/* ─── GET /quotations/meta/advisors ───────────────────────────────────────── */
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
    console.error("GET /quotations/meta/advisors", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /quotations ─────────────────────────────────────────────────────── */
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

    const advisorAlias = alias(usersTable, "adv");

    const VALID_STATUSES = ["draft", "sent", "viewed", "approved", "rejected", "expired"];

    const conditions: any[] = [
      eq(quotationsTable.tenant_id, tenant.id),
      ...(status && VALID_STATUSES.includes(status)
        ? [eq(quotationsTable.status, status as any)] : []),
      ...(q ? [or(
        ilike(quotationsTable.ref,  `%${q}%`),
        ilike(clientsTable.name,    `%${q}%`),
        ilike(clientsTable.phone,   `%${q}%`),
        ilike(vehiclesTable.plate,  `%${q}%`),
      )] : []),
    ];

    const base = and(...conditions);

    const [rows, countRow] = await Promise.all([
      db
        .select({
          id:              quotationsTable.id,
          ref:             quotationsTable.ref,
          status:          quotationsTable.status,
          estimated_hours: quotationsTable.estimated_hours,
          subtotal:        quotationsTable.subtotal,
          discount:        quotationsTable.discount,
          tax_rate:        quotationsTable.tax_rate,
          tax_amount:      quotationsTable.tax_amount,
          total:           quotationsTable.total,
          expires_at:      quotationsTable.expires_at,
          sent_at:         quotationsTable.sent_at,
          approved_at:     quotationsTable.approved_at,
          converted_job_id:quotationsTable.converted_job_id,
          created_at:      quotationsTable.created_at,
          client_id:       quotationsTable.client_id,
          client_name:     clientsTable.name,
          client_phone:    clientsTable.phone,
          vehicle_id:      quotationsTable.vehicle_id,
          plate_number:    vehiclesTable.plate,
          vehicle_make:    vehiclesTable.make,
          vehicle_model:   vehiclesTable.model,
          advisor_id:      quotationsTable.advisor_id,
          advisor_name:    advisorAlias.name,
        })
        .from(quotationsTable)
        .leftJoin(clientsTable, eq(clientsTable.id, quotationsTable.client_id))
        .leftJoin(vehiclesTable, eq(vehiclesTable.id, quotationsTable.vehicle_id))
        .leftJoin(advisorAlias, eq(advisorAlias.id, quotationsTable.advisor_id))
        .where(base)
        .orderBy(desc(quotationsTable.created_at))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(quotationsTable)
        .leftJoin(clientsTable, eq(clientsTable.id, quotationsTable.client_id))
        .leftJoin(vehiclesTable, eq(vehiclesTable.id, quotationsTable.vehicle_id))
        .where(base),
    ]);

    // Status summary
    const summary = await db
      .select({
        status: quotationsTable.status,
        count:  sql<number>`cast(count(*) as int)`,
        total:  sql<string>`cast(sum(${quotationsTable.total}) as text)`,
      })
      .from(quotationsTable)
      .where(eq(quotationsTable.tenant_id, tenant.id))
      .groupBy(quotationsTable.status);

    res.json({ rows, total: countRow[0]?.count ?? 0, page, limit, summary });
  } catch (e: any) {
    console.error("GET /quotations", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /quotations/:id ─────────────────────────────────────────────────── */
router.get("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const advisorAlias  = alias(usersTable, "adv");
    const creatorAlias  = alias(usersTable, "creator");

    const [quotation] = await db
      .select({
        id:               quotationsTable.id,
        ref:              quotationsTable.ref,
        seq:              quotationsTable.seq,
        status:           quotationsTable.status,
        estimated_hours:  quotationsTable.estimated_hours,
        subtotal:         quotationsTable.subtotal,
        discount:         quotationsTable.discount,
        tax_rate:         quotationsTable.tax_rate,
        tax_amount:       quotationsTable.tax_amount,
        total:            quotationsTable.total,
        notes:            quotationsTable.notes,
        internal_note:    quotationsTable.internal_note,
        expires_at:       quotationsTable.expires_at,
        sent_at:          quotationsTable.sent_at,
        approved_at:      quotationsTable.approved_at,
        rejected_at:      quotationsTable.rejected_at,
        converted_job_id: quotationsTable.converted_job_id,
        booking_id:       quotationsTable.booking_id,
        created_at:       quotationsTable.created_at,
        updated_at:       quotationsTable.updated_at,
        client_id:        quotationsTable.client_id,
        client_name:      clientsTable.name,
        client_phone:     clientsTable.phone,
        client_email:     clientsTable.email,
        vehicle_id:       quotationsTable.vehicle_id,
        plate_number:     vehiclesTable.plate,
        vehicle_make:     vehiclesTable.make,
        vehicle_model:    vehiclesTable.model,
        vehicle_year:     vehiclesTable.year,
        vehicle_color:    vehiclesTable.color,
        vehicle_vin:      vehiclesTable.vin,
        advisor_id:       quotationsTable.advisor_id,
        advisor_name:     advisorAlias.name,
        advisor_email:    advisorAlias.email,
        created_by_name:  creatorAlias.name,
      })
      .from(quotationsTable)
      .leftJoin(clientsTable, eq(clientsTable.id, quotationsTable.client_id))
      .leftJoin(vehiclesTable, eq(vehiclesTable.id, quotationsTable.vehicle_id))
      .leftJoin(advisorAlias, eq(advisorAlias.id, quotationsTable.advisor_id))
      .leftJoin(creatorAlias, eq(creatorAlias.id, quotationsTable.created_by))
      .where(and(eq(quotationsTable.id, req.params.id), eq(quotationsTable.tenant_id, tenant.id)))
      .limit(1);

    if (!quotation) return res.status(404).json({ error: "Quotation not found" });

    const [lineItems, advancePayments] = await Promise.all([
      db
        .select()
        .from(quoteLineItemsTable)
        .where(eq(quoteLineItemsTable.quotation_id, quotation.id))
        .orderBy(quoteLineItemsTable.sort_order),
      db
        .select()
        .from(quoteAdvancePaymentsTable)
        .where(eq(quoteAdvancePaymentsTable.quotation_id, quotation.id))
        .orderBy(quoteAdvancePaymentsTable.paid_at),
    ]);

    // Calculate remaining balance
    const totalPaid = advancePayments.reduce((s, p) => s + parseFloat(p.amount ?? "0"), 0);
    const balance   = parseFloat(quotation.total ?? "0") - totalPaid;

    res.json({ quotation, lineItems, advancePayments, totalPaid, balance });
  } catch (e: any) {
    console.error("GET /quotations/:id", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /quotations ────────────────────────────────────────────────────── */
router.post("/", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const {
      client_id, vehicle_id, advisor_id, booking_id,
      estimated_hours, notes, internal_note, tax_rate = "5.00",
      expires_at,
    } = req.body;

    const [{ seq }] = await db
      .select({ seq: sql<number>`cast(coalesce(max(seq), 0) + 1 as int)` })
      .from(quotationsTable)
      .where(eq(quotationsTable.tenant_id, tenant.id));

    const year = new Date().getFullYear();
    const ref  = `QT-${year}-${String(seq).padStart(4, "0")}`;

    const [quotation] = await db
      .insert(quotationsTable)
      .values({
        tenant_id:       tenant.id,
        seq,
        ref,
        client_id:       client_id      || null,
        vehicle_id:      vehicle_id     || null,
        advisor_id:      advisor_id     || null,
        booking_id:      booking_id     || null,
        estimated_hours: estimated_hours ? String(estimated_hours) : null,
        notes:           notes          || null,
        internal_note:   internal_note  || null,
        tax_rate:        String(tax_rate),
        expires_at:      expires_at ? new Date(expires_at) : null,
        status: "draft",
      })
      .returning();

    res.status(201).json({ quotation });
  } catch (e: any) {
    console.error("POST /quotations", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── PUT /quotations/:id ─────────────────────────────────────────────────── */
router.put("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const {
      client_id, vehicle_id, advisor_id, booking_id,
      estimated_hours, notes, internal_note, tax_rate, discount, expires_at,
    } = req.body;

    const updates: Record<string, any> = { updated_at: new Date() };
    if (client_id        !== undefined) updates.client_id        = client_id || null;
    if (vehicle_id       !== undefined) updates.vehicle_id       = vehicle_id || null;
    if (advisor_id       !== undefined) updates.advisor_id       = advisor_id || null;
    if (booking_id       !== undefined) updates.booking_id       = booking_id || null;
    if (estimated_hours  !== undefined) updates.estimated_hours  = estimated_hours ? String(estimated_hours) : null;
    if (notes            !== undefined) updates.notes            = notes || null;
    if (internal_note    !== undefined) updates.internal_note    = internal_note || null;
    if (expires_at       !== undefined) updates.expires_at       = expires_at ? new Date(expires_at) : null;
    if (discount         !== undefined) updates.discount         = String(discount);
    if (tax_rate         !== undefined) updates.tax_rate         = String(tax_rate);

    await db
      .update(quotationsTable)
      .set(updates)
      .where(and(eq(quotationsTable.id, req.params.id), eq(quotationsTable.tenant_id, tenant.id)));

    // Recalc totals if discount or tax_rate changed
    if (discount !== undefined || tax_rate !== undefined) {
      await recalcTotals(
        req.params.id,
        discount  !== undefined ? Number(discount)  : undefined,
        tax_rate  !== undefined ? Number(tax_rate)  : undefined,
      );
    }

    const [quotation] = await db
      .select().from(quotationsTable)
      .where(eq(quotationsTable.id, req.params.id))
      .limit(1);

    res.json({ quotation });
  } catch (e: any) {
    console.error("PUT /quotations/:id", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /quotations/:id/lines ──────────────────────────────────────────── */
router.post("/:id/lines", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [qt] = await db.select({ id: quotationsTable.id }).from(quotationsTable)
      .where(and(eq(quotationsTable.id, req.params.id), eq(quotationsTable.tenant_id, tenant.id))).limit(1);
    if (!qt) return res.status(404).json({ error: "Quotation not found" });

    const { description, type = "labour", qty = "1.00", unit_price = "0.00", discount = "0.00", part_number, notes, sort_order } = req.body;
    if (!description) return res.status(400).json({ error: "description is required" });

    const q     = parseFloat(qty);
    const up    = parseFloat(unit_price);
    const disc  = parseFloat(discount);
    const lt    = parseFloat(((q * up) - disc).toFixed(2));

    // Max sort order
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`cast(coalesce(max(sort_order), 0) as int)` })
      .from(quoteLineItemsTable)
      .where(eq(quoteLineItemsTable.quotation_id, req.params.id));

    const [line] = await db
      .insert(quoteLineItemsTable)
      .values({
        quotation_id: req.params.id,
        description,
        type,
        qty:        qty.toString(),
        unit_price: unit_price.toString(),
        discount:   discount.toString(),
        line_total: lt.toString(),
        part_number: part_number || null,
        notes:       notes || null,
        sort_order:  sort_order ?? (maxOrder + 1),
      })
      .returning();

    const totals = await recalcTotals(req.params.id);
    res.status(201).json({ line, totals });
  } catch (e: any) {
    console.error("POST /quotations/:id/lines", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── PUT /quotations/:id/lines/:lid ─────────────────────────────────────── */
router.put("/:id/lines/:lid", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { description, type, qty, unit_price, discount, part_number, notes } = req.body;
    const updates: Record<string, any> = {};
    if (description  !== undefined) updates.description  = description;
    if (type         !== undefined) updates.type         = type;
    if (part_number  !== undefined) updates.part_number  = part_number || null;
    if (notes        !== undefined) updates.notes        = notes || null;

    // Fetch existing to recalc line_total
    const [existing] = await db
      .select().from(quoteLineItemsTable)
      .where(eq(quoteLineItemsTable.id, req.params.lid))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Line not found" });

    const q  = qty        !== undefined ? parseFloat(qty)        : parseFloat(existing.qty);
    const up = unit_price !== undefined ? parseFloat(unit_price) : parseFloat(existing.unit_price);
    const d  = discount   !== undefined ? parseFloat(discount)   : parseFloat(existing.discount);
    updates.qty        = q.toString();
    updates.unit_price = up.toString();
    updates.discount   = d.toString();
    updates.line_total = ((q * up) - d).toFixed(2);

    const [line] = await db
      .update(quoteLineItemsTable)
      .set(updates)
      .where(eq(quoteLineItemsTable.id, req.params.lid))
      .returning();

    const totals = await recalcTotals(req.params.id);
    res.json({ line, totals });
  } catch (e: any) {
    console.error("PUT /quotations/:id/lines/:lid", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── DELETE /quotations/:id/lines/:lid ──────────────────────────────────── */
router.delete("/:id/lines/:lid", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await db.delete(quoteLineItemsTable).where(eq(quoteLineItemsTable.id, req.params.lid));
    const totals = await recalcTotals(req.params.id);
    res.json({ ok: true, totals });
  } catch (e: any) {
    console.error("DELETE /quotations/:id/lines/:lid", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /quotations/:id/advance ───────────────────────────────────────── */
router.post("/:id/advance", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { amount, method = "cash", reference, note, paid_at } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: "amount must be > 0" });

    const [payment] = await db
      .insert(quoteAdvancePaymentsTable)
      .values({
        quotation_id: req.params.id,
        tenant_id:    tenant.id,
        amount:       String(parseFloat(amount).toFixed(2)),
        method,
        reference:    reference || null,
        note:         note || null,
        paid_at:      paid_at ? new Date(paid_at) : new Date(),
      })
      .returning();

    res.status(201).json({ payment });
  } catch (e: any) {
    console.error("POST /quotations/:id/advance", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── DELETE /quotations/:id/advance/:aid ────────────────────────────────── */
router.delete("/:id/advance/:aid", async (req, res) => {
  try {
    await db.delete(quoteAdvancePaymentsTable).where(eq(quoteAdvancePaymentsTable.id, req.params.aid));
    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /quotations/:id/advance/:aid", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /quotations/:id/send ───────────────────────────────────────────── */
router.post("/:id/send", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [quotation] = await db
      .update(quotationsTable)
      .set({ status: "sent", sent_at: new Date(), updated_at: new Date() })
      .where(and(eq(quotationsTable.id, req.params.id), eq(quotationsTable.tenant_id, tenant.id)))
      .returning();

    if (!quotation) return res.status(404).json({ error: "Quotation not found" });
    // TODO: dispatch WhatsApp/email notification
    res.json({ quotation, sent: true });
  } catch (e: any) {
    console.error("POST /quotations/:id/send", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /quotations/:id/approve ───────────────────────────────────────── */
router.post("/:id/approve", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [quotation] = await db
      .update(quotationsTable)
      .set({ status: "approved", approved_at: new Date(), updated_at: new Date() })
      .where(and(eq(quotationsTable.id, req.params.id), eq(quotationsTable.tenant_id, tenant.id)))
      .returning();

    if (!quotation) return res.status(404).json({ error: "Quotation not found" });
    res.json({ quotation });
  } catch (e: any) {
    console.error("POST /quotations/:id/approve", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /quotations/:id/reject ────────────────────────────────────────── */
router.post("/:id/reject", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { note } = req.body;
    const updates: Record<string, any> = { status: "rejected", rejected_at: new Date(), updated_at: new Date() };
    if (note) updates.notes = note;

    const [quotation] = await db
      .update(quotationsTable)
      .set(updates)
      .where(and(eq(quotationsTable.id, req.params.id), eq(quotationsTable.tenant_id, tenant.id)))
      .returning();

    if (!quotation) return res.status(404).json({ error: "Quotation not found" });
    res.json({ quotation });
  } catch (e: any) {
    console.error("POST /quotations/:id/reject", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /quotations/:id/convert ───────────────────────────────────────── */
router.post("/:id/convert", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [qt] = await db
      .select().from(quotationsTable)
      .where(and(eq(quotationsTable.id, req.params.id), eq(quotationsTable.tenant_id, tenant.id)))
      .limit(1);
    if (!qt) return res.status(404).json({ error: "Quotation not found" });
    if (qt.status !== "approved") return res.status(400).json({ error: "Only approved quotations can be converted to jobs" });
    if (qt.converted_job_id) return res.status(400).json({ error: "Already converted", job_id: qt.converted_job_id });

    // Fetch line items to copy as job parts
    const lines = await db
      .select().from(quoteLineItemsTable)
      .where(eq(quoteLineItemsTable.quotation_id, qt.id));

    // Generate job ref
    const [{ seq }] = await db
      .select({ seq: sql<number>`cast(coalesce(max(seq), 0) + 1 as int)` })
      .from(jobsTable)
      .where(eq(jobsTable.tenant_id, tenant.id));

    const year   = new Date().getFullYear();
    const jobRef = `JC-${year}-${String(seq).padStart(4, "0")}`;

    const { priority = "normal", bay, customer_concern, technician_id } = req.body;

    const [job] = await db
      .insert(jobsTable)
      .values({
        tenant_id:        tenant.id,
        seq,
        ref:              jobRef,
        quotation_id:     qt.id,
        booking_id:       qt.booking_id || null,
        client_id:        qt.client_id  || null,
        vehicle_id:       qt.vehicle_id || null,
        advisor_id:       qt.advisor_id || null,
        technician_id:    technician_id || null,
        status:           "waiting",
        priority,
        bay:              bay || null,
        customer_concern: customer_concern || qt.notes || null,
        internal_note:    qt.internal_note || null,
      })
      .returning();

    // Mark quotation as converted
    await db
      .update(quotationsTable)
      .set({ converted_job_id: job.id, updated_at: new Date() })
      .where(eq(quotationsTable.id, qt.id));

    res.status(201).json({ job, quotation_ref: qt.ref });
  } catch (e: any) {
    console.error("POST /quotations/:id/convert", e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── DELETE /quotations/:id ─────────────────────────────────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await db.delete(quotationsTable)
      .where(and(eq(quotationsTable.id, req.params.id), eq(quotationsTable.tenant_id, tenant.id)));
    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /quotations/:id", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
