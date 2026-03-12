import {
  pgTable, text, timestamp, boolean, uuid, pgEnum, index
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/* ── Enums ──────────────────────────────────────────────────────────────── */
export const planEnum = pgEnum("plan", [
  "starter", "professional", "enterprise",
]);

export const tenantStatusEnum = pgEnum("tenant_status", [
  "trial", "active", "past_due", "suspended", "cancelled",
]);

/* ── Tenants ────────────────────────────────────────────────────────────── */
export const tenantsTable = pgTable("tenants", {
  id:            uuid("id").defaultRandom().primaryKey(),
  slug:          text("slug").notNull().unique(),
  name:          text("name").notNull(),
  plan:          planEnum("plan").notNull().default("trial"),
  status:        tenantStatusEnum("status").notNull().default("trial"),
  timezone:      text("timezone").notNull().default("UTC"),
  currency:      text("currency").notNull().default("AED"),
  locale:        text("locale").notNull().default("en"),
  logo_url:      text("logo_url"),
  phone:         text("phone"),
  email:         text("email"),
  address:       text("address"),
  country:       text("country"),
  vat_number:    text("vat_number"),
  trial_ends_at: timestamp("trial_ends_at", { withTimezone: true }),
  created_at:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deleted_at:    timestamp("deleted_at", { withTimezone: true }),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;

/* ── Tenant users (roles) ───────────────────────────────────────────────── */
export const roleEnum = pgEnum("role", [
  "owner",
  "admin",
  "service_advisor",
  "technician",
  "cashier",
  "parts_manager",
  "receptionist",
  "platform_admin",
  "platform_support",
  "platform_readonly",
  "platform_finance",
]);

export const usersTable = pgTable("users", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  email:       text("email").notNull().unique(),
  name:        text("name").notNull(),
  role:        roleEnum("role").notNull().default("service_advisor"),
  avatar_url:  text("avatar_url"),
  phone:       text("phone"),
  is_active:   boolean("is_active").notNull().default(true),
  last_login:  timestamp("last_login", { withTimezone: true }),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deleted_at:  timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("users_tenant_idx").on(t.tenant_id),
  index("users_email_idx").on(t.email),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

/* ── Audit log ──────────────────────────────────────────────────────────── */
export const auditLogsTable = pgTable("audit_logs", {
  id:          uuid("id").defaultRandom().primaryKey(),
  tenant_id:   uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
  user_id:     uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  action:      text("action").notNull(),
  resource:    text("resource").notNull(),
  resource_id: text("resource_id"),
  payload:     text("payload"),
  ip_address:  text("ip_address"),
  user_agent:  text("user_agent"),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("audit_tenant_idx").on(t.tenant_id),
  index("audit_user_idx").on(t.user_id),
]);

export type AuditLog = typeof auditLogsTable.$inferSelect;

/* ── Feature flags ──────────────────────────────────────────────────────── */
export const featureFlagsTable = pgTable("feature_flags", {
  id:          uuid("id").defaultRandom().primaryKey(),
  key:         text("key").notNull().unique(),
  label:       text("label").notNull(),
  description: text("description"),
  enabled:     boolean("enabled").notNull().default(false),
  rollout_pct: text("rollout_pct").notNull().default("0"),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FeatureFlag = typeof featureFlagsTable.$inferSelect;

/* ── Sessions ───────────────────────────────────────────────────────────── */
export const sessionsTable = pgTable("sessions", {
  id:          uuid("id").defaultRandom().primaryKey(),
  user_id:     uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  token_hash:  text("token_hash").notNull().unique(),
  device:      text("device"),
  ip_address:  text("ip_address"),
  location:    text("location"),
  user_agent:  text("user_agent"),
  last_active: timestamp("last_active", { withTimezone: true }).defaultNow().notNull(),
  expires_at:  timestamp("expires_at", { withTimezone: true }).notNull(),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("sessions_user_idx").on(t.user_id),
  index("sessions_token_idx").on(t.token_hash),
]);

export type Session = typeof sessionsTable.$inferSelect;
