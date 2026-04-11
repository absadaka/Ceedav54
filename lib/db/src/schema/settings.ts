import {
  pgTable, text, timestamp, boolean, uuid, numeric, integer, jsonb, index, unique,
} from "drizzle-orm/pg-core";
import { tenantsTable } from "./platform";

/* ─────────────────────────────────────────────────────────────────────────
   TENANT EXTENDED SETTINGS
   One-to-one with tenants. Holds settings that don't belong in the core
   tenant row (office hours, social links, sales defaults, comms config, etc.)
───────────────────────────────────────────────────────────────────────── */

export const tenantSettingsTable = pgTable("tenant_settings", {
  id:         uuid("id").defaultRandom().primaryKey(),
  tenant_id:  uuid("tenant_id")
    .references(() => tenantsTable.id, { onDelete: "cascade" })
    .notNull()
    .unique(),

  /* Business */
  website:    text("website"),
  maps_url:   text("maps_url"),

  /* Social */
  social_facebook:  text("social_facebook"),
  social_instagram: text("social_instagram"),
  social_twitter:   text("social_twitter"),
  social_linkedin:  text("social_linkedin"),
  social_tiktok:    text("social_tiktok"),
  social_youtube:   text("social_youtube"),

  /* Preferences */
  distance_unit: text("distance_unit").notNull().default("km"),
  language:      text("language").notNull().default("en"),

  /* Office hours – JSON object keyed by day name */
  office_hours: jsonb("office_hours").default({
    monday:    { enabled: true,  open: "08:00", close: "18:00" },
    tuesday:   { enabled: true,  open: "08:00", close: "18:00" },
    wednesday: { enabled: true,  open: "08:00", close: "18:00" },
    thursday:  { enabled: true,  open: "08:00", close: "18:00" },
    friday:    { enabled: true,  open: "08:00", close: "14:00" },
    saturday:  { enabled: false, open: "09:00", close: "13:00" },
    sunday:    { enabled: false, open: "09:00", close: "13:00" },
  }),

  /* Sales */
  default_tax_pct:      numeric("default_tax_pct", { precision: 5, scale: 2 }).notNull().default("5.00"),
  invoice_notes:        text("invoice_notes"),
  quote_validity_days:  integer("quote_validity_days").notNull().default(7),
  payment_terms:        text("payment_terms").notNull().default("Due on receipt"),
  auto_invoice:         boolean("auto_invoice").notNull().default(false),
  show_cost_on_quote:   boolean("show_cost_on_quote").notNull().default(false),

  /* Reporting */
  fiscal_year_start:    text("fiscal_year_start").notNull().default("01-01"),

  /* Communications */
  email_from_name:   text("email_from_name"),
  email_reply_to:    text("email_reply_to"),
  sms_sender_id:     text("sms_sender_id"),

  /* Audit */
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("tenant_settings_tenant_idx").on(t.tenant_id),
]);

export type TenantSettings = typeof tenantSettingsTable.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────
   INTEGRATIONS
   One row per integration type per tenant (Stripe, WhatsApp, SMS, …)
   Secrets are stored encrypted (or masked on read by the API layer).
───────────────────────────────────────────────────────────────────────── */

export const integrationsTable = pgTable("integrations", {
  id:         uuid("id").defaultRandom().primaryKey(),
  tenant_id:  uuid("tenant_id")
    .references(() => tenantsTable.id, { onDelete: "cascade" })
    .notNull(),
  type:       text("type").notNull(),     /* "stripe" | "whatsapp" | "sms" */
  enabled:    boolean("enabled").notNull().default(false),
  config:     jsonb("config").default({}), /* type-specific fields */
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique("integrations_tenant_type_uniq").on(t.tenant_id, t.type),
  index("integrations_tenant_idx").on(t.tenant_id),
]);

export type Integration = typeof integrationsTable.$inferSelect;
