import { Router } from "express";
import { sql, eq, and, desc, ilike, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db, tenantsTable, clientsTable, vehiclesTable, usersTable,
  jobsTable, jobPartsTable,
  invoicesTable, invoiceLineItemsTable, paymentsTable,
  quotationsTable, quoteLineItemsTable,
} from "@workspace/db";
import { sendEmail, invoiceEmailHtml } from "../services/email.js";

const router = Router();

async function resolveTenant(slug: string) {
  const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
  return t ?? null;
}

/* ─── recalculate invoice totals ─────────────────────────────────────────── */
async function recalcInvoice(invoiceId: string) {
  const lines = await db
    .select({ line_total: invoiceLineItemsTable.line_total })
    .from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoice_id, invoiceId));

  const subtotal = lines.reduce((s, l) => s + parseFloat(l.line_total), 0);

  const [inv] = await db
    .select({ discount: invoicesTable.discount, tax_rate: invoicesTable.tax_rate })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId))
    .limit(1);

  if (!inv) return;

  const discountAmount = parseFloat(inv.discount ?? "0");
  const taxRate        = parseFloat(inv.tax_rate ?? "5");
  const taxable        = Math.max(0, subtotal - discountAmount);
  const tax_amount     = +(taxable * taxRate / 100).toFixed(2);
  const total          = +(taxable + tax_amount).toFixed(2);

  await db.update(invoicesTable)
    .set({
      subtotal:   subtotal.toFixed(2),
      tax_amount: tax_amount.toFixed(2),
      total:      total.toFixed(2),
      updated_at: new Date(),
    })
    .where(eq(invoicesTable.id, invoiceId));
}

/* ─── recalculate paid amount ────────────────────────────────────────────── */
async function recalcPaid(invoiceId: string) {
  const payments = await db
    .select({ amount: paymentsTable.amount })
    .from(paymentsTable)
    .where(eq(paymentsTable.invoice_id, invoiceId));

  const paid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);

  const [inv] = await db
    .select({ total: invoicesTable.total })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId))
    .limit(1);
  if (!inv) return;

  const total = parseFloat(inv.total ?? "0");
  const status = paid <= 0
    ? undefined
    : paid >= total
    ? "paid"
    : "partial";

  await db.update(invoicesTable)
    .set({
      paid_amount: paid.toFixed(2),
      ...(status ? { status, paid_at: status === "paid" ? new Date() : undefined } : {}),
      updated_at: new Date(),
    })
    .where(eq(invoicesTable.id, invoiceId));
}

/* ─── sync invoice line items from quotation ─────────────────────────────── */
export async function syncInvoiceFromQuotation(invoiceId: string, quotationId: string) {
  const quoteLines = await db
    .select()
    .from(quoteLineItemsTable)
    .where(eq(quoteLineItemsTable.quotation_id, quotationId))
    .orderBy(quoteLineItemsTable.sort_order);

  await db.delete(invoiceLineItemsTable).where(eq(invoiceLineItemsTable.invoice_id, invoiceId));

  let lineOrder = 0;
  for (const l of quoteLines) {
    await db.insert(invoiceLineItemsTable).values({
      invoice_id:  invoiceId,
      sort_order:  lineOrder++,
      description: l.description,
      type:        l.type ?? "labour",
      part_number: l.part_number ?? null,
      catalog_item_id: (l as any).catalog_item_id ?? null,
      notes:       (l as any).notes ?? null,
      qty:         l.qty,
      unit_price:  l.unit_price,
      discount:    l.discount ?? "0.00",
      line_total:  l.line_total,
    });
  }

  await recalcInvoice(invoiceId);
}

export async function syncDraftInvoicesForQuotation(quotationId: string) {
  const draftInvoices = await db
    .select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.quotation_id, quotationId), eq(invoicesTable.status, "draft")));

  for (const inv of draftInvoices) {
    await syncInvoiceFromQuotation(inv.id, quotationId);
  }
}

/* ─── next sequence ──────────────────────────────────────────────────────── */
async function nextSeq(tenantId: string) {
  const [r] = await db
    .select({ max: sql<number>`coalesce(max(${invoicesTable.seq}), 0)` })
    .from(invoicesTable)
    .where(eq(invoicesTable.tenant_id, tenantId));
  return (r?.max ?? 0) + 1;
}

function makeRef(seq: number) {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

/* ──────────────────────────────────────────────────────────────────────────
   GET /invoices/stats
─────────────────────────────────────────────────────────────────────────── */
router.get("/stats", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const rows = await db
      .select({ status: invoicesTable.status, total: invoicesTable.total, paid_amount: invoicesTable.paid_amount })
      .from(invoicesTable)
      .where(and(eq(invoicesTable.tenant_id, tenant.id)));

    const stats = { draft: 0, sent: 0, partial: 0, paid: 0, overdue: 0, void: 0,
      total_outstanding: 0, total_paid: 0 };
    for (const r of rows) {
      const key = r.status as keyof typeof stats;
      if (typeof stats[key] === "number") (stats[key] as number)++;
      const amt  = parseFloat(r.total ?? "0");
      const paid = parseFloat(r.paid_amount ?? "0");
      if (r.status === "paid") stats.total_paid += amt;
      else if (r.status !== "void") stats.total_outstanding += (amt - paid);
    }

    return res.json({ stats });
  } catch (err) {
    console.error("GET /invoices/stats", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   GET /invoices
─────────────────────────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const statusFilter = req.query.status as string | undefined;
    const search       = req.query.search as string | undefined;
    const limit        = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset       = parseInt(req.query.offset as string) || 0;

    const client  = clientsTable;
    const cashier = usersTable;

    const conditions = [eq(invoicesTable.tenant_id, tenant.id)];
    if (statusFilter && statusFilter !== "all") conditions.push(eq(invoicesTable.status, statusFilter as any));
    if (search) {
      conditions.push(or(
        ilike(invoicesTable.ref, `%${search}%`),
        ilike(client.name, `%${search}%`),
        ilike(client.phone, `%${search}%`),
      )!);
    }

    const rows = await db
      .select({
        id:           invoicesTable.id,
        ref:          invoicesTable.ref,
        seq:          invoicesTable.seq,
        status:       invoicesTable.status,
        subtotal:     invoicesTable.subtotal,
        discount:     invoicesTable.discount,
        tax_amount:   invoicesTable.tax_amount,
        total:        invoicesTable.total,
        paid_amount:  invoicesTable.paid_amount,
        tax_rate:     invoicesTable.tax_rate,
        due_at:       invoicesTable.due_at,
        sent_at:      invoicesTable.sent_at,
        paid_at:      invoicesTable.paid_at,
        notes:        invoicesTable.notes,
        created_at:   invoicesTable.created_at,
        client_id:    invoicesTable.client_id,
        client_name:  client.name,
        client_phone: client.phone,
        job_id:       invoicesTable.job_id,
        cashier_name: cashier.name,
      })
      .from(invoicesTable)
      .leftJoin(client,  eq(invoicesTable.client_id,  client.id))
      .leftJoin(cashier, eq(invoicesTable.cashier_id, cashier.id))
      .where(and(...conditions))
      .orderBy(desc(invoicesTable.created_at))
      .limit(limit)
      .offset(offset);

    return res.json({ data: rows });
  } catch (err) {
    console.error("GET /invoices", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /invoices/from-job/:jobId  —  create invoice from completed job
─────────────────────────────────────────────────────────────────────────── */
router.post("/from-job/:jobId", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [job] = await db
      .select()
      .from(jobsTable)
      .where(and(eq(jobsTable.id, req.params.jobId), eq(jobsTable.tenant_id, tenant.id)))
      .limit(1);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const seq = await nextSeq(tenant.id);
    const ref = makeRef(seq);
    const taxRate = parseFloat((req.body as any).tax_rate ?? "5");

    const [inv] = await db.insert(invoicesTable).values({
      tenant_id:    tenant.id,
      seq,
      ref,
      job_id:       job.id,
      quotation_id: job.quotation_id ?? undefined,
      client_id:    job.client_id ?? undefined,
      vehicle_id:   job.vehicle_id ?? undefined,
      status:       "draft",
      tax_rate:     taxRate.toFixed(2),
      notes:        (req.body as any).notes ?? null,
      due_at:       (req.body as any).due_at ? new Date((req.body as any).due_at) : null,
    }).returning();

    // Prefer quotation line items if a quotation is linked; otherwise fall back to job parts
    let lineOrder = 0;
    if (job.quotation_id) {
      const quoteLines = await db
        .select()
        .from(quoteLineItemsTable)
        .where(eq(quoteLineItemsTable.quotation_id, job.quotation_id))
        .orderBy(quoteLineItemsTable.sort_order);

      for (const l of quoteLines) {
        await db.insert(invoiceLineItemsTable).values({
          invoice_id:  inv.id,
          sort_order:  lineOrder++,
          description: l.description,
          type:        l.type ?? "labour",
          part_number: l.part_number ?? null,
          qty:         l.qty,
          unit_price:  l.unit_price,
          discount:    l.discount ?? "0.00",
          line_total:  l.line_total,
        });
      }
    } else {
      const jobParts = await db
        .select()
        .from(jobPartsTable)
        .where(and(eq(jobPartsTable.job_id, job.id), eq(jobPartsTable.tenant_id, tenant.id)));

      for (const p of jobParts) {
        await db.insert(invoiceLineItemsTable).values({
          invoice_id:  inv.id,
          sort_order:  lineOrder++,
          description: p.description,
          type:        "part",
          part_number: p.part_number ?? null,
          qty:         p.qty,
          unit_price:  p.unit_price,
          line_total:  parseFloat(p.line_total).toFixed(2),
        });
      }
    }

    await recalcInvoice(inv.id);
    const [fresh] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv.id)).limit(1);

    return res.status(201).json({ invoice: fresh });
  } catch (err) {
    console.error("POST /invoices/from-job/:jobId", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   GET /invoices/:id
─────────────────────────────────────────────────────────────────────────── */
router.get("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const invCashier = alias(usersTable, "inv_cashier");
    const pmtCashier = alias(usersTable, "pmt_cashier");

    const [inv] = await db
      .select({
        id:           invoicesTable.id,
        ref:          invoicesTable.ref,
        seq:          invoicesTable.seq,
        status:       invoicesTable.status,
        subtotal:     invoicesTable.subtotal,
        discount:     invoicesTable.discount,
        tax_rate:     invoicesTable.tax_rate,
        tax_amount:   invoicesTable.tax_amount,
        total:        invoicesTable.total,
        paid_amount:  invoicesTable.paid_amount,
        notes:        invoicesTable.notes,
        due_at:       invoicesTable.due_at,
        sent_at:      invoicesTable.sent_at,
        paid_at:      invoicesTable.paid_at,
        voided_at:    invoicesTable.voided_at,
        created_at:   invoicesTable.created_at,
        updated_at:   invoicesTable.updated_at,
        client_id:    invoicesTable.client_id,
        client_name:  clientsTable.name,
        client_phone: clientsTable.phone,
        client_email: clientsTable.email,
        vehicle_id:   invoicesTable.vehicle_id,
        plate_number: vehiclesTable.plate,
        make:         vehiclesTable.make,
        model:        vehiclesTable.model,
        year:         vehiclesTable.year,
        job_id:       invoicesTable.job_id,
        quotation_id: invoicesTable.quotation_id,
        cashier_id:   invoicesTable.cashier_id,
        cashier_name: invCashier.name,
      })
      .from(invoicesTable)
      .leftJoin(clientsTable, eq(invoicesTable.client_id,  clientsTable.id))
      .leftJoin(vehiclesTable, eq(invoicesTable.vehicle_id, vehiclesTable.id))
      .leftJoin(invCashier,   eq(invoicesTable.cashier_id, invCashier.id))
      .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.tenant_id, tenant.id)))
      .limit(1);

    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    const lineItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoice_id, inv.id))
      .orderBy(invoiceLineItemsTable.sort_order);

    const payments = await db
      .select({
        id:           paymentsTable.id,
        method:       paymentsTable.method,
        amount:       paymentsTable.amount,
        reference:    paymentsTable.reference,
        notes:        paymentsTable.notes,
        paid_at:      paymentsTable.paid_at,
        created_at:   paymentsTable.created_at,
        cashier_name: pmtCashier.name,
      })
      .from(paymentsTable)
      .leftJoin(pmtCashier, eq(paymentsTable.created_by, pmtCashier.id))
      .where(eq(paymentsTable.invoice_id, inv.id))
      .orderBy(desc(paymentsTable.paid_at));

    return res.json({ invoice: inv, lineItems, payments });
  } catch (err) {
    console.error("GET /invoices/:id", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /invoices   — create blank invoice
─────────────────────────────────────────────────────────────────────────── */
router.post("/", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { client_id, vehicle_id, job_id, quotation_id, tax_rate, due_at, notes } = req.body as Record<string, string>;

    const seq = await nextSeq(tenant.id);
    const ref = makeRef(seq);

    const [inv] = await db.insert(invoicesTable).values({
      tenant_id:    tenant.id,
      seq,
      ref,
      client_id:    client_id    ?? null,
      vehicle_id:   vehicle_id   ?? null,
      job_id:       job_id       ?? null,
      quotation_id: quotation_id ?? null,
      tax_rate:     tax_rate     ?? "5.00",
      due_at:       due_at ? new Date(due_at) : null,
      notes:        notes ?? null,
      status:       "draft",
    }).returning();

    return res.status(201).json({ invoice: inv });
  } catch (err) {
    console.error("POST /invoices", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   PUT /invoices/:id
─────────────────────────────────────────────────────────────────────────── */
router.put("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { notes, due_at, discount, tax_rate, client_id, vehicle_id } = req.body as Record<string, string>;

    await db.update(invoicesTable)
      .set({
        notes:      notes      ?? undefined,
        due_at:     due_at     ? new Date(due_at) : undefined,
        discount:   discount   ?? undefined,
        tax_rate:   tax_rate   ?? undefined,
        client_id:  client_id  ?? undefined,
        vehicle_id: vehicle_id ?? undefined,
        updated_at: new Date(),
      })
      .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.tenant_id, tenant.id)));

    await recalcInvoice(req.params.id);
    const [fresh] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, req.params.id)).limit(1);
    return res.json({ invoice: fresh });
  } catch (err) {
    console.error("PUT /invoices/:id", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /invoices/:id/sync-from-quotation
─────────────────────────────────────────────────────────────────────────── */
router.post("/:id/sync-from-quotation", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [inv] = await db.select().from(invoicesTable)
      .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.tenant_id, tenant.id)))
      .limit(1);
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    if (!inv.quotation_id) return res.status(400).json({ error: "Invoice has no linked quotation" });
    if (inv.status !== "draft") return res.status(400).json({ error: "Can only sync draft invoices" });

    await syncInvoiceFromQuotation(inv.id, inv.quotation_id);
    const [fresh] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv.id)).limit(1);

    const lineItems = await db.select().from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoice_id, inv.id))
      .orderBy(invoiceLineItemsTable.sort_order);

    return res.json({ invoice: { ...fresh, lineItems } });
  } catch (err) {
    console.error("POST /invoices/:id/sync-from-quotation", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /invoices/:id/send
─────────────────────────────────────────────────────────────────────────── */
router.post("/:id/send", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [inv] = await db.update(invoicesTable)
      .set({ status: "sent", sent_at: new Date(), updated_at: new Date() })
      .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.tenant_id, tenant.id)))
      .returning();

    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    const [client] = inv.client_id
      ? await db.select({ name: clientsTable.name, email: clientsTable.email })
          .from(clientsTable).where(eq(clientsTable.id, inv.client_id)).limit(1)
      : [null];

    let emailResult = null;
    if (client?.email) {
      const html = invoiceEmailHtml({
        shopName: tenant.name,
        invoiceRef: inv.ref,
        clientName: client.name ?? "Customer",
        total: inv.total ?? "0",
        currency: tenant.currency ?? "AED",
        dueDate: inv.due_at?.toISOString() ?? null,
      });
      emailResult = await sendEmail({
        to: client.email,
        subject: `Invoice ${inv.ref} from ${tenant.name}`,
        html,
        tenantId: tenant.id,
        shopName: tenant.name,
      });
    }

    return res.json({ invoice: inv, emailSent: emailResult?.success ?? false });
  } catch (err) {
    console.error("POST /invoices/:id/send", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /invoices/:id/void
─────────────────────────────────────────────────────────────────────────── */
router.post("/:id/void", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [inv] = await db.update(invoicesTable)
      .set({ status: "void", voided_at: new Date(), updated_at: new Date() })
      .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.tenant_id, tenant.id)))
      .returning();

    return res.json({ invoice: inv });
  } catch (err) {
    console.error("POST /invoices/:id/void", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /invoices/:id/lines
─────────────────────────────────────────────────────────────────────────── */
router.post("/:id/lines", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [inv] = await db.select({ id: invoicesTable.id }).from(invoicesTable)
      .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.tenant_id, tenant.id))).limit(1);
    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    const { description, type, part_number, qty, unit_price, discount, notes } = req.body as Record<string, string>;
    if (!description) return res.status(400).json({ error: "description is required" });

    const qtyNum   = parseFloat(qty  ?? "1");
    const priceNum = parseFloat(unit_price ?? "0");
    const discNum  = parseFloat(discount ?? "0");
    const total    = Math.max(0, qtyNum * priceNum - discNum).toFixed(2);

    const [maxRow] = await db
      .select({ m: sql<number>`coalesce(max(${invoiceLineItemsTable.sort_order}), -1)` })
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoice_id, req.params.id));
    const maxSort = maxRow?.m ?? -1;

    const [line] = await db.insert(invoiceLineItemsTable).values({
      invoice_id:  req.params.id,
      sort_order:  maxSort + 1,
      description,
      type:        type ?? "labour",
      part_number: part_number ?? null,
      qty:         qtyNum.toFixed(2),
      unit_price:  priceNum.toFixed(2),
      discount:    discNum.toFixed(2),
      line_total:  total,
      notes:       notes ?? null,
    }).returning();

    await recalcInvoice(req.params.id);

    return res.status(201).json({ line });
  } catch (err) {
    console.error("POST /invoices/:id/lines", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   DELETE /invoices/:id/lines/:lineId
─────────────────────────────────────────────────────────────────────────── */
router.delete("/:id/lines/:lineId", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await db.delete(invoiceLineItemsTable)
      .where(and(
        eq(invoiceLineItemsTable.id, req.params.lineId),
        eq(invoiceLineItemsTable.invoice_id, req.params.id),
      ));

    await recalcInvoice(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /invoices/:id/lines/:lineId", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   POST /invoices/:id/payments   — record a payment
─────────────────────────────────────────────────────────────────────────── */
router.post("/:id/payments", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [inv] = await db.select({ id: invoicesTable.id, total: invoicesTable.total })
      .from(invoicesTable)
      .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.tenant_id, tenant.id)))
      .limit(1);
    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    const { method, amount, reference, notes, paid_at } = req.body as Record<string, string>;
    if (!method || !amount) return res.status(400).json({ error: "method and amount are required" });

    const [payment] = await db.insert(paymentsTable).values({
      tenant_id:  tenant.id,
      invoice_id: req.params.id,
      method:     method as any,
      amount:     parseFloat(amount).toFixed(2),
      reference:  reference ?? null,
      notes:      notes ?? null,
      paid_at:    paid_at ? new Date(paid_at) : new Date(),
    }).returning();

    await recalcPaid(req.params.id);
    const [fresh] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, req.params.id)).limit(1);

    return res.status(201).json({ payment, invoice: fresh });
  } catch (err) {
    console.error("POST /invoices/:id/payments", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   DELETE /invoices/:id/payments/:paymentId
─────────────────────────────────────────────────────────────────────────── */
router.delete("/:id/payments/:paymentId", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await db.delete(paymentsTable)
      .where(and(
        eq(paymentsTable.id, req.params.paymentId),
        eq(paymentsTable.invoice_id, req.params.id),
        eq(paymentsTable.tenant_id, tenant.id),
      ));

    await recalcPaid(req.params.id);
    const [fresh] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, req.params.id)).limit(1);
    return res.json({ ok: true, invoice: fresh });
  } catch (err) {
    console.error("DELETE /invoices/:id/payments/:paymentId", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   DELETE /invoices/:id   — hard delete if draft, else void
─────────────────────────────────────────────────────────────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [inv] = await db.select({ id: invoicesTable.id, status: invoicesTable.status })
      .from(invoicesTable)
      .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.tenant_id, tenant.id)))
      .limit(1);
    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    if (inv.status === "draft") {
      await db.delete(invoiceLineItemsTable).where(eq(invoiceLineItemsTable.invoice_id, req.params.id));
      await db.delete(paymentsTable).where(and(eq(paymentsTable.invoice_id, req.params.id), eq(paymentsTable.tenant_id, tenant.id)));
      await db.delete(invoicesTable).where(eq(invoicesTable.id, req.params.id));
    } else {
      await db.update(invoicesTable).set({ status: "void", voided_at: new Date(), updated_at: new Date() })
        .where(eq(invoicesTable.id, req.params.id));
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /invoices/:id", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
