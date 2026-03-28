import { useState } from "react";
import { Search, Shield, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const OVERRIDES = [
  { id: "1", tenant: "Al Baraka Auto", slug: "al-baraka-auto", currentPlan: "professional", overridePlan: "enterprise", reason: "Strategic partner — waived upgrade fee", overriddenBy: "ab.sadaqa@gmail.com", overriddenAt: "2026-02-15T10:00:00Z", expiresAt: null },
  { id: "2", tenant: "Dubai Motors", slug: "dubai-motors", currentPlan: "enterprise", overridePlan: "enterprise", reason: "Extended trial — 6 months free enterprise", overriddenBy: "ab.sadaqa@gmail.com", overriddenAt: "2026-01-10T14:30:00Z", expiresAt: "2026-07-10T14:30:00Z" },
  { id: "3", tenant: "Quick Fix Garage", slug: "quick-fix-garage", currentPlan: "starter", overridePlan: "professional", reason: "Beta tester program — complimentary Pro access", overriddenBy: "ab.sadaqa@gmail.com", overriddenAt: "2026-03-01T09:00:00Z", expiresAt: "2026-06-01T09:00:00Z" },
];

const TENANTS = [
  { id: "t1", name: "Precision Auto Care", slug: "precision-auto-care", plan: "professional" },
  { id: "t2", name: "Gulf Star Workshop", slug: "gulf-star-workshop", plan: "starter" },
  { id: "t3", name: "Sharjah Auto Hub", slug: "sharjah-auto-hub", plan: "professional" },
];

function fmtDate(iso: string | null) {
  if (!iso) return "Permanent";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PlanOverridePage() {
  const [q, setQ] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Manual Plan Override</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Override subscription plans for specific tenants.</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Shield className="w-3.5 h-3.5" />New Override
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Admin-only feature</p>
          <p className="text-xs text-amber-700 mt-0.5">Plan overrides bypass billing. All changes are logged for audit. Use sparingly for strategic partners, beta testers, or support escalations.</p>
        </div>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search overrides…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-8 text-sm" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Active Overrides ({OVERRIDES.length})</p>
        </div>
        <div className="divide-y divide-border">
          {OVERRIDES.map(o => (
            <div key={o.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{o.tenant}</span>
                  <span className="text-xs text-muted-foreground">({o.slug})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{o.currentPlan}</Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-[10px] capitalize text-primary bg-primary/10 border-primary/20">{o.overridePlan}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{o.reason}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>By: {o.overriddenBy}</span>
                <span>On: {fmtDate(o.overriddenAt)}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires: {fmtDate(o.expiresAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Quick Override</p>
          <p className="text-xs text-muted-foreground mt-0.5">Select a tenant to apply a manual plan change.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tenant</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Current Plan</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {TENANTS.map(t => (
              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px] capitalize">{t.plan}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" className="h-7 text-xs">Override</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
