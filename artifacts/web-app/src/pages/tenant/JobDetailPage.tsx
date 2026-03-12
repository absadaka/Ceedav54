import {
  ArrowLeft, Wrench, User, Car, Clock, AlertTriangle, Plus,
  ChevronRight, Timer, Package, Camera, History, CheckCircle2,
  Edit, Trash2, MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn }       from "@/lib/utils";
import { statusClass, statusLabel } from "@/lib/status";
import { toast }    from "sonner";
import JobDrawer, { type JobRow } from "@/components/JobDrawer";
import StatusTransitionModal, { JOB_STATUSES } from "@/components/StatusTransitionModal";

const TENANT = "demo-workshop";
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-300",
  high:   "bg-orange-100 text-orange-700 border-orange-300",
  normal: "bg-blue-50 text-blue-700 border-blue-300",
  low:    "bg-gray-100 text-gray-600 border-gray-300",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtMinutes(m: number) {
  if (!m) return "0m";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

interface JobDetail {
  id: string; ref: string; seq: number; status: string; priority: string;
  bay: string | null; started_at: string | null; completed_at: string | null; qc_at: string | null;
  mileage_in: string | null; mileage_out: string | null;
  customer_concern: string | null; technician_note: string | null;
  qc_note: string | null; internal_note: string | null;
  created_at: string; updated_at: string;
  client_id: string | null; client_name: string | null; client_phone: string | null; client_email: string | null;
  vehicle_id: string | null; plate_number: string | null; make: string | null; model: string | null;
  year: string | null; color: string | null; vin: string | null; fuel_type: string | null;
  advisor_id: string | null; advisor_name: string | null; advisor_phone: string | null;
  technician_id: string | null; technician_name: string | null;
  qc_by: string | null; qc_by_name: string | null;
  quotation_id: string | null; booking_id: string | null;
}

interface StatusHistoryEntry {
  id: string; from_status: string | null; to_status: string;
  note: string | null; created_at: string; changed_by_name: string | null;
}

interface Assignment {
  id: string; technician_id: string; technician_name: string | null;
  technician_email: string | null; is_lead: string;
  notes: string | null; assigned_at: string; released_at: string | null;
}

interface TimeLog {
  id: string; technician_id: string | null; started_at: string;
  ended_at: string | null; minutes: number | null; notes: string | null;
}

interface Part {
  id: string; sort_order: number; part_number: string | null;
  description: string; qty: string; unit_price: string; line_total: string; created_at: string;
}

interface Photo {
  id: string; url: string; caption: string | null; photo_type: string; created_at: string;
}

interface DetailData {
  job: JobDetail;
  statusHistory: StatusHistoryEntry[];
  assignments: Assignment[];
  timeLogs: TimeLog[];
  totalMinutes: number;
  parts: Part[];
  photos: Photo[];
  quotation: { ref: string; total: string; status: string } | null;
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg bg-background p-4 flex gap-3 items-start">
      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-base font-semibold mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function AddPartForm({ jobId, onAdded }: { jobId: string; onAdded: () => void }) {
  const [form, setForm] = useState({ description: "", part_number: "", qty: "1", unit_price: "0" });
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/jobs/${jobId}/parts?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      onAdded();
      setForm({ description: "", part_number: "", qty: "1", unit_price: "0" });
      toast.success("Part added");
    },
    onError: () => toast.error("Failed to add part"),
  });

  return (
    <div className="border border-dashed border-border rounded-lg p-4 mt-3 space-y-3 bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add part / labour</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Description *</Label>
          <Input placeholder="e.g. Engine Air Filter" value={form.description} onChange={e => set("description", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Part #</Label>
          <Input placeholder="Optional" value={form.part_number} onChange={e => set("part_number", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qty</Label>
          <Input type="number" min="0.01" step="0.01" value={form.qty} onChange={e => set("qty", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unit price (AED)</Label>
          <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => set("unit_price", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex items-end">
          <Button
            size="sm" disabled={!form.description || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="w-full"
          >
            {mutation.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const { data, isLoading } = useQuery<DetailData>({
    queryKey: ["job", id],
    queryFn:  () => fetch(`${API}/api/jobs/${id}?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 10_000,
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/jobs/${id}?tenant=${TENANT}`, { method: "DELETE" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-kanban"] });
      toast.success("Job deleted");
      navigate("/jobs");
    },
    onError: () => toast.error("Failed to delete job"),
  });

  const removePartMutation = useMutation({
    mutationFn: (partId: string) =>
      fetch(`${API}/api/jobs/${id}/parts/${partId}?tenant=${TENANT}`, { method: "DELETE" })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Part removed"); },
    onError: () => toast.error("Failed to remove part"),
  });

  const techNotesMutation = useMutation({
    mutationFn: (technician_note: string) =>
      fetch(`${API}/api/jobs/${id}?tenant=${TENANT}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technician_note }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      toast.success("Notes saved");
      setSavingNote(false);
    },
    onError: () => { toast.error("Failed to save notes"); setSavingNote(false); },
  });

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-5xl mx-auto">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!data?.job) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Wrench className="w-12 h-12 text-muted-foreground/20" />
        <p className="text-muted-foreground">Job not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/jobs")}>Back to jobs</Button>
      </div>
    );
  }

  const { job, statusHistory, assignments, timeLogs, totalMinutes, parts, photos, quotation } = data;
  const currentLane = JOB_STATUSES.find(s => s.key === job.status);
  const partsTotal  = parts.reduce((sum, p) => sum + parseFloat(p.line_total), 0);

  const asJobRow: JobRow = {
    id: job.id, ref: job.ref, status: job.status, priority: job.priority,
    bay: job.bay, client_id: job.client_id, client_name: job.client_name,
    vehicle_id: job.vehicle_id, plate_number: job.plate_number,
    advisor_id: job.advisor_id, technician_id: job.technician_id,
    customer_concern: job.customer_concern, internal_note: job.internal_note,
    mileage_in: job.mileage_in,
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("/jobs")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Jobs
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold font-mono">{job.ref}</h1>
              <Badge variant="outline" className={cn("text-xs font-medium border", currentLane?.color)}>
                {statusLabel(job.status)}
              </Badge>
              <Badge variant="outline" className={cn("text-xs font-medium border", PRIORITY_BADGE[job.priority])}>
                {job.priority}
              </Badge>
              {job.bay && (
                <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">Bay {job.bay}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Created {fmtDate(job.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => setStatusOpen(true)}>
            Move status
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="w-3.5 h-3.5 mr-1.5" />Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="px-2">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-2" />Delete job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Timer} label="Labor time" value={fmtMinutes(totalMinutes)} />
        <StatCard icon={Package} label="Parts used" value={`${parts.length} items`} />
        <StatCard icon={Camera} label="Photos" value={`${photos.length}`} />
        <StatCard icon={History} label="Status changes" value={`${statusHistory.length}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — info cards */}
        <div className="space-y-4">
          {/* Customer & vehicle */}
          <div className="border border-border rounded-lg bg-background p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer & vehicle</p>
            {job.client_name ? (
              <button
                onClick={() => job.client_id && navigate(`/customers/${job.client_id}`)}
                className="flex items-start gap-2 w-full hover:opacity-70 transition-opacity text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                  {job.client_name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{job.client_name}</p>
                  {job.client_phone && <p className="text-xs text-muted-foreground">{job.client_phone}</p>}
                  {job.client_email && <p className="text-xs text-muted-foreground">{job.client_email}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-0.5" />
              </button>
            ) : <p className="text-sm text-muted-foreground">No customer linked</p>}

            {job.plate_number && (
              <button
                onClick={() => job.vehicle_id && navigate(`/vehicles/${job.vehicle_id}`)}
                className="flex items-start gap-2 w-full pt-2 border-t border-border hover:opacity-70 transition-opacity text-left"
              >
                <Car className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold font-mono">{job.plate_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {[job.year, job.make, job.model, job.color].filter(Boolean).join(" · ")}
                  </p>
                  {job.vin && <p className="text-[11px] text-muted-foreground font-mono mt-0.5">VIN {job.vin}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-0.5" />
              </button>
            )}
          </div>

          {/* Mileage */}
          <div className="border border-border rounded-lg bg-background p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mileage</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">In</p>
                <p className="font-medium">{job.mileage_in ? `${parseInt(job.mileage_in).toLocaleString()} km` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Out</p>
                <p className="font-medium">{job.mileage_out ? `${parseInt(job.mileage_out).toLocaleString()} km` : "—"}</p>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="border border-border rounded-lg bg-background p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</p>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Advisor</p>
                <p className="text-sm font-medium">{job.advisor_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Lead technician</p>
                <p className="text-sm font-medium">{job.technician_name ?? <span className="text-muted-foreground">Unassigned</span>}</p>
              </div>
              {assignments.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Assigned</p>
                  <div className="space-y-1">
                    {assignments.map(a => (
                      <div key={a.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                          {a.technician_name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() ?? "?"}
                        </div>
                        <span className="text-xs">{a.technician_name}</span>
                        {a.is_lead === "true" && (
                          <span className="text-[10px] bg-primary/10 text-primary rounded px-1">lead</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="border border-border rounded-lg bg-background p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timeline</p>
            <div className="space-y-1.5 text-xs">
              {[
                { label: "Created",   value: job.created_at   },
                { label: "Started",   value: job.started_at   },
                { label: "QC",        value: job.qc_at        },
                { label: "Completed", value: job.completed_at },
              ].map(({ label, value }) => value && (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right">{fmtDate(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Linked */}
          {(quotation || job.booking_id) && (
            <div className="border border-border rounded-lg bg-background p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linked</p>
              {quotation && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Quotation</span>
                  <span className="font-mono font-semibold">{quotation.ref}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="work">
            <TabsList className="mb-4">
              <TabsTrigger value="work">Work</TabsTrigger>
              <TabsTrigger value="parts">Parts ({parts.length})</TabsTrigger>
              <TabsTrigger value="time">Time ({fmtMinutes(totalMinutes)})</TabsTrigger>
              <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
              <TabsTrigger value="history">History ({statusHistory.length})</TabsTrigger>
            </TabsList>

            {/* Work tab */}
            <TabsContent value="work" className="space-y-4 mt-0">
              {/* Customer concern */}
              <div className="border border-border rounded-lg bg-background p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />Customer concern
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {job.customer_concern ?? <span className="text-muted-foreground/50 italic">No customer concern recorded</span>}
                </p>
              </div>

              {/* Technician notes */}
              <div className="border border-border rounded-lg bg-background p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />Technician notes
                </p>
                <Textarea
                  rows={4}
                  placeholder="Record findings, work done, recommendations…"
                  defaultValue={job.technician_note ?? ""}
                  key={job.technician_note ?? ""}
                  onChange={e => setNoteText(e.target.value)}
                  className="text-sm resize-none"
                />
                <Button
                  size="sm"
                  disabled={savingNote || techNotesMutation.isPending}
                  onClick={() => { setSavingNote(true); techNotesMutation.mutate(noteText || job.technician_note || ""); }}
                >
                  {techNotesMutation.isPending ? "Saving…" : "Save notes"}
                </Button>
              </div>

              {/* QC */}
              {(job.status === "qc" || job.status === "completed" || job.qc_note) && (
                <div className="border border-blue-200 rounded-lg bg-blue-50/50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />QC review
                  </p>
                  {job.qc_by_name && (
                    <p className="text-xs text-muted-foreground">By {job.qc_by_name} · {fmtDate(job.qc_at)}</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {job.qc_note ?? <span className="text-muted-foreground/50 italic">No QC note yet</span>}
                  </p>
                </div>
              )}

              {/* Internal note */}
              {job.internal_note && (
                <div className="border border-border rounded-lg bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Internal note</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{job.internal_note}</p>
                </div>
              )}
            </TabsContent>

            {/* Parts tab */}
            <TabsContent value="parts" className="mt-0">
              <div className="border border-border rounded-lg bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parts & labour</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddPart(p => !p)}>
                    <Plus className="w-3 h-3" />{showAddPart ? "Cancel" : "Add"}
                  </Button>
                </div>

                {parts.length === 0 && !showAddPart ? (
                  <div className="p-8 text-center text-sm text-muted-foreground/50">No parts added yet</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Part #</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Unit</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Total</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map(p => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 text-sm">{p.description}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono hidden sm:table-cell">{p.part_number ?? "—"}</td>
                          <td className="px-4 py-2.5 text-right text-sm">{parseFloat(p.qty).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-sm">{parseFloat(p.unit_price).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium">{parseFloat(p.line_total).toFixed(2)}</td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => removePartMutation.mutate(p.id)}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {parts.length > 0 && (
                        <tr className="bg-muted/30">
                          <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-right">Total</td>
                          <td className="px-4 py-2 text-right text-sm font-bold">{partsTotal.toFixed(2)} AED</td>
                          <td />
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {showAddPart && (
                  <div className="px-4 pb-4">
                    <AddPartForm
                      jobId={job.id}
                      onAdded={() => {
                        qc.invalidateQueries({ queryKey: ["job", id] });
                        setShowAddPart(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Time tab */}
            <TabsContent value="time" className="mt-0">
              <div className="border border-border rounded-lg bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Labor time logs</p>
                  <span className="text-xs font-medium text-muted-foreground">Total: {fmtMinutes(totalMinutes)}</span>
                </div>
                {timeLogs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground/50">
                    <Timer className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                    No time logs yet. Use the mobile app to start the timer.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Started</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Ended</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Duration</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeLogs.map(l => (
                        <tr key={l.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 text-xs">{fmtDate(l.started_at)}</td>
                          <td className="px-4 py-2.5 text-xs">
                            {l.ended_at
                              ? fmtDate(l.ended_at)
                              : <span className="text-orange-600 font-medium flex items-center gap-1"><Clock className="w-3 h-3" />Running</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-sm">{l.minutes ? fmtMinutes(l.minutes) : "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{l.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="mt-3 p-3 border border-dashed border-border rounded-lg bg-muted/20 text-xs text-muted-foreground text-center">
                Timer start/stop is available in the mobile technician app. API: <code className="font-mono">POST /api/jobs/:id/time</code>
              </div>
            </TabsContent>

            {/* Photos tab */}
            <TabsContent value="photos" className="mt-0">
              <div className="border border-border rounded-lg bg-background p-4">
                {photos.length === 0 ? (
                  <div className="p-8 text-center">
                    <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground/60">No photos yet</p>
                    <p className="text-xs text-muted-foreground/40 mt-1">Photos are uploaded from the mobile technician app</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map(p => (
                      <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-muted">
                        <img src={p.url} alt={p.caption ?? "Job photo"} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-2">
                          <span className="text-[10px] text-white font-medium">{p.photo_type}</span>
                          {p.caption && <p className="text-[10px] text-white/80 line-clamp-1">{p.caption}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 p-3 border border-dashed border-border rounded-lg bg-muted/20 text-xs text-muted-foreground text-center">
                  Photo upload available via mobile app or API: <code className="font-mono">POST /api/jobs/:id/photos</code>
                </div>
              </div>
            </TabsContent>

            {/* History tab */}
            <TabsContent value="history" className="mt-0">
              <div className="border border-border rounded-lg bg-background overflow-hidden">
                {statusHistory.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground/50">No history yet</div>
                ) : (
                  <div className="divide-y divide-border">
                    {statusHistory.map((h, i) => (
                      <div key={h.id} className="flex gap-3 px-4 py-3">
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full border-2",
                            h.to_status === "completed" ? "border-green-500 bg-green-500"
                              : h.to_status === "in_progress" ? "border-orange-500 bg-orange-500"
                              : h.to_status === "qc" ? "border-blue-500 bg-blue-500"
                              : "border-muted-foreground/40 bg-muted",
                          )} />
                          {i < statusHistory.length - 1 && <div className="w-0.5 flex-1 bg-border min-h-[16px]" />}
                        </div>
                        <div className="pb-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {h.from_status && (
                              <>
                                <Badge variant="outline" className={cn("text-[10px] border", statusClass(h.from_status))}>
                                  {statusLabel(h.from_status)}
                                </Badge>
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              </>
                            )}
                            <Badge variant="outline" className={cn("text-[10px] border", statusClass(h.to_status))}>
                              {statusLabel(h.to_status)}
                            </Badge>
                          </div>
                          {h.note && <p className="text-xs text-muted-foreground mt-1">{h.note}</p>}
                          <p className="text-[11px] text-muted-foreground/60 mt-1">
                            {h.changed_by_name && <>{h.changed_by_name} · </>}{fmtDate(h.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <JobDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        job={asJobRow}
      />

      <StatusTransitionModal
        open={statusOpen}
        onOpenChange={setStatusOpen}
        jobId={job.id}
        jobRef={job.ref}
        currentStatus={job.status}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["job", id] })}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {job.ref}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job card and all related time logs, parts, and photos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
