import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Building2, Search, Plus, ExternalLink, MoreHorizontal, RefreshCw, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const API = "/api";

const STATUS_FILTERS = ["All", "Active", "Trial", "Suspended", "Cancelled"] as const;
const PLAN_FILTERS   = ["All plans", "Starter", "Professional", "Enterprise"] as const;

type TenantStatus = "trial" | "active" | "suspended" | "cancelled";
type TenantPlan   = "starter" | "professional" | "enterprise";

interface Tenant {
  id: string; slug: string; name: string; plan: TenantPlan; status: TenantStatus;
  country: string | null; currency: string; email: string | null; phone: string | null;
  logo_url: string | null; trial_ends_at: string | null; created_at: string; user_count: number;
}

function statusBadge(status: TenantStatus) {
  const map: Record<TenantStatus, string> = {
    active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
    trial:     "bg-blue-50 text-blue-700 border-blue-200",
    suspended: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

function planBadge(plan: TenantPlan) {
  const map: Record<TenantPlan, string> = {
    starter:      "bg-muted text-muted-foreground",
    professional: "bg-primary/10 text-primary",
    enterprise:   "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${map[plan] ?? "bg-muted text-muted-foreground"}`}>
      {plan}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function TenantAvatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) return <img src={logoUrl} alt={name} className="w-8 h-8 rounded-lg object-cover shrink-0" />;
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-bold text-primary">{initials}</span>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants]         = useState<Tenant[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [planFilter, setPlanFilter]     = useState("All plans");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "All") params.set("status", statusFilter.toLowerCase());
      if (planFilter !== "All plans") params.set("plan", planFilter.toLowerCase());
      params.set("limit", "100");
      const res  = await fetch(`${API}/admin/tenants?${params}`);
      const data = await res.json();
      setTenants(data.tenants ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, planFilter]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${total} workshop${total !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTenants} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />Create tenant
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, slug or email…"
            className="pl-9 h-8 text-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 text-sm">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                statusFilter === f
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Plan filter */}
        <div className="flex items-center gap-1 text-sm ml-auto">
          {PLAN_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setPlanFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs transition-colors",
                planFilter === f
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenant</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Users</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Created</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))
            )}
            {!loading && tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Building2 className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-[15px] font-medium text-muted-foreground">
                      {search || statusFilter !== "All" ? "No tenants match your filters" : "No tenants yet"}
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      {search || statusFilter !== "All" ? "Try adjusting your search or filter." : "Tenants will appear here when workshops sign up."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {!loading && tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  <Link href={`/tenants/${tenant.id}`}>
                    <div className="flex items-center gap-3 cursor-pointer">
                      <TenantAvatar name={tenant.name} logoUrl={tenant.logo_url} />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {tenant.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tenant.slug}{tenant.email ? ` · ${tenant.email}` : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">{planBadge(tenant.plan)}</td>
                <td className="px-4 py-3">{statusBadge(tenant.status)}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{tenant.user_count}</td>
                <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">{fmtDate(tenant.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/tenants/${tenant.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                        Details
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => window.open(`/dashboard?tenant=${tenant.slug}`, "_blank")}>
                          <ExternalLink className="w-3.5 h-3.5 mr-2" />Open app
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/impersonate`}>
                            <span className="flex items-center">
                              <UserSearch className="w-3.5 h-3.5 mr-2" />Impersonate
                            </span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Suspend tenant</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
