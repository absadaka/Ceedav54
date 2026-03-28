import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  FileText, Search, User, Car, ChevronRight, MoreHorizontal, Trash2,
  Clock,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft:    { label: "Draft",    color: "bg-gray-100 text-gray-700 border-gray-300" },
  sent:     { label: "Sent",     color: "bg-blue-100 text-blue-800 border-blue-200" },
  viewed:   { label: "Viewed",   color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
  expired:  { label: "Expired",  color: "bg-orange-100 text-orange-700 border-orange-200" },
};

function fmtAed(val: string | number | null) {
  return `AED ${parseFloat(String(val ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StatusSummaryBar({ summary }: { summary: any[] }) {
  const total = summary.reduce((s, x) => s + x.count, 0);
  if (total === 0) return null;

  const statusOrder = ["draft", "sent", "viewed", "approved", "rejected", "expired"];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {statusOrder.map(s => {
        const row = summary.find((x: any) => x.status === s);
        const sm  = STATUS_META[s];
        return (
          <div key={s} className="rounded-lg border border-border bg-background px-4 py-3 flex flex-col gap-0.5">
            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full w-fit border ${sm.color}`}>{sm.label}</span>
            <span className="text-xl font-bold tabular-nums mt-1">{row?.count ?? 0}</span>
            {row?.total && parseFloat(row.total) > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">{fmtAed(row.total)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function QuotationsPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const params = new URLSearchParams({
    tenant: TENANT,
    ...(search ? { q: search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    limit: "100",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["quotations", search, statusFilter],
    queryFn: () => fetch(`${API}/api/quotations?${params}`).then(r => r.json()),
    refetchInterval: 60_000,
  });

  const rows: any[]    = data?.rows    ?? [];
  const summary: any[] = data?.summary ?? [];

  const deleteQt = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/api/quotations/${id}?tenant=${TENANT}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotations"] }); toast.success("Deleted"); },
  });

  const handleSearch = useCallback((v: string) => setSearch(v), []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Quotations</h1>
      </div>

      {/* Status summary strip */}
      <StatusSummaryBar summary={summary} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search quotations…"
            className="pl-9 h-8 text-sm"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_META).map(([v, m]) => (
              <SelectItem key={v} value={v}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Ref #</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Customer</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Vehicle</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Created</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Est. hrs</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-full" /></td>
                    ))}
                    <td />
                  </tr>
                ))
              : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="w-10 h-10 text-muted-foreground/20" />
                        <p className="text-[15px] font-medium text-muted-foreground">No quotations found</p>
                        <p className="text-sm text-muted-foreground/70">Quotations are created from service job or quick repair flows.</p>
                      </div>
                    </td>
                  </tr>
                )
                : rows.map(row => {
                  const sm = STATUS_META[row.status] ?? { label: row.status, color: "bg-gray-100 text-gray-700 border-gray-200" };
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/quotations/${row.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-sm font-medium">{row.ref}</td>
                      <td className="px-4 py-3">
                        {row.client_name
                          ? <div className="flex items-center gap-1.5"><User className="w-3 h-3 text-muted-foreground shrink-0" /><span className="font-medium truncate max-w-[120px]">{row.client_name}</span></div>
                          : <span className="text-muted-foreground text-xs italic">No customer</span>
                        }
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {row.plate_number
                          ? <div className="flex items-center gap-1.5 text-xs"><Car className="w-3 h-3 text-muted-foreground" /><span className="font-mono font-medium">{row.plate_number}</span></div>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${sm.color}`}>
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                        {fmtDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {row.estimated_hours
                          ? <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{parseFloat(row.estimated_hours)} h</div>
                          : "—"
                        }
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-sm">
                        {fmtAed(row.total)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-sm w-40">
                            <DropdownMenuItem onClick={() => navigate(`/quotations/${row.id}`)}>
                              <ChevronRight className="w-3.5 h-3.5 mr-2" />View / Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => { if (confirm(`Delete ${row.ref}?`)) deleteQt.mutate(row.id); }}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

    </div>
  );
}
