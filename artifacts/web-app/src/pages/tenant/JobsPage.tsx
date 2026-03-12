import { Wrench, Plus, Search, Filter, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePageLoad } from "@/hooks/usePageLoad";

const lanes = ["Pending", "In progress", "Awaiting parts", "Ready", "Completed"];

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {lanes.map((lane) => (
        <div key={lane} className="shrink-0 w-64">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-5 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: lane === "In progress" ? 2 : 1 }).map((_, i) => (
              <div key={i} className="bg-background border border-border rounded-lg p-3 space-y-2.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-3/4" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="w-6 h-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JobsPage() {
  const loading = usePageLoad();
  const [view, setView] = useState<"board" | "list">("board");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Jobs</h1>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />New job
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search jobs…" className="pl-9 h-8 text-sm" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Filter className="w-3.5 h-3.5" />Filter
        </Button>
        <div className="ml-auto flex items-center border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setView("board")}
            className={cn("px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors",
              view === "board" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            aria-label="Board view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />Board
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors border-l border-border",
              view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            aria-label="List view"
          >
            <List className="w-3.5 h-3.5" />List
          </button>
        </div>
      </div>

      {/* Board view */}
      {view === "board" && (
        loading
          ? <KanbanSkeleton />
          : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {lanes.map((lane) => (
                <div key={lane} className="shrink-0 w-64">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{lane}</span>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">0</span>
                  </div>
                  <div className="min-h-[120px] rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground/50">No jobs</p>
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {/* List view */}
      {view === "list" && (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Job #</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Technician</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Due</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3 w-28" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td colSpan={5} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Wrench className="w-10 h-10 text-muted-foreground/20" />
                        <p className="text-[15px] font-medium text-muted-foreground">No active jobs</p>
                        <p className="text-sm text-muted-foreground/70">
                          Jobs are created from approved quotations or bookings.
                        </p>
                      </div>
                    </td>
                  </tr>
                )
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
