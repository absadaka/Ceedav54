import { Resend } from "resend";
import { db, tenantSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

interface TenantEmailConfig {
  fromName?: string;
  replyTo?: string;
}

async function getTenantEmailConfig(tenantId: string): Promise<TenantEmailConfig> {
  const [settings] = await db
    .select({
      email_from_name: tenantSettingsTable.email_from_name,
      email_reply_to: tenantSettingsTable.email_reply_to,
    })
    .from(tenantSettingsTable)
    .where(eq(tenantSettingsTable.tenant_id, tenantId))
    .limit(1);

  return {
    fromName: settings?.email_from_name ?? undefined,
    replyTo: settings?.email_reply_to ?? undefined,
  };
}

const VERIFIED_DOMAIN = process.env.EMAIL_FROM_DOMAIN;
const DEFAULT_FROM_EMAIL = VERIFIED_DOMAIN
  ? `info@${VERIFIED_DOMAIN}`
  : "onboarding@resend.dev";

function buildFrom(shopName: string, config: TenantEmailConfig): string {
  const name = config.fromName || shopName || "CEEDA";
  return `${name} <${DEFAULT_FROM_EMAIL}>`;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  tenantId: string;
  shopName: string;
}

export async function sendEmail({ to, subject, html, tenantId, shopName }: SendEmailParams) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return { success: false, reason: "no_api_key" };
  }

  const config = await getTenantEmailConfig(tenantId);
  const from = buildFrom(shopName, config);

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      replyTo: config.replyTo || undefined,
    });

    if (result.error) {
      console.error("[email] Resend error:", result.error);
      return { success: false, reason: result.error.message };
    }

    console.log(`[email] Sent to ${to}: "${subject}"`);
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    console.error("[email] Send failed:", err.message);
    return { success: false, reason: err.message };
  }
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

function baseTemplate(shopName: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:#0a0a0a;padding:20px 32px;">
  <span style="color:#ffffff;font-size:18px;font-weight:700;">${shopName}</span>
</td></tr>
<tr><td style="padding:32px;">
  ${content}
</td></tr>
<tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
    Sent by ${shopName} via CEEDA
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

interface LineItem {
  description: string;
  type: string;
  qty: string;
  unit_price: string;
  discount: string;
  line_total: string;
}

function renderLineItemsTable(lines: LineItem[], currency: string): string {
  if (!lines.length) return "";
  const rows = lines.map(l => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#3f3f46;">${l.description}${l.type !== "labour" ? ` <span style="color:#a1a1aa;font-size:11px;">(${l.type})</span>` : ""}</td>
      <td align="center" style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#3f3f46;">${parseFloat(l.qty)}</td>
      <td align="right" style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#3f3f46;">${formatCurrency(l.unit_price, currency)}</td>
      ${parseFloat(l.discount) > 0 ? `<td align="right" style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#ef4444;">-${formatCurrency(l.discount, currency)}</td>` : `<td align="right" style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#a1a1aa;">—</td>`}
      <td align="right" style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;font-weight:600;color:#0a0a0a;">${formatCurrency(l.line_total, currency)}</td>
    </tr>`).join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <tr style="background:#f4f4f5;">
        <th align="left" style="padding:10px 12px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
        <th align="center" style="padding:10px 12px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
        <th align="right" style="padding:10px 12px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
        <th align="right" style="padding:10px 12px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Disc.</th>
        <th align="right" style="padding:10px 12px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
      </tr>
      ${rows}
    </table>`;
}

function renderSummaryRows(opts: { subtotal?: string; discount?: string; taxRate?: string; taxAmount?: string; total: string; currency: string }): string {
  const rows: string[] = [];
  if (opts.subtotal && parseFloat(opts.subtotal) > 0) {
    rows.push(`<tr><td style="font-size:13px;color:#71717a;padding:4px 0;">Subtotal</td><td align="right" style="font-size:13px;color:#3f3f46;padding:4px 0;">${formatCurrency(opts.subtotal, opts.currency)}</td></tr>`);
  }
  if (opts.discount && parseFloat(opts.discount) > 0) {
    rows.push(`<tr><td style="font-size:13px;color:#71717a;padding:4px 0;">Discount</td><td align="right" style="font-size:13px;color:#ef4444;padding:4px 0;">-${formatCurrency(opts.discount, opts.currency)}</td></tr>`);
  }
  if (opts.taxAmount && parseFloat(opts.taxAmount) > 0) {
    rows.push(`<tr><td style="font-size:13px;color:#71717a;padding:4px 0;">VAT (${opts.taxRate ?? "5"}%)</td><td align="right" style="font-size:13px;color:#3f3f46;padding:4px 0;">${formatCurrency(opts.taxAmount, opts.currency)}</td></tr>`);
  }
  rows.push(`<tr><td style="font-size:14px;font-weight:700;color:#0a0a0a;padding:8px 0 4px;border-top:2px solid #e4e4e7;">Total</td><td align="right" style="font-size:14px;font-weight:700;color:#0a0a0a;padding:8px 0 4px;border-top:2px solid #e4e4e7;">${formatCurrency(opts.total, opts.currency)}</td></tr>`);
  return rows.join("");
}

export function invoiceEmailHtml(opts: {
  shopName: string;
  invoiceRef: string;
  clientName: string;
  total: string;
  currency: string;
  dueDate?: string | null;
  subtotal?: string;
  discount?: string;
  taxRate?: string;
  taxAmount?: string;
  lineItems?: LineItem[];
  vehicleInfo?: string;
  notes?: string | null;
}): string {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0a0a0a;">Invoice ${opts.invoiceRef}</h2>
    <p style="margin:0 0 24px;color:#71717a;font-size:14px;">Hi ${opts.clientName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
      Please find your invoice details below:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="padding:12px 16px;background:#f4f4f5;border-radius:8px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#71717a;padding:4px 0;">Invoice No.</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#0a0a0a;padding:4px 0;">${opts.invoiceRef}</td>
            </tr>
            ${opts.dueDate ? `<tr>
              <td style="font-size:13px;color:#71717a;padding:4px 0;">Due Date</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#0a0a0a;padding:4px 0;">${formatDate(opts.dueDate)}</td>
            </tr>` : ""}
            ${opts.vehicleInfo ? `<tr>
              <td style="font-size:13px;color:#71717a;padding:4px 0;">Vehicle</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#0a0a0a;padding:4px 0;">${opts.vehicleInfo}</td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
    ${opts.lineItems?.length ? `<h3 style="margin:0 0 12px;font-size:15px;color:#0a0a0a;">Items</h3>` : ""}
    ${renderLineItemsTable(opts.lineItems ?? [], opts.currency)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="padding:12px 16px;background:#f4f4f5;border-radius:8px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${renderSummaryRows({ subtotal: opts.subtotal, discount: opts.discount, taxRate: opts.taxRate, taxAmount: opts.taxAmount, total: opts.total, currency: opts.currency })}
        </table>
      </td></tr>
    </table>
    ${opts.notes ? `<p style="margin:0 0 16px;font-size:13px;color:#71717a;font-style:italic;">Note: ${opts.notes}</p>` : ""}
    <p style="margin:0;font-size:14px;color:#3f3f46;">
      If you have any questions, please don't hesitate to reach out.
    </p>`;
  return baseTemplate(opts.shopName, content);
}

export function quotationEmailHtml(opts: {
  shopName: string;
  quoteRef: string;
  clientName: string;
  total: string;
  currency: string;
  expiresAt?: string | null;
  subtotal?: string;
  discount?: string;
  taxRate?: string;
  taxAmount?: string;
  lineItems?: LineItem[];
  vehicleInfo?: string;
  notes?: string | null;
}): string {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0a0a0a;">Quotation ${opts.quoteRef}</h2>
    <p style="margin:0 0 24px;color:#71717a;font-size:14px;">Hi ${opts.clientName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
      We've prepared a quotation for you. Here are the details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="padding:12px 16px;background:#f4f4f5;border-radius:8px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#71717a;padding:4px 0;">Quote No.</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#0a0a0a;padding:4px 0;">${opts.quoteRef}</td>
            </tr>
            ${opts.expiresAt ? `<tr>
              <td style="font-size:13px;color:#71717a;padding:4px 0;">Valid Until</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#0a0a0a;padding:4px 0;">${formatDate(opts.expiresAt)}</td>
            </tr>` : ""}
            ${opts.vehicleInfo ? `<tr>
              <td style="font-size:13px;color:#71717a;padding:4px 0;">Vehicle</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#0a0a0a;padding:4px 0;">${opts.vehicleInfo}</td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
    ${opts.lineItems?.length ? `<h3 style="margin:0 0 12px;font-size:15px;color:#0a0a0a;">Items</h3>` : ""}
    ${renderLineItemsTable(opts.lineItems ?? [], opts.currency)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="padding:12px 16px;background:#f4f4f5;border-radius:8px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${renderSummaryRows({ subtotal: opts.subtotal, discount: opts.discount, taxRate: opts.taxRate, taxAmount: opts.taxAmount, total: opts.total, currency: opts.currency })}
        </table>
      </td></tr>
    </table>
    ${opts.notes ? `<p style="margin:0 0 16px;font-size:13px;color:#71717a;font-style:italic;">Note: ${opts.notes}</p>` : ""}
    <p style="margin:0;font-size:14px;color:#3f3f46;">
      Please review and let us know if you'd like to proceed. We're happy to answer any questions.
    </p>`;
  return baseTemplate(opts.shopName, content);
}

export function bookingConfirmationEmailHtml(opts: {
  shopName: string;
  bookingRef: string;
  clientName: string;
  scheduledAt: string;
  vehicleInfo?: string;
}): string {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0a0a0a;">Booking Confirmed</h2>
    <p style="margin:0 0 24px;color:#71717a;font-size:14px;">Hi ${opts.clientName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
      Your booking has been confirmed. Here are the details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:12px 16px;background:#f4f4f5;border-radius:8px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#71717a;padding:4px 0;">Booking Ref</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#0a0a0a;padding:4px 0;">${opts.bookingRef}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#71717a;padding:4px 0;">Date & Time</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#0a0a0a;padding:4px 0;">${formatDate(opts.scheduledAt)}</td>
            </tr>
            ${opts.vehicleInfo ? `<tr>
              <td style="font-size:13px;color:#71717a;padding:4px 0;">Vehicle</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#0a0a0a;padding:4px 0;">${opts.vehicleInfo}</td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#3f3f46;">
      We look forward to seeing you. If you need to reschedule, please contact us.
    </p>`;
  return baseTemplate(opts.shopName, content);
}
