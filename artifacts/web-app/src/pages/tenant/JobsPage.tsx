import {
  Wrench, Plus, Search, LayoutGrid, List,
  ChevronRight, Clock, User, Car, ClipboardList,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge }    from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusClass, statusLabel } from "@/lib/status";
import JobDrawer     from "@/components/JobDrawer";
import StatusTransitionModal, { JOB_STATUSES } from "@/components/StatusTransitionModal";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {JOB_STATUSES.map(s => (
        <div key={s.key} className="shrink-0 w-64">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3.5 w-24" /><Skeleton className="h-4 w-5 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: s.key === "in_progress" ? 2 : 1 }).map((_, i) => (
              <div key={i} className="bg-background border border-border rounded-lg p-3 space-y-2.5">
                <Skeleton className="h-3 w-full" /><Skeleton className="h-2.5 w-3/4" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="w-6 h-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
    <div onClick={onClick} className="bg-background border border-border rounded-lg p-3 h-[148px] flex flex-col justify-between cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-1.5">
          <span className="text-[11px] font-mono font-semibold text-muted-foreground">{job.ref}</span>
          {job.priority !== "normal" && (
            <span className={cn("text-[10px] font-medium border rounded px-1 py-0.5 shrink-0", PRIORITY_COLORS[job.priority])}>{job.priority}</span>
          )}
        </div>
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed min-h-[2.5em]">
          {job.customer_concern ?? "—"}
        </p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">{job.client_name ?? "—"}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Car className="w-3 h-3 shrink-0" />
          <span className="font-mono">{job.plate_number ?? "—"}</span>
          {job.make && <span className="text-muted-foreground/60 truncate">· {job.make} {job.model}</span>}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />{elapsed(job.started_at ?? job.created_at)}
        </div>
        <div className="flex items-center gap-1.5">
          {job.technician_name && (
            <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 font-medium truncate max-w-[80px]">
              {job.technician_name.split(" ")[0]}
            </span>
          )}
          {job.bay && <span className="text-[10px] text-muted-foreground">Bay {job.bay}</span>}
          <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [, navigate]    = useLocation();
  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ]       = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [movingJob, setMovingJob]   = useState<KanbanJob | null>(null);

  // Read job_type filter from URL
  const urlType = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  ).get("job_type") ?? "";

  const typeQs = urlType ? `&job_type=${urlType}` : "";

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery<Record<string, KanbanJob[]>>({
    queryKey: ["jobs-kanban", urlType],
    queryFn:  () => fetch(`${API}/api/jobs/kanban?tenant=${TENANT}${typeQs}`).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: listData, isLoading: listLoading } = useQuery<{ data: ListJob[]; total: number }>({
    queryKey: ["jobs", q, urlType],
    queryFn:  () => fetch(`${API}/api/jobs?tenant=${TENANT}&q=${encodeURIComponent(q)}&limit=100${typeQs}`).then(r => r.json()),
    enabled: view === "list",
  });

  const filtered = useMemo<Record<string, KanbanJob[]> | undefined>(() => {
    if (!q || !kanbanData) return kanbanData;
    const lq = q.toLowerCase();
    const fn = (j: KanbanJob) =>
      [j.ref, j.client_name, j.plate_number, j.customer_concern].some(v => v?.toLowerCase().includes(lq));
    return Object.fromEntries(Object.entries(kanbanData).map(([k, v]) => [k, v.filter(fn)]));
  }, [kanbanData, q]);

  const tenantQ = `?tenant=${TENANT}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            {urlType === "inspection" ? "Inspections" : urlType === "service" ? "Services" : "Jobs"}
          </h1>
          <div className="flex items-center gap-1 mt-2">
            {([
              { key: "",           label: "All",         icon: null },
              { key: "service",    label: "Services",    icon: Wrench },
              { key: "inspection", label: "Inspections", icon: ClipboardList },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => navigate(key ? `/jobs${tenantQ}&job_type=${key}` : `/jobs${tenantQ}`)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  urlType === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                )}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {label}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
          <Plus className="w-4 h-4" />New job
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search jobs…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-8 text-sm" />
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

      {view === "board" && (
        kanbanLoading ? <KanbanSkeleton /> : (
          <div className="flex gap-4 overflow-x-auto pb-6">
            {JOB_STATUSES.map(lane => {
              const jobs: KanbanJob[] = filtered?.[lane.key] ?? [];
              return (
                <div key={lane.key} className="shrink-0 w-64">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{lane.label}</span>
                    <span className={cn(
                      "text-[10px] font-semibold rounded-full px-1.5 py-0.5 border",
                      jobs.length > 0 ? lane.color : "bg-muted text-muted-foreground border-border",
                    )}>{jobs.length}</span>
                  </div>
                  <div className={cn(
                    "min-h-[120px] space-y-2 rounded-lg p-1",
                    jobs.length === 0 && "border border-dashed border-border flex items-center justify-center",
                  )}>
                    {jobs.length === 0
                      ? <p className="text-xs text-muted-foreground/40 py-4">No jobs</p>
                      : jobs.map(job => <KanbanCard key={job.id} job={job} onClick={() => navigate(`/jobs/${job.id}`)} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {view === "list" && (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Job", "Customer", "Vehicle", "Status", "Technician", "Priority"].map((h, i) => (
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
                          <Wrench className="w-10 h-10 text-muted-foreground/20" />
                          <p className="text-[15px] font-medium text-muted-foreground">No jobs yet</p>
                          <p className="text-sm text-muted-foreground/70">Jobs are created from quotations or directly.</p>
                          <Button size="sm" className="mt-1" onClick={() => setDrawerOpen(true)}>
                            <Plus className="w-3.5 h-3.5 mr-1" />New job
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                  : listData.data.map(job => (
                      <tr key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}
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

      <JobDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
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
  );
}
