import {
  pgTable, text, timestamp, uuid, integer, numeric, index, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tenantsTable, usersTable } from "./platform";
import { clientsTable, vehiclesTable } from "./clients";
import { jobsTable, quotationsTable } from "./jobs";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft", "sent", "partial", "paid", "overdue", "void",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash", "card", "bank_transfer", "online_link", "insurance",
]);

/* ─────────────────────────────────────────────────────────────────────────
   INVOICES
───────────────────────────────────────────────────────────────────────── */

export const invoicesTable = pgTable("invoices", {
  id:           uuid("id").defaultRandom().primaryKey(),
  tenant_id:    uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  seq:          integer("seq").notNull(),
  ref:          text("ref").notNull(),                  // e.g. "INV-2024-0001"
  job_id:       uuid("job_id").references(() => jobsTable.id, { onDelete: "set null" }),
  quotation_id: uuid("quotation_id").references(() => quotationsTable.id, { onDelete: "set null" }),
  client_id:    uuid("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  vehicle_id:   uuid("vehicle_id").references(() => vehiclesTable.id, { onDelete: "set null" }),
  cashier_id:   uuid("cashier_id").references(() => usersTable.id, { onDelete: "set null" }),
  status:       invoiceStatusEnum("status").notNull().default("draft"),
  subtotal:     numeric("subtotal",    { precision: 12, scale: 2 }).notNull().default("0.00"),
  discount:     numeric("discount",    { precision: 12, scale: 2 }).notNull().default("0.00"),
  tax_rate:     numeric("tax_rate",    { precision: 5, scale: 2 }).notNull().default("5.00"),
  tax_amount:   numeric("tax_amount",  { precision: 12, scale: 2 }).notNull().default("0.00"),
  total:        numeric("total",       { precision: 12, scale: 2 }).notNull().default("0.00"),
  paid_amount:  numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  notes:        text("notes"),
  due_at:       timestamp("due_at",    { withTimezone: true }),
  sent_at:      timestamp("sent_at",   { withTimezone: true }),
  paid_at:      timestamp("paid_at",   { withTimezone: true }),
  voided_at:    timestamp("voided_at", { withTimezone: true }),
  voided_by:    uuid("voided_by").references(() => usersTable.id, { onDelete: "set null" }),
  // Audit
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  created_by:   uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  updated_by:   uuid("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
}, (t) => [
  index("invoices_tenant_idx").on(t.tenant_id),
  index("invoices_client_idx").on(t.client_id),
  index("invoices_status_idx").on(t.status),
  index("invoices_job_idx").on(t.job_id),
]);

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   INVOICE LINE ITEMS
───────────────────────────────────────────────────────────────────────── */

export const invoiceLineItemsTable = pgTable("invoice_line_items", {
  id:              uuid("id").defaultRandom().primaryKey(),
  invoice_id:      uuid("invoice_id").references(() => invoicesTable.id, { onDelete: "cascade" }).notNull(),
  catalog_item_id: uuid("catalog_item_id"),           // optional FK
  sort_order:      integer("sort_order").notNull().default(0),
  description:     text("description").notNull(),
  type:            text("type").notNull().default("labour"),
  qty:             numeric("qty",        { precision: 10, scale: 2 }).notNull().default("1.00"),
  unit_price:      numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discount:        numeric("discount",   { precision: 12, scale: 2 }).notNull().default("0.00"),
  line_total:      numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0.00"),
  part_number:     text("part_number"),
  notes:           text("notes"),
}, (t) => [
  index("inv_lines_invoice_idx").on(t.invoice_id),
]);

export type InvoiceLineItem = typeof invoiceLineItemsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   PAYMENTS
───────────────────────────────────────────────────────────────────────── */

export const paymentsTable = pgTable("payments", {
  id:           uuid("id").defaultRandom().primaryKey(),
  tenant_id:    uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  invoice_id:   uuid("invoice_id").references(() => invoicesTable.id, { onDelete: "cascade" }).notNull(),
  method:       paymentMethodEnum("method").notNull(),
  amount:       numeric("amount",    { precision: 12, scale: 2 }).notNull(),
  reference:    text("reference"),
  notes:        text("notes"),
  paid_at:      timestamp("paid_at",    { withTimezone: true }).notNull(),
  created_by:   uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("payments_invoice_idx").on(t.invoice_id),
  index("payments_tenant_idx").on(t.tenant_id),
]);

export type Payment = typeof paymentsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   DEPOSITS  (pre-booking / advance payments)
───────────────────────────────────────────────────────────────────────── */

export const depositsTable = pgTable("deposits", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  booking_id:  uuid("booking_id"),                    // soft FK (no cascade needed)
  amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method:      text("method").notNull().default("online_link"),
  reference:   text("reference"),
  status:      text("status").notNull().default("pending"),
  paid_at:     timestamp("paid_at",    { withTimezone: true }),
  created_by:  uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("deposits_tenant_idx").on(t.tenant_id),
  index("deposits_booking_idx").on(t.booking_id),
]);

export type Deposit = typeof depositsTable.$inferSelect;
