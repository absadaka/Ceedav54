import {
  ArrowLeft, Zap, User, Car, Plus,
  Edit, Trash2, Package, History, CheckCircle2,
  Search, Wrench, Receipt, Send, MessageSquare, Phone, Mail,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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

interface TechNote {
  id: string; note: string; type: string;
  created_by: string | null; created_by_name: string | null; created_at: string;
}

interface HistoryEntry {
  id: string; from_status: string | null; to_status: string;
  note: string | null; changed_by_name: string | null; created_at: string;
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  labour:     { label: "Labour",     cls: "bg-blue-100 text-blue-700 border-blue-200" },
  part:       { label: "Part",       cls: "bg-green-100 text-green-700 border-green-200" },
  consumable: { label: "Consumable", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  sublet:     { label: "Sublet",     cls: "bg-purple-100 text-purple-700 border-purple-200" },
  package:    { label: "Package",    cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  service:    { label: "Service",    cls: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

function CatalogDropdown({
  items, anchorRef, onSelect, onClose,
}: {
  items: any[];
  anchorRef: React.RefObject<HTMLDivElement>;
  onSelect: (item: any) => void;
  onClose: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
  }, [anchorRef]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  if (!rect) return null;
  const style: React.CSSProperties = {
    position: "fixed", top: rect.bottom + 6, left: rect.left, width: rect.width, zIndex: 9999,
  };
  return createPortal(
    <div style={style} className="rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
      <div className="max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No catalog items match your search</div>
        ) : (
          items.map((item: any) => {
            const tm = TYPE_META[item.type] ?? { label: item.type ?? "Item", cls: "bg-gray-100 text-gray-600 border-gray-200" };
            const price = item.unit_price ? `AED ${parseFloat(item.unit_price).toFixed(2)}` : null;
            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); onSelect(item); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/60 text-left border-b border-border/40 last:border-0 transition-colors"
              >
                <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${tm.cls}`}>
                  {tm.label}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{item.name}</span>
                  {item.sku && <span className="block text-xs text-muted-foreground font-mono mt-0.5">{item.sku}</span>}
                </span>
                {price && <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{price}</span>}
              </button>
            );
          })
        )}
      </div>
      {items.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/40 text-[10px] text-muted-foreground text-right">
          {items.length} result{items.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>,
    document.body
  );
}

function AddServiceForm({ jobId, onAdded }: { jobId: string; onAdded: () => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ name: string; sku?: string; unit_price?: string } | null>(null);
  const [qty, setQty] = useState("1");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const { data: catData } = useQuery({
    queryKey: ["catalog", TENANT],
    queryFn: () => fetch(`${API}/api/settings/catalog?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 60_000,
  });

  const allCatalog: any[] = (catData?.items ?? []).filter((i: any) => i.is_active !== false);
  const filtered = allCatalog.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const pickItem = useCallback((item: any) => {
    setSelected({ name: item.name, sku: item.sku ?? "", unit_price: item.unit_price ?? "0" });
    setSearch(item.name);
    setOpen(false);
  }, []);

  const closeDropdown = useCallback(() => setOpen(false), []);

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/jobs/${jobId}/parts?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: selected?.name ?? search,
        part_number: selected?.sku ?? "",
        qty,
        unit_price: selected?.unit_price ?? "0",
      }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      onAdded();
      setSearch(""); setSelected(null); setQty("1");
      toast.success("Service added");
    },
    onError: () => toast.error("Failed to add service"),
  });

  return (
    <div className="border border-dashed border-primary/30 rounded-lg p-4 mt-3 space-y-3 bg-primary/5" ref={anchorRef}>
      <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide">Add service / part</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className={cn("h-8 text-sm pl-7 pr-3", selected ? "border-green-500 ring-1 ring-green-500/20" : "")}
            placeholder="Search catalog or type custom…"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 100)}
          />
        </div>
        <Input
          type="number" min="0.01" step="0.01"
          value={qty} onChange={e => setQty(e.target.value)}
          className="h-8 text-sm w-16 shrink-0"
          placeholder="Qty"
        />
        <Button
          size="sm" className="h-8 shrink-0"
          disabled={(!selected && !search.trim()) || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Adding…" : "Add"}
        </Button>
      </div>
      {open && <CatalogDropdown items={filtered} anchorRef={anchorRef} onSelect={pickItem} onClose={closeDropdown} />}
    </div>
  );
}

function AddManualPartForm({ jobId, onAdded }: { jobId: string; onAdded: () => void }) {
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/jobs/${jobId}/parts?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, qty, unit_price: "0", part_number: "" }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      onAdded();
      setDescription(""); setQty("1");
      toast.success("Part added");
    },
    onError: () => toast.error("Failed to add part"),
  });

  return (
    <div className="border border-dashed border-border rounded-lg p-4 mt-3 space-y-3 bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add part manually</p>
      <div className="grid grid-cols-4 gap-3 items-end">
        <div className="col-span-3 space-y-1">
          <Label className="text-xs">Part description *</Label>
          <Input
            className="h-8 text-sm"
            placeholder="e.g. Engine Air Filter"
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && description.trim()) mutation.mutate(); }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qty</Label>
          <Input
            type="number" min="0.01" step="0.01"
            value={qty} onChange={e => setQty(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-4 flex justify-end">
          <Button size="sm" disabled={!description.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Adding…" : "Add part"}
          </Button>
        </div>
      </div>
    </div>
  );
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
    job: JobDetail; parts: Part[]; history: HistoryEntry[]; techNotes: TechNote[]; invoices: any[];
  }>({
    queryKey: ["quick-repair", id],
    queryFn: () => fetch(`${API}/api/jobs/${id}?tenant=${TENANT}`).then(r => r.json()),
  });

  const job       = data?.job;
  const parts     = data?.parts ?? [];
  const history   = data?.history ?? [];
  const techNotes = data?.techNotes ?? [];
  const invoices  = data?.invoices ?? [];

  const [editOpen, setEditOpen]   = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddManualPart, setShowAddManualPart] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [noteText, setNoteText] = useState("");
  const [showShareInvoice, setShowShareInvoice] = useState(false);
  const [shareChannels, setShareChannels] = useState({ sms: false, whatsapp: false, email: false });
  const [activeTab, setActiveTab] = useState("parts");
  const partsRef = useRef<HTMLDivElement>(null);

  const deletePartMut = useMutation({
    mutationFn: async (partId: string) => {
      const r = await fetch(`${API}/api/jobs/${id}/parts/${partId}?tenant=${TENANT}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-repair", id] });
      toast.success("Item removed");
    },
    onError: () => toast.error("Failed to remove item"),
  });

  const noteMut = useMutation({
    mutationFn: async (note: string) => {
      const session = getSession();
      const r = await fetch(`${API}/api/jobs/${id}/notes?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, created_by: session?.userId, type: "technician" }),
      });
      if (!r.ok) throw new Error("Failed to add note");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-repair", id] });
      setNoteText("");
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

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

  const createInvoiceMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/invoices/from-job/${id}?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["quick-repair", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Invoice ${data.invoice?.ref} created`);
      setActiveTab("invoices");
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => fetch(`${API}/api/invoices/${invoiceId}/send?tenant=${TENANT}`, {
      method: "POST",
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-repair", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      statusMut.mutate({ status: "invoiced" });
      toast.success("Invoice sent to customer");
    },
    onError: () => toast.error("Failed to send invoice"),
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
            ) : job.status === "completed" ? (() => {
              const inv = invoices[0];
              const hasInvoice = !!inv;
              const isSent = hasInvoice && inv.status !== "draft";
              return (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (isSent) return;
                    if (hasInvoice) {
                      setShareChannels({ sms: false, whatsapp: false, email: false });
                      setShowShareInvoice(true);
                    } else {
                      createInvoiceMutation.mutate();
                    }
                  }}
                  disabled={isSent || createInvoiceMutation.isPending || sendInvoiceMutation.isPending}
                >
                  {isSent ? <CheckCircle2 className="w-4 h-4" /> : hasInvoice ? <Send className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                  {createInvoiceMutation.isPending ? "Creating…" : sendInvoiceMutation.isPending ? "Sending…" : isSent ? "Invoice Shared" : hasInvoice ? "Send Invoice" : "Create Invoice"}
                </Button>
              );
            })() : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => handleStatusClick(next.key)}
                disabled={statusMut.isPending}
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="parts" className="gap-1.5"><Package className="w-3.5 h-3.5" />Parts & Services</TabsTrigger>
          {["completed", "invoiced", "delivered"].includes(job.status) && (
            <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="w-3.5 h-3.5" />Invoices</TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-1.5"><History className="w-3.5 h-3.5" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="parts" className="mt-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => { setShowAddService(true); setShowAddManualPart(false); }}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-colors",
                showAddService ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30" : "border-border hover:border-blue-400 bg-background"
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Add Service</p>
                <p className="text-xs text-muted-foreground">From service catalog</p>
              </div>
            </button>
            <button
              onClick={() => { setShowAddManualPart(true); setShowAddService(false); }}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-colors",
                showAddManualPart ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30" : "border-border hover:border-blue-400 bg-background"
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Add Parts</p>
                <p className="text-xs text-muted-foreground">Custom or manual entry</p>
              </div>
            </button>
          </div>

          {(showAddService || showAddManualPart) && (
            <div>
              {showAddService && (
                <AddServiceForm jobId={id!} onAdded={() => {
                  qc.invalidateQueries({ queryKey: ["quick-repair", id] });
                  setShowAddService(false);
                }} />
              )}
              {showAddManualPart && (
                <AddManualPartForm jobId={id!} onAdded={() => {
                  qc.invalidateQueries({ queryKey: ["quick-repair", id] });
                  setShowAddManualPart(false);
                }} />
              )}
            </div>
          )}

          {parts.length > 0 && (
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Item</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-16">Qty</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">{p.description}</span>
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums">{parseFloat(p.qty)}</td>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => deletePartMut.mutate(p.id)}
                          className="p-1 hover:bg-destructive/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Technician Notes</span>
            </div>
            {techNotes.length > 0 && (
              <div className="divide-y divide-border">
                {techNotes.map(n => (
                  <div key={n.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{n.created_by_name ?? "Technician"}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-3 border-t border-border">
              <Textarea
                placeholder="Add a note about the inspection findings..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={() => { if (noteText.trim()) noteMut.mutate(noteText.trim()); }}
                  disabled={!noteText.trim() || noteMut.isPending}
                >
                  {noteMut.isPending ? "Adding…" : "Add Note"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-4">
          {invoices.length === 0 ? (
            <div className="border border-border rounded-lg bg-background overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />Invoices
                </p>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={createInvoiceMutation.isPending}
                  onClick={() => createInvoiceMutation.mutate()}
                >
                  <Plus className="w-3 h-3" />
                  {createInvoiceMutation.isPending ? "Creating…" : "Create Invoice"}
                </Button>
              </div>
              <div className="px-4 py-8 text-center">
                <Receipt className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground/50 italic">No invoices yet</p>
                <p className="text-xs text-muted-foreground/40 mt-1">Create an invoice from this job's parts list</p>
              </div>
            </div>
          ) : (
            invoices.map((inv: any) => {
              const subtotal = parseFloat(inv.subtotal ?? "0");
              const discount = parseFloat(inv.discount ?? "0");
              const taxAmount = parseFloat(inv.tax_amount ?? "0");
              const total = parseFloat(inv.total ?? "0");
              const paid  = parseFloat(inv.paid_amount ?? "0");
              const balance = total - paid;
              const taxRate = parseFloat(inv.tax_rate ?? "5");
              const lines: any[] = inv.lineItems ?? [];
              const pmts: any[] = inv.payments ?? [];
              const statusColor: Record<string, string> = {
                draft:   "bg-slate-100 text-slate-700",
                sent:    "bg-blue-100 text-blue-700",
                partial: "bg-amber-100 text-amber-700",
                paid:    "bg-green-100 text-green-700",
                overdue: "bg-red-100 text-red-700",
                void:    "bg-gray-100 text-gray-500",
              };
              return (
                <div key={inv.id} className="border border-border rounded-lg bg-background overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground">{inv.ref}</span>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase", statusColor[inv.status] ?? "bg-gray-100 text-gray-600")}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" })}
                      {inv.due_at && <> · Due {new Date(inv.due_at).toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}</>}
                    </p>
                  </div>

                  {lines.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                            <th className="text-left px-4 py-2 font-medium">#</th>
                            <th className="text-left px-4 py-2 font-medium">Description</th>
                            <th className="text-left px-4 py-2 font-medium">Type</th>
                            <th className="text-right px-4 py-2 font-medium">Qty</th>
                            <th className="text-right px-4 py-2 font-medium">Unit Price</th>
                            <th className="text-right px-4 py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {lines.map((line: any, idx: number) => (
                            <tr key={line.id} className="hover:bg-muted/10">
                              <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                              <td className="px-4 py-2 text-foreground font-medium">{line.description}</td>
                              <td className="px-4 py-2 text-muted-foreground capitalize">{line.type}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{parseFloat(line.qty).toFixed(0)}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{parseFloat(line.unit_price).toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-medium text-foreground">{parseFloat(line.line_total).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {inv.notes && (
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Technician Notes</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{inv.notes}</p>
                    </div>
                  )}

                  <div className="border-t border-border px-4 py-3">
                    <div className="flex justify-end">
                      <div className="w-56 space-y-1 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span>{subtotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Discount</span>
                            <span>-{discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-muted-foreground">
                          <span>VAT ({taxRate}%)</span>
                          <span>{taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm text-foreground border-t border-border pt-1">
                          <span>Total</span>
                          <span>AED {total.toFixed(2)}</span>
                        </div>
                        {paid > 0 && (
                          <>
                            <div className="flex justify-between text-green-600">
                              <span>Paid</span>
                              <span>-{paid.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-amber-600">
                              <span>Balance Due</span>
                              <span>AED {balance.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {pmts.length > 0 && (
                    <div className="border-t border-border">
                      <div className="px-4 py-2 bg-muted/20">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Payments</p>
                      </div>
                      <div className="divide-y divide-border">
                        {pmts.map((pmt: any) => (
                          <div key={pmt.id} className="px-4 py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="capitalize text-muted-foreground">{pmt.method?.replace("_", " ")}</span>
                              {pmt.reference && <span className="text-muted-foreground/60">#{pmt.reference}</span>}
                            </div>
                            <div className="text-right">
                              <span className="font-medium text-green-600">AED {parseFloat(pmt.amount).toFixed(2)}</span>
                              <span className="ml-2 text-muted-foreground/60">{new Date(pmt.paid_at).toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
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
            disabled={statusMut.isPending || (parts.length === 0 && techNotes.length === 0)}
          >
            {statusMut.isPending ? "Updating…" : "Mark as Work Done"}
          </Button>
          {parts.length === 0 && techNotes.length === 0 && (
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

      <Dialog open={showShareInvoice} onOpenChange={setShowShareInvoice}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Invoice</DialogTitle>
            <DialogDescription>Choose how to send the invoice to the customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {([
              { key: "sms" as const, label: "SMS", icon: <MessageSquare className="w-4 h-4" />, desc: "Send via text message" },
              { key: "whatsapp" as const, label: "WhatsApp", icon: <Phone className="w-4 h-4" />, desc: "Send via WhatsApp" },
              { key: "email" as const, label: "Email", icon: <Mail className="w-4 h-4" />, desc: "Send via email" },
            ]).map(ch => (
              <label
                key={ch.key}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  shareChannels[ch.key]
                    ? "border-[#161aff] bg-[#161aff]/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <input
                  type="checkbox"
                  checked={shareChannels[ch.key]}
                  onChange={() => setShareChannels(prev => ({ ...prev, [ch.key]: !prev[ch.key] }))}
                  className="sr-only"
                />
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                  shareChannels[ch.key] ? "border-[#161aff] bg-[#161aff]" : "border-muted-foreground/30"
                )}>
                  {shareChannels[ch.key] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className={cn("p-1.5 rounded-md", shareChannels[ch.key] ? "text-[#161aff]" : "text-muted-foreground")}>
                  {ch.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{ch.label}</p>
                  <p className="text-xs text-muted-foreground">{ch.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowShareInvoice(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!shareChannels.sms && !shareChannels.whatsapp && !shareChannels.email || sendInvoiceMutation.isPending}
              onClick={() => {
                const inv = invoices[0];
                if (inv) {
                  sendInvoiceMutation.mutate(inv.id);
                  setShowShareInvoice(false);
                }
              }}
              className="bg-[#161aff] hover:bg-[#1014cc] text-white"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {sendInvoiceMutation.isPending ? "Sending…" : "Share Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

