import {
  ArrowLeft, Wrench, User, Car, Clock, AlertTriangle, Plus,
  ChevronRight, Timer, Package, Camera, History, CheckCircle2,
  Edit, Trash2, MoreHorizontal, Play, Square, UserPlus, Upload,
  Link as LinkIcon, X, Receipt, FileText, Search, ClipboardList,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn }       from "@/lib/utils";
import { statusClass, statusLabel } from "@/lib/status";
import { toast }    from "sonner";
import JobDrawer, { type JobRow } from "@/components/JobDrawer";
import StatusTransitionModal, { JOB_STATUSES, INSPECTION_STATUSES } from "@/components/StatusTransitionModal";

import { getSession } from "@/hooks/useAuth";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-300",
  high:   "bg-orange-100 text-orange-700 border-orange-300",
  normal: "bg-blue-50 text-blue-700 border-blue-300",
  low:    "bg-gray-100 text-gray-600 border-gray-300",
};

/* ── label maps per module type ──────────────────────────────────────────── */
const SVC_LABELS: Record<string, string> = Object.fromEntries(JOB_STATUSES.map(s => [s.key, s.label]));
const INSP_LABELS: Record<string, string> = Object.fromEntries(INSPECTION_STATUSES.map(s => [s.key, s.label]));
function jobStatusLabel(s: string, isInspection = false) {
  const map = isInspection ? INSP_LABELS : SVC_LABELS;
  return map[s] ?? statusLabel(s);
}

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

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

/* ─── interfaces ─────────────────────────────────────────────────────────── */
interface JobDetail {
  id: string; ref: string; seq: number; type: string | null; status: string; priority: string;
  bay: string | null; started_at: string | null; completed_at: string | null; qc_at: string | null;
  mileage_in: string | null; mileage_out: string | null; scheduled_date: string | null;
  customer_concern: string | null; technician_note: string | null;
  qc_note: string | null; internal_note: string | null; cancellation_note: string | null;
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
interface TechNote {
  id: string;
  note: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
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
  techNotes: TechNote[];
}

/* ─── StatCard ───────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accent, color }: { icon: React.ElementType; label: string; value: string; accent?: boolean; color?: string }) {
  return (
    <div className={cn("border rounded-lg bg-background p-4 flex gap-3 items-start",
      accent ? "border-orange-200 bg-orange-50/40" : "border-border")}>
      <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0",
        accent ? "bg-orange-100" : "bg-primary/10")}
        style={color && !accent ? { backgroundColor: color + "1a" } : undefined}>
        <Icon className={cn("w-4 h-4", accent ? "text-orange-600" : "text-primary")}
          style={color && !accent ? { color } : undefined} />
      </div>
      <div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={cn("text-base font-semibold mt-0.5", accent && "text-orange-700")}>{value}</div>
      </div>
    </div>
  );
}

/* ─── AddPartForm ─────────────────────────────────────────────────────────── */
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
          <Button size="sm" disabled={!form.description || mutation.isPending} onClick={() => mutation.mutate()} className="w-full">
            {mutation.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── TYPE_META — catalog item type colours ──────────────────────────────── */
const TYPE_META: Record<string, { label: string; cls: string }> = {
  labour:     { label: "Labour",     cls: "bg-blue-100 text-blue-700 border-blue-200" },
  part:       { label: "Part",       cls: "bg-green-100 text-green-700 border-green-200" },
  consumable: { label: "Consumable", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  sublet:     { label: "Sublet",     cls: "bg-purple-100 text-purple-700 border-purple-200" },
  package:    { label: "Package",    cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  service:    { label: "Service",    cls: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

/* ─── CatalogDropdown — portal dropdown ─────────────────────────────────── */
function CatalogDropdown({
  items,
  anchorRef,
  onSelect,
  onClose,
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
    position: "fixed",
    top:  rect.bottom + 6,
    left: rect.left,
    width: rect.width,
    zIndex: 9999,
  };

  return createPortal(
    <div style={style} className="rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
      {/* list */}
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
                  {item.sku && (
                    <span className="block text-xs text-muted-foreground font-mono mt-0.5">{item.sku}</span>
                  )}
                </span>
                {price && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{price}</span>
                )}
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

/* ─── AddDiagnosisForm ────────────────────────────────────────────────────── */
function AddDiagnosisForm({ jobId, onAdded }: { jobId: string; onAdded: () => void }) {
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<{ name: string; sku?: string } | null>(null);
  const [qty,      setQty]      = useState("1");
  const [open,     setOpen]     = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const { data: catData } = useQuery({
    queryKey: ["catalog", TENANT],
    queryFn: () => fetch(`${API}/api/settings/catalog?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 60_000,
  });

  const allCatalog: any[] = (catData?.items ?? []).filter((i: any) => i.is_active !== false);
  const filtered = allCatalog.filter(i =>
    !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const pickItem = useCallback((item: any) => {
    setSelected({ name: item.name, sku: item.sku ?? "" });
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
        unit_price: "0",
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
    <div className="border border-dashed border-primary/30 rounded-lg p-4 mt-3 space-y-3 bg-primary/5">
      <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide">Add service / part</p>
      <div className="grid grid-cols-4 gap-3 items-end">
        <div className="col-span-3 space-y-1" ref={anchorRef}>
          <Label className="text-xs">Service or part *</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="h-8 text-sm pl-7 pr-3"
              placeholder="Search catalog or type custom…"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setSelected(null);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 100)}
            />
          </div>
          {selected && (
            <p className="text-[10px] text-green-700 font-medium">
              ✓ From catalog{selected.sku ? ` · SKU: ${selected.sku}` : ""}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qty</Label>
          <Input
            type="number" min="0.01" step="0.01"
            value={qty} onChange={e => setQty(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-4 flex justify-end gap-2">
          <Button
            size="sm"
            disabled={(!selected && !search.trim()) || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Adding…" : "Add service"}
          </Button>
        </div>
      </div>

      {open && (
        <CatalogDropdown
          items={filtered}
          anchorRef={anchorRef}
          onSelect={pickItem}
          onClose={closeDropdown}
        />
      )}
    </div>
  );
}

/* ─── AddManualPartForm ───────────────────────────────────────────────────── */
function AddManualPartForm({ jobId, onAdded }: { jobId: string; onAdded: () => void }) {
  const [description, setDescription] = useState("");
  const [qty,         setQty]         = useState("1");

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
            value={qty}
            onChange={e => setQty(e.target.value)}
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

/* ─── LiveTimer ───────────────────────────────────────────────────────────── */
function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(startedAt).getTime());
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - new Date(startedAt).getTime()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return <span className="font-mono tabular-nums text-orange-600 font-bold text-lg">{fmtElapsed(elapsed)}</span>;
}

/* ─── AssignTechDialog ────────────────────────────────────────────────────── */
function AssignTechDialog({ jobId, open, onClose }: { jobId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [techId, setTechId] = useState("");
  const [isLead, setIsLead] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: techData } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => fetch(`${API}/api/jobs/meta/technicians?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 60_000,
  });
  const technicians: Array<{ id: string; name: string; role: string }> = techData?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/jobs/${jobId}/assign?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technician_id: techId, is_lead: String(isLead), notes: notes || null }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Technician assigned");
      onClose();
      setTechId(""); setIsLead(false); setNotes("");
    },
    onError: () => toast.error("Failed to assign technician"),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Assign technician</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Technician</Label>
            <Select value={techId} onValueChange={setTechId}>
              <SelectTrigger><SelectValue placeholder="Select technician…" /></SelectTrigger>
              <SelectContent>
                {technicians.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} <span className="text-muted-foreground text-xs">({t.role})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isLead" checked={isLead} onChange={e => setIsLead(e.target.checked)} className="rounded" />
            <Label htmlFor="isLead" className="cursor-pointer font-normal">Set as lead technician</Label>
          </div>
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g. Handle engine bay only" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!techId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── AddPhotoForm ────────────────────────────────────────────────────────── */
function AddPhotoForm({ jobId, onAdded }: { jobId: string; onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [type, setType] = useState("general");

  const PHOTO_TYPES = ["before", "after", "damage", "parts", "general"];

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/jobs/${jobId}/photos?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, caption: caption || null, photo_type: type }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      onAdded();
      setUrl(""); setCaption(""); setType("general");
      toast.success("Photo added");
    },
    onError: () => toast.error("Failed to add photo"),
  });

  return (
    <div className="border border-dashed border-border rounded-lg p-4 mt-3 space-y-3 bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <LinkIcon className="w-3.5 h-3.5" />Add photo by URL
      </p>
      <div className="space-y-1">
        <Label className="text-xs">Photo URL *</Label>
        <Input placeholder="https://example.com/photo.jpg" value={url} onChange={e => setUrl(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PHOTO_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Caption</Label>
          <Input placeholder="Optional" value={caption} onChange={e => setCaption(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <Button size="sm" disabled={!url || mutation.isPending} onClick={() => mutation.mutate()} className="w-full">
        {mutation.isPending ? "Adding…" : "Add photo"}
      </Button>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
interface JobDetailPageProps {
  moduleType?: "inspection" | "service_job";
  backPath?: string;
  backLabel?: string;
}

export default function JobDetailPage({ moduleType, backPath = "/jobs", backLabel = "Service Jobs" }: JobDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [editOpen,       setEditOpen]       = useState(false);
  const [statusOpen,     setStatusOpen]     = useState(false);
  const [cancelOpen,     setCancelOpen]     = useState(false);
  const [cancelNote,     setCancelNote]     = useState("");
  const [assignOpen,     setAssignOpen]     = useState(false);
  const [showAddPart,       setShowAddPart]       = useState(false);
  const [showAddManualPart, setShowAddManualPart] = useState(false);
  const [showAddPhoto,   setShowAddPhoto]   = useState(false);
  const [newNote,        setNewNote]        = useState("");
  const [timerNote,      setTimerNote]      = useState("");

  const createInvoiceMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/invoices/from-job/${id}?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Invoice ${data.invoice?.ref} created`);
      navigate(`/invoices/${data.invoice?.id}`);
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const createQuotationMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/quotations/from-job/${id}?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
      toast.success(`Quotation ${data.quotation?.ref} created`);
      navigate(`/quotations/${data.quotation?.id}`);
    },
    onError: () => toast.error("Failed to create quotation"),
  });

  const syncQuotationMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/quotations/sync-from-job/${id}?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
      toast.success(`Quotation ${data.quotation?.ref} updated`);
      navigate(`/quotations/${data.quotation?.id}`);
    },
    onError: () => toast.error("Failed to update quotation"),
  });


  const { data, isLoading } = useQuery<DetailData>({
    queryKey: ["job", id],
    queryFn:  () => fetch(`${API}/api/jobs/${id}?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 10_000,
  });


  const cancelMutation = useMutation({
    mutationFn: (note: string) =>
      fetch(`${API}/api/jobs/${id}/status?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", cancellation_note: note || null }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-kanban"] });
      toast.success("Job cancelled");
      setCancelOpen(false);
      setCancelNote("");
    },
    onError: () => toast.error("Failed to cancel job"),
  });

  const removePartMutation = useMutation({
    mutationFn: (partId: string) =>
      fetch(`${API}/api/jobs/${id}/parts/${partId}?tenant=${TENANT}`, { method: "DELETE" })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Part removed"); },
    onError: () => toast.error("Failed to remove part"),
  });

  const removePhotoMutation = useMutation({
    mutationFn: (photoId: string) =>
      fetch(`${API}/api/jobs/${id}/photos/${photoId}?tenant=${TENANT}`, { method: "DELETE" })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Photo removed"); },
    onError: () => toast.error("Failed to remove photo"),
  });

  const releaseAssignMutation = useMutation({
    mutationFn: (assignId: string) =>
      fetch(`${API}/api/jobs/${id}/assign/${assignId}?tenant=${TENANT}`, { method: "DELETE" })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Technician released"); },
    onError: () => toast.error("Failed to release technician"),
  });

  const addNoteMutation = useMutation({
    mutationFn: (note: string) => {
      const session = getSession();
      return fetch(`${API}/api/jobs/${id}/notes?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, created_by: session?.userId ?? null }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      setNewNote("");
      toast.success("Note saved");
    },
    onError: () => toast.error("Failed to save note"),
  });

  const startTimerMutation = useMutation({
    mutationFn: () =>
      fetch(`${API}/api/jobs/${id}/time?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", notes: timerNote || null }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      toast.success("Timer started");
      setTimerNote("");
    },
    onError: () => toast.error("Failed to start timer"),
  });

  const stopTimerMutation = useMutation({
    mutationFn: () =>
      fetch(`${API}/api/jobs/${id}/time?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      toast.success("Timer stopped");
    },
    onError: () => toast.error("Failed to stop timer"),
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

  if (!data?.job || (moduleType && data.job.type !== moduleType)) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Wrench className="w-12 h-12 text-muted-foreground/20" />
        <p className="text-muted-foreground">{moduleType === "inspection" ? "Inspection" : "Service Job"} not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate(backPath)}>Back to {backLabel.toLowerCase()}</Button>
      </div>
    );
  }

  const { job, statusHistory, assignments, timeLogs, totalMinutes, parts, photos, quotation,
          quotationOutOfSync = false,
          inspectionParts = [], inspectionTechNote, inspectionRef,
          techNotes = [] } = data as any;
  const isInspection = moduleType === "inspection";
  const statusSet    = isInspection ? INSPECTION_STATUSES : JOB_STATUSES;
  const currentLane  = statusSet.find(s => s.key === job.status) ?? JOB_STATUSES.find(s => s.key === job.status);
  const partsTotal  = parts.reduce((sum, p) => sum + parseFloat(p.line_total), 0);
  const runningLog  = timeLogs.find(l => !l.ended_at);

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
        onClick={() => navigate(backPath)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
            style={isInspection ? { backgroundColor: "#ff53491a" } : undefined}>
            {isInspection
              ? <ClipboardList className="w-5 h-5" style={{ color: "#ff5349" }} />
              : <Wrench className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold font-mono">{job.ref}</h1>
              <Badge variant="outline" className={cn("text-xs font-medium border", currentLane?.color)}>
                {jobStatusLabel(job.status, isInspection)}
              </Badge>
              <Badge variant="outline" className={cn("text-xs font-medium border", PRIORITY_BADGE[job.priority])}>
                {job.priority}
              </Badge>
              {job.bay && (
                <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">Bay {job.bay}</span>
              )}
              {runningLog && (
                <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5 flex items-center gap-1 animate-pulse">
                  <Clock className="w-3 h-3" />Timer running
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Created {fmtDate(job.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isInspection && job.status === "completed" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={createInvoiceMutation.isPending}
              onClick={() => createInvoiceMutation.mutate()}
            >
              <Receipt className="w-3.5 h-3.5" />
              {createInvoiceMutation.isPending ? "Creating…" : "Create invoice"}
            </Button>
          )}
          {/* Update quotation — only shown when linked quotation is out of sync with current parts */}
          {quotation && quotationOutOfSync && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={syncQuotationMutation.isPending}
              onClick={() => syncQuotationMutation.mutate()}
            >
              <FileText className="w-3.5 h-3.5" />
              {syncQuotationMutation.isPending ? "Updating…" : "Update quotation"}
            </Button>
          )}
          {/* Create quotation — only for inspections without an existing quotation */}
          {!quotation && isInspection && (job.status === "completed" || job.status === "delivered") && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={createQuotationMutation.isPending}
              onClick={() => createQuotationMutation.mutate()}
            >
              <FileText className="w-3.5 h-3.5" />
              {createQuotationMutation.isPending ? "Creating…" : "Create quotation"}
            </Button>
          )}
          {job.status !== "cancelled" && (
            <Button size="sm" onClick={() => setStatusOpen(true)}>
              Move status
            </Button>
          )}
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
              {job.status !== "cancelled" && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => { setCancelNote(""); setCancelOpen(true); }}
                >
                  <X className="w-3.5 h-3.5 mr-2" />Cancel job
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Timer} label="Labor time" value={fmtMinutes(totalMinutes)} accent={!!runningLog} color={isInspection ? "#ff5349" : undefined} />
        <StatCard icon={Package} label={isInspection ? "Diagnosis" : "Inspection"} value={`${parts.length} items`} color={isInspection ? "#ff5349" : undefined} />
        <StatCard icon={Camera} label="Photos" value={`${photos.length}`} color={isInspection ? "#ff5349" : undefined} />
        <StatCard icon={History} label="Status changes" value={`${statusHistory.length}`} color={isInspection ? "#ff5349" : undefined} />
      </div>

      {/* Cancellation banner */}
      {job.status === "cancelled" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-3">
          <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Job cancelled</p>
            {job.cancellation_note && (
              <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{job.cancellation_note}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          {/* Customer & vehicle */}
          <div className="border border-border rounded-lg bg-background p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer & vehicle</p>
            {job.client_name ? (
              <button
                onClick={() => job.client_id && navigate(`/customers/${job.client_id}`)}
                className="flex items-start gap-2 w-full hover:opacity-70 transition-opacity text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0"
                  style={isInspection ? { backgroundColor: "#ff53491a", color: "#ff5349" } : undefined}>
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
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</p>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={() => setAssignOpen(true)}>
                <UserPlus className="w-3 h-3" />Assign
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Advisor</p>
                <p className="text-sm font-medium">{job.advisor_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Lead technician</p>
                <p className="text-sm font-medium">{job.technician_name ?? <span className="text-muted-foreground/50">Unassigned</span>}</p>
              </div>
              {assignments.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">All assigned</p>
                  <div className="space-y-1.5">
                    {assignments.map(a => (
                      <div key={a.id} className="flex items-center gap-2 group">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                          {a.technician_name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() ?? "?"}
                        </div>
                        <span className="text-xs flex-1 truncate">{a.technician_name}</span>
                        {a.is_lead === "true" && (
                          <span className="text-[10px] bg-primary/10 text-primary rounded px-1 shrink-0">lead</span>
                        )}
                        <button
                          onClick={() => releaseAssignMutation.mutate(a.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
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
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="work">Work</TabsTrigger>
              {isInspection && (
                <TabsTrigger value="parts">Diagnosis ({parts.length})</TabsTrigger>
              )}
              {!isInspection && job.source_inspection_id && (
                <TabsTrigger value="inspection">Inspection ({inspectionParts.length})</TabsTrigger>
              )}
              {!isInspection && !job.source_inspection_id && (
                <TabsTrigger value="parts">Inspection ({parts.length})</TabsTrigger>
              )}
              <TabsTrigger value="time">Time ({fmtMinutes(totalMinutes)})</TabsTrigger>
              <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
              <TabsTrigger value="history">History ({statusHistory.length})</TabsTrigger>
            </TabsList>

            {/* ── Work tab ─────────────────────────────────────────────── */}
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

              {/* Technician notes log */}
              <div className="border border-border rounded-lg bg-background p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />Technician notes
                </p>

                {/* Existing notes timeline */}
                {techNotes.length > 0 ? (
                  <div className="space-y-2.5">
                    {(techNotes as TechNote[]).map((n) => (
                      <div key={n.id} className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {n.created_by_name ?? "Unknown"}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {new Date(n.created_at).toLocaleString("en-GB", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{n.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">No notes yet.</p>
                )}

                {/* Add new note */}
                <div className="space-y-2 pt-1 border-t border-border">
                  <Textarea
                    rows={3}
                    placeholder="Add a new note — findings, work done, recommendations…"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="text-sm resize-none"
                  />
                  <Button
                    size="sm"
                    disabled={addNoteMutation.isPending}
                    onClick={() => { if (newNote.trim()) addNoteMutation.mutate(newNote); }}
                  >
                    {addNoteMutation.isPending ? "Saving…" : "Save note"}
                  </Button>
                </div>
              </div>

              {/* QC review */}
              {!isInspection && (job.status === "qc" || job.status === "completed" || job.status === "delivered" || job.qc_note) && (
                <div className="border border-blue-200 rounded-lg bg-blue-50/50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />QC review / completion check
                  </p>
                  {job.qc_by_name && (
                    <p className="text-xs text-muted-foreground">By {job.qc_by_name} · {fmtDate(job.qc_at)}</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {job.qc_note ?? <span className="text-muted-foreground/50 italic">No QC note yet</span>}
                  </p>
                  {job.status !== "qc" && job.status !== "completed" && job.status !== "delivered" && job.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="text-blue-700 border-blue-300" onClick={() => setStatusOpen(true)}>
                      Send to QC
                    </Button>
                  )}
                </div>
              )}

              {/* Completion checklist hint */}
              {(job.status === "completed" || job.status === "delivered") && (
                <div className="border border-green-200 rounded-lg bg-green-50/50 p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-green-800 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />Completion summary
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    {[
                      ["Mileage in",   job.mileage_in  ? `${parseInt(job.mileage_in).toLocaleString()} km`  : "—"],
                      ["Mileage out",  job.mileage_out ? `${parseInt(job.mileage_out).toLocaleString()} km` : "—"],
                      ["Labor time",   fmtMinutes(totalMinutes)],
                      ["Parts",        `${parts.length} item(s) · ${partsTotal.toFixed(2)} AED`],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <span className="text-muted-foreground">{k}: </span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {job.status === "completed" && (
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => setStatusOpen(true)}>
                        Mark as delivered
                      </Button>
                    )}
                  </div>
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

            {/* ── Parts / Diagnosis tab ────────────────────────────────── */}
            <TabsContent value="parts" className="mt-0">
              <div className="border border-border rounded-lg bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {isInspection ? "Diagnosis items" : "Inspection items"}
                  </p>
                  {isInspection ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => { setShowAddPart(p => !p); setShowAddManualPart(false); }}>
                        <Plus className="w-3 h-3" />{showAddPart ? "Cancel" : "Add service"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => { setShowAddManualPart(p => !p); setShowAddPart(false); }}>
                        <Plus className="w-3 h-3" />{showAddManualPart ? "Cancel" : "Add parts"}
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddPart(p => !p)}>
                      <Plus className="w-3 h-3" />{showAddPart ? "Cancel" : "Add"}
                    </Button>
                  )}
                </div>

                {parts.length === 0 && !showAddPart && !showAddManualPart ? (
                  <div className="p-8 text-center text-sm text-muted-foreground/50">
                    {isInspection ? "No diagnosis items added yet" : "No inspection items added yet"}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
                        {!isInspection && <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Part #</th>}
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                        {!isInspection && <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Unit</th>}
                        {!isInspection && <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Total</th>}
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map(p => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 text-sm">{p.description}</td>
                          {!isInspection && <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono hidden sm:table-cell">{p.part_number ?? "—"}</td>}
                          <td className="px-4 py-2.5 text-right text-sm">{parseFloat(p.qty).toFixed(2)}</td>
                          {!isInspection && <td className="px-4 py-2.5 text-right text-sm">{parseFloat(p.unit_price).toFixed(2)}</td>}
                          {!isInspection && <td className="px-4 py-2.5 text-right text-sm font-medium">{parseFloat(p.line_total).toFixed(2)}</td>}
                          <td className="px-2 py-2">
                            <button onClick={() => removePartMutation.mutate(p.id)}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!isInspection && parts.length > 0 && (
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
                    {isInspection ? (
                      <AddDiagnosisForm jobId={job.id} onAdded={() => {
                        qc.invalidateQueries({ queryKey: ["job", id] });
                        setShowAddPart(false);
                      }} />
                    ) : (
                      <AddPartForm jobId={job.id} onAdded={() => {
                        qc.invalidateQueries({ queryKey: ["job", id] });
                        setShowAddPart(false);
                      }} />
                    )}
                  </div>
                )}
                {showAddManualPart && (
                  <div className="px-4 pb-4">
                    <AddManualPartForm jobId={job.id} onAdded={() => {
                      qc.invalidateQueries({ queryKey: ["job", id] });
                      setShowAddManualPart(false);
                    }} />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Inspection tab (service jobs linked to an inspection) ── */}
            {!isInspection && job.source_inspection_id && (
              <TabsContent value="inspection" className="mt-0 space-y-4">
                <div className="border border-border rounded-lg bg-background overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Inspection findings
                      {inspectionRef && <span className="ml-2 text-muted-foreground/60 normal-case font-normal">from {inspectionRef}</span>}
                    </p>
                  </div>

                  {inspectionParts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground/50">No items recorded in inspection</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Part #</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectionParts.map((p: any) => (
                          <tr key={p.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-2.5 text-sm">{p.description}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono hidden sm:table-cell">{p.part_number || "—"}</td>
                            <td className="px-4 py-2.5 text-right text-sm">{parseFloat(p.qty).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {inspectionTechNote && (
                  <div className="border border-border rounded-lg bg-background p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />Technician notes from inspection
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{inspectionTechNote}</p>
                  </div>
                )}
              </TabsContent>
            )}

            {/* ── Time tab ─────────────────────────────────────────────── */}
            <TabsContent value="time" className="mt-0 space-y-3">
              {/* Timer control card */}
              <div className={cn(
                "border rounded-lg p-4",
                runningLog ? "border-orange-200 bg-orange-50/50" : "border-border bg-background",
              )}>
                {runningLog ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Timer running</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Elapsed time</p>
                        <LiveTimer startedAt={runningLog.started_at} />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-100"
                        disabled={stopTimerMutation.isPending}
                        onClick={() => stopTimerMutation.mutate()}
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        {stopTimerMutation.isPending ? "Stopping…" : "Stop timer"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Started at {new Date(runningLog.started_at).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5" />Labor time tracker
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Optional note for this session…"
                        value={timerNote}
                        onChange={e => setTimerNote(e.target.value)}
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        size="sm"
                        className="gap-1.5 shrink-0"
                        disabled={startTimerMutation.isPending}
                        onClick={() => startTimerMutation.mutate()}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {startTimerMutation.isPending ? "Starting…" : "Start timer"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total logged: <span className="font-semibold">{fmtMinutes(totalMinutes)}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Logs table */}
              <div className="border border-border rounded-lg bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time logs</p>
                  <span className="text-xs font-medium text-muted-foreground">Total: {fmtMinutes(totalMinutes)}</span>
                </div>
                {timeLogs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground/50">
                    <Timer className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                    No time logs yet. Start the timer above.
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
                        <tr key={l.id} className={cn("border-b border-border last:border-0", !l.ended_at && "bg-orange-50/30")}>
                          <td className="px-4 py-2.5 text-xs">{fmtDate(l.started_at)}</td>
                          <td className="px-4 py-2.5 text-xs">
                            {l.ended_at
                              ? fmtDate(l.ended_at)
                              : <span className="text-orange-600 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" />Running
                                </span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-sm">
                            {l.minutes ? fmtMinutes(l.minutes) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{l.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

            {/* ── Photos tab ───────────────────────────────────────────── */}
            <TabsContent value="photos" className="mt-0 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{photos.length} photo{photos.length !== 1 ? "s" : ""} attached</p>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddPhoto(p => !p)}>
                  <Upload className="w-3 h-3" />{showAddPhoto ? "Cancel" : "Add photo"}
                </Button>
              </div>

              {showAddPhoto && (
                <AddPhotoForm jobId={job.id} onAdded={() => {
                  qc.invalidateQueries({ queryKey: ["job", id] });
                  setShowAddPhoto(false);
                }} />
              )}

              {photos.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-12 text-center">
                  <Camera className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground/60 font-medium">No photos yet</p>
                  <p className="text-xs text-muted-foreground/40 mt-1">Add photos via URL above or from the mobile technician app</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map(p => (
                    <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-muted">
                      <img src={p.url} alt={p.caption ?? "Job photo"} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2">
                        <span className="text-[10px] text-white font-medium capitalize">{p.photo_type}</span>
                        {p.caption && <p className="text-[10px] text-white/80 line-clamp-1">{p.caption}</p>}
                      </div>
                      <button
                        onClick={() => removePhotoMutation.mutate(p.id)}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity
                                   bg-black/50 hover:bg-red-600 rounded p-1 text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 border border-dashed border-border rounded-lg bg-muted/20 text-xs text-muted-foreground text-center">
                Native camera upload available in the mobile technician app
              </div>
            </TabsContent>

            {/* ── History tab ─────────────────────────────────────────── */}
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
                            h.to_status === "delivered" ? "border-teal-500 bg-teal-500"
                              : h.to_status === "completed" ? "border-green-500 bg-green-500"
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
                                  {jobStatusLabel(h.from_status, isInspection)}
                                </Badge>
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              </>
                            )}
                            <Badge variant="outline" className={cn("text-[10px] border", statusClass(h.to_status))}>
                              {jobStatusLabel(h.to_status, isInspection)}
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

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <JobDrawer open={editOpen} onOpenChange={setEditOpen} job={asJobRow} />

      <StatusTransitionModal
        open={statusOpen}
        onOpenChange={setStatusOpen}
        jobId={job.id}
        jobRef={job.ref}
        currentStatus={job.status}
        moduleType={moduleType}
        onSuccess={(newStatus, data) => {
          if (newStatus === "move_to_service_job") {
            const d = data as { job?: { id?: string; ref?: string } };
            if (d?.job?.id) navigate(`/jobs/${d.job.id}`);
          } else {
            qc.invalidateQueries({ queryKey: ["job", id] });
          }
        }}
      />

      <AssignTechDialog jobId={job.id} open={assignOpen} onClose={() => setAssignOpen(false)} />

      {/* Cancel job dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {job.ref}?</DialogTitle>
            <DialogDescription>
              The job will be marked as cancelled. You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-note">Reason (optional)</Label>
            <Textarea
              id="cancel-note"
              placeholder="e.g. Customer requested cancellation…"
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(cancelNote)}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
