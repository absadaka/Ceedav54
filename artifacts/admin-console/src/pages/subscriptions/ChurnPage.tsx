import { useState } from "react";
import { UserMinus, RefreshCw, Calendar, AlertTriangle, TrendingDown, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CHURN_DATA = [
  { id: "1", tenant: "Ajman Auto Services", plan: "professional", mrr: 149, churnedAt: "2026-02-20", reason: "Switched to competitor", feedback: "Missing multi-branch support", reactivatable: true },
  { id: "2", tenant: "RAK Motors", plan: "starter", mrr: 0, churnedAt: "2026-01-15", reason: "Business closed", feedback: null, reactivatable: false },
];

const RENEWALS = [
  { id: "r1", tenant: "Al Baraka Auto", plan: "professional", mrr: 149, renewsAt: "2026-04-01", autoRenew: true, daysUntil: 4 },
  { id: "r2", tenant: "Dubai Motors", plan: "enterprise", mrr: 499, renewsAt: "2026-04-05", autoRenew: true, daysUntil: 8 },
  { id: "r3", tenant: "Quick Fix Garage", plan: "professional", mrr: 149, renewsAt: "2026-04-10", autoRenew: false, daysUntil: 13 },
  { id: "r4", tenant: "Precision Auto Care", plan: "professional", mrr: 149, renewsAt: "2026-04-15", autoRenew: true, daysUntil: 18 },
  { id: "r5", tenant: "Gulf Star Workshop", plan: "enterprise", mrr: 499, renewsAt: "2026-05-01", autoRenew: true, daysUntil: 34 },
];

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const CHURN_RATES = [0, 0, 0, 4.2, 0, 0];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ChurnPage() {
  const [tab, setTab] = useState<"churn" | "renewals">("renewals");
  const churnRate = 2.1;
  const totalChurned = CHURN_DATA.reduce((s, c) => s + c.mrr, 0);
  const atRisk = RENEWALS.filter(r => !r.autoRenew);
  const upcomingRevenue = RENEWALS.reduce((s, r) => s + r.mrr, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Churn & Renewals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track subscription churn and upcoming renewals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Churn Rate</p>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{churnRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">Monthly average</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Churned MRR</p>
            <UserMinus className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-3xl font-semibold text-foreground">AED {totalChurned}</p>
          <p className="text-xs text-muted-foreground mt-1">{CHURN_DATA.length} tenant{CHURN_DATA.length !== 1 ? "s" : ""} churned</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upcoming Renewals</p>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{RENEWALS.length}</p>
          <p className="text-xs text-muted-foreground mt-1">AED {upcomingRevenue.toLocaleString()} MRR</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">At Risk</p>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-semibold text-foreground text-amber-600">{atRisk.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Auto-renew disabled</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Monthly Churn Rate (%)</p>
        <div className="flex items-end gap-3 h-32">
          {CHURN_RATES.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{v}%</span>
              <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                <div
                  className={cn("w-full rounded-t", v > 3 ? "bg-red-400" : v > 0 ? "bg-amber-400" : "bg-emerald-400")}
                  style={{ height: `${Math.max((v / 5) * 100, 4)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{MONTHS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center border border-border rounded-md overflow-hidden w-fit">
        {(["renewals", "churn"] as const).map((t, i) => (
          <button key={t} onClick={() => setTab(t)} className={cn(
            "px-3 py-1.5 text-xs font-medium transition-colors capitalize",
            i > 0 && "border-l border-border",
            tab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
          )}>{t === "renewals" ? "Upcoming Renewals" : "Churned Tenants"}</button>
        ))}
      </div>

      {tab === "renewals" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tenant</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Plan</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">MRR</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Renews</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Auto-Renew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RENEWALS.map(r => (
                <tr key={r.id} className={cn("hover:bg-muted/20 transition-colors", !r.autoRenew && "bg-amber-50/50")}>
                  <td className="px-4 py-3 font-medium">{r.tenant}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="outline" className="text-[10px] capitalize">{r.plan}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">AED {r.mrr}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm">{fmtDate(r.renewsAt)}</span>
                      <span className={cn(
                        "text-xs ml-2",
                        r.daysUntil <= 7 ? "text-red-600 font-medium" : "text-muted-foreground"
                      )}>
                        {r.daysUntil}d
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.autoRenew ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">No</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "churn" && (
        <div className="space-y-3">
          {CHURN_DATA.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <UserMinus className="w-4 h-4 text-red-400" />
                    <span className="font-semibold text-foreground">{c.tenant}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{c.plan}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">{c.reason}</p>
                  {c.feedback && <p className="text-xs text-muted-foreground ml-6 mt-1 italic">"{c.feedback}"</p>}
                  <p className="text-xs text-muted-foreground ml-6 mt-1">Churned: {fmtDate(c.churnedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600 tabular-nums">-AED {c.mrr}/mo</p>
                  {c.reactivatable && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 mt-2">
                      <RefreshCw className="w-3 h-3" />Win Back
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
