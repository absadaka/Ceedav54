import {
  pgTable, text, timestamp, boolean, uuid, numeric, index, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tenantsTable } from "./platform";

export const catalogItemTypeEnum = pgEnum("catalog_item_type", [
  "labour", "part", "consumable", "sublet", "package",
]);

/* ── Service/Parts Catalog ──────────────────────────────────────────────── */
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
  is_active:     boolean("is_active").notNull().default(true),
  created_at:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("catalog_tenant_idx").on(t.tenant_id),
  index("catalog_sku_idx").on(t.sku),
]);

export const insertCatalogItemSchema = createInsertSchema(catalogItemsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;
export type CatalogItem = typeof catalogItemsTable.$inferSelect;

/* ── Notification log ───────────────────────────────────────────────────── */
export const notificationLogsTable = pgTable("notification_logs", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  channel:     text("channel").notNull(),
  recipient:   text("recipient").notNull(),
  template:    text("template").notNull(),
  payload:     text("payload"),
  status:      text("status").notNull().default("queued"),
  sent_at:     timestamp("sent_at",    { withTimezone: true }),
  error:       text("error"),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("notif_tenant_idx").on(t.tenant_id),
  index("notif_channel_idx").on(t.channel),
]);

export type NotificationLog = typeof notificationLogsTable.$inferSelect;

/* ── WhatsApp thread ────────────────────────────────────────────────────── */
export const whatsappThreadsTable = pgTable("whatsapp_threads", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  wa_id:       text("wa_id").notNull(),
  phone:       text("phone").notNull(),
  client_id:   uuid("client_id"),
  last_msg_at: timestamp("last_msg_at", { withTimezone: true }),
  created_at:  timestamp("created_at",  { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("wa_tenant_idx").on(t.tenant_id),
  index("wa_phone_idx").on(t.phone),
]);

export type WhatsappThread = typeof whatsappThreadsTable.$inferSelect;

/* ── Deposits ───────────────────────────────────────────────────────────── */
export const depositsTable = pgTable("deposits", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  booking_id:  uuid("booking_id"),
  amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method:      text("method").notNull().default("online_link"),
  reference:   text("reference"),
  status:      text("status").notNull().default("pending"),
  paid_at:     timestamp("paid_at",    { withTimezone: true }),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("deposits_tenant_idx").on(t.tenant_id),
]);

export type Deposit = typeof depositsTable.$inferSelect;
