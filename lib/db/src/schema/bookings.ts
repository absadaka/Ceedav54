import {
  pgTable, text, timestamp, uuid, integer, index, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tenantsTable, usersTable } from "./platform";
import { clientsTable, vehiclesTable } from "./clients";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show",
]);

export const bookingSourceEnum = pgEnum("booking_source", [
  "walk_in", "phone", "online", "whatsapp", "referral",
]);

/* ── Bookings ───────────────────────────────────────────────────────────── */
export const bookingsTable = pgTable("bookings", {
  id:           uuid("id").defaultRandom().primaryKey(),
  tenant_id:    uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  seq:          integer("seq").notNull(),
  ref:          text("ref").notNull(),
  client_id:    uuid("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  vehicle_id:   uuid("vehicle_id").references(() => vehiclesTable.id, { onDelete: "set null" }),
  advisor_id:   uuid("advisor_id").references(() => usersTable.id, { onDelete: "set null" }),
  status:       bookingStatusEnum("status").notNull().default("pending"),
  source:       bookingSourceEnum("source").notNull().default("phone"),
  scheduled_at: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  duration_min: integer("duration_min").notNull().default(60),
  notes:        text("notes"),
  mileage_in:   text("mileage_in"),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deleted_at:   timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("bookings_tenant_idx").on(t.tenant_id),
  index("bookings_client_idx").on(t.client_id),
  index("bookings_date_idx").on(t.scheduled_at),
]);

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
