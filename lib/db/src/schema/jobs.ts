import {
  pgTable, text, timestamp, uuid, integer, numeric, index, uniqueIndex, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tenantsTable, usersTable } from "./platform";
import { clientsTable, vehiclesTable } from "./clients";
import { bookingsTable } from "./bookings";

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft", "sent", "viewed", "approved", "rejected", "expired",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "waiting", "in_progress", "waiting_parts", "on_hold", "qc", "completed", "delivered",
]);

export const jobPriorityEnum = pgEnum("job_priority", [
  "low", "normal", "high", "urgent",
]);

/* ─────────────────────────────────────────────────────────────────────────
   QUOTATIONS
───────────────────────────────────────────────────────────────────────── */

export const quotationsTable = pgTable("quotations", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  seq:         integer("seq").notNull(),
  ref:         text("ref").notNull(),                   // e.g. "QT-2024-0001"
  booking_id:  uuid("booking_id").references(() => bookingsTable.id, { onDelete: "set null" }),
  client_id:   uuid("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  vehicle_id:  uuid("vehicle_id").references(() => vehiclesTable.id, { onDelete: "set null" }),
  advisor_id:  uuid("advisor_id").references(() => usersTable.id, { onDelete: "set null" }),
  status:           quoteStatusEnum("status").notNull().default("draft"),
  estimated_hours:  numeric("estimated_hours", { precision: 8, scale: 2 }),
  subtotal:         numeric("subtotal",   { precision: 12, scale: 2 }).notNull().default("0.00"),
  discount:         numeric("discount",   { precision: 12, scale: 2 }).notNull().default("0.00"),
  tax_rate:         numeric("tax_rate",   { precision: 5, scale: 2 }).notNull().default("5.00"),
  tax_amount:       numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  total:            numeric("total",      { precision: 12, scale: 2 }).notNull().default("0.00"),
  notes:            text("notes"),
  internal_note:    text("internal_note"),
  expires_at:       timestamp("expires_at",  { withTimezone: true }),
  sent_at:          timestamp("sent_at",     { withTimezone: true }),
  approved_at:      timestamp("approved_at", { withTimezone: true }),
  rejected_at:      timestamp("rejected_at", { withTimezone: true }),
  converted_job_id: uuid("converted_job_id"),
  // Audit
  created_at:  timestamp("created_at",  { withTimezone: true }).defaultNow().notNull(),
  updated_at:  timestamp("updated_at",  { withTimezone: true }).defaultNow().notNull(),
  created_by:  uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  updated_by:  uuid("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
}, (t) => [
  index("quotations_tenant_idx").on(t.tenant_id),
  index("quotations_client_idx").on(t.client_id),
  index("quotations_status_idx").on(t.status),
]);

export const insertQuotationSchema = createInsertSchema(quotationsTable).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotationsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   QUOTATION LINE ITEMS
───────────────────────────────────────────────────────────────────────── */

export const quoteLineItemsTable = pgTable("quote_line_items", {
  id:             uuid("id").defaultRandom().primaryKey(),
  quotation_id:   uuid("quotation_id").references(() => quotationsTable.id, { onDelete: "cascade" }).notNull(),
  catalog_item_id: uuid("catalog_item_id"),             // optional FK to catalog_items
  sort_order:     integer("sort_order").notNull().default(0),
  description:    text("description").notNull(),
  type:           text("type").notNull().default("labour"),
  // "labour" | "part" | "consumable" | "sublet" | "package"
  qty:            numeric("qty",        { precision: 10, scale: 2 }).notNull().default("1.00"),
  unit_price:     numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discount:       numeric("discount",   { precision: 12, scale: 2 }).notNull().default("0.00"),
  line_total:     numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0.00"),
  part_number:    text("part_number"),
  notes:          text("notes"),
}, (t) => [
  index("quote_lines_quote_idx").on(t.quotation_id),
]);

export type QuoteLineItem = typeof quoteLineItemsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   QUOTE ADVANCE PAYMENTS
───────────────────────────────────────────────────────────────────────── */

export const quoteAdvancePaymentsTable = pgTable("quote_advance_payments", {
  id:           uuid("id").defaultRandom().primaryKey(),
  quotation_id: uuid("quotation_id").references(() => quotationsTable.id, { onDelete: "cascade" }).notNull(),
  tenant_id:    uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  amount:       numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method:       text("method").notNull().default("cash"),
  // "cash" | "card" | "bank_transfer" | "cheque" | "online"
  reference:    text("reference"),
  note:         text("note"),
  paid_at:      timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
  recorded_by:  uuid("recorded_by").references(() => usersTable.id, { onDelete: "set null" }),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("qap_quotation_idx").on(t.quotation_id),
  index("qap_tenant_idx").on(t.tenant_id),
]);

export type QuoteAdvancePayment = typeof quoteAdvancePaymentsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   JOBS  (job cards)
───────────────────────────────────────────────────────────────────────── */

export const jobsTable = pgTable("jobs", {
  id:              uuid("id").defaultRandom().primaryKey(),
  tenant_id:       uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  seq:             integer("seq").notNull(),
  ref:             text("ref").notNull(),               // e.g. "JC-2024-0001"
  quotation_id:    uuid("quotation_id").references(() => quotationsTable.id, { onDelete: "set null" }),
  booking_id:      uuid("booking_id").references(() => bookingsTable.id, { onDelete: "set null" }),
  client_id:       uuid("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  vehicle_id:      uuid("vehicle_id").references(() => vehiclesTable.id, { onDelete: "set null" }),
  advisor_id:      uuid("advisor_id").references(() => usersTable.id, { onDelete: "set null" }),
  // primary technician (quick assignment — use job_assignments for multi-tech)
  technician_id:   uuid("technician_id").references(() => usersTable.id, { onDelete: "set null" }),
  job_type:        text("job_type").notNull().default("service"),
  // "service" | "inspection"
  status:          jobStatusEnum("status").notNull().default("waiting"),
  priority:        jobPriorityEnum("priority").notNull().default("normal"),
  bay:             text("bay"),
  started_at:      timestamp("started_at",    { withTimezone: true }),
  completed_at:    timestamp("completed_at",  { withTimezone: true }),
  qc_at:           timestamp("qc_at",         { withTimezone: true }),
  qc_by:           uuid("qc_by").references(() => usersTable.id, { onDelete: "set null" }),
  mileage_in:      text("mileage_in"),
  mileage_out:     text("mileage_out"),
  customer_concern: text("customer_concern"),
  technician_note: text("technician_note"),
  qc_note:         text("qc_note"),
  internal_note:   text("internal_note"),
  // Audit
  created_at:      timestamp("created_at",    { withTimezone: true }).defaultNow().notNull(),
  updated_at:      timestamp("updated_at",    { withTimezone: true }).defaultNow().notNull(),
  created_by:      uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  updated_by:      uuid("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
}, (t) => [
  index("jobs_tenant_idx").on(t.tenant_id),
  index("jobs_status_idx").on(t.status),
  index("jobs_tech_idx").on(t.technician_id),
  index("jobs_advisor_idx").on(t.advisor_id),
  index("jobs_client_idx").on(t.client_id),
  index("jobs_vehicle_idx").on(t.vehicle_id),
  uniqueIndex("jobs_booking_unique_idx").on(t.tenant_id, t.booking_id),
]);

export const insertJobSchema = createInsertSchema(jobsTable).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   JOB STATUS HISTORY  (immutable status-change log)
───────────────────────────────────────────────────────────────────────── */

export const jobStatusHistoryTable = pgTable("job_status_history", {
  id:          uuid("id").defaultRandom().primaryKey(),
  job_id:      uuid("job_id").references(() => jobsTable.id, { onDelete: "cascade" }).notNull(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  from_status: jobStatusEnum("from_status"),            // null on creation
  to_status:   jobStatusEnum("to_status").notNull(),
  note:        text("note"),
  changed_by:  uuid("changed_by").references(() => usersTable.id, { onDelete: "set null" }),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("jsh_job_idx").on(t.job_id),
  index("jsh_tenant_idx").on(t.tenant_id),
]);

export type JobStatusHistory = typeof jobStatusHistoryTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   JOB ASSIGNMENTS  (multi-technician per job card)
───────────────────────────────────────────────────────────────────────── */

export const jobAssignmentsTable = pgTable("job_assignments", {
  id:             uuid("id").defaultRandom().primaryKey(),
  job_id:         uuid("job_id").references(() => jobsTable.id, { onDelete: "cascade" }).notNull(),
  tenant_id:      uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  technician_id:  uuid("technician_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  is_lead:        text("is_lead").notNull().default("false"),  // lead technician flag
  notes:          text("notes"),
  assigned_at:    timestamp("assigned_at",   { withTimezone: true }).defaultNow().notNull(),
  assigned_by:    uuid("assigned_by").references(() => usersTable.id, { onDelete: "set null" }),
  released_at:    timestamp("released_at",   { withTimezone: true }),
}, (t) => [
  index("job_asgn_job_idx").on(t.job_id),
  index("job_asgn_tech_idx").on(t.technician_id),
  index("job_asgn_tenant_idx").on(t.tenant_id),
]);

export type JobAssignment = typeof jobAssignmentsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   JOB TIME LOGS
───────────────────────────────────────────────────────────────────────── */

export const jobTimeLogsTable = pgTable("job_time_logs", {
  id:             uuid("id").defaultRandom().primaryKey(),
  job_id:         uuid("job_id").references(() => jobsTable.id, { onDelete: "cascade" }).notNull(),
  tenant_id:      uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  technician_id:  uuid("technician_id").references(() => usersTable.id, { onDelete: "set null" }),
  started_at:     timestamp("started_at", { withTimezone: true }).notNull(),
  ended_at:       timestamp("ended_at",   { withTimezone: true }),
  minutes:        integer("minutes"),
  notes:          text("notes"),
  created_at:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("time_logs_job_idx").on(t.job_id),
  index("time_logs_tech_idx").on(t.technician_id),
]);

export type JobTimeLog = typeof jobTimeLogsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   JOB PARTS USED
───────────────────────────────────────────────────────────────────────── */

export const jobPartsTable = pgTable("job_parts", {
  id:             uuid("id").defaultRandom().primaryKey(),
  job_id:         uuid("job_id").references(() => jobsTable.id, { onDelete: "cascade" }).notNull(),
  tenant_id:      uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  catalog_item_id: uuid("catalog_item_id"),
  sort_order:     integer("sort_order").notNull().default(0),
  part_number:    text("part_number"),
  description:    text("description").notNull(),
  qty:            numeric("qty",        { precision: 10, scale: 2 }).notNull().default("1.00"),
  unit_price:     numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  line_total:     numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0.00"),
  added_by:       uuid("added_by").references(() => usersTable.id, { onDelete: "set null" }),
  created_at:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("job_parts_job_idx").on(t.job_id),
  index("job_parts_tenant_idx").on(t.tenant_id),
]);

export const insertJobPartSchema = createInsertSchema(jobPartsTable).omit({
  id: true, created_at: true,
});
export type InsertJobPart = z.infer<typeof insertJobPartSchema>;
export type JobPart = typeof jobPartsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   JOB PHOTOS
───────────────────────────────────────────────────────────────────────── */

export const jobPhotosTable = pgTable("job_photos", {
  id:             uuid("id").defaultRandom().primaryKey(),
  job_id:         uuid("job_id").references(() => jobsTable.id, { onDelete: "cascade" }).notNull(),
  tenant_id:      uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  url:            text("url").notNull(),
  caption:        text("caption"),
  photo_type:     text("photo_type").notNull().default("general"),
  // "before" | "after" | "damage" | "parts" | "general"
  uploaded_by:    uuid("uploaded_by").references(() => usersTable.id, { onDelete: "set null" }),
  created_at:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("job_photos_job_idx").on(t.job_id),
  index("job_photos_tenant_idx").on(t.tenant_id),
]);

export const insertJobPhotoSchema = createInsertSchema(jobPhotosTable).omit({
  id: true, created_at: true,
});
export type InsertJobPhoto = z.infer<typeof insertJobPhotoSchema>;
export type JobPhoto = typeof jobPhotosTable.$inferSelect;
