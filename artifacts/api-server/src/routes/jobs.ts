import { Router } from "express";
import { sql, eq, and, or, asc, desc, ilike, isNull, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db, tenantsTable, clientsTable, vehiclesTable, usersTable,
  quotationsTable, quoteLineItemsTable, bookingsTable,
  jobsTable, jobStatusHistoryTable, jobAssignmentsTable,
  jobTimeLogsTable, jobPartsTable, jobPhotosTable, jobNotesTable,
  catalogItemsTable, quoteAdvancePaymentsTable,
} from "@workspace/db";

const router = Router();

/* ─── helpers ─────────────────────────────────────────────────────────────── */

async function resolveTenant(slug: string) {
  const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
  return t ?? null;
}

const VALID_STATUSES = ["new", "waiting", "in_progress", "waiting_parts", "on_hold", "qc", "completed", "delivered", "cancelled"] as const;
type JobStatus = typeof VALID_STATUSES[number];

/* ─── GET /jobs ───────────────────────────────────────────────────────────── */

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
    const techId = req.query.technician_id as string | undefined;
    const typeFilter = req.query.type as string | undefined;
    const bookingIdFilter = req.query.booking_id as string | undefined;

    const advisorAlias = alias(usersTable, "adv");
    const techAlias    = alias(usersTable, "tech");
    const qcAlias      = alias(usersTable, "qcu");

    const conditions = [
      eq(jobsTable.tenant_id, tenant.id),
    ];

    if (status && VALID_STATUSES.includes(status as JobStatus)) {
      conditions.push(eq(jobsTable.status, status as JobStatus));
    }
    if (techId) {
      conditions.push(eq(jobsTable.technician_id, techId));
    }
    if (typeFilter) {
      if (typeFilter === "service_job") {
        conditions.push(or(eq(jobsTable.type, "service_job"), isNull(jobsTable.type))!);
      } else {
        conditions.push(eq(jobsTable.type, typeFilter));
      }
    }
    if (bookingIdFilter) {
      conditions.push(eq(jobsTable.booking_id, bookingIdFilter));
    }
    if (q) {
      conditions.push(
        or(
          ilike(jobsTable.ref, `%${q}%`),
          ilike(jobsTable.customer_concern, `%${q}%`),
          ilike(clientsTable.name, `%${q}%`),
          ilike(vehiclesTable.plate, `%${q}%`),
        )!,
      );
    }

    const where = and(...conditions);

    const [jobs, [{ total }]] = await Promise.all([
      db
        .select({
          id:             jobsTable.id,
          ref:            jobsTable.ref,
          seq:            jobsTable.seq,
          type:           jobsTable.type,
          status:         jobsTable.status,
          work_status:    jobsTable.work_status,
          priority:       jobsTable.priority,
          bay:            jobsTable.bay,
          started_at:     jobsTable.started_at,
          completed_at:   jobsTable.completed_at,
          customer_concern: jobsTable.customer_concern,
          scheduled_date: jobsTable.scheduled_date,
          mileage_in:     jobsTable.mileage_in,
          created_at:     jobsTable.created_at,
          updated_at:     jobsTable.updated_at,
          client_id:      jobsTable.client_id,
          client_name:    clientsTable.name,
          client_phone:   clientsTable.phone,
          vehicle_id:     jobsTable.vehicle_id,
          plate_number:   vehiclesTable.plate,
          make:           vehiclesTable.make,
          model:          vehiclesTable.model,
          year:           vehiclesTable.year,
          color:          vehiclesTable.color,
          advisor_id:     jobsTable.advisor_id,
          advisor_name:   advisorAlias.name,
          technician_id:  jobsTable.technician_id,
          technician_name: techAlias.name,
          quotation_id:   jobsTable.quotation_id,
          booking_id:     jobsTable.booking_id,
        })
        .from(jobsTable)
        .leftJoin(clientsTable, eq(jobsTable.client_id, clientsTable.id))
        .leftJoin(vehiclesTable, eq(jobsTable.vehicle_id, vehiclesTable.id))
        .leftJoin(advisorAlias, eq(jobsTable.advisor_id, advisorAlias.id))
        .leftJoin(techAlias, eq(jobsTable.technician_id, techAlias.id))
        .leftJoin(qcAlias, eq(jobsTable.qc_by, qcAlias.id))
        .where(where)
        .orderBy(desc(jobsTable.created_at))
        .limit(limit)
        .offset(offset),

      db
        .select({ total: sql<number>`count(*)::int` })
        .from(jobsTable)
        .leftJoin(clientsTable, eq(jobsTable.client_id, clientsTable.id))
        .leftJoin(vehiclesTable, eq(jobsTable.vehicle_id, vehiclesTable.id))
        .where(where),
    ]);

    return res.json({ data: jobs, total, page, limit });
  } catch (err) {
    console.error("GET /jobs", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── GET /jobs/kanban ──────────────────────────────────────────────────────
   Returns { waiting: [...], in_progress: [...], waiting_parts: [...],
             on_hold: [...], qc: [...], completed: [...] }
─────────────────────────────────────────────────────────────────────────── */

router.get("/kanban", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const typeFilter = req.query.type as string | undefined;
    const advisorAlias = alias(usersTable, "adv");
    const techAlias    = alias(usersTable, "tech");

    const jobs = await db
      .select({
        id:           jobsTable.id,
        ref:          jobsTable.ref,
        type:         jobsTable.type,
        status:       jobsTable.status,
        work_status:  jobsTable.work_status,
        priority:     jobsTable.priority,
        bay:          jobsTable.bay,
        started_at:   jobsTable.started_at,
        created_at:   jobsTable.created_at,
        customer_concern: jobsTable.customer_concern,
        client_name:  clientsTable.name,
        plate_number: vehiclesTable.plate,
        make:         vehiclesTable.make,
        model:        vehiclesTable.model,
        color:        vehiclesTable.color,
        advisor_name: advisorAlias.name,
        technician_id: jobsTable.technician_id,
        technician_name: techAlias.name,
      })
      .from(jobsTable)
      .leftJoin(clientsTable, eq(jobsTable.client_id, clientsTable.id))
      .leftJoin(vehiclesTable, eq(jobsTable.vehicle_id, vehiclesTable.id))
      .leftJoin(advisorAlias, eq(jobsTable.advisor_id, advisorAlias.id))
      .leftJoin(techAlias, eq(jobsTable.technician_id, techAlias.id))
      .where(and(
        eq(jobsTable.tenant_id, tenant.id),
        ...(typeFilter
          ? typeFilter === "service_job"
            ? [or(eq(jobsTable.type, "service_job"), isNull(jobsTable.type))!]
            : [eq(jobsTable.type, typeFilter)]
          : []),
      ))
      .orderBy(jobsTable.seq);

    const lanes: Record<string, typeof jobs> = {
      new: [], waiting: [], in_progress: [], waiting_parts: [],
      on_hold: [], qc: [], completed: [],
    };
    for (const j of jobs) {
      lanes[j.status]?.push(j);
    }

    return res.json(lanes);
  } catch (err) {
    console.error("GET /jobs/kanban", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── GET /jobs/:id ──────────────────────────────────────────────────────── */

router.get("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const advisorAlias = alias(usersTable, "adv");
    const techAlias    = alias(usersTable, "tech");
    const qcAlias      = alias(usersTable, "qcu");

    const [job] = await db
      .select({
        id:              jobsTable.id,
        ref:             jobsTable.ref,
        seq:             jobsTable.seq,
        type:            jobsTable.type,
        status:          jobsTable.status,
        work_status:     jobsTable.work_status,
        priority:        jobsTable.priority,
        bay:             jobsTable.bay,
        started_at:      jobsTable.started_at,
        completed_at:    jobsTable.completed_at,
        qc_at:           jobsTable.qc_at,
        mileage_in:      jobsTable.mileage_in,
        mileage_out:     jobsTable.mileage_out,
        scheduled_date:  jobsTable.scheduled_date,
        customer_concern: jobsTable.customer_concern,
        technician_note: jobsTable.technician_note,
        qc_note:           jobsTable.qc_note,
        internal_note:     jobsTable.internal_note,
        cancellation_note: jobsTable.cancellation_note,
        created_at:      jobsTable.created_at,
        updated_at:      jobsTable.updated_at,
        client_id:       jobsTable.client_id,
        client_name:     clientsTable.name,
        client_phone:    clientsTable.phone,
        client_email:    clientsTable.email,
        vehicle_id:      jobsTable.vehicle_id,
        plate_number:    vehiclesTable.plate,
        make:            vehiclesTable.make,
        model:           vehiclesTable.model,
        year:            vehiclesTable.year,
        color:           vehiclesTable.color,
        vin:              vehiclesTable.vin,
        vehicle_mileage:  vehiclesTable.mileage,
        fuel_type:        vehiclesTable.fuel_type,
        advisor_id:      jobsTable.advisor_id,
        advisor_name:    advisorAlias.name,
        advisor_phone:   advisorAlias.phone,
        technician_id:   jobsTable.technician_id,
        technician_name: techAlias.name,
        qc_by:           jobsTable.qc_by,
        qc_by_name:      qcAlias.name,
        quotation_id:         jobsTable.quotation_id,
        booking_id:           jobsTable.booking_id,
        source_inspection_id: jobsTable.source_inspection_id,
      })
      .from(jobsTable)
      .leftJoin(clientsTable, eq(jobsTable.client_id, clientsTable.id))
      .leftJoin(vehiclesTable, eq(jobsTable.vehicle_id, vehiclesTable.id))
      .leftJoin(advisorAlias, eq(jobsTable.advisor_id, advisorAlias.id))
      .leftJoin(techAlias, eq(jobsTable.technician_id, techAlias.id))
      .leftJoin(qcAlias, eq(jobsTable.qc_by, qcAlias.id))
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)))
      .limit(1);

    if (!job) return res.status(404).json({ error: "Job not found" });

    const changedByAlias = alias(usersTable, "changer");
    const asgTechAlias   = alias(usersTable, "asgtech");

    const [statusHistory, assignments, timeLogs, parts, photos, quotation, quoteLines, advancePayments, inspectionParts, inspectionJob, notes] = await Promise.all([
      db
        .select({
          id:          jobStatusHistoryTable.id,
          from_status: jobStatusHistoryTable.from_status,
          to_status:   jobStatusHistoryTable.to_status,
          note:        jobStatusHistoryTable.note,
          created_at:  jobStatusHistoryTable.created_at,
          changed_by_name: changedByAlias.name,
        })
        .from(jobStatusHistoryTable)
        .leftJoin(changedByAlias, eq(jobStatusHistoryTable.changed_by, changedByAlias.id))
        .where(eq(jobStatusHistoryTable.job_id, job.id))
        .orderBy(jobStatusHistoryTable.created_at),

      db
        .select({
          id:              jobAssignmentsTable.id,
          technician_id:   jobAssignmentsTable.technician_id,
          technician_name: asgTechAlias.name,
          technician_email: asgTechAlias.email,
          is_lead:         jobAssignmentsTable.is_lead,
          notes:           jobAssignmentsTable.notes,
          assigned_at:     jobAssignmentsTable.assigned_at,
          released_at:     jobAssignmentsTable.released_at,
        })
        .from(jobAssignmentsTable)
        .leftJoin(asgTechAlias, eq(jobAssignmentsTable.technician_id, asgTechAlias.id))
        .where(and(eq(jobAssignmentsTable.job_id, job.id), isNull(jobAssignmentsTable.released_at)))
        .orderBy(jobAssignmentsTable.assigned_at),

      db
        .select()
        .from(jobTimeLogsTable)
        .where(eq(jobTimeLogsTable.job_id, job.id))
        .orderBy(desc(jobTimeLogsTable.started_at)),

      db
        .select()
        .from(jobPartsTable)
        .where(eq(jobPartsTable.job_id, job.id))
        .orderBy(jobPartsTable.sort_order),

      db
        .select()
        .from(jobPhotosTable)
        .where(eq(jobPhotosTable.job_id, job.id))
        .orderBy(jobPhotosTable.created_at),

      job.quotation_id
        ? db.select().from(quotationsTable).where(eq(quotationsTable.id, job.quotation_id!)).limit(1)
        : Promise.resolve([]),

      // Quotation line items (for sync-status comparison)
      job.quotation_id
        ? db.select().from(quoteLineItemsTable).where(eq(quoteLineItemsTable.quotation_id, job.quotation_id!)).orderBy(quoteLineItemsTable.sort_order)
        : Promise.resolve([]),

      // Quotation advance payments
      job.quotation_id
        ? db.select().from(quoteAdvancePaymentsTable).where(eq(quoteAdvancePaymentsTable.quotation_id, job.quotation_id!)).orderBy(quoteAdvancePaymentsTable.paid_at)
        : Promise.resolve([]),

      // Source inspection parts (read-only reference for service jobs)
      job.source_inspection_id
        ? db.select().from(jobPartsTable).where(eq(jobPartsTable.job_id, job.source_inspection_id)).orderBy(jobPartsTable.sort_order)
        : Promise.resolve([]),

      // Source inspection job (for tech notes)
      job.source_inspection_id
        ? db.select({ technician_note: jobsTable.technician_note, ref: jobsTable.ref })
            .from(jobsTable).where(eq(jobsTable.id, job.source_inspection_id)).limit(1)
        : Promise.resolve([]),

      // Technician notes log
      db
        .select({
          id:             jobNotesTable.id,
          note:           jobNotesTable.note,
          created_by:     jobNotesTable.created_by,
          created_by_name: usersTable.name,
          created_at:     jobNotesTable.created_at,
        })
        .from(jobNotesTable)
        .leftJoin(usersTable, eq(jobNotesTable.created_by, usersTable.id))
        .where(and(eq(jobNotesTable.job_id, job.id), eq(jobNotesTable.tenant_id, tenant.id)))
        .orderBy(asc(jobNotesTable.created_at)),
    ]);

    const totalMinutes = timeLogs.reduce((acc, l) => acc + (l.minutes ?? 0), 0);

    // ── Quotation out-of-sync detection ────────────────────────────────────
    // Compare current job parts against quotation positive line items.
    // A "fingerprint" is: sorted array of "description|qty" strings.
    let quotationOutOfSync = false;
    if (quotation[0] && (quoteLines as any[]).length >= 0) {
      const positiveLines = (quoteLines as any[]).filter(l => parseFloat(l.line_total ?? "0") >= 0);

      const partsFP = [...parts]
        .map(p => `${(p.description ?? "").trim().toLowerCase()}|${parseFloat(String(p.qty ?? 1)).toFixed(4)}`)
        .sort();

      const linesFP = [...positiveLines]
        .map(l => `${(l.description ?? "").trim().toLowerCase()}|${parseFloat(String(l.qty ?? 1)).toFixed(4)}`)
        .sort();

      quotationOutOfSync =
        partsFP.length !== linesFP.length ||
        partsFP.some((fp, i) => fp !== linesFP[i]);
    }

    const qtTotalPaid = (advancePayments as any[]).reduce((s: number, p: any) => s + parseFloat(p.amount ?? "0"), 0);
    const qtBalance = quotation[0] ? parseFloat(quotation[0].total ?? "0") - qtTotalPaid : 0;

    return res.json({
      job,
      statusHistory,
      assignments,
      timeLogs,
      totalMinutes,
      parts,
      photos,
      quotation: quotation[0] ?? null,
      quotationOutOfSync,
      quoteLineItems: quoteLines,
      quoteAdvancePayments: advancePayments,
      quoteTotalPaid: qtTotalPaid,
      quoteBalance: qtBalance,
      inspectionParts,
      inspectionTechNote: (inspectionJob as any[])[0]?.technician_note ?? null,
      inspectionRef:      (inspectionJob as any[])[0]?.ref ?? null,
      techNotes: (notes as any[]) ?? [],
    });
  } catch (err) {
    console.error("GET /jobs/:id", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── POST /jobs/:id/notes ───────────────────────────────────────────────── */

router.post("/:id/notes", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { note, created_by } = req.body as { note: string; created_by?: string };
    if (!note?.trim()) return res.status(400).json({ error: "Note text is required" });

    const [inserted] = await db.insert(jobNotesTable).values({
      job_id:     req.params.id,
      tenant_id:  tenant.id,
      note:       note.trim(),
      created_by: created_by || null,
    }).returning();

    const author = created_by
      ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, created_by)).limit(1)
      : [];

    return res.status(201).json({
      ...inserted,
      created_by_name: author[0]?.name ?? null,
    });
  } catch (err) {
    console.error("POST /jobs/:id/notes", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── POST /jobs ─────────────────────────────────────────────────────────── */

router.post("/", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const {
      client_id, vehicle_id, quotation_id, booking_id,
      advisor_id, technician_id, priority, bay,
      customer_concern, internal_note, mileage_in, type,
      scheduled_date,
    } = req.body as Record<string, string>;

    const [{ seq }] = await db
      .select({ seq: sql<number>`coalesce(max(seq), 0) + 1` })
      .from(jobsTable)
      .where(eq(jobsTable.tenant_id, tenant.id));

    const year   = new Date().getFullYear();
    const prefix = type === "inspection" ? "Insp" : "JC";
    const ref    = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;

    const validPriority = (["low", "normal", "high", "urgent"] as const).includes(priority as "low" | "normal" | "high" | "urgent")
      ? (priority as "low" | "normal" | "high" | "urgent")
      : "normal";

    const [job] = await db
      .insert(jobsTable)
      .values({
        tenant_id:    tenant.id,
        seq,
        ref,
        type:         type || null,
        client_id:    client_id   || null,
        vehicle_id:   vehicle_id  || null,
        quotation_id: quotation_id || null,
        booking_id:   booking_id  || null,
        advisor_id:   advisor_id  || null,
        technician_id: technician_id || null,
        priority:     validPriority,
        bay:          bay ?? null,
        scheduled_date:   scheduled_date ?? null,
        customer_concern: customer_concern ?? null,
        internal_note:    internal_note ?? null,
        mileage_in:       mileage_in ?? null,
        status:       "new",
      })
      .returning();

    const initialStatus = "new";
    await db.insert(jobStatusHistoryTable).values({
      job_id:    job.id,
      tenant_id: tenant.id,
      to_status: initialStatus,
      note:      "Job created",
    });

    if (technician_id) {
      await db.insert(jobAssignmentsTable).values({
        job_id:       job.id,
        tenant_id:    tenant.id,
        technician_id,
        is_lead:      "true",
      });
    }

    return res.status(201).json({ job });
  } catch (err) {
    console.error("POST /jobs", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── PUT /jobs/:id ──────────────────────────────────────────────────────── */

router.put("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [existing] = await db
      .select({ id: jobsTable.id })
      .from(jobsTable)
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Job not found" });

    const {
      advisor_id, technician_id, priority, bay, work_status,
      customer_concern, technician_note, qc_note, internal_note,
      mileage_in, mileage_out,
    } = req.body as Record<string, string>;

    const [job] = await db
      .update(jobsTable)
      .set({
        advisor_id:       advisor_id === "" ? null : advisor_id ?? undefined,
        technician_id:    technician_id === "" ? null : technician_id ?? undefined,
        work_status:      work_status      ?? undefined,
        priority:         priority         ?? undefined,
        bay:              bay              ?? undefined,
        customer_concern: customer_concern ?? undefined,
        technician_note:  technician_note  ?? undefined,
        qc_note:          qc_note          ?? undefined,
        internal_note:    internal_note    ?? undefined,
        mileage_in:       mileage_in       ?? undefined,
        mileage_out:      mileage_out      ?? undefined,
        updated_at:       new Date(),
      })
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)))
      .returning();

    return res.json({ job });
  } catch (err) {
    console.error("PUT /jobs/:id", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── DELETE /jobs/:id ───────────────────────────────────────────────────── */

router.delete("/:id", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [existing] = await db
      .select({ id: jobsTable.id })
      .from(jobsTable)
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Job not found" });

    await db.delete(jobPhotosTable).where(and(eq(jobPhotosTable.job_id, req.params.id), eq(jobPhotosTable.tenant_id, tenant.id)));
    await db.delete(jobPartsTable).where(and(eq(jobPartsTable.job_id, req.params.id), eq(jobPartsTable.tenant_id, tenant.id)));
    await db.delete(jobTimeLogsTable).where(and(eq(jobTimeLogsTable.job_id, req.params.id), eq(jobTimeLogsTable.tenant_id, tenant.id)));
    await db.delete(jobAssignmentsTable).where(and(eq(jobAssignmentsTable.job_id, req.params.id), eq(jobAssignmentsTable.tenant_id, tenant.id)));
    await db.delete(jobStatusHistoryTable).where(and(eq(jobStatusHistoryTable.job_id, req.params.id), eq(jobStatusHistoryTable.tenant_id, tenant.id)));
    await db.delete(jobsTable).where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)));

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /jobs/:id", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── POST /jobs/:id/convert-to-job ──────────────────────────────────────── */

router.post("/:id/convert-to-job", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);

    const [inspection] = await db
      .select()
      .from(jobsTable)
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)))
      .limit(1);

    if (!inspection) return res.status(404).json({ error: "Inspection not found" });
    if (inspection.type !== "inspection") return res.status(400).json({ error: "Job is not an inspection" });

    const [{ seq }] = await db
      .select({ seq: sql<number>`coalesce(max(seq), 0) + 1` })
      .from(jobsTable)
      .where(eq(jobsTable.tenant_id, tenant.id));

    const year = new Date().getFullYear();
    const ref  = `JC-${year}-${String(seq).padStart(4, "0")}`;

    const [newJob] = await db
      .insert(jobsTable)
      .values({
        tenant_id:            tenant.id,
        seq,
        ref,
        type:                 "service_job",
        client_id:            inspection.client_id,
        vehicle_id:           inspection.vehicle_id,
        advisor_id:           inspection.advisor_id,
        technician_id:        inspection.technician_id,
        priority:             inspection.priority,
        bay:                  inspection.bay,
        customer_concern:     inspection.customer_concern,
        internal_note:        inspection.internal_note,
        mileage_in:           inspection.mileage_in,
        status:               "new",
        source_inspection_id: inspection.id,
      })
      .returning();

    // Mark the inspection as converted
    await db.update(jobsTable)
      .set({ converted_job_id: newJob.id, updated_at: new Date() } as any)
      .where(eq(jobsTable.id, inspection.id));

    await db.insert(jobStatusHistoryTable).values({
      job_id:    newJob.id,
      tenant_id: tenant.id,
      to_status: "new",
      note:      `Converted from inspection ${inspection.ref}`,
    });

    return res.status(201).json({ job: newJob });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ─── POST /jobs/:id/status ──────────────────────────────────────────────── */

router.post("/:id/status", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [existing] = await db
      .select({ id: jobsTable.id, status: jobsTable.status, quotation_id: jobsTable.quotation_id })
      .from(jobsTable)
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Job not found" });

    const { status, note, changed_by, cancellation_note } = req.body as { status: JobStatus; note?: string; changed_by?: string; cancellation_note?: string };

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    if (status === "in_progress" && existing.status === "qc") {
      if (existing.quotation_id) {
        const [q] = await db.select({ status: quotationsTable.status }).from(quotationsTable).where(eq(quotationsTable.id, existing.quotation_id)).limit(1);
        if (!q || q.status !== "approved") {
          return res.status(400).json({ error: "Quotation must be approved before starting work" });
        }
      } else {
        return res.status(400).json({ error: "A quotation must be created and approved before starting work" });
      }
    }

    const now = new Date();
    const updates: Partial<typeof jobsTable.$inferInsert> = {
      status,
      updated_at: now,
    };

    if (status === "in_progress" && !existing.status.includes("in_progress")) {
      updates.started_at = now;
    }
    if (status === "completed") {
      updates.completed_at = now;
    }
    if (status === "qc") {
      updates.qc_at = now;
      if (changed_by) updates.qc_by = changed_by;

      const zeroPriceParts = await db.select()
        .from(jobPartsTable)
        .where(and(
          eq(jobPartsTable.job_id, req.params.id!),
          eq(jobPartsTable.tenant_id, tenant.id),
          eq(jobPartsTable.unit_price, "0.00"),
        ));

      if (zeroPriceParts.length > 0) {
        const catalogItems = await db.select()
          .from(catalogItemsTable)
          .where(eq(catalogItemsTable.tenant_id, tenant.id));

        for (const part of zeroPriceParts) {
          const match = catalogItems.find(c =>
            c.name.toLowerCase() === part.description.toLowerCase() ||
            (c.sku && part.part_number && c.sku.toLowerCase() === part.part_number.toLowerCase())
          );
          if (match && parseFloat(match.unit_price) > 0) {
            const price = parseFloat(match.unit_price);
            const qty = parseFloat(part.qty);
            await db.update(jobPartsTable)
              .set({
                unit_price: price.toFixed(2),
                line_total: (qty * price).toFixed(2),
              })
              .where(eq(jobPartsTable.id, part.id));
          }
        }
      }
    }
    if (status === "cancelled") {
      updates.cancellation_note = cancellation_note ?? null;
    }

    const [job] = await db
      .update(jobsTable)
      .set(updates as any)
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)))
      .returning();

    await db.insert(jobStatusHistoryTable).values({
      job_id:      job.id,
      tenant_id:   tenant.id,
      from_status: existing.status as any,
      to_status:   status,
      note:        note ?? null,
      changed_by:  changed_by ?? null,
    });

    return res.json({ job });
  } catch (err) {
    console.error("POST /jobs/:id/status", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── POST /jobs/:id/assign ─────────────────────────────────────────────── */

router.post("/:id/assign", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [existing] = await db
      .select({ id: jobsTable.id })
      .from(jobsTable)
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Job not found" });

    const { technician_id, is_lead, notes, assigned_by } = req.body as Record<string, string>;
    if (!technician_id) return res.status(400).json({ error: "technician_id is required" });

    const [assignment] = await db
      .insert(jobAssignmentsTable)
      .values({
        job_id:       req.params.id,
        tenant_id:    tenant.id,
        technician_id,
        is_lead:      is_lead === "true" ? "true" : "false",
        notes:        notes ?? null,
        assigned_by:  assigned_by ?? null,
      })
      .onConflictDoNothing()
      .returning();

    if (is_lead === "true") {
      await db
        .update(jobsTable)
        .set({ technician_id, updated_at: new Date() })
        .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.tenant_id, tenant.id)));
    }

    return res.status(201).json({ assignment });
  } catch (err) {
    console.error("POST /jobs/:id/assign", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── DELETE /jobs/:id/assign/:assignmentId ──────────────────────────────── */

router.delete("/:id/assign/:assignmentId", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await db
      .update(jobAssignmentsTable)
      .set({ released_at: new Date() })
      .where(and(
        eq(jobAssignmentsTable.id, req.params.assignmentId),
        eq(jobAssignmentsTable.job_id, req.params.id),
        eq(jobAssignmentsTable.tenant_id, tenant.id),
      ));

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /jobs/:id/assign/:assignmentId", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── POST /jobs/:id/time (start or stop timer) ─────────────────────────── */

router.post("/:id/time", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { action, technician_id, notes } = req.body as {
      action: "start" | "stop";
      technician_id?: string;
      notes?: string;
    };

    if (!["start", "stop"].includes(action)) {
      return res.status(400).json({ error: "action must be 'start' or 'stop'" });
    }

    if (action === "start") {
      const [log] = await db
        .insert(jobTimeLogsTable)
        .values({
          job_id:       req.params.id,
          tenant_id:    tenant.id,
          technician_id: technician_id ?? null,
          started_at:   new Date(),
          notes:        notes ?? null,
        })
        .returning();
      return res.status(201).json({ log });
    } else {
      const [openLog] = await db
        .select()
        .from(jobTimeLogsTable)
        .where(and(
          eq(jobTimeLogsTable.job_id, req.params.id),
          isNull(jobTimeLogsTable.ended_at),
        ))
        .orderBy(desc(jobTimeLogsTable.started_at))
        .limit(1);

      if (!openLog) return res.status(404).json({ error: "No open timer found" });

      const endedAt = new Date();
      const minutes = Math.round((endedAt.getTime() - new Date(openLog.started_at).getTime()) / 60000);

      const [log] = await db
        .update(jobTimeLogsTable)
        .set({ ended_at: endedAt, minutes, notes: notes ?? openLog.notes })
        .where(eq(jobTimeLogsTable.id, openLog.id))
        .returning();

      return res.json({ log });
    }
  } catch (err) {
    console.error("POST /jobs/:id/time", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── POST /jobs/:id/parts ───────────────────────────────────────────────── */

router.post("/:id/parts", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { description, part_number, qty, unit_price, added_by } = req.body as Record<string, string>;
    if (!description) return res.status(400).json({ error: "description is required" });

    const qtyNum   = parseFloat(qty   ?? "1");
    const priceNum = parseFloat(unit_price ?? "0");
    const total    = (qtyNum * priceNum).toFixed(2);

    const [{ maxSort }] = await db
      .select({ maxSort: sql<number>`coalesce(max(sort_order), 0)` })
      .from(jobPartsTable)
      .where(eq(jobPartsTable.job_id, req.params.id));

    const [part] = await db
      .insert(jobPartsTable)
      .values({
        job_id:      req.params.id,
        tenant_id:   tenant.id,
        description,
        part_number: part_number ?? null,
        qty:         qtyNum.toString(),
        unit_price:  priceNum.toString(),
        line_total:  total,
        sort_order:  maxSort + 1,
        added_by:    added_by ?? null,
      })
      .returning();

    return res.status(201).json({ part });
  } catch (err) {
    console.error("POST /jobs/:id/parts", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── DELETE /jobs/:id/parts/:partId ────────────────────────────────────── */

router.patch("/:id/parts/:partId", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { unit_price, qty, description } = req.body as Record<string, string | undefined>;
    const patch: Record<string, unknown> = {};
    if (unit_price !== undefined) patch.unit_price = parseFloat(unit_price).toFixed(2);
    if (qty !== undefined)        patch.qty        = parseFloat(qty).toFixed(2);
    if (description !== undefined) patch.description = description;

    if (patch.unit_price !== undefined || patch.qty !== undefined) {
      const qVal = patch.qty !== undefined ? parseFloat(patch.qty as string) : undefined;
      const pVal = patch.unit_price !== undefined ? parseFloat(patch.unit_price as string) : undefined;

      const [existing] = await db.select().from(jobPartsTable).where(and(
        eq(jobPartsTable.id, req.params.partId!),
        eq(jobPartsTable.job_id, req.params.id!),
        eq(jobPartsTable.tenant_id, tenant.id),
      )).limit(1);
      if (!existing) return res.status(404).json({ error: "Part not found" });

      const finalQty   = qVal ?? parseFloat(existing.qty);
      const finalPrice = pVal ?? parseFloat(existing.unit_price);
      patch.line_total = (finalQty * finalPrice).toFixed(2);
    }

    const [updated] = await db.update(jobPartsTable)
      .set(patch)
      .where(and(
        eq(jobPartsTable.id, req.params.partId!),
        eq(jobPartsTable.job_id, req.params.id!),
        eq(jobPartsTable.tenant_id, tenant.id),
      ))
      .returning();

    return res.json({ part: updated });
  } catch (err) {
    console.error("PATCH /jobs/:id/parts/:partId", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/parts/:partId", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await db
      .delete(jobPartsTable)
      .where(and(
        eq(jobPartsTable.id, req.params.partId),
        eq(jobPartsTable.job_id, req.params.id),
        eq(jobPartsTable.tenant_id, tenant.id),
      ));

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /jobs/:id/parts/:partId", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── POST /jobs/:id/photos ──────────────────────────────────────────────── */

router.post("/:id/photos", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { url, caption, photo_type, uploaded_by } = req.body as Record<string, string>;
    if (!url) return res.status(400).json({ error: "url is required" });

    const [photo] = await db
      .insert(jobPhotosTable)
      .values({
        job_id:      req.params.id,
        tenant_id:   tenant.id,
        url,
        caption:     caption    ?? null,
        photo_type:  photo_type ?? "general",
        uploaded_by: uploaded_by ?? null,
      })
      .returning();

    return res.status(201).json({ photo });
  } catch (err) {
    console.error("POST /jobs/:id/photos", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── DELETE /jobs/:id/photos/:photoId ──────────────────────────────────── */

router.delete("/:id/photos/:photoId", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await db
      .delete(jobPhotosTable)
      .where(and(
        eq(jobPhotosTable.id, req.params.photoId),
        eq(jobPhotosTable.job_id, req.params.id),
        eq(jobPhotosTable.tenant_id, tenant.id),
      ));

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /jobs/:id/photos/:photoId", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── GET /jobs/technicians ──────────────────────────────────────────────── */

router.get("/meta/technicians", async (req, res) => {
  try {
    const slug   = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const technicians = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(and(
        eq(usersTable.tenant_id, tenant.id),
        inArray(usersTable.role, ["technician", "admin", "owner"]),
      ))
      .orderBy(usersTable.name);

    return res.json({ data: technicians });
  } catch (err) {
    console.error("GET /jobs/meta/technicians", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
