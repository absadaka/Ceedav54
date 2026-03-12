import {
  pgTable, text, timestamp, boolean, uuid, numeric, integer, index, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tenantsTable, usersTable } from "./platform";
import { clientsTable } from "./clients";

export const catalogItemTypeEnum = pgEnum("catalog_item_type", [
  "labour", "part", "consumable", "sublet", "package",
]);

/* ─────────────────────────────────────────────────────────────────────────
   SERVICES / PARTS CATALOG
───────────────────────────────────────────────────────────────────────── */

export const catalogItemsTable = pgTable("catalog_items", {
  id:            uuid("id").defaultRandom().primaryKey(),
  tenant_id:     uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  type:          catalogItemTypeEnum("type").notNull().default("labour"),
  sku:           text("sku"),
  name:          text("name").notNull(),
  description:   text("description"),
  unit:          text("unit").notNull().default("each"),
  unit_price:    numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  cost_price:    numeric("cost_price", { precision: 12, scale: 2 }),
  taxable:       boolean("taxable").notNull().default(true),
  is_active:     boolean("is_active").notNull().default(true),
  // Audit
  created_at:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  created_by:    uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  updated_by:    uuid("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
}, (t) => [
  index("catalog_tenant_idx").on(t.tenant_id),
  index("catalog_sku_idx").on(t.sku),
  index("catalog_type_idx").on(t.type),
]);

export const insertCatalogItemSchema = createInsertSchema(catalogItemsTable).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;
export type CatalogItem = typeof catalogItemsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   NOTIFICATION LOG
───────────────────────────────────────────────────────────────────────── */

export const notificationLogsTable = pgTable("notification_logs", {
  id:           uuid("id").defaultRandom().primaryKey(),
  tenant_id:    uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  channel:      text("channel").notNull(),     // "whatsapp" | "email" | "sms"
  recipient:    text("recipient").notNull(),   // phone or email
  template:     text("template").notNull(),
  payload:      text("payload"),               // JSON string
  status:       text("status").notNull().default("queued"),
  // "queued" | "sent" | "delivered" | "read" | "failed"
  sent_at:      timestamp("sent_at",    { withTimezone: true }),
  error:        text("error"),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("notif_tenant_idx").on(t.tenant_id),
  index("notif_channel_idx").on(t.channel),
  index("notif_status_idx").on(t.status),
]);

export type NotificationLog = typeof notificationLogsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   WHATSAPP THREADS
───────────────────────────────────────────────────────────────────────── */

export const whatsappThreadsTable = pgTable("whatsapp_threads", {
  id:           uuid("id").defaultRandom().primaryKey(),
  tenant_id:    uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  wa_id:        text("wa_id").notNull(),         // WhatsApp contact ID
  phone:        text("phone").notNull(),
  client_id:    uuid("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  last_msg_at:  timestamp("last_msg_at", { withTimezone: true }),
  unread_count: integer("unread_count").notNull().default(0),
  created_at:   timestamp("created_at",  { withTimezone: true }).defaultNow().notNull(),
  updated_at:   timestamp("updated_at",  { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("wa_tenant_idx").on(t.tenant_id),
  index("wa_phone_idx").on(t.phone),
]);

export type WhatsappThread = typeof whatsappThreadsTable.$inferSelect;
