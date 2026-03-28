import { AlertTriangle, RotateCcw, Mail, Search, CreditCard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FAILED = [
  { id: "fp-001", tenant: "Quick Fix Garage", email: "ops@quickfix.ae", plan: "professional", amount: 149, failedAt: "2026-03-15T10:23:00Z", reason: "Card declined — insufficient funds", retries: 3, lastRetry: "2026-03-20T08:00:00Z", resolved: false },
  { id: "fp-002", tenant: "Abu Dhabi Service Center", email: "billing@adsc.ae", plan: "professional", amount: 149, failedAt: "2026-03-10T14:45:00Z", reason: "Card expired", retries: 2, lastRetry: "2026-03-14T08:00:00Z", resolved: false },
  { id: "fp-003", tenant: "Sharjah Auto Hub", email: "admin@sharjahauto.ae", plan: "enterprise", amount: 499, failedAt: "2026-02-28T09:00:00Z", reason: "Payment method removed", retries: 3, lastRetry: "2026-03-05T08:00:00Z", resolved: true },
  { id: "fp-004", tenant: "Al Ain Motors", email: "finance@alainmotors.ae", plan: "professional", amount: 149, failedAt: "2026-02-15T11:30:00Z", reason: "3D Secure authentication failed", retries: 1, lastRetry: "2026-02-17T08:00:00Z", resolved: true },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function FailedPaymentsPage() {
  const [q, setQ] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const filtered = FAILED
    .filter(f => showResolved || !f.resolved)
    .filter(f => [f.tenant, f.email, f.reason].some(v => v.toLowerCase().includes(q.toLowerCase())));

  const unresolvedCount = FAILED.filter(f => !f.resolved).length;
  const totalAtRisk = FAILED.filter(f => !f.resolved).reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Failed Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track and resolve payment failures.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Unresolved</p>
          <p className="text-2xl font-semibold mt-1 text-red-700">{unresolvedCount}</p>
          <p className="text-xs text-red-600 mt-0.5">Requires attention</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue at Risk</p>
          <p className="text-2xl font-semibold mt-1">AED {totalAtRisk.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly recurring</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Failures</p>
          <p className="text-2xl font-semibold mt-1">{FAILED.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{FAILED.filter(f => f.resolved).length} resolved</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          {[false, true].map((v, i) => (
            <button key={String(v)} onClick={() => setShowResolved(v)} className={cn(
              "px-2.5 py-1.5 text-xs font-medium transition-colors",
              i > 0 && "border-l border-border",
              showResolved === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}>{v ? "All" : "Unresolved"}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(f => (
          <div key={f.id} className={cn(
            "bg-card border rounded-lg p-4",
            f.resolved ? "border-border" : "border-red-200 bg-red-50/30"
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={cn("w-4 h-4 shrink-0", f.resolved ? "text-gray-400" : "text-red-500")} />
                  <span className="font-semibold text-foreground">{f.tenant}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{f.plan}</Badge>
                  {f.resolved && <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">Resolved</Badge>}
                </div>
                <p className="text-sm text-muted-foreground ml-6">{f.reason}</p>
                <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-muted-foreground">
                  <span>Failed: {fmtDate(f.failedAt)}</span>
                  <span>{f.retries} retries</span>
                  {!f.resolved && <span className="text-red-600 font-medium">{daysSince(f.failedAt)} days overdue</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-foreground tabular-nums">AED {f.amount.toFixed(2)}</p>
                {!f.resolved && (
                  <div className="flex items-center gap-1 mt-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><RotateCcw className="w-3 h-3" />Retry</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><Mail className="w-3 h-3" />Notify</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <CreditCard className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">No failed payments</p>
          </div>
        )}
      </div>
    </div>
  );
}
