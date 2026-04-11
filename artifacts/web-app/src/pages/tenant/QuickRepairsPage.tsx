import {
  Zap, Search, LayoutGrid, List,
  Clock, User,
} from "lucide-react";
import CarBrandLogo from "@/components/CarBrandLogo";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input }    from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge }    from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { statusClass, statusLabel } from "@/lib/status";
import StatusTransitionModal from "@/components/StatusTransitionModal";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const QR_STATUSES = [
  { key: "new",       label: "New",       color: "bg-slate-100  text-slate-700  border-slate-300"  },
  { key: "completed", label: "Work Done", color: "bg-green-100  text-green-800  border-green-300"  },
  { key: "invoiced",  label: "Invoiced",  color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { key: "paid",      label: "Paid",      color: "bg-cyan-100   text-cyan-800   border-cyan-300"   },
] as const;

interface KanbanJob {
  id: string; ref: string; status: string; priority: string;
  bay: string | null; started_at: string | null; created_at: string;
  customer_concern: string | null; client_name: string | null;
  plate_number: string | null; make: string | null; model: string | null;
  technician_name: string | null;
}

interface ListJob extends KanbanJob {
  advisor_name: string | null; technician_id: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  low:    "bg-gray-100 text-gray-600 border-gray-200",
};

function elapsed(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function KanbanCard({ job, onClick }: { job: KanbanJob; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-background border border-border rounded-lg px-4 py-3.5 flex flex-col gap-2.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Zap className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="text-sm font-mono font-semibold text-muted-foreground">{job.ref}</span>
        </div>
        {job.priority !== "normal" && (
          <span className={cn("text-xs font-medium border rounded px-1.5 py-0.5 shrink-0", PRIORITY_COLORS[job.priority])}>{job.priority}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[15px] text-foreground min-w-0">
        <User className="w-4 h-4 shrink-0 text-amber-500" />
        <span className="truncate font-medium">{job.client_name ?? "—"}</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          <CarBrandLogo make={job.make} size={22} />
          <span className="font-mono truncate">{job.plate_number ?? "—"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
          <Clock className="w-4 h-4" />{elapsed(job.started_at ?? job.created_at)}
        </div>
      </div>
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4 pb-4">
      {QR_STATUSES.map(lane => (
        <div key={lane.key} className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3.5 w-24" /><Skeleton className="h-4 w-5 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="bg-background border border-border rounded-lg p-3 space-y-2.5">
              <Skeleton className="h-3 w-full" /><Skeleton className="h-2.5 w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="w-6 h-6 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QuickRepairsPage() {
  const [, navigate]    = useLocation();
  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ]       = useState("");
  const [movingJob, setMovingJob]       = useState<KanbanJob | null>(null);
  const [expandedLane, setExpandedLane] = useState<typeof QR_STATUSES[number] | null>(null);

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery<Record<string, KanbanJob[]>>({
    queryKey: ["quick-repairs-kanban"],
    queryFn:  () => fetch(`${API}/api/jobs/kanban?tenant=${TENANT}&type=quick_repair`).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: listData, isLoading: listLoading } = useQuery<{ data: ListJob[]; total: number }>({
    queryKey: ["quick-repairs", q],
    queryFn:  () => fetch(`${API}/api/jobs?tenant=${TENANT}&type=quick_repair&q=${encodeURIComponent(q)}&limit=100`).then(r => r.json()),
    enabled: view === "list",
  });

  const filtered = useMemo<Record<string, KanbanJob[]> | undefined>(() => {
    if (!q || !kanbanData) return kanbanData;
    const lq = q.toLowerCase();
    const fn = (j: KanbanJob) =>
      [j.ref, j.client_name, j.plate_number, j.customer_concern].some(v => v?.toLowerCase().includes(lq));
    return Object.fromEntries(Object.entries(kanbanData).map(([k, v]) => [k, v.filter(fn)]));
  }, [kanbanData, q]);

  const renderLane = (lane: typeof QR_STATUSES[number]) => {
    const jobs: KanbanJob[] = filtered?.[lane.key] ?? [];
    const visible = jobs.slice(0, 3);
    const extra   = jobs.length - visible.length;
    return (
      <div key={lane.key} className="min-w-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setExpandedLane(lane)}
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
          >
            {lane.label}
          </button>
          <span className={cn(
            "text-[10px] font-semibold rounded-full px-1.5 py-0.5 border cursor-pointer",
            jobs.length > 0 ? lane.color : "bg-muted text-muted-foreground border-border",
          )} onClick={() => jobs.length > 0 && setExpandedLane(lane)}>{jobs.length}</span>
        </div>
        <div className={cn(
          "min-h-[80px] space-y-2 rounded-lg p-1",
          jobs.length === 0 && "border border-dashed border-border flex items-center justify-center",
        )}>
          {jobs.length === 0
            ? <p className="text-xs text-muted-foreground/40 py-4">No repairs</p>
            : visible.map(job => <KanbanCard key={job.id} job={job} onClick={() => navigate(`/quick-repairs/${job.id}`)} />)}
        </div>
        {extra > 0 && (
          <button
            onClick={() => setExpandedLane(lane)}
            className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            +{extra} more
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="-mx-6 -mt-6 px-6 pt-6 pb-4 bg-white space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Quick Repair</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search quick repairs…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>
          <div className="ml-auto flex items-center border border-border rounded-md overflow-hidden">
            {(["board", "list"] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)} className={cn(
                "px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors",
                i > 0 && "border-l border-border",
                view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}>
                {v === "board" ? <><LayoutGrid className="w-3.5 h-3.5" />Board</> : <><List className="w-3.5 h-3.5" />List</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="-mx-6 h-6 bg-gradient-to-b from-white to-[#f2f3ff]" />

      <div className="-mx-6 -mb-6 px-6 pb-6 bg-[#f2f3ff] min-h-[60vh]">

      {view === "board" && (
        kanbanLoading ? <KanbanSkeleton /> : (
          <div className="grid grid-cols-4 gap-4 pb-6">
            {QR_STATUSES.map(renderLane)}
          </div>
        )
      )}

      <Sheet open={!!expandedLane} onOpenChange={o => !o && setExpandedLane(null)}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              {expandedLane && (
                <span className={cn("text-[11px] font-semibold rounded-full px-2 py-0.5 border", expandedLane.color)}>
                  {(filtered?.[expandedLane.key] ?? []).length}
                </span>
              )}
              <SheetTitle className="text-base">{expandedLane?.label}</SheetTitle>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {expandedLane && (filtered?.[expandedLane.key] ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">No quick repairs in this status</p>
            )}
            {expandedLane && (filtered?.[expandedLane.key] ?? []).map(job => (
              <KanbanCard key={job.id} job={job} onClick={() => { setExpandedLane(null); navigate(`/quick-repairs/${job.id}`); }} />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {view === "list" && (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Ref", "Customer", "Vehicle", "Status", "Technician", "Priority"].map((h, i) => (
                  <th key={h} className={cn(
                    "text-left px-4 py-2.5 text-xs font-medium text-muted-foreground",
                    i === 1 && "hidden md:table-cell", i === 2 && "hidden lg:table-cell",
                    i === 4 && "hidden sm:table-cell", i === 5 && "hidden lg:table-cell",
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {[16, 28, 20, 20, 20, 12].map((w, j) => (
                        <td key={j} className={cn("px-4 py-3", j === 1 && "hidden md:table-cell", j === 2 && "hidden lg:table-cell", j === 4 && "hidden sm:table-cell", j === 5 && "hidden lg:table-cell")}>
                          <Skeleton className={`h-3 w-${w}`} />
                        </td>
                      ))}
                    </tr>
                  ))
                : !listData?.data.length
                  ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Zap className="w-10 h-10 text-muted-foreground/20" />
                          <p className="text-[15px] font-medium text-muted-foreground">No quick repairs yet</p>
                          <p className="text-sm text-muted-foreground/70">Create a booking with type "Quick Repair" to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )
                  : listData.data.map(job => (
                      <tr key={job.id} onClick={() => navigate(`/quick-repairs/${job.id}`)}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-semibold">{job.ref}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[140px]">{job.customer_concern ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-sm">{job.client_name ?? "—"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {job.plate_number ? <span className="font-mono text-xs">{job.plate_number}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs font-medium border", statusClass(job.status))}>
                            {statusLabel(job.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-sm">
                          {job.technician_name ?? <span className="text-muted-foreground/40">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={cn("text-[11px] font-medium border rounded px-1.5 py-0.5", PRIORITY_COLORS[job.priority])}>
                            {job.priority}
                          </span>
                        </td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
      )}

      {movingJob && (
        <StatusTransitionModal
          open={!!movingJob}
          onOpenChange={o => { if (!o) setMovingJob(null); }}
          jobId={movingJob.id}
          jobRef={movingJob.ref}
          currentStatus={movingJob.status}
        />
      )}
      </div>
    </div>
  );
}
