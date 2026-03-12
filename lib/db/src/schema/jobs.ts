import {
  pgTable, text, timestamp, uuid, integer, numeric, index, pgEnum
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
  "waiting", "in_progress", "waiting_parts", "on_hold", "qc", "completed",
]);

/* ── Quotations ─────────────────────────────────────────────────────────── */
export const quotationsTable = pgTable("quotations", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  seq:         integer("seq").notNull(),
  ref:         text("ref").notNull(),
  booking_id:  uuid("booking_id").references(() => bookingsTable.id, { onDelete: "set null" }),
  client_id:   uuid("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  vehicle_id:  uuid("vehicle_id").references(() => vehiclesTable.id, { onDelete: "set null" }),
  advisor_id:  uuid("advisor_id").references(() => usersTable.id, { onDelete: "set null" }),
  status:      quoteStatusEnum("status").notNull().default("draft"),
  subtotal:    numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discount:    numeric("discount",  { precision: 12, scale: 2 }).notNull().default("0.00"),
  tax_rate:    numeric("tax_rate",  { precision: 5, scale: 2 }).notNull().default("5.00"),
  tax_amount:  numeric("tax_amount",{ precision: 12, scale: 2 }).notNull().default("0.00"),
  total:       numeric("total",     { precision: 12, scale: 2 }).notNull().default("0.00"),
  notes:       text("notes"),
  expires_at:  timestamp("expires_at", { withTimezone: true }),
  sent_at:     timestamp("sent_at",    { withTimezone: true }),
  approved_at: timestamp("approved_at",{ withTimezone: true }),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("quotations_tenant_idx").on(t.tenant_id),
  index("quotations_client_idx").on(t.client_id),
]);

export const insertQuotationSchema = createInsertSchema(quotationsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotationsTable.$inferSelect;

/* ── Quotation line items ───────────────────────────────────────────────── */
export const quoteLineItemsTable = pgTable("quote_line_items", {
  id:            uuid("id").defaultRandom().primaryKey(),
  quotation_id:  uuid("quotation_id").references(() => quotationsTable.id, { onDelete: "cascade" }).notNull(),
  sort_order:    integer("sort_order").notNull().default(0),
  description:   text("description").notNull(),
  type:          text("type").notNull().default("labour"),
  qty:           numeric("qty",       { precision: 10, scale: 2 }).notNull().default("1.00"),
  unit_price:    numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  line_total:    numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0.00"),
  part_number:   text("part_number"),
  notes:         text("notes"),
}, (t) => [
  index("quote_lines_quote_idx").on(t.quotation_id),
]);

export type QuoteLineItem = typeof quoteLineItemsTable.$inferSelect;

/* ── Jobs (job cards) ───────────────────────────────────────────────────── */
export const jobsTable = pgTable("jobs", {
  id:             uuid("id").defaultRandom().primaryKey(),
  tenant_id:      uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  seq:            integer("seq").notNull(),
  ref:            text("ref").notNull(),
  quotation_id:   uuid("quotation_id").references(() => quotationsTable.id, { onDelete: "set null" }),
  client_id:      uuid("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  vehicle_id:     uuid("vehicle_id").references(() => vehiclesTable.id, { onDelete: "set null" }),
  technician_id:  uuid("technician_id").references(() => usersTable.id, { onDelete: "set null" }),
  advisor_id:     uuid("advisor_id").references(() => usersTable.id, { onDelete: "set null" }),
  status:         jobStatusEnum("status").notNull().default("waiting"),
  priority:       integer("priority").notNull().default(0),
  bay:            text("bay"),
  started_at:     timestamp("started_at",   { withTimezone: true }),
  completed_at:   timestamp("completed_at", { withTimezone: true }),
  qc_at:          timestamp("qc_at",        { withTimezone: true }),
  mileage_out:    text("mileage_out"),
  technician_note:text("technician_note"),
  qc_note:        text("qc_note"),
  created_at:     timestamp("created_at",   { withTimezone: true }).defaultNow().notNull(),
  updated_at:     timestamp("updated_at",   { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("jobs_tenant_idx").on(t.tenant_id),
  index("jobs_status_idx").on(t.status),
  index("jobs_tech_idx").on(t.technician_id),
]);

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;

/* ── Job time logs ──────────────────────────────────────────────────────── */
export const jobTimeLogsTable = pgTable("job_time_logs", {
  id:            uuid("id").defaultRandom().primaryKey(),
  job_id:        uuid("job_id").references(() => jobsTable.id, { onDelete: "cascade" }).notNull(),
  technician_id: uuid("technician_id").references(() => usersTable.id, { onDelete: "set null" }),
  started_at:    timestamp("started_at", { withTimezone: true }).notNull(),
  ended_at:      timestamp("ended_at",   { withTimezone: true }),
  minutes:       integer("minutes"),
  notes:         text("notes"),
}, (t) => [
  index("time_logs_job_idx").on(t.job_id),
]);

export type JobTimeLog = typeof jobTimeLogsTable.$inferSelect;
