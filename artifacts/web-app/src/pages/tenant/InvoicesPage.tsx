import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Receipt, Search, FileText, CheckCircle2, Clock, TrendingUp,
} from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn }       from "@/lib/utils";
import { statusClass } from "@/lib/status";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_TABS = [
  { key: "all",     label: "All"     },
  { key: "draft",   label: "Draft"   },
  { key: "sent",    label: "Sent"    },
  { key: "partial", label: "Partial" },
  { key: "overdue", label: "Overdue" },
  { key: "paid",    label: "Paid"    },
  { key: "void",    label: "Void"    },
];

function fmtAed(val: string | number | null) {
  return `AED ${parseFloat(String(val ?? 0)).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

interface InvoiceRow {
  id: string; ref: string; status: string;
  client_id: string | null; client_name: string | null;
  vehicle_id: string | null;
  job_id: string | null;
  total: string; paid_amount: string;
  discount: string; tax_rate: string; notes: string | null;
  due_at: string | null; created_at: string;
}

interface Stats {
  draft: number; sent: number; partial: number; paid: number; overdue: number; void: number;
  total_outstanding: number; total_paid: number;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="bg-background border border-border rounded-lg p-4 flex gap-3 items-start">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return <>
    {Array.from({ length: 5 }).map((_, i) => (
      <tr key={i} className="border-b border-border last:border-0">
        {[1,2,3,4,5,6].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-full" /></td>)}
      </tr>
    ))}
  </>;
}

export default function InvoicesPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [search,     setSearch]     = useState("");
  const [statusTab,  setStatusTab]  = useState("all");

  const { data, isLoading } = useQuery<{ data: InvoiceRow[] }>({
    queryKey: ["invoices", statusTab, search],
    queryFn:  () => {
      const params = new URLSearchParams({ tenant: TENANT });
      if (statusTab !== "all") params.set("status", statusTab);
      if (search) params.set("search", search);
      return fetch(`${API}/api/invoices?${params}`).then(r => r.json());
    },
    staleTime: 15_000,
  });

  const { data: statsData } = useQuery<{ stats: Stats }>({
    queryKey: ["invoices-stats"],
    queryFn:  () => fetch(`${API}/api/invoices/stats?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 30_000,
  });

  const invoices = data?.data ?? [];
  const stats    = statsData?.stats;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Invoices</h1>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats ? (
          <>
            <StatCard icon={FileText}     label="Draft"       value={stats.draft}               color="bg-gray-100 text-gray-600" />
            <StatCard icon={Clock}        label="Overdue"     value={stats.overdue}              color="bg-red-100 text-red-600" />
            <StatCard icon={TrendingUp}   label="Outstanding" value={fmtAed(stats.total_outstanding)} color="bg-orange-100 text-orange-600" />
            <StatCard icon={CheckCircle2} label="Total paid"  value={fmtAed(stats.total_paid)}  color="bg-green-100 text-green-700" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-background border border-border rounded-lg p-4 space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search invoices, customers…"
            className="pl-9 h-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                statusTab === tab.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Invoice #</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Customer</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Due date</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Balance</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Receipt className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-[15px] font-medium text-muted-foreground">No invoices yet</p>
                    <p className="text-sm text-muted-foreground/60">Invoices are created from service job or quick repair flows.</p>
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map(inv => {
                const balance = parseFloat(inv.total ?? "0") - parseFloat(inv.paid_amount ?? "0");
                return (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-sm font-semibold">{inv.ref}</td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">{inv.client_name ?? <span className="text-muted-foreground/50">—</span>}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-[11px] border capitalize", statusClass(inv.status))}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{fmtDate(inv.due_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtAed(inv.total)}</td>
                    <td className="px-4 py-3 text-right text-xs hidden lg:table-cell">
                      {balance > 0.01
                        ? <span className={cn(inv.status === "overdue" && "text-red-600 font-medium")}>{fmtAed(balance)} due</span>
                        : <span className="text-green-600 font-medium">Settled</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
