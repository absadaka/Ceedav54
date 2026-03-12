import {
  pgTable, text, timestamp, uuid, index, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tenantsTable } from "./platform";

export const clientTypeEnum = pgEnum("client_type", ["individual", "company"]);

/* ── Clients ────────────────────────────────────────────────────────────── */
export const clientsTable = pgTable("clients", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  type:        clientTypeEnum("type").notNull().default("individual"),
  name:        text("name").notNull(),
  company:     text("company"),
  phone:       text("phone"),
  email:       text("email"),
  whatsapp:    text("whatsapp"),
  id_number:   text("id_number"),
  notes:       text("notes"),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deleted_at:  timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("clients_tenant_idx").on(t.tenant_id),
  index("clients_phone_idx").on(t.phone),
]);

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;

/* ── Vehicles ───────────────────────────────────────────────────────────── */
export const vehiclesTable = pgTable("vehicles", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  client_id:   uuid("client_id").references(() => clientsTable.id, { onDelete: "cascade" }).notNull(),
  plate:       text("plate").notNull(),
  vin:         text("vin"),
  make:        text("make"),
  model:       text("model"),
  year:        text("year"),
  color:       text("color"),
  mileage:     text("mileage"),
  fuel_type:   text("fuel_type"),
  notes:       text("notes"),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("vehicles_tenant_idx").on(t.tenant_id),
  index("vehicles_client_idx").on(t.client_id),
  index("vehicles_plate_idx").on(t.plate),
]);

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;
