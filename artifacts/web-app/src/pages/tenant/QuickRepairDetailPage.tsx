import {
  ArrowLeft, Zap, User, Car, Clock, Plus,
  Edit, Trash2, Package, History, CheckCircle2,
  Receipt, Truck, Pencil, Search,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn }       from "@/lib/utils";
import { statusClass, statusLabel } from "@/lib/status";
import { toast }    from "sonner";
import JobDrawer, { type JobRow } from "@/components/JobDrawer";

import { getSession } from "@/hooks/useAuth";
import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const QR_FLOW = [
  { key: "new",       label: "New" },
  { key: "completed", label: "Work Done" },
  { key: "invoiced",  label: "Invoiced" },
  { key: "delivered", label: "Delivered" },
];

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtAed(val: string | number | null) {
  return `AED ${parseFloat(String(val ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface JobDetail {
  id: string; ref: string; seq: number; type: string | null; status: string; priority: string;
  bay: string | null; started_at: string | null; completed_at: string | null;
  mileage_in: string | null; mileage_out: string | null;
  customer_concern: string | null; technician_note: string | null;
  internal_note: string | null;
  created_at: string; updated_at: string;
  client_id: string | null; client_name: string | null; client_phone: string | null; client_email: string | null;
  vehicle_id: string | null; plate_number: string | null; make: string | null; model: string | null;
  year: string | null; color: string | null;
  advisor_id: string | null; advisor_name: string | null;
  technician_id: string | null; technician_name: string | null;
  quotation_id: string | null; booking_id: string | null;
}

interface Part {
  id: string; sort_order: number; part_number: string | null;
  description: string; qty: string; unit_price: string; line_total: string;
}

interface HistoryEntry {
  id: string; from_status: string | null; to_status: string;
  note: string | null; changed_by_name: string | null; created_at: string;
}

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-300",
  high:   "bg-orange-100 text-orange-700 border-orange-300",
  normal: "bg-blue-50 text-blue-700 border-blue-300",
  low:    "bg-gray-100 text-gray-600 border-gray-300",
};

export default function QuickRepairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{
    job: JobDetail; parts: Part[]; history: HistoryEntry[];
  }>({
    queryKey: ["quick-repair", id],
    queryFn: () => fetch(`${API}/api/jobs/${id}?tenant=${TENANT}`).then(r => r.json()),
  });

  const job     = data?.job;
  const parts   = data?.parts ?? [];
  const history = data?.history ?? [];

  const [editOpen, setEditOpen]   = useState(false);
  const [partDialog, setPartDialog] = useState<{ open: boolean; part?: Part }>({ open: false });
  const [statusDialog, setStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const partsRef = useRef<HTMLDivElement>(null);

  const statusMut = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const session = getSession();
      const r = await fetch(`${API}/api/jobs/${id}/status?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note, changed_by: session?.userId }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-repair", id] });
      qc.invalidateQueries({ queryKey: ["quick-repairs-kanban"] });
      toast.success("Status updated");
      setStatusDialog(false);
      setPendingStatus(null);
      setStatusNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/jobs/${id}?tenant=${TENANT}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast.success("Quick repair deleted");
      navigate("/quick-repairs");
    },
    onError: () => toast.error("Cannot delete this repair"),
  });

  function nextStatus() {
    if (!job) return null;
    const idx = QR_FLOW.findIndex(s => s.key === job.status);
    if (idx >= 0 && idx < QR_FLOW.length - 1) return QR_FLOW[idx + 1];
    return null;
  }

  function handleStatusClick(status: string) {
    setPendingStatus(status);
    setStatusNote("");
    setStatusDialog(true);
  }

  function confirmStatus() {
    if (pendingStatus) statusMut.mutate({ status: pendingStatus, note: statusNote || undefined });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Quick repair not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/quick-repairs")}>Back to list</Button>
      </div>
    );
  }

  const next = nextStatus();
  const currentStep = QR_FLOW.findIndex(s => s.key === job.status);
  const partsTotal = parts.reduce((s, p) => s + parseFloat(p.line_total || "0"), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/quick-repairs")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h1 className="text-lg font-semibold">{job.ref}</h1>
              <Badge variant="outline" className={cn("text-xs font-medium border", statusClass(job.status))}>
                {QR_FLOW.find(s => s.key === job.status)?.label ?? statusLabel(job.status)}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] border", PRIORITY_BADGE[job.priority])}>
                {job.priority}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {fmtDate(job.created_at)}
              {job.completed_at && ` · Completed ${fmtDate(job.completed_at)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="w-3.5 h-3.5 mr-1" />Edit
          </Button>
          {job.status === "new" && (
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => { if (confirm("Delete this quick repair?")) deleteMut.mutate(); }}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
            </Button>
          )}
        </div>
      </div>

      {/* Progress tracker */}
      <div className="bg-background border border-border rounded-lg px-6 py-4">
        <div className="flex items-center justify-between">
          {QR_FLOW.map((step, i) => {
            const done = i <= currentStep;
            const isCurrent = i === currentStep;
            return (
              <div key={step.key} className="flex items-center gap-0 flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                    isCurrent ? "border-primary bg-primary text-primary-foreground" :
                    done ? "border-green-500 bg-green-50 text-green-700" :
                    "border-border bg-muted text-muted-foreground",
                  )}>
                    {done && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium whitespace-nowrap",
                    isCurrent ? "text-primary" : done ? "text-green-700" : "text-muted-foreground",
                  )}>{step.label}</span>
                </div>
                {i < QR_FLOW.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 mt-[-16px]",
                    i < currentStep ? "bg-green-400" : "bg-border",
                  )} />
                )}
              </div>
            );
          })}
        </div>
        {next && (
          <div className="mt-4 flex justify-center">
            {next.key === "completed" ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  partsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Update Work Report
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => handleStatusClick(next.key)}
                disabled={statusMut.isPending || (job.status === "new" && parts.length === 0)}
              >
                {statusMut.isPending ? "Updating…" : `Mark as ${next.label}`}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer */}
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</span>
          </div>
          <p className="text-sm font-medium">{job.client_name ?? "—"}</p>
          {job.client_phone && <p className="text-xs text-muted-foreground mt-1">{job.client_phone}</p>}
          {job.client_email && <p className="text-xs text-muted-foreground">{job.client_email}</p>}
        </div>

        {/* Vehicle */}
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Car className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</span>
          </div>
          <p className="text-sm font-medium font-mono">{job.plate_number ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {[job.make, job.model, job.year].filter(Boolean).join(" ") || "—"}
            {job.color && ` · ${job.color}`}
          </p>
          {job.mileage_in && <p className="text-xs text-muted-foreground">Mileage: {job.mileage_in} km</p>}
        </div>

        {/* Assignment */}
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repair Info</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Technician: <span className="text-foreground font-medium">{job.technician_name ?? "Unassigned"}</span></p>
            {job.bay && <p className="text-xs text-muted-foreground">Bay: <span className="text-foreground font-medium">{job.bay}</span></p>}
            <p className="text-xs text-muted-foreground">Parts total: <span className="text-foreground font-medium">{fmtAed(partsTotal)}</span></p>
          </div>
        </div>
      </div>

      {/* Customer concern */}
      {job.customer_concern && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Customer concern</p>
          <p className="text-sm text-amber-900">{job.customer_concern}</p>
        </div>
      )}

      {/* Tabs: Parts & History */}
      <div ref={partsRef}>
      <Tabs defaultValue="parts">
        <TabsList>
          <TabsTrigger value="parts" className="gap-1.5"><Package className="w-3.5 h-3.5" />Parts & Services</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="w-3.5 h-3.5" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="parts" className="mt-4">
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Parts & services ({parts.length})</span>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setPartDialog({ open: true })}>
                <Plus className="w-3.5 h-3.5" />Add item
              </Button>
            </div>
            {parts.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Package className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">No parts or services added yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground w-16">Qty</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground w-24">Unit Price</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground w-24">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{p.description}</span>
                        {p.part_number && <span className="text-xs text-muted-foreground ml-2">#{p.part_number}</span>}
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums">{parseFloat(p.qty)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums">{fmtAed(p.unit_price)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-medium">{fmtAed(p.line_total)}</td>
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => setPartDialog({ open: true, part: p })}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-sm">Total</td>
                    <td className="text-right px-4 py-2.5 font-semibold tabular-nums">{fmtAed(partsTotal)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="bg-background border border-border rounded-lg p-4">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No history yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        {h.from_status && (
                          <>
                            <Badge variant="outline" className={cn("text-[10px] border", statusClass(h.from_status))}>
                              {statusLabel(h.from_status)}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        <Badge variant="outline" className={cn("text-[10px] border", statusClass(h.to_status))}>
                          {statusLabel(h.to_status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {h.changed_by_name ?? "System"} · {fmtDate(h.created_at)}
                        {h.note && ` — ${h.note}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {job.status === "new" && (
        <div className="flex justify-center pt-2 pb-4">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => handleStatusClick("completed")}
            disabled={statusMut.isPending || parts.length === 0}
          >
            {statusMut.isPending ? "Updating…" : "Mark as Work Done"}
          </Button>
          {parts.length === 0 && (
            <p className="text-xs text-muted-foreground ml-3 self-center">Add at least one part, service or note first</p>
          )}
        </div>
      )}
      </div>

      {/* Status confirmation dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {pendingStatus && (pendingStatus === "completed" ? "Update Work Report" : `Mark as ${QR_FLOW.find(s => s.key === pendingStatus)?.label}`)}
            </DialogTitle>
            <DialogDescription>Add an optional note for this status change.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Optional note…"
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
            <Button onClick={confirmStatus} disabled={statusMut.isPending}>
              {statusMut.isPending ? "Updating…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Part add/edit dialog */}
      <PartDialog
        open={partDialog.open}
        part={partDialog.part}
        jobId={id!}
        onClose={() => setPartDialog({ open: false })}
        onSaved={() => {
          setPartDialog({ open: false });
          qc.invalidateQueries({ queryKey: ["quick-repair", id] });
        }}
      />

      {/* Edit drawer */}
      {editOpen && job && (
        <JobDrawer
          open={editOpen}
          onOpenChange={setEditOpen}
          job={{
            id: job.id,
            ref: job.ref,
            status: job.status,
            priority: job.priority,
            bay: job.bay,
            client_id: job.client_id,
            client_name: job.client_name,
            vehicle_id: job.vehicle_id,
            plate_number: job.plate_number,
            advisor_id: job.advisor_id,
            technician_id: job.technician_id,
            customer_concern: job.customer_concern,
            internal_note: job.internal_note,
            mileage_in: job.mileage_in,
          }}
          jobType="quick_repair"
        />
      )}
    </div>
  );
}

function PartDialog({ open, part, jobId, onClose, onSaved }: {
  open: boolean; part?: Part; jobId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!part;
  const [form, setForm] = useState({
    description: "", qty: "1", unit_price: "0.00", part_number: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        description: part?.description ?? "",
        qty: part?.qty ? String(parseFloat(part.qty)) : "1",
        unit_price: part?.unit_price ? String(parseFloat(part.unit_price)) : "0.00",
        part_number: part?.part_number ?? "",
      });
    }
  }, [open, part]);

  const { data: catalogData } = useQuery<{ data: Array<{ id: string; name: string; type: string; unit_price: string; sku: string | null }> }>({
    queryKey: ["catalog-items"],
    queryFn: () => fetch(`${API}/api/settings/services?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 60_000,
    enabled: open,
  });

  const [catalogSearch, setCatalogSearch] = useState("");
  const catalogItems = catalogData?.data ?? [];
  const filteredCatalog = catalogSearch
    ? catalogItems.filter(c => c.name.toLowerCase().includes(catalogSearch.toLowerCase()))
    : catalogItems;

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isEdit
        ? `${API}/api/jobs/${jobId}/parts/${part!.id}?tenant=${TENANT}`
        : `${API}/api/jobs/${jobId}/parts?tenant=${TENANT}`;
      const r = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Failed to save part");
      return r.json();
    },
    onSuccess: onSaved,
    onError: () => toast.error("Failed to save part"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/jobs/${jobId}/parts/${part!.id}?tenant=${TENANT}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: onSaved,
    onError: () => toast.error("Failed to delete part"),
  });

  function selectCatalogItem(item: typeof catalogItems[0]) {
    setForm({
      description: item.name,
      qty: "1",
      unit_price: String(parseFloat(item.unit_price)),
      part_number: item.sku ?? "",
    });
    setCatalogSearch("");
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "Add part or service"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update the item details." : "Add a part or service from the catalog or manually."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Quick add from catalog</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search catalog…"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              {catalogSearch && filteredCatalog.length > 0 && (
                <div className="border border-border rounded-md max-h-32 overflow-y-auto">
                  {filteredCatalog.slice(0, 8).map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCatalogItem(c)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex justify-between"
                    >
                      <span>{c.name}</span>
                      <span className="text-muted-foreground text-xs">AED {parseFloat(c.unit_price).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Oil filter replacement" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <Input type="number" min="0.01" step="0.01" value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit price</Label>
              <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Part #</Label>
              <Input value={form.part_number} onChange={e => setForm(p => ({ ...p, part_number: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {isEdit && (
            <Button variant="outline" className="text-destructive mr-auto" onClick={() => { if (confirm("Delete this item?")) deleteMut.mutate(); }}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.description}>
              {mutation.isPending ? "Saving…" : isEdit ? "Update" : "Add"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
