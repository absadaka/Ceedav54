import { useState } from "react";
import { Tag, Plus, Copy, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COUPONS = [
  { id: "1", code: "LAUNCH50", type: "percent", value: 50, maxUses: 100, used: 34, validUntil: "2026-06-30", active: true, plans: ["professional", "enterprise"] },
  { id: "2", code: "FIRST3FREE", type: "trial_extension", value: 90, maxUses: null, used: 12, validUntil: null, active: true, plans: ["professional"] },
  { id: "3", code: "FRIEND20", type: "percent", value: 20, maxUses: 50, used: 50, validUntil: "2026-03-01", active: false, plans: ["professional", "enterprise"] },
  { id: "4", code: "AED100OFF", type: "fixed", value: 100, maxUses: 200, used: 67, validUntil: "2026-12-31", active: true, plans: ["enterprise"] },
];

function fmtDate(iso: string | null) {
  if (!iso) return "No expiry";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function CouponsPage() {
  const [q, setQ] = useState("");
  const filtered = COUPONS.filter(c => c.code.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Coupons & Discounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage promotional codes.</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />Create Coupon
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Coupons</p>
          <p className="text-2xl font-semibold mt-1">{COUPONS.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600">{COUPONS.filter(c => c.active).length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Redemptions</p>
          <p className="text-2xl font-semibold mt-1">{COUPONS.reduce((s, c) => s + c.used, 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expired</p>
          <p className="text-2xl font-semibold mt-1 text-red-500">{COUPONS.filter(c => !c.active).length}</p>
        </div>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search coupons…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-8 text-sm" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Code</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Discount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Plans</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Usage</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Expires</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono font-semibold text-foreground">{c.code}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.type === "percent" ? `${c.value}% off` : c.type === "fixed" ? `AED ${c.value} off` : `${c.value}-day trial`}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {c.plans.map(p => (
                    <Badge key={p} variant="outline" className="text-[10px] mr-1 capitalize">{p}</Badge>
                  ))}
                </td>
                <td className="px-4 py-3 hidden md:table-cell tabular-nums">
                  {c.used}{c.maxUses ? ` / ${c.maxUses}` : ""}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(c.validUntil)}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn("text-[10px]", c.active ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200")}>
                    {c.active ? "Active" : "Expired"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-muted rounded"><Copy className="w-3 h-3 text-muted-foreground" /></button>
                    <button className="p-1 hover:bg-muted rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Tag className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground">No coupons found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
