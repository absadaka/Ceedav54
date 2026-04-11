import { Router } from "express";
import {
  db, invoicesTable, invoiceLineItemsTable, tenantsTable,
  clientsTable, vehiclesTable, jobsTable, jobNotesTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

router.get("/:invoiceId", async (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(invoiceId)) {
      return res.status(404).send(notFoundHtml());
    }

    const [inv] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .limit(1);

    if (!inv) {
      return res.status(404).send(notFoundHtml());
    }

    const [tenant] = await db
      .select({ name: tenantsTable.name, currency: tenantsTable.currency })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, inv.tenant_id))
      .limit(1);

    const shopName = tenant?.name ?? "Workshop";
    const currency = tenant?.currency ?? "AED";

    const [client] = inv.client_id
      ? await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, inv.client_id)).limit(1)
      : [null];

    let vehicleInfo = "";
    if (inv.vehicle_id) {
      const [v] = await db.select({ make: vehiclesTable.make, model: vehiclesTable.model, plate: vehiclesTable.plate })
        .from(vehiclesTable).where(eq(vehiclesTable.id, inv.vehicle_id)).limit(1);
      if (v) vehicleInfo = [v.make, v.model, v.plate].filter(Boolean).join(" · ");
    }

    const lines = await db
      .select({
        description: invoiceLineItemsTable.description,
        type: invoiceLineItemsTable.type,
        qty: invoiceLineItemsTable.qty,
        unit_price: invoiceLineItemsTable.unit_price,
        line_total: invoiceLineItemsTable.line_total,
      })
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoice_id, inv.id))
      .orderBy(invoiceLineItemsTable.sort_order);

    let jobReportNotes: string[] = [];
    if (inv.job_id) {
      const rNotes = await db
        .select({ note: jobNotesTable.note })
        .from(jobNotesTable)
        .where(and(
          eq(jobNotesTable.job_id, inv.job_id),
          eq(jobNotesTable.tenant_id, inv.tenant_id),
          eq(jobNotesTable.type, "report"),
        ))
        .orderBy(asc(jobNotesTable.created_at));
      jobReportNotes = rNotes.map(n => n.note);
    }

    const html = successPageHtml({
      shopName,
      invoiceRef: inv.ref,
      clientName: client?.name ?? "Customer",
      total: inv.total ?? "0",
      currency,
      vehicleInfo,
      lines: lines.map(l => ({
        description: l.description,
        type: l.type,
        qty: String(l.qty),
        unitPrice: String(l.unit_price),
        lineTotal: String(l.line_total),
      })),
      subtotal: inv.subtotal ?? undefined,
      discount: inv.discount ?? undefined,
      taxRate: inv.tax_rate ?? undefined,
      taxAmount: inv.tax_amount ?? undefined,
      notes: inv.notes ?? undefined,
      jobReport: jobReportNotes,
      isPaid: inv.status === "paid",
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(html);
  } catch (err) {
    console.error("GET /payment-success/:invoiceId", err);
    return res.status(500).send("Something went wrong");
  }
});

function notFoundHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not Found</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa"><div style="text-align:center"><h1 style="font-size:2rem;color:#333">Invoice not found</h1><p style="color:#666">This payment link may have expired.</p></div></body></html>`;
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtNum(n: string | undefined | null): string {
  if (!n) return "0.00";
  return parseFloat(n).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function successPageHtml(opts: {
  shopName: string;
  invoiceRef: string;
  clientName: string;
  total: string;
  currency: string;
  vehicleInfo: string;
  lines: { description: string; type: string; qty: string; unitPrice: string; lineTotal: string }[];
  subtotal?: string;
  discount?: string;
  taxRate?: string;
  taxAmount?: string;
  notes?: string;
  jobReport: string[];
  isPaid: boolean;
}) {
  const linesHtml = opts.lines.map((l, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;font-size:13px">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px">${esc(l.description)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;font-size:13px;text-transform:capitalize">${esc(l.type)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px">${esc(l.qty)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px">${fmtNum(l.unitPrice)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600">${fmtNum(l.lineTotal)}</td>
    </tr>
  `).join("");

  const reportHtml = opts.jobReport.length > 0 ? `
    <div id="report-section" style="margin-top:24px;padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0">
      <h3 style="margin:0 0 12px;font-size:15px;color:#166534;font-weight:700">Job Report</h3>
      ${opts.jobReport.map(n => `<p style="margin:4px 0;font-size:13px;color:#333;line-height:1.5">${esc(n)}</p>`).join("")}
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Successful — ${esc(opts.shopName)}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f8fafc; min-height:100vh; }
    .confetti-container { position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1000; overflow:hidden; }
    .confetti {
      position:absolute; width:10px; height:10px; top:-10px;
      animation: confetti-fall linear forwards;
    }
    @keyframes confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity:1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity:0; }
    }
    .page { max-width:640px; margin:0 auto; padding:40px 20px 60px; position:relative; z-index:1; }
    .success-icon {
      width:80px; height:80px; margin:0 auto 20px; border-radius:50%; background:#22c55e;
      display:flex; align-items:center; justify-content:center;
      animation: pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
      transform: scale(0);
    }
    @keyframes pop { 0% { transform:scale(0); } 100% { transform:scale(1); } }
    .checkmark { width:40px; height:40px; fill:none; stroke:#fff; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
    .checkmark path {
      stroke-dasharray: 60; stroke-dashoffset: 60;
      animation: draw 0.6s 0.3s ease forwards;
    }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    .card {
      background:#fff; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
      padding:24px; margin-top:24px;
    }
    .btn {
      display:inline-flex; align-items:center; gap:8px; padding:12px 24px;
      border-radius:10px; font-size:14px; font-weight:600; cursor:pointer;
      border:none; text-decoration:none; transition:all 0.15s;
    }
    .btn-primary { background:#161aff; color:#fff; }
    .btn-primary:hover { background:#1014cc; transform:translateY(-1px); box-shadow:0 4px 12px rgba(22,26,255,0.3); }
    .btn-outline { background:#fff; color:#333; border:1.5px solid #e2e8f0; }
    .btn-outline:hover { border-color:#cbd5e1; background:#f8fafc; }
    @media print {
      .confetti-container, .actions, .no-print { display:none !important; }
      body { background:#fff; }
      .card { box-shadow:none; border:1px solid #eee; }
    }
  </style>
</head>
<body>
  <div class="confetti-container" id="confetti"></div>

  <div class="page">
    <div style="text-align:center;margin-bottom:32px">
      <div class="success-icon">
        <svg class="checkmark" viewBox="0 0 40 40"><path d="M10 20 L17 27 L30 13" /></svg>
      </div>
      <h1 style="font-size:28px;font-weight:800;color:#111;margin-bottom:6px">Payment Successful!</h1>
      <p style="font-size:15px;color:#64748b">Thank you for your payment, ${esc(opts.clientName)}</p>
    </div>

    <div class="card" style="text-align:center;padding:28px">
      <p style="font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${esc(opts.shopName)}</p>
      <p style="font-size:13px;color:#64748b;margin-bottom:16px">Invoice ${esc(opts.invoiceRef)}</p>
      <p style="font-size:36px;font-weight:800;color:#111">${esc(opts.currency)} ${fmtNum(opts.total)}</p>
      ${opts.isPaid ? `<span style="display:inline-block;margin-top:12px;padding:4px 14px;border-radius:20px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;text-transform:uppercase">Paid</span>` : ""}
      ${opts.vehicleInfo ? `<p style="margin-top:12px;font-size:13px;color:#64748b">${esc(opts.vehicleInfo)}</p>` : ""}
    </div>

    ${opts.lines.length > 0 ? `
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid #f1f5f9">
        <h3 style="font-size:14px;font-weight:700;color:#333">Invoice Details</h3>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase">#</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase">Description</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase">Type</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase">Qty</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase">Unit Price</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase">Total</th>
            </tr>
          </thead>
          <tbody>${linesHtml}</tbody>
        </table>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #f1f5f9">
        ${opts.subtotal ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#555"><span>Subtotal</span><span>${fmtNum(opts.subtotal)}</span></div>` : ""}
        ${opts.discount && parseFloat(opts.discount) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#ef4444"><span>Discount</span><span>-${fmtNum(opts.discount)}</span></div>` : ""}
        ${opts.taxRate && parseFloat(opts.taxRate) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#555"><span>VAT (${opts.taxRate}%)</span><span>${fmtNum(opts.taxAmount)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:16px;font-weight:700;color:#111;border-top:1px solid #eee;margin-top:4px"><span>Total Paid</span><span>${esc(opts.currency)} ${fmtNum(opts.total)}</span></div>
      </div>
    </div>
    ` : ""}

    ${reportHtml}

    ${opts.notes ? `
    <div class="card">
      <h3 style="font-size:14px;font-weight:700;color:#333;margin-bottom:8px">Notes</h3>
      <p style="font-size:13px;color:#555;line-height:1.6">${esc(opts.notes)}</p>
    </div>
    ` : ""}

    <div class="actions" style="margin-top:28px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h4v7"/><path d="M4 14h8"/><path d="M4 9H2v5a1 1 0 001 1h10a1 1 0 001-1V9h-2"/></svg>
        Download Invoice
      </button>
      ${opts.jobReport.length > 0 ? `
      <button class="btn btn-outline" onclick="printReport()">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v12l4-3 4 3V4a2 2 0 00-2-2z"/></svg>
        Download Report
      </button>
      ` : ""}
    </div>

    <p style="text-align:center;margin-top:32px;font-size:12px;color:#94a3b8">
      Powered by <span style="font-weight:700;color:#161aff">ceeda</span><span style="color:#161aff">></span>
    </p>
  </div>

  <script>
    (function() {
      var colors = ['#161aff','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
      var container = document.getElementById('confetti');
      for (var i = 0; i < 80; i++) {
        var el = document.createElement('div');
        el.className = 'confetti';
        el.style.left = Math.random() * 100 + '%';
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        el.style.width = (Math.random() * 8 + 6) + 'px';
        el.style.height = (Math.random() * 8 + 6) + 'px';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.animationDuration = (Math.random() * 2 + 2) + 's';
        el.style.animationDelay = (Math.random() * 1.5) + 's';
        container.appendChild(el);
      }
      setTimeout(function() { container.style.display = 'none'; }, 5000);
    })();

    function printReport() {
      var allCards = document.querySelectorAll('.card');
      allCards.forEach(function(c) { c.style.display = 'none'; });
      var report = document.getElementById('report-section');
      if (report) report.style.display = 'block';
      window.print();
      allCards.forEach(function(c) { c.style.display = ''; });
    }
  </script>
</body>
</html>`;
}

export default router;
