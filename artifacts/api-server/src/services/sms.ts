import twilio from "twilio";
import {
  db,
  integrationsTable,
  tenantSettingsTable,
  customerMessagesTable,
  DEFAULT_NOTIFICATIONS,
  type NotificationEvent,
  type NotificationChannel,
  type NotificationsConfig,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

let _client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!_client) _client = twilio(sid, token);
  return _client;
}

const SMS_FROM = () => process.env.TWILIO_PHONE_NUMBER || "";
const WA_FROM = () => {
  const num = process.env.TWILIO_WHATSAPP_NUMBER || "";
  return num.startsWith("whatsapp:") ? num : num ? `whatsapp:${num}` : "";
};

/* ─────────────────────────────────────────────────────────────────────────
   GATING — per-tenant integration on/off + per-event channel toggle
───────────────────────────────────────────────────────────────────────── */

async function isTenantChannelEnabled(
  tenantId: string,
  channel: "sms" | "whatsapp",
): Promise<boolean> {
  const [row] = await db
    .select({ enabled: integrationsTable.enabled })
    .from(integrationsTable)
    .where(
      and(
        eq(integrationsTable.tenant_id, tenantId),
        eq(integrationsTable.type, channel),
      ),
    )
    .limit(1);

  // No row = integration never configured = treat as off
  return !!row?.enabled;
}

export async function isEventEnabled(
  tenantId: string,
  event: Exclude<NotificationEvent, "manual">,
  channel: NotificationChannel,
): Promise<boolean> {
  const [row] = await db
    .select({ notifications: tenantSettingsTable.notifications })
    .from(tenantSettingsTable)
    .where(eq(tenantSettingsTable.tenant_id, tenantId))
    .limit(1);

  const cfg = ((row?.notifications as NotificationsConfig | null) ?? DEFAULT_NOTIFICATIONS);
  return cfg?.[event]?.[channel] ?? DEFAULT_NOTIFICATIONS[event][channel];
}

/* ─────────────────────────────────────────────────────────────────────────
   MESSAGE LOG
───────────────────────────────────────────────────────────────────────── */

export interface LogMessageParams {
  tenantId: string;
  clientId?: string | null;
  channel: NotificationChannel;
  event?: NotificationEvent;
  to: string;
  subject?: string | null;
  body: string;
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string | null;
  error?: string | null;
  relatedType?: "booking" | "quotation" | "invoice" | "job" | null;
  relatedId?: string | null;
  sentByUserId?: string | null;
}

export async function logCustomerMessage(p: LogMessageParams): Promise<void> {
  try {
    await db.insert(customerMessagesTable).values({
      tenant_id:           p.tenantId,
      client_id:           p.clientId ?? null,
      channel:             p.channel,
      event:               p.event ?? null,
      to_address:          p.to,
      subject:             p.subject ?? null,
      body:                p.body,
      status:              p.status,
      provider_message_id: p.providerMessageId ?? null,
      error:               p.error ?? null,
      related_type:        p.relatedType ?? null,
      related_id:          p.relatedId ?? null,
      sent_by_user_id:     p.sentByUserId ?? null,
    });
  } catch (err: any) {
    // Never let logging break the send flow
    console.error("[messages] log insert failed:", err.message);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   SEND
───────────────────────────────────────────────────────────────────────── */

interface SendCommonParams {
  to: string;
  body: string;
  tenantId: string;
  /** When provided, gates the send on tenant_settings.notifications[event][channel] */
  event?: Exclude<NotificationEvent, "manual">;
  /** Skip both integration and event gating (used by manual sends from the UI) */
  skipGating?: boolean;
  // Logging metadata
  clientId?: string | null;
  relatedType?: LogMessageParams["relatedType"];
  relatedId?: string | null;
  sentByUserId?: string | null;
}

export type SendResult =
  | { success: true; sid: string }
  | { success: false; reason: string };

export async function sendSms(params: SendCommonParams & { to: string; body: string; tenantId: string }): Promise<SendResult> {
  return sendViaTwilio({ ...params, channel: "sms" });
}

export async function sendWhatsApp(params: SendCommonParams & { to: string; body: string; tenantId: string }): Promise<SendResult> {
  return sendViaTwilio({ ...params, channel: "whatsapp" });
}

async function sendViaTwilio(p: SendCommonParams & { channel: "sms" | "whatsapp" }): Promise<SendResult> {
  const { channel, to, body, tenantId, event, skipGating } = p;
  const tag = `[${channel}]`;

  // 1) Integration on/off
  if (!skipGating) {
    const integEnabled = await isTenantChannelEnabled(tenantId, channel);
    if (!integEnabled) {
      console.log(`${tag} skipped — integration disabled for tenant`);
      await logCustomerMessage({ ...logMeta(p), status: "skipped", error: "integration_disabled" });
      return { success: false, reason: "integration_disabled" };
    }

    // 2) Per-event toggle
    if (event) {
      const eventOn = await isEventEnabled(tenantId, event, channel);
      if (!eventOn) {
        console.log(`${tag} skipped — event ${event} disabled for tenant`);
        await logCustomerMessage({ ...logMeta(p), status: "skipped", error: `event_disabled:${event}` });
        return { success: false, reason: "event_disabled" };
      }
    }
  }

  // 3) Twilio creds
  const client = getClient();
  if (!client) {
    console.warn(`${tag} Twilio not configured — skipping`);
    await logCustomerMessage({ ...logMeta(p), status: "failed", error: "no_twilio_credentials" });
    return { success: false, reason: "no_twilio_credentials" };
  }

  // 4) From number
  const from = channel === "sms" ? SMS_FROM() : WA_FROM();
  if (!from) {
    const reason = channel === "sms" ? "no_phone_number" : "no_whatsapp_number";
    console.warn(`${tag} ${reason} — skipping`);
    await logCustomerMessage({ ...logMeta(p), status: "failed", error: reason });
    return { success: false, reason };
  }

  // 5) Send
  let toFmt = normalizePhone(to);
  if (channel === "whatsapp" && !toFmt.startsWith("whatsapp:")) toFmt = `whatsapp:${toFmt}`;

  try {
    const message = await client.messages.create({ body, from, to: toFmt });
    console.log(`${tag} sent to ${to}: SID=${message.sid}`);
    await logCustomerMessage({ ...logMeta(p), status: "sent", providerMessageId: message.sid });
    return { success: true, sid: message.sid };
  } catch (err: any) {
    console.error(`${tag} send failed:`, err.message);
    await logCustomerMessage({ ...logMeta(p), status: "failed", error: err.message });
    return { success: false, reason: err.message };
  }
}

function logMeta(p: SendCommonParams & { channel: NotificationChannel }): LogMessageParams {
  return {
    tenantId:    p.tenantId,
    clientId:    p.clientId,
    channel:     p.channel,
    event:       p.event,
    to:          p.to,
    body:        p.body,
    status:      "sent", // overwritten by caller
    relatedType: p.relatedType,
    relatedId:   p.relatedId,
    sentByUserId: p.sentByUserId,
  };
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("whatsapp:")) return cleaned;
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("0")) {
      cleaned = "+971" + cleaned.slice(1);
    } else if (cleaned.startsWith("5")) {
      cleaned = "+971" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}

/* ─────────────────────────────────────────────────────────────────────────
   TEMPLATES
───────────────────────────────────────────────────────────────────────── */

function formatCurrency(amount: string | number, currency: string = "AED"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${num.toFixed(2)} ${currency}`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function bookingConfirmationSmsBody(opts: {
  shopName: string;
  bookingRef: string;
  clientName: string;
  scheduledAt: string;
  vehicleInfo?: string;
}): string {
  let msg = `Hi ${opts.clientName}, your booking ${opts.bookingRef} at ${opts.shopName} is confirmed for ${formatDate(opts.scheduledAt)}.`;
  if (opts.vehicleInfo) msg += ` Vehicle: ${opts.vehicleInfo}.`;
  msg += ` We look forward to seeing you!`;
  return msg;
}

export function quotationSmsBody(opts: {
  shopName: string;
  quoteRef: string;
  clientName: string;
  total: string;
  currency: string;
  approveUrl?: string;
  rejectUrl?: string;
}): string {
  let msg = `Hi ${opts.clientName}, ${opts.shopName} has sent you quotation ${opts.quoteRef} for ${formatCurrency(opts.total, opts.currency)}.`;
  if (opts.approveUrl) msg += `\n\nApprove: ${opts.approveUrl}`;
  if (opts.rejectUrl)  msg += `\nReject: ${opts.rejectUrl}`;
  return msg;
}

export function invoiceSmsBody(opts: {
  shopName: string;
  invoiceRef: string;
  clientName: string;
  total: string;
  currency: string;
  dueDate?: string | null;
  paymentUrl?: string | null;
  advanceFromQuotation?: string | null;
}): string {
  const advance = parseFloat(opts.advanceFromQuotation ?? "0");
  const totalVal = parseFloat(opts.total ?? "0");
  const balanceDue = Math.max(0, totalVal - advance);
  let msg = `Hi ${opts.clientName}, invoice ${opts.invoiceRef} from ${opts.shopName} for ${formatCurrency(opts.total, opts.currency)} is ready.`;
  if (advance > 0) {
    msg += ` Advance paid: ${formatCurrency(String(advance), opts.currency)}. Balance due: ${formatCurrency(String(balanceDue), opts.currency)}.`;
  }
  if (opts.dueDate) msg += ` Due: ${formatDate(opts.dueDate)}.`;
  if (opts.paymentUrl) msg += `\n\nPay online: ${opts.paymentUrl}`;
  msg += ` Thank you for your business!`;
  return msg;
}

const JOB_STATUS_LABELS: Record<string, string> = {
  new:           "received",
  waiting:       "waiting in queue",
  in_progress:   "in progress",
  waiting_parts: "waiting for parts",
  on_hold:       "on hold",
  qc:            "in quality check",
  completed:     "completed and ready for pickup",
  invoiced:      "invoiced",
  paid:          "paid",
  delivered:     "delivered",
  cancelled:     "cancelled",
};

export function jobStatusSmsBody(opts: {
  shopName: string;
  jobRef: string;
  clientName: string;
  status: string;
  vehicleInfo?: string;
  note?: string | null;
}): string {
  const label = JOB_STATUS_LABELS[opts.status] ?? opts.status;
  let msg = `Hi ${opts.clientName}, your job ${opts.jobRef}`;
  if (opts.vehicleInfo) msg += ` (${opts.vehicleInfo})`;
  msg += ` at ${opts.shopName} is now ${label}.`;
  if (opts.note) msg += ` Note: ${opts.note}`;
  return msg;
}

/** Statuses that should trigger a customer notification by default. */
export const NOTIFIABLE_JOB_STATUSES = new Set([
  "in_progress",
  "waiting_parts",
  "on_hold",
  "qc",
  "completed",
  "delivered",
  "cancelled",
]);
