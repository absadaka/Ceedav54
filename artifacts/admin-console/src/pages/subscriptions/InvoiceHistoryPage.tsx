import { useState } from "react";
import { FileText, Search, Download, Eye, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const INVOICES = [
  { id: "INV-2026-0042", tenant: "Al Baraka Auto", plan: "professional", amount: 149, status: "paid", date: "2026-03-01", paidAt: "2026-03-01" },
  { id: "INV-2026-0041", tenant: "Dubai Motors", plan: "enterprise", amount: 499, status: "paid", date: "2026-03-01", paidAt: "2026-03-02" },
  { id: "INV-2026-0040", tenant: "Quick Fix Garage", plan: "professional", amount: 149, status: "overdue", date: "2026-02-01", paidAt: null },
  { id: "INV-2026-0039", tenant: "Precision Auto Care", plan: "professional", amount: 119.20, status: "paid", date: "2026-02-01", paidAt: "2026-02-01" },
  { id: "INV-2026-0038", tenant: "Al Baraka Auto", plan: "professional", amount: 149, status: "paid", date: "2026-02-01", paidAt: "2026-02-03" },
  { id: "INV-2026-0037", tenant: "Gulf Star Workshop", plan: "enterprise", amount: 499, status: "void", date: "2026-01-01", paidAt: null },
  { id: "INV-2026-0036", tenant: "Dubai Motors", plan: "enterprise", amount: 499, status: "paid", date: "2026-01-01", paidAt: "2026-01-01" },
];

const STATUS_STYLES: Record<string, string> = {
  paid: "text-emerald-700 bg-emerald-50 border-emerald-200",
  overdue: "text-red-700 bg-red-50 border-red-200",
  pending: "text-amber-700 bg-amber-50 border-amber-200",
  void: "text-gray-500 bg-gray-50 border-gray-200",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function InvoiceHistoryPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = INVOICES
    .filter(inv => statusFilter === "all" || inv.status === statusFilter)
    .filter(inv => [inv.id, inv.tenant].some(v => v.toLowerCase().includes(q.toLowerCase())));

  const totalPaid = INVOICES.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = INVOICES.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Invoice History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform subscription invoices across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Invoices</p>
          <p className="text-2xl font-semibold mt-1">{INVOICES.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Collected</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600">AED {totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
          <p className="text-2xl font-semibold mt-1 text-red-500">AED {totalOverdue.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Void</p>
          <p className="text-2xl font-semibold mt-1 text-gray-400">{INVOICES.filter(i => i.status === "void").length}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search invoices…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          {["all", "paid", "overdue", "void"].map((s, i) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn(
              "px-2.5 py-1.5 text-xs font-medium transition-colors capitalize",
              i > 0 && "border-l border-border",
              statusFilter === s ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}>{s}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Invoice</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tenant</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Plan</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Date</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(inv => (
              <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.id}</td>
                <td className="px-4 py-3 font-medium">{inv.tenant}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <Badge variant="outline" className="text-[10px] capitalize">{inv.plan}</Badge>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">AED {inv.amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_STYLES[inv.status])}>
                    {inv.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(inv.date)}</td>
                <td className="px-4 py-3">
                  <button className="p-1 hover:bg-muted rounded"><Download className="w-3 h-3 text-muted-foreground" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground">No invoices found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
