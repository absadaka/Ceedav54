import { Receipt, Plus, Search, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageLoad } from "@/hooks/usePageLoad";

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          <td className="px-4 py-3"><Skeleton className="h-3 w-20" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3 w-28" /></td>
          <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3 w-20" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

export default function InvoicesPage() {
  const loading = usePageLoad();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Invoices</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-4 h-4" />Export
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />New invoice
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search invoices…" className="pl-9 h-8 text-sm" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Filter className="w-3.5 h-3.5" />Filter
        </Button>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Draft",     value: "0", color: "text-muted-foreground" },
            { label: "Sent",      value: "0", color: "text-blue-600" },
            { label: "Overdue",   value: "0", color: "text-red-600" },
            { label: "Paid",      value: "0", color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="bg-background border border-border rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-background border border-border rounded-lg px-4 py-3 space-y-2">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Invoice #</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Customer</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Due date</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <TableSkeleton />
              : (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Receipt className="w-10 h-10 text-muted-foreground/20" />
                      <p className="text-[15px] font-medium text-muted-foreground">No invoices yet</p>
                      <p className="text-sm text-muted-foreground/70">
                        Invoices are created automatically when a job is completed.
                      </p>
                      <Button variant="outline" size="sm">Create manually</Button>
                    </div>
                  </td>
                </tr>
              )
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
