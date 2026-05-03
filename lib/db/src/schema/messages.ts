import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { tenantsTable, usersTable } from "./platform";
import { clientsTable } from "./clients";

export const customerMessagesTable = pgTable("customer_messages", {
  id:                  uuid("id").defaultRandom().primaryKey(),
  tenant_id:           uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  client_id:           uuid("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  channel:             text("channel").notNull(),               // 'email' | 'sms' | 'whatsapp'
  direction:           text("direction").notNull().default("outbound"),
  event:               text("event"),                           // 'booking_confirmation' | 'job_status' | ...
  to_address:          text("to_address").notNull(),
  subject:             text("subject"),
  body:                text("body"),
  status:              text("status").notNull(),                // 'sent' | 'failed' | 'skipped'
  provider_message_id: text("provider_message_id"),
  error:               text("error"),
  related_type:        text("related_type"),                    // 'booking' | 'quotation' | 'invoice' | 'job'
  related_id:          uuid("related_id"),
  sent_by_user_id:     uuid("sent_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  created_at:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("customer_messages_tenant_idx").on(t.tenant_id),
  index("customer_messages_client_idx").on(t.client_id),
  index("customer_messages_related_idx").on(t.related_type, t.related_id),
  index("customer_messages_created_idx").on(t.created_at),
]);

export type CustomerMessage = typeof customerMessagesTable.$inferSelect;
export type NotificationEvent = "booking_confirmation" | "job_status" | "invoice" | "quote" | "reminder" | "manual";
export type NotificationChannel = "email" | "sms" | "whatsapp";

export type NotificationsConfig = Record<
  Exclude<NotificationEvent, "manual">,
  Record<NotificationChannel, boolean>
>;

export const DEFAULT_NOTIFICATIONS: NotificationsConfig = {
  booking_confirmation: { email: true,  sms: false, whatsapp: true  },
  job_status:           { email: false, sms: false, whatsapp: true  },
  invoice:              { email: true,  sms: false, whatsapp: true  },
  quote:                { email: true,  sms: false, whatsapp: true  },
  reminder:             { email: true,  sms: false, whatsapp: false },
};
