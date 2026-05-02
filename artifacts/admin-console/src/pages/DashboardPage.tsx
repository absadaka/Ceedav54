import { useQuery } from "@tanstack/react-query";
import { Building2, Users, CreditCard, TrendingUp, AlertTriangle, Circle, Activity, LifeBuoy, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const API = "/api";

interface Stats {
  total_tenants: number;
  active_users:  number;
  mrr_estimate:  number;
  by_plan:   Record<string, number>;
  by_status: Record<string, number>;
  support?: {
    open:        number;
    in_progress: number;
    waiting:     number;
    resolved:    number;
    unread:      number;
  };
}

function StatCard({
  label, value, sub, icon: Icon, iconColor, loading,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; iconColor: string; loading: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-3xl font-semibold text-foreground tabular-nums">{value}</p>
      )}
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PlanBar({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground capitalize">{label}</span>
        <span className="font-medium text-foreground">{count} <span className="text-muted-foreground/60">({pct}%)</span></span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => fetch(`${API}/admin/stats`).then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const totalTenants = data?.total_tenants ?? 0;
  const byStatus = data?.by_status ?? {};
  const byPlan   = data?.by_plan ?? {};

  const support = data?.support;
  const unreadTickets = support?.unread ?? 0;
  const openTickets   = support?.open   ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Platform overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time health of the ceeda{">"} platform.
        </p>
      </div>

      {byStatus.suspended ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {byStatus.suspended} tenant{byStatus.suspended > 1 ? "s" : ""} suspended
        </div>
      ) : null}

      {unreadTickets > 0 && (
        <Link href="/tickets">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border text-sm bg-red-50 border-red-200 text-red-800 hover:bg-red-100 transition-colors cursor-pointer">
            <LifeBuoy className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">
                {unreadTickets} new support ticket{unreadTickets > 1 ? "s" : ""} need{unreadTickets > 1 ? "" : "s"} attention
              </p>
              <p className="text-xs text-red-700/80 mt-0.5">
                {openTickets} open in total — click to review and respond.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </div>
        </Link>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total tenants"
          value={isLoading ? "—" : String(totalTenants)}
          sub={data ? `${byStatus.active ?? 0} active` : undefined}
          icon={Building2} iconColor="text-blue-500" loading={false}
        />
        <StatCard
          label="Active users"
          value={isLoading ? "—" : String(data?.active_users ?? 0)}
          sub="Across all tenants"
          icon={Users} iconColor="text-emerald-500" loading={false}
        />
        <StatCard
          label="Est. MRR"
          value={isLoading ? "—" : `AED ${(data?.mrr_estimate ?? 0).toLocaleString()}`}
          sub="Professional + Enterprise"
          icon={CreditCard} iconColor="text-primary" loading={false}
        />
        <StatCard
          label="In trial"
          value={isLoading ? "—" : String(byStatus.trial ?? 0)}
          sub={totalTenants > 0 ? `${Math.round(((byStatus.trial ?? 0) / totalTenants) * 100)}% of all tenants` : undefined}
          icon={TrendingUp} iconColor="text-amber-500" loading={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plan breakdown */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Plan distribution</p>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              <PlanBar label="Starter"      count={byPlan.starter      ?? 0} total={totalTenants} color="bg-muted-foreground/40" />
              <PlanBar label="Professional" count={byPlan.professional ?? 0} total={totalTenants} color="bg-primary" />
              <PlanBar label="Enterprise"   count={byPlan.enterprise   ?? 0} total={totalTenants} color="bg-purple-500" />
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Status breakdown</p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { key: "active",    label: "Active",    color: "bg-emerald-500" },
                { key: "trial",     label: "Trial",     color: "bg-blue-400" },
                { key: "suspended", label: "Suspended", color: "bg-amber-400" },
                { key: "cancelled", label: "Cancelled", color: "bg-red-400" },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                  <span className="font-medium text-foreground">{byStatus[key] ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Quick actions</p>
          <div className="space-y-2">
            {[
              { label: "View all tenants",     href: "/tenants",     icon: Building2 },
              { label: "Feature flags",         href: "/flags",       icon: Activity },
              { label: "Impersonate a tenant",  href: "/impersonate", icon: Users },
              { label: "Platform billing",      href: "/billing",     icon: CreditCard },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent tenant signups */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Recent signups</p>
          <Link href="/tenants">
            <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
          </Link>
        </div>
        <RecentSignups />
      </div>
    </div>
  );
}

function RecentSignups() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants-recent"],
    queryFn: () => fetch(`${API}/admin/tenants?limit=5&page=1`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const tenants = data?.tenants ?? [];

  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Building2 className="w-8 h-8 text-muted-foreground/25 mb-3" />
        <p className="text-sm text-muted-foreground">No tenants yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {tenants.map((t: any) => (
        <Link key={t.id} href={`/tenants/${t.id}`}>
          <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary">
                {t.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.slug} · {new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border capitalize ${
              t.status === "active"    ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              t.status === "trial"     ? "bg-blue-50 text-blue-700 border-blue-200" :
              t.status === "suspended" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                         "bg-red-50 text-red-700 border-red-200"
            }`}>
              {t.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
