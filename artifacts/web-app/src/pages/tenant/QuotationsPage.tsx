import { FileText, Plus, Search, Filter } from "lucide-react";
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
          <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
        </tr>
      ))}
    </>
  );
}

export default function QuotationsPage() {
  const loading = usePageLoad();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Quotations</h1>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />New quote
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search quotations…" className="pl-9 h-8 text-sm" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Filter className="w-3.5 h-3.5" />Filter
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Ref #</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Customer</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Created</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <TableSkeleton />
              : (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-10 h-10 text-muted-foreground/20" />
                      <p className="text-[15px] font-medium text-muted-foreground">No quotations yet</p>
                      <p className="text-sm text-muted-foreground/70">
                        Create your first price estimate for a customer.
                      </p>
                      <Button size="sm" className="mt-1 gap-1.5">
                        <Plus className="w-4 h-4" />New quote
                      </Button>
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
