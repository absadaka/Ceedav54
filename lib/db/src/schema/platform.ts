import {
  pgTable, text, timestamp, boolean, uuid, pgEnum, index, unique, jsonb, integer, numeric, serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────
   ENUMS
───────────────────────────────────────────────────────────────────────── */

export const planEnum = pgEnum("plan", [
  "starter", "professional", "enterprise",
]);

export const tenantStatusEnum = pgEnum("tenant_status", [
  "trial", "active", "past_due", "suspended", "cancelled",
]);

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

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending", "accepted", "expired", "cancelled",
]);

export const deviceTypeEnum = pgEnum("device_type", [
  "desktop", "mobile", "tablet",
]);

/* ─────────────────────────────────────────────────────────────────────────
   TENANTS
───────────────────────────────────────────────────────────────────────── */

export const tenantsTable = pgTable("tenants", {
  id:            uuid("id").defaultRandom().primaryKey(),
  slug:          text("slug").notNull().unique(),
  name:          text("name").notNull(),
  plan:          planEnum("plan").notNull().default("starter"),
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
  // SSO
  sso_enabled:    boolean("sso_enabled").notNull().default(false),
  sso_provider:   text("sso_provider"),
  sso_entity_id:  text("sso_entity_id"),
  sso_sso_url:    text("sso_sso_url"),
  sso_cert:       text("sso_cert"),
  // Billing
  stripe_customer_id:     text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  trial_ends_at: timestamp("trial_ends_at", { withTimezone: true }),
  // Audit
  created_at:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deleted_at:    timestamp("deleted_at", { withTimezone: true }),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   USERS
───────────────────────────────────────────────────────────────────────── */

export const usersTable = pgTable("users", {
  id:              uuid("id").defaultRandom().primaryKey(),
  tenant_id:       uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  // null tenant_id = platform staff
  email:           text("email").notNull().unique(),
  name:            text("name").notNull(),
  role:            roleEnum("role").notNull().default("service_advisor"),
  avatar_url:      text("avatar_url"),
  phone:           text("phone"),
  is_active:       boolean("is_active").notNull().default(true),
  email_verified:  boolean("email_verified").notNull().default(false),
  phone_verified:  boolean("phone_verified").notNull().default(false),
  // Hashed credentials (managed by auth layer, NOT stored in plain text)
  password_hash:   text("password_hash"),
  // 2FA / passkey placeholder
  totp_secret:     text("totp_secret"),
  last_login_at:   timestamp("last_login_at", { withTimezone: true }),
  // Audit
  created_at:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  created_by:      uuid("created_by"),               // self-ref, nullable on first user
  deleted_at:      timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("users_tenant_idx").on(t.tenant_id),
  index("users_email_idx").on(t.email),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true, created_at: true, updated_at: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   PERMISSIONS  (resource → action pairs, code-defined + seeded)
───────────────────────────────────────────────────────────────────────── */

export const permissionsTable = pgTable("permissions", {
  id:          uuid("id").defaultRandom().primaryKey(),
  resource:    text("resource").notNull(),   // e.g. "invoices"
  action:      text("action").notNull(),     // e.g. "create", "read", "update", "delete", "send"
  description: text("description"),
}, (t) => [
  unique("permissions_resource_action_uq").on(t.resource, t.action),
]);

export type Permission = typeof permissionsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   ROLE PERMISSIONS  (many-to-many: role → permission)
───────────────────────────────────────────────────────────────────────── */

export const rolePermissionsTable = pgTable("role_permissions", {
  role:          roleEnum("role").notNull(),
  permission_id: uuid("permission_id").references(() => permissionsTable.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  unique("role_permissions_uq").on(t.role, t.permission_id),
  index("role_permissions_role_idx").on(t.role),
]);

export type RolePermission = typeof rolePermissionsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   USER INVITES
───────────────────────────────────────────────────────────────────────── */

export const userInvitesTable = pgTable("user_invites", {
  id:            uuid("id").defaultRandom().primaryKey(),
  tenant_id:     uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  email:         text("email").notNull(),
  role:          roleEnum("role").notNull().default("service_advisor"),
  status:        inviteStatusEnum("status").notNull().default("pending"),
  token_hash:    text("token_hash").notNull().unique(),
  invited_by:    uuid("invited_by").references(() => usersTable.id, { onDelete: "set null" }),
  accepted_by:   uuid("accepted_by").references(() => usersTable.id, { onDelete: "set null" }),
  expires_at:    timestamp("expires_at", { withTimezone: true }).notNull(),
  accepted_at:   timestamp("accepted_at", { withTimezone: true }),
  created_at:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("invites_tenant_idx").on(t.tenant_id),
  index("invites_email_idx").on(t.email),
]);

export type UserInvite = typeof userInvitesTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   SESSIONS  (active auth sessions)
───────────────────────────────────────────────────────────────────────── */

export const sessionsTable = pgTable("sessions", {
  id:           uuid("id").defaultRandom().primaryKey(),
  user_id:      uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  token_hash:   text("token_hash").notNull().unique(),
  device_id:    uuid("device_id"),               // FK to devices, set after trust
  auth_method:  text("auth_method").notNull().default("password"),
  // "password" | "google" | "passkey" | "magic_link" | "phone_otp" | "sso"
  ip_address:   text("ip_address"),
  city:         text("city"),
  user_agent:   text("user_agent"),
  last_active_at: timestamp("last_active_at", { withTimezone: true }).defaultNow().notNull(),
  expires_at:   timestamp("expires_at", { withTimezone: true }).notNull(),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("sessions_user_idx").on(t.user_id),
  index("sessions_token_idx").on(t.token_hash),
]);

export type Session = typeof sessionsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   DEVICES  (trusted devices, linked to users)
───────────────────────────────────────────────────────────────────────── */

export const devicesTable = pgTable("devices", {
  id:             uuid("id").defaultRandom().primaryKey(),
  user_id:        uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  device_type:    deviceTypeEnum("device_type").notNull().default("desktop"),
  browser:        text("browser"),
  os:             text("os"),
  device_name:    text("device_name"),            // e.g. "MacBook Pro"
  fingerprint:    text("fingerprint").notNull(),  // hashed device fingerprint
  trusted:        boolean("trusted").notNull().default(false),
  last_active_at: timestamp("last_active_at", { withTimezone: true }).defaultNow().notNull(),
  first_seen_at:  timestamp("first_seen_at",  { withTimezone: true }).defaultNow().notNull(),
  revoked_at:     timestamp("revoked_at",     { withTimezone: true }),
}, (t) => [
  index("devices_user_idx").on(t.user_id),
  index("devices_fingerprint_idx").on(t.fingerprint),
]);

export type Device = typeof devicesTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   AUDIT LOG
───────────────────────────────────────────────────────────────────────── */

export const auditLogsTable = pgTable("audit_logs", {
  id:           uuid("id").defaultRandom().primaryKey(),
  tenant_id:    uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
  user_id:      uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  action:       text("action").notNull(),          // e.g. "invoice.sent", "user.role_changed"
  resource:     text("resource").notNull(),        // e.g. "invoice"
  resource_id:  text("resource_id"),
  meta:         jsonb("meta"),                     // structured context (old/new values, etc.)
  ip_address:   text("ip_address"),
  user_agent:   text("user_agent"),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("audit_tenant_idx").on(t.tenant_id),
  index("audit_user_idx").on(t.user_id),
  index("audit_action_idx").on(t.action),
  index("audit_created_at_idx").on(t.created_at),
]);

export type AuditLog = typeof auditLogsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   FEATURE FLAGS
───────────────────────────────────────────────────────────────────────── */

export const featureFlagsTable = pgTable("feature_flags", {
  id:           uuid("id").defaultRandom().primaryKey(),
  key:          text("key").notNull().unique(),
  label:        text("label").notNull(),
  description:  text("description"),
  enabled:      boolean("enabled").notNull().default(false),
  rollout_pct:  text("rollout_pct").notNull().default("0"),  // "0"–"100"
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FeatureFlag = typeof featureFlagsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   API KEYS  (tenant-scoped, for integrations)
───────────────────────────────────────────────────────────────────────── */

export const apiKeysTable = pgTable("api_keys", {
  id:           uuid("id").defaultRandom().primaryKey(),
  tenant_id:    uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  name:         text("name").notNull(),
  key_prefix:   text("key_prefix").notNull(),           // first 12 chars (displayable)
  key_hash:     text("key_hash").notNull().unique(),    // SHA-256 of full key
  scopes:       text("scopes").array().notNull().default([]),
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
  expires_at:   timestamp("expires_at", { withTimezone: true }),
  created_by:   uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  revoked_at:   timestamp("revoked_at", { withTimezone: true }),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("api_keys_tenant_idx").on(t.tenant_id),
  index("api_keys_hash_idx").on(t.key_hash),
]);

export type ApiKey = typeof apiKeysTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   PLAN CATALOG  (single source of truth for subscription plans)
───────────────────────────────────────────────────────────────────────── */

export const planCatalogTable = pgTable("plan_catalog", {
  id:             uuid("id").defaultRandom().primaryKey(),
  plan_key:       text("plan_key").notNull().unique(),
  name:           text("name").notNull(),
  monthly_price:  numeric("monthly_price", { precision: 10, scale: 2 }),
  annual_price:   numeric("annual_price", { precision: 10, scale: 2 }),
  description:    text("description").notNull().default(""),
  features:       jsonb("features").notNull().default([]),
  badge:          text("badge"),
  sort_order:     integer("sort_order").notNull().default(0),
  is_active:      boolean("is_active").notNull().default(true),
  created_at:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:     timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PlanCatalog = typeof planCatalogTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   SUPPORT TICKETS  (raised by tenant users, handled by platform staff)
───────────────────────────────────────────────────────────────────────── */

export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open", "in_progress", "waiting_on_customer", "resolved", "closed",
]);

export const supportTicketPriorityEnum = pgEnum("support_ticket_priority", [
  "low", "medium", "high", "urgent",
]);

export const supportTicketCategoryEnum = pgEnum("support_ticket_category", [
  "general", "billing", "technical", "feature_request", "bug", "account",
]);

export const supportTicketsTable = pgTable("support_tickets", {
  id:              uuid("id").defaultRandom().primaryKey(),
  seq:             serial("seq").notNull(),                       // numeric counter, used to format `ref`
  ref:             text("ref").notNull().unique(),                // e.g. "TK-1024"
  tenant_id:       uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
  created_by_id:   uuid("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  contact_email:   text("contact_email").notNull(),
  contact_name:    text("contact_name").notNull(),
  subject:         text("subject").notNull(),
  description:     text("description").notNull(),
  priority:        supportTicketPriorityEnum("priority").notNull().default("medium"),
  category:        supportTicketCategoryEnum("category").notNull().default("general"),
  status:          supportTicketStatusEnum("status").notNull().default("open"),
  assigned_to_id:  uuid("assigned_to_id").references(() => usersTable.id, { onDelete: "set null" }),
  acknowledged_at: timestamp("acknowledged_at", { withTimezone: true }),  // when an admin first viewed it
  resolved_at:     timestamp("resolved_at",     { withTimezone: true }),
  reply_count:     integer("reply_count").notNull().default(0),
  created_at:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("support_tickets_tenant_idx").on(t.tenant_id),
  index("support_tickets_status_idx").on(t.status),
  index("support_tickets_created_idx").on(t.created_at),
]);

export type SupportTicket = typeof supportTicketsTable.$inferSelect;

export const supportTicketMessagesTable = pgTable("support_ticket_messages", {
  id:           uuid("id").defaultRandom().primaryKey(),
  ticket_id:    uuid("ticket_id").references(() => supportTicketsTable.id, { onDelete: "cascade" }).notNull(),
  author_id:    uuid("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  author_type:  text("author_type").notNull(),   // 'tenant' | 'platform' | 'system'
  author_name:  text("author_name").notNull(),
  body:         text("body").notNull(),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("support_ticket_messages_ticket_idx").on(t.ticket_id),
]);

export type SupportTicketMessage = typeof supportTicketMessagesTable.$inferSelect;
