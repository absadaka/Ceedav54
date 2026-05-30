function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtNum(n: string | undefined | null): string {
  if (!n) return "0.00";
  return parseFloat(n).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" });
}

interface ShopInfo {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  vatNumber?: string | null;
  currency: string;
}

interface LineItem {
  description: string;
  type?: string;
  qty: string;
  unitPrice: string;
  lineTotal: string;
}

interface DocData {
  ref: string;
  status: string;
  date: string | Date | null;
  dueDate?: string | Date | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  vehiclePlate?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: string | null;
  vehicleVin?: string | null;
  lines: LineItem[];
  subtotal?: string;
  discount?: string;
  taxRate?: string;
  taxAmount?: string;
  total?: string;
  paidAmount?: string;
  advanceFromQuotation?: string;
  notes?: string | null;
  jobReport?: string[];
}

function baseStyles() {
  return `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; color:#1a1a2e; background:#fff; }
    .page { max-width:800px; margin:0 auto; padding:40px; }
    @media print {
      body { background:#fff; }
      .page { padding:20px; }
      .no-print { display:none !important; }
      @page { margin: 12mm 10mm; size: A4; }
    }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:24px; border-bottom:2px solid #161aff; }
    .shop-name { font-size:22px; font-weight:800; color:#161aff; margin-bottom:4px; }
    .shop-detail { font-size:11px; color:#64748b; line-height:1.6; }
    .doc-title { text-align:right; }
    .doc-title h1 { font-size:28px; font-weight:800; color:#1a1a2e; letter-spacing:-0.5px; }
    .doc-title .ref { font-size:14px; color:#64748b; margin-top:2px; }
    .doc-title .status { display:inline-block; margin-top:8px; padding:3px 12px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
    .status-draft { background:#f1f5f9; color:#64748b; }
    .status-sent { background:#dbeafe; color:#1d4ed8; }
    .status-approved { background:#dcfce7; color:#166534; }
    .status-rejected { background:#fee2e2; color:#991b1b; }
    .status-paid { background:#dcfce7; color:#166534; }
    .status-void { background:#f1f5f9; color:#64748b; }
    .status-partial { background:#fef3c7; color:#92400e; }
    .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
    .meta-box { background:#f8fafc; border-radius:8px; padding:16px; }
    .meta-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
    .meta-value { font-size:13px; color:#1a1a2e; line-height:1.5; }
    .meta-value strong { font-weight:600; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    thead th { background:#f8fafc; padding:10px 14px; font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #e2e8f0; text-align:left; }
    thead th.num { text-align:right; }
    tbody td { padding:10px 14px; font-size:13px; border-bottom:1px solid #f1f5f9; }
    tbody td.num { text-align:right; font-variant-numeric:tabular-nums; }
    tbody tr:last-child td { border-bottom:none; }
    .totals { display:flex; justify-content:flex-end; margin-bottom:28px; }
    .totals-box { width:280px; }
    .totals-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#555; }
    .totals-row.grand { padding:10px 0 0; margin-top:6px; border-top:2px solid #1a1a2e; font-size:16px; font-weight:800; color:#1a1a2e; }
    .notes-section { background:#f8fafc; border-radius:8px; padding:16px; margin-bottom:20px; }
    .notes-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
    .notes-text { font-size:13px; color:#333; line-height:1.6; }
    .report-section { background:#f0fdf4; border-radius:8px; padding:16px; margin-bottom:20px; border:1px solid #bbf7d0; }
    .footer { text-align:center; padding-top:20px; border-top:1px solid #f1f5f9; margin-top:32px; }
    .footer p { font-size:11px; color:#94a3b8; }
    .download-bar { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #e2e8f0; padding:12px; display:flex; justify-content:center; gap:12px; z-index:100; }
    .btn { display:inline-flex; align-items:center; gap:6px; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all 0.15s; }
    .btn-primary { background:#161aff; color:#fff; }
    .btn-primary:hover { background:#1014cc; }
  `;
}

function statusCls(status: string): string {
  const map: Record<string, string> = {
    draft: "status-draft", sent: "status-sent", approved: "status-approved",
    rejected: "status-rejected", paid: "status-paid", void: "status-void",
    partial: "status-partial",
  };
  return map[status] ?? "status-draft";
}

function vehicleLine(d: DocData): string {
  const parts = [d.vehicleMake, d.vehicleModel, d.vehicleYear].filter(Boolean);
  const info = parts.join(" ");
  const lines: string[] = [];
  if (info) lines.push(`<strong>${esc(info)}</strong>`);
  if (d.vehiclePlate) lines.push(`Plate: ${esc(d.vehiclePlate)}`);
  if (d.vehicleVin) lines.push(`VIN: ${esc(d.vehicleVin)}`);
  return lines.join("<br>");
}

export function quotationPdfHtml(shop: ShopInfo, doc: DocData): string {
  return documentHtml("QUOTATION", shop, doc);
}

export function invoicePdfHtml(shop: ShopInfo, doc: DocData): string {
  return documentHtml("INVOICE", shop, doc);
}

function documentHtml(docType: "QUOTATION" | "INVOICE", shop: ShopInfo, doc: DocData): string {
  const linesHtml = doc.lines.map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(l.description)}</td>
      <td style="text-transform:capitalize">${esc(l.type ?? "")}</td>
      <td class="num">${esc(l.qty)}</td>
      <td class="num">${fmtNum(l.unitPrice)}</td>
      <td class="num" style="font-weight:600">${fmtNum(l.lineTotal)}</td>
    </tr>
  `).join("");

  const shopDetails: string[] = [];
  if (shop.address) shopDetails.push(esc(shop.address));
  if (shop.phone) shopDetails.push(`Tel: ${esc(shop.phone)}`);
  if (shop.email) shopDetails.push(esc(shop.email));
  if (shop.vatNumber) shopDetails.push(`TRN: ${esc(shop.vatNumber)}`);

  const isPaid = doc.status === "paid";
  const totalLabel = docType === "INVOICE" && isPaid ? "Total Paid" : docType === "INVOICE" ? "Total Due" : "Total";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${docType === "QUOTATION" ? "Quotation" : "Invoice"} ${esc(doc.ref)} — ${esc(shop.name)}</title>
  <style>${baseStyles()}</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="shop-name">${esc(shop.name)}</div>
        <div class="shop-detail">${shopDetails.join("<br>")}</div>
      </div>
      <div class="doc-title">
        <h1>${docType}</h1>
        <div class="ref">${esc(doc.ref)}</div>
        <span class="status ${statusCls(doc.status)}">${esc(doc.status)}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-label">Bill To</div>
        <div class="meta-value">
          ${doc.clientName ? `<strong>${esc(doc.clientName)}</strong>` : "—"}
          ${doc.clientPhone ? `<br>${esc(doc.clientPhone)}` : ""}
          ${doc.clientEmail ? `<br>${esc(doc.clientEmail)}` : ""}
        </div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Details</div>
        <div class="meta-value">
          Date: ${fmtDate(doc.date)}<br>
          ${doc.dueDate ? `Due: ${fmtDate(doc.dueDate)}<br>` : ""}
          ${vehicleLine(doc) ? `<br>${vehicleLine(doc)}` : ""}
        </div>
      </div>
    </div>

    ${doc.lines.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th style="width:36px">#</th>
          <th>Description</th>
          <th style="width:80px">Type</th>
          <th class="num" style="width:60px">Qty</th>
          <th class="num" style="width:100px">Unit Price</th>
          <th class="num" style="width:100px">Total</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>
    ` : ""}

    <div class="totals">
      <div class="totals-box">
        ${doc.subtotal ? `<div class="totals-row"><span>Subtotal</span><span>${fmtNum(doc.subtotal)}</span></div>` : ""}
        ${doc.discount && parseFloat(doc.discount) > 0 ? `<div class="totals-row"><span>Discount</span><span style="color:#ef4444">-${fmtNum(doc.discount)}</span></div>` : ""}
        ${doc.taxRate && parseFloat(doc.taxRate) > 0 ? `<div class="totals-row"><span>VAT (${doc.taxRate}%)</span><span>${fmtNum(doc.taxAmount)}</span></div>` : ""}
        <div class="totals-row grand"><span>${totalLabel}</span><span>${esc(shop.currency)} ${fmtNum(doc.total)}</span></div>
        ${docType === "INVOICE" && doc.advanceFromQuotation && parseFloat(doc.advanceFromQuotation) > 0 ? `<div class="totals-row"><span>Advance Paid</span><span style="color:#16a34a">−${fmtNum(doc.advanceFromQuotation)}</span></div>` : ""}
        ${docType === "INVOICE" && doc.paidAmount && parseFloat(doc.paidAmount) > 0 && !isPaid ? `<div class="totals-row"><span>Paid</span><span style="color:#16a34a">${fmtNum(doc.paidAmount)}</span></div>` : ""}
        ${docType === "INVOICE" && !isPaid ? (() => { const adv = parseFloat(doc.advanceFromQuotation ?? "0"); const paid = parseFloat(doc.paidAmount ?? "0"); const bal = parseFloat(doc.total ?? "0") - adv - paid; return (adv > 0 || paid > 0) ? `<div class="totals-row" style="font-weight:700"><span>Balance Due</span><span>${esc(shop.currency)} ${fmtNum(String(Math.max(0, bal)))}</span></div>` : ""; })() : ""}
      </div>
    </div>

    ${doc.notes ? `
    <div class="notes-section">
      <div class="notes-label">Notes</div>
      <div class="notes-text">${esc(doc.notes)}</div>
    </div>
    ` : ""}

    ${doc.jobReport && doc.jobReport.length > 0 ? `
    <div class="report-section">
      <div class="notes-label" style="color:#166534">Job Report</div>
      ${doc.jobReport.map(n => `<p class="notes-text" style="margin-top:4px">${esc(n)}</p>`).join("")}
    </div>
    ` : ""}

    <div class="footer">
      <p>${esc(shop.name)}${shop.vatNumber ? ` · TRN ${esc(shop.vatNumber)}` : ""}</p>
      <p style="margin-top:4px">Powered by <span style="font-weight:700;color:#161aff">ceer</span></span></p>
    </div>
  </div>

  <div class="download-bar no-print">
    <button class="btn btn-primary" onclick="window.print()">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h4v7"/><path d="M4 14h8"/><path d="M4 9H2v5a1 1 0 001 1h10a1 1 0 001-1V9h-2"/></svg>
      Save as PDF
    </button>
  </div>
</body>
</html>`;
}
