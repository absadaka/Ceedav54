import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, TrendingUp, Users, Building2 } from "lucide-react";
import { Link } from "wouter";

const API = "/api";

interface Stats {
  total_tenants: number;
  active_users:  number;
  mrr_estimate:  number;
  by_plan:   Record<string, number>;
  by_status: Record<string, number>;
}

interface Tenant {
  id: string; slug: string; name: string; plan: string; status: string;
  email: string | null; created_at: string; trial_ends_at: string | null; user_count: number;
}

const PLAN_PRICES: Record<string, number> = {
  starter: 0, professional: 149, enterprise: 499,
};

function StatCard({ label, value, sub, icon: Icon, iconColor }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; iconColor: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-3xl font-semibold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BillingPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => fetch(`${API}/admin/stats`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery<{ tenants: Tenant[] }>({
    queryKey: ["admin-tenants-billing"],
    queryFn: () => fetch(`${API}/admin/tenants?limit=100`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const byPlan   = stats?.by_plan   ?? {};
  const byStatus = stats?.by_status ?? {};
  const mrr      = stats?.mrr_estimate ?? 0;
  const paidSubs = (byPlan.professional ?? 0) + (byPlan.enterprise ?? 0);
  const churnTarget = (byStatus.cancelled ?? 0);

  const tenants = (tenantsData?.tenants ?? []).filter((t) => t.plan !== "starter" || t.status !== "trial");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Billing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform-level billing overview and subscription management.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-5 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Est. MRR"
              value={`AED ${mrr.toLocaleString()}`}
              sub="Professional + Enterprise"
              icon={CreditCard} iconColor="text-primary"
            />
            <StatCard
              label="Paid subscriptions"
              value={String(paidSubs)}
              sub={`${byPlan.professional ?? 0} Pro · ${byPlan.enterprise ?? 0} Enterprise`}
              icon={TrendingUp} iconColor="text-emerald-500"
            />
            <StatCard
              label="Free / Trial"
              value={String((byPlan.starter ?? 0) + (byStatus.trial ?? 0))}
              sub="May convert to paid"
              icon={Building2} iconColor="text-blue-500"
            />
            <StatCard
              label="Cancelled"
              value={String(churnTarget)}
              sub="All-time"
              icon={Users} iconColor="text-red-400"
            />
          </>
        )}
      </div>

      {/* Plan breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { plan: "starter",      label: "Starter",      price: 0,   color: "bg-muted-foreground/20" },
          { plan: "professional", label: "Professional",  price: 149, color: "bg-primary/20" },
          { plan: "enterprise",   label: "Enterprise",    price: 499, color: "bg-purple-100" },
        ].map(({ plan, label, price, color }) => {
          const cnt = byPlan[plan] ?? 0;
          const rev = cnt * price;
          return (
            <div key={plan} className="bg-card border border-border rounded-lg p-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>
                  AED {price}{price > 0 ? "/mo" : ""}
                </span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums text-foreground">{cnt}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {price > 0 ? `≈ AED ${rev.toLocaleString()}/mo revenue` : "Free tier"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Subscription ledger */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Active subscriptions</p>
          <p className="text-xs text-muted-foreground">{tenants.length} tenants</p>
        </div>

        {tenantsLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CreditCard className="w-8 h-8 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">No billing data yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tenant</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Plan</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">MRR</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/tenants/${t.id}`}>
                      <div className="flex items-center gap-2 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-primary">
                            {t.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.slug}</p>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                      t.plan === "professional" ? "text-primary bg-primary/10" :
                      t.plan === "enterprise"   ? "text-purple-700 bg-purple-100" :
                                                   "text-muted-foreground bg-muted"
                    }`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${
                      t.status === "active"    ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                      t.status === "trial"     ? "text-blue-700 bg-blue-50 border-blue-200" :
                      t.status === "suspended" ? "text-amber-700 bg-amber-50 border-amber-200" :
                                                  "text-red-700 bg-red-50 border-red-200"
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell font-medium text-foreground">
                    AED {PLAN_PRICES[t.plan] ?? 0}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                    {fmtDate(t.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
