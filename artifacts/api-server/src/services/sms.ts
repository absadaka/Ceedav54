import twilio from "twilio";
import { db, tenantSettingsTable, integrationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

let _client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!_client) _client = twilio(sid, token);
  return _client;
}

interface TenantSmsConfig {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  twilioPhone: string;
  twilioWhatsappPhone: string;
  senderName: string;
}

async function getTenantSmsConfig(tenantId: string): Promise<TenantSmsConfig> {
  const [settings] = await db
    .select({ sms_sender_id: tenantSettingsTable.sms_sender_id })
    .from(tenantSettingsTable)
    .where(eq(tenantSettingsTable.tenant_id, tenantId))
    .limit(1);

  const integrations = await db
    .select({ type: integrationsTable.type, enabled: integrationsTable.enabled, config: integrationsTable.config })
    .from(integrationsTable)
    .where(eq(integrationsTable.tenant_id, tenantId));

  const smsInteg = integrations.find((i) => i.type === "sms");
  const waInteg = integrations.find((i) => i.type === "whatsapp");

  const smsCfg = (smsInteg?.config ?? {}) as Record<string, string>;
  const waCfg = (waInteg?.config ?? {}) as Record<string, string>;

  return {
    smsEnabled: smsInteg?.enabled ?? false,
    whatsappEnabled: waInteg?.enabled ?? false,
    twilioPhone: smsCfg.phone_number || process.env.TWILIO_PHONE_NUMBER || "",
    twilioWhatsappPhone: waCfg.phone_number || process.env.TWILIO_WHATSAPP_NUMBER || "",
    senderName: settings?.sms_sender_id || "",
  };
}

interface SendSmsParams {
  to: string;
  body: string;
  tenantId: string;
}

export async function sendSms({ to, body, tenantId }: SendSmsParams) {
  const client = getClient();
  if (!client) {
    console.warn("[sms] Twilio not configured — skipping SMS");
    return { success: false, reason: "no_twilio_credentials" };
  }

  const config = await getTenantSmsConfig(tenantId);
  if (!config.smsEnabled) {
    console.log("[sms] SMS disabled for tenant — skipping");
    return { success: false, reason: "sms_disabled" };
  }

  if (!config.twilioPhone) {
    console.warn("[sms] No Twilio phone number configured");
    return { success: false, reason: "no_phone_number" };
  }

  try {
    const message = await client.messages.create({
      body,
      from: config.twilioPhone,
      to: normalizePhone(to),
    });
    console.log(`[sms] Sent to ${to}: SID=${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (err: any) {
    console.error("[sms] Send failed:", err.message);
    return { success: false, reason: err.message };
  }
}

interface SendWhatsAppParams {
  to: string;
  body: string;
  tenantId: string;
}

export async function sendWhatsApp({ to, body, tenantId }: SendWhatsAppParams) {
  const client = getClient();
  if (!client) {
    console.warn("[whatsapp] Twilio not configured — skipping WhatsApp");
    return { success: false, reason: "no_twilio_credentials" };
  }

  const config = await getTenantSmsConfig(tenantId);
  if (!config.whatsappEnabled) {
    console.log("[whatsapp] WhatsApp disabled for tenant — skipping");
    return { success: false, reason: "whatsapp_disabled" };
  }

  if (!config.twilioWhatsappPhone) {
    console.warn("[whatsapp] No WhatsApp phone number configured");
    return { success: false, reason: "no_whatsapp_number" };
  }

  const waFrom = config.twilioWhatsappPhone.startsWith("whatsapp:")
    ? config.twilioWhatsappPhone
    : `whatsapp:${config.twilioWhatsappPhone}`;

  const waTo = normalizePhone(to);
  const waToFmt = waTo.startsWith("whatsapp:") ? waTo : `whatsapp:${waTo}`;

  try {
    const message = await client.messages.create({
      body,
      from: waFrom,
      to: waToFmt,
    });
    console.log(`[whatsapp] Sent to ${to}: SID=${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (err: any) {
    console.error("[whatsapp] Send failed:", err.message);
    return { success: false, reason: err.message };
  }
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (!cleaned.startsWith("+") && !cleaned.startsWith("whatsapp:")) {
    if (cleaned.startsWith("0")) {
      cleaned = "+971" + cleaned.slice(1);
    } else if (cleaned.startsWith("5")) {
      cleaned = "+971" + cleaned;
    } else if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}

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
  if (opts.approveUrl) {
    msg += `\n\nApprove: ${opts.approveUrl}`;
  }
  if (opts.rejectUrl) {
    msg += `\nReject: ${opts.rejectUrl}`;
  }
  return msg;
}

export function invoiceSmsBody(opts: {
  shopName: string;
  invoiceRef: string;
  clientName: string;
  total: string;
  currency: string;
  dueDate?: string | null;
}): string {
  let msg = `Hi ${opts.clientName}, invoice ${opts.invoiceRef} from ${opts.shopName} for ${formatCurrency(opts.total, opts.currency)} is ready.`;
  if (opts.dueDate) msg += ` Due: ${formatDate(opts.dueDate)}.`;
  msg += ` Thank you for your business!`;
  return msg;
}
