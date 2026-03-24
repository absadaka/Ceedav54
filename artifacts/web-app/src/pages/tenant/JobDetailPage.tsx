import {
  ArrowLeft, Wrench, User, Car, Clock, AlertTriangle, Plus,
  ChevronRight, Timer, Package, Camera, History, CheckCircle2,
  Edit, Trash2, MoreHorizontal, Play, Square, UserPlus, Upload,
  Link as LinkIcon, X, Receipt, FileText, Search, ClipboardList, Pencil, ArrowRight,
  Loader2, DollarSign, Wallet, CircleX, ClipboardCheck, Eye, Calculator, Hammer, Send, Truck,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { JOB_STATUSES, INSPECTION_STATUSES } from "@/components/StatusTransitionModal";

import { getSession } from "@/hooks/useAuth";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const PAYMENT_METHODS = [
  { value: "cash",          label: "Cash" },
  { value: "card",          label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque",        label: "Cheque" },
  { value: "online",        label: "Online" },
];

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

function fmtAed(val: string | number | null) {
  return `AED ${parseFloat(String(val ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

/* ─── ServiceFlowTracker ─────────────────────────────────────────────────── */
function ServiceFlowTracker({
  currentStatus,
  statusHistory,
  isInspection,
  onStepClick,
}: {
  currentStatus: string;
  statusHistory: StatusHistoryEntry[];
  isInspection: boolean;
  onStepClick?: (statusKey: string) => void;
}) {
  const stages = (isInspection ? INSPECTION_STATUSES : JOB_STATUSES).filter(
    (s) => s.key !== "move_to_service_job"
  );
  const reachedAt: Record<string, string> = {};
  for (const entry of statusHistory) {
    if (entry.to_status && !reachedAt[entry.to_status]) {
      reachedAt[entry.to_status] = entry.created_at;
    }
  }
  const currentIdx  = stages.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === "cancelled";

  const [celebrating, setCelebrating] = useState(false);
  const prevIdxRef = useRef(currentIdx);

  useEffect(() => {
    if (currentIdx > prevIdxRef.current) {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 700);
      prevIdxRef.current = currentIdx;
      return () => clearTimeout(t);
    }
    prevIdxRef.current = currentIdx;
  }, [currentIdx]);

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-background via-background to-muted/20 px-5 pt-4 pb-5 shadow-sm overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle_at_60%_50%,_hsl(var(--primary))_0%,_transparent_70%)]" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-primary/60" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Service Flow Tracker
          </span>
        </div>
        {isCancelled && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
            Cancelled
          </span>
        )}
      </div>

      <div className="flex items-start">
        {stages.map((stage, idx) => {
          const isPast      = !isCancelled && currentIdx > idx;
          const isCurrent   = !isCancelled && idx === currentIdx;
          const isFuture    = isCancelled || idx > currentIdx;
          const isClickable = !isCancelled && onStepClick && idx !== currentIdx;
          const timestamp   = reachedAt[stage.key];

          return (
            <div key={stage.key} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className="flex items-center w-full">
                  {idx > 0 && (
                    <div
                      className={cn(
                        "flex-1 h-[2px] rounded-full transition-colors duration-500",
                        isPast ? "bg-primary" : isCurrent ? "bg-primary/40" : "bg-border"
                      )}
                    />
                  )}
                  <button
                    disabled={!isClickable}
                    onClick={() => isClickable && onStepClick?.(stage.key)}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-all duration-300",
                      isPast
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : isCurrent
                        ? "bg-background border-primary text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
                        : "bg-background border-border text-muted-foreground",
                      isPast && celebrating ? "step-celebrate" : "",
                      isClickable && !isPast && "hover:border-primary/60 hover:text-primary/80 hover:scale-110 cursor-pointer",
                      isClickable && isPast && "hover:scale-110 cursor-pointer",
                      !isClickable && "cursor-default"
                    )}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className={cn("text-[10px] font-bold", isCurrent ? "text-primary" : "text-muted-foreground/60")}>
                        {idx + 1}
                      </span>
                    )}
                  </button>
                  {idx < stages.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-[2px] rounded-full transition-colors duration-500",
                        isPast ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>

                <div className="flex flex-col items-center mt-2 px-1 min-w-0 w-full">
                  <button
                    disabled={!isClickable}
                    onClick={() => isClickable && onStepClick?.(stage.key)}
                    className={cn(
                      "text-[10px] font-semibold text-center leading-tight truncate w-full transition-colors",
                      isCurrent
                        ? "text-primary"
                        : isPast
                        ? "text-foreground/70"
                        : "text-muted-foreground/50",
                      isClickable && !isCurrent && "hover:text-primary/70",
                      isClickable ? "cursor-pointer" : "cursor-default"
                    )}
                  >
                    {stage.label}
                  </button>
                  {timestamp ? (
                    <span className="text-[9px] text-muted-foreground/50 text-center mt-0.5 leading-none">
                      {new Date(timestamp).toLocaleDateString("en-AE", { day: "numeric", month: "short" })}
                    </span>
                  ) : (
                    <span className="text-[9px] text-transparent mt-0.5 leading-none select-none">–</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

/* ─── AddQuoteLineInline ──────────────────────────────────────────────────── */
function AddQuoteLineInline({ quotationId, onAdded, onCancel }: { quotationId: string; onAdded: () => void; onCancel: () => void }) {
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0.00");
  const [showDrop, setShowDrop] = useState(false);

  const { data: catData } = useQuery({
    queryKey: ["catalog", TENANT],
    queryFn: () => fetch(`${API}/api/settings/catalog?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 60_000,
  });
  const allCatalog: any[] = (catData?.items ?? []).filter((i: any) => i.is_active !== false);
  const filtered = allCatalog.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  function pickItem(item: any) {
    setDescription(item.name);
    setSearch(item.name);
    setUnitPrice(parseFloat(item.unit_price).toFixed(2));
    setShowDrop(false);
  }

  const lineTotal = Math.max(0, parseFloat(qty || "0") * parseFloat(unitPrice || "0"));

  const add = useMutation({
    mutationFn: () => fetch(`${API}/api/quotations/${quotationId}/lines?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: description || search, type: "labour", qty, unit_price: unitPrice, discount: "0.00" }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      toast.success("Line item added");
      onAdded();
    },
    onError: () => toast.error("Failed to add line"),
  });

  return (
    <tr className="border-t border-dashed border-primary/30 bg-primary/5">
      <td className="px-3 py-2">
        <div className="relative">
          <Input
            className="h-7 text-xs"
            placeholder="Search catalog or type description…"
            value={search}
            onChange={e => { setSearch(e.target.value); setDescription(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
          />
          {showDrop && filtered.length > 0 && (
            <div className="absolute z-50 top-full left-0 mt-1 w-80 rounded-md border bg-popover shadow-lg overflow-hidden">
              {filtered.map((item: any) => (
                <button key={item.id} type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent text-left gap-3"
                  onMouseDown={() => pickItem(item)}>
                  <span className="font-medium truncate flex-1">{item.name}</span>
                  <span className="tabular-nums font-semibold text-foreground shrink-0">AED {parseFloat(item.unit_price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <Input className="h-7 text-xs w-16 tabular-nums" type="number" step="0.01" min="0" value={qty} onChange={e => setQty(e.target.value)} />
      </td>
      <td className="px-3 py-2 text-right text-xs tabular-nums font-medium">{fmtAed(lineTotal)}</td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => add.mutate()} disabled={!(description || search) || add.isPending}>
            {add.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancel}><X className="w-3 h-3" /></Button>
        </div>
      </td>
    </tr>
  );
}

/* ─── AddDiagnosisForm ────────────────────────────────────────────────────── */
function AddDiagnosisForm({ jobId, onAdded }: { jobId: string; onAdded: () => void }) {
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<{ name: string; sku?: string; unit_price?: string } | null>(null);
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
  const [cancelOpen,     setCancelOpen]     = useState(false);
  const [cancelNote,     setCancelNote]     = useState("");
  const [assignOpen,     setAssignOpen]     = useState(false);
  const [showAddPart,       setShowAddPart]       = useState(false);
  const [showAddManualPart, setShowAddManualPart] = useState(false);
  const [showAddPhoto,   setShowAddPhoto]   = useState(false);
  const [dirtyParts,     setDirtyParts]     = useState(false);
  const [showAddQtLine,  setShowAddQtLine]  = useState(false);
  const [showAddQtDiscount, setShowAddQtDiscount] = useState(false);
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareChannels, setShareChannels] = useState<{ whatsapp: boolean; sms: boolean; email: boolean }>({ whatsapp: false, sms: false, email: false });
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRevertShareModal, setShowRevertShareModal] = useState(false);
  const [newNote,        setNewNote]        = useState("");
  const [newReportNote,  setNewReportNote]  = useState("");
  const [timerNote,      setTimerNote]      = useState("");

  const [inlineField,    setInlineField]    = useState<string | null>(null);
  const [inlineValue,    setInlineValue]    = useState("");
  const inlineSavedRef = useRef(false);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState("work");
  const tabsRef = useRef<HTMLDivElement>(null);

  const patchJobMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      fetch(`${API}/api/jobs/${id}?tenant=${TENANT}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Saved"); setInlineField(null); },
    onError: () => toast.error("Failed to save"),
  });

  const patchVehicleMutation = useMutation({
    mutationFn: ({ vehicleId, data }: { vehicleId: string; data: Record<string, string> }) =>
      fetch(`${API}/api/vehicles/${vehicleId}?tenant=${TENANT}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Saved"); setInlineField(null); },
    onError: () => toast.error("Failed to save"),
  });

  const { data: teamData } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => fetch(`${API}/api/jobs/meta/technicians?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 60_000,
  });
  const teamMembers: Array<{ id: string; name: string; role: string }> = teamData?.data ?? [];

  const NEXT_STATUS: Record<string, string> = {
    new: "waiting", waiting: "on_hold", on_hold: "qc",
    qc: "in_progress", in_progress: "completed",
    completed: "invoiced", invoiced: "delivered",
  };

  const validateTransition = (targetStatus: string): boolean => {
    if (!job) return false;
    if (job.status === "new" && targetStatus !== "waiting") {
      toast.error("You must check in the vehicle first before moving to any other stage");
      return false;
    }
    if (job.status === "new" && targetStatus === "waiting") {
      const missing: string[] = [];
      if (!job.vin) missing.push("VIN");
      const mileage = job.mileage_in ?? (job as any).vehicle_mileage;
      if (!mileage) missing.push("Mileage");
      if (missing.length > 0) {
        toast.error(`Please fill in ${missing.join(" and ")} before checking in`);
        return false;
      }
    }
    if (job.status === "waiting" && targetStatus === "on_hold") {
      if (!job.technician_id && !job.advisor_id) {
        toast.error("Please assign a Technician or an Advisor before moving to Inspection");
        return false;
      }
    }
    if (job.status === "on_hold" && targetStatus === "qc") {
      const hasParts = parts.length > 0;
      const hasNotes = techNotes.length > 0;
      if (!hasParts && !hasNotes) {
        toast.error("Please add at least one service/part or a technician note before moving to Estimation");
        return false;
      }
    }
    if (job.status === "completed" && targetStatus === "invoiced") {
      const hasReportEntries = reportNotes.length > 0;
      if (!hasReportEntries) {
        toast.error("Please add at least one report entry or photo before moving to Invoices");
        return false;
      }
    }
    return true;
  };

  const moveStatusMutation = useMutation({
    mutationFn: async (targetStatus: string) => {
      const userId = (() => { try { const s = localStorage.getItem("ceeda_session"); return s ? JSON.parse(s).userId : undefined; } catch { return undefined; } })();
      const r = await fetch(`${API}/api/jobs/${id}/status?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, changed_by: userId }),
      });
      if (!r.ok) throw new Error("Status transition failed");
      return { targetStatus, data: await r.json() };
    },
    onSuccess: ({ targetStatus }) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-kanban"] });
      qc.invalidateQueries({ queryKey: ["inspections-kanban"] });
      qc.invalidateQueries({ queryKey: ["job", id] });
      const label = [...JOB_STATUSES, ...INSPECTION_STATUSES].find(s => s.key === targetStatus)?.label ?? targetStatus;
      toast.success(`Moved to ${label}`);
    },
    onError: () => toast.error("Could not update status"),
  });

  const moveStatus = (targetStatus: string) => {
    if (!validateTransition(targetStatus)) return;
    moveStatusMutation.mutate(targetStatus);
  };

  const moveToNext = () => {
    const next = NEXT_STATUS[job?.status ?? ""];
    if (next) moveStatus(next);
  };

  const createInvoiceMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/invoices/from-job/${id}?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Invoice ${data.invoice?.ref} created`);
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
      toast.success(data.reused ? `Quotation ${data.quotation?.ref} already exists` : `Quotation ${data.quotation?.ref} created`);
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
      setDirtyParts(false);
      toast.success(`Quotation ${data.quotation?.ref} updated`);
    },
    onError: () => toast.error("Failed to update quotation"),
  });

  const addQuoteLineMutation = useMutation({
    mutationFn: (body: { description: string; type: string; part_number?: string; qty: string; unit_price: string; discount?: string }) =>
      fetch(`${API}/api/quotations/${quotation?.id}/lines?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, discount: body.discount ?? "0.00" }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Line item added"); },
    onError: () => toast.error("Failed to add line"),
  });

  const deleteQuoteLineMutation = useMutation({
    mutationFn: (lineId: string) =>
      fetch(`${API}/api/quotations/${quotation?.id}/lines/${lineId}?tenant=${TENANT}`, { method: "DELETE" })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Line removed"); },
    onError: () => toast.error("Failed to remove line"),
  });

  const addAdvancePaymentMutation = useMutation({
    mutationFn: (body: { amount: string; method: string; reference?: string; note?: string }) =>
      fetch(`${API}/api/quotations/${quotation?.id}/advance?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Payment recorded"); },
    onError: () => toast.error("Failed to record payment"),
  });

  const deleteAdvancePaymentMutation = useMutation({
    mutationFn: (payId: string) =>
      fetch(`${API}/api/quotations/${quotation?.id}/advance/${payId}?tenant=${TENANT}`, { method: "DELETE" })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Payment removed"); },
    onError: () => toast.error("Failed to remove payment"),
  });

  const revertToSharedMutation = useMutation({
    mutationFn: () =>
      fetch(`${API}/api/quotations/${quotation?.id}/revert-to-sent?tenant=${TENANT}`, { method: "POST" })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Quotation reverted to Shared"); },
    onError: () => toast.error("Failed to revert quotation"),
  });

  const approveQuotationMutation = useMutation({
    mutationFn: () =>
      fetch(`${API}/api/quotations/${quotation?.id}/approve?tenant=${TENANT}`, { method: "POST" })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Quotation approved"); },
    onError: () => toast.error("Failed to approve quotation"),
  });

  const rejectQuotationMutation = useMutation({
    mutationFn: (reason: string) =>
      fetch(`${API}/api/quotations/${quotation?.id}/reject?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: reason }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      toast.success("Quotation rejected — job cancelled");
      setShowRejectConfirm(false);
      setRejectReason("");
    },
    onError: () => toast.error("Failed to reject quotation"),
  });

  const shareQuotationMutation = useMutation({
    mutationFn: (channels: { whatsapp: boolean; sms: boolean; email: boolean }) =>
      fetch(`${API}/api/quotations/${quotation?.id}/send?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      toast.success("Quotation shared successfully");
      setShowShareModal(false);
      setShareChannels({ whatsapp: false, sms: false, email: false });
    },
    onError: () => toast.error("Failed to share quotation"),
  });


  const { data, isLoading } = useQuery<DetailData>({
    queryKey: ["job", id],
    queryFn:  () => fetch(`${API}/api/jobs/${id}?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 10_000,
  });

  const jobStatus = (data as any)?.job?.status;
  useEffect(() => {
    if (!jobStatus) return;
    const statusTabMap: Record<string, string> = {
      new: "work", waiting: "work",
      on_hold: "parts", qc: "cost",
      in_progress: "report",
      completed: "invoices", invoiced: "invoices",
      delivered: "work",
    };
    const target = statusTabMap[jobStatus] ?? "work";
    setActiveTab(target);
  }, [jobStatus]);

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

  const updatePartPriceMutation = useMutation({
    mutationFn: ({ partId, unit_price }: { partId: string; unit_price: string }) =>
      fetch(`${API}/api/jobs/${id}/parts/${partId}?tenant=${TENANT}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit_price }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); toast.success("Price updated"); },
    onError: () => toast.error("Failed to update price"),
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

  const addReportNoteMutation = useMutation({
    mutationFn: (note: string) => {
      const session = getSession();
      return fetch(`${API}/api/jobs/${id}/notes?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, type: "report", created_by: session?.userId ?? null }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      setNewReportNote("");
      toast.success("Report entry saved");
    },
    onError: () => toast.error("Failed to save report entry"),
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

  const { data: catData } = useQuery({
    queryKey: ["catalog", TENANT],
    queryFn: () => fetch(`${API}/api/settings/catalog?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 60_000,
  });
  const catalogSet = useMemo(() => {
    const items: any[] = catData?.items ?? [];
    const set = new Set<string>();
    items.forEach(i => { set.add(i.name.toLowerCase()); if (i.sku) set.add(i.sku.toLowerCase()); });
    return set;
  }, [catData]);

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
          quoteLineItems = [], quoteAdvancePayments = [], quoteTotalPaid = 0, quoteBalance = 0,
          inspectionParts = [], inspectionTechNote, inspectionRef,
          techNotes = [], reportNotes = [], invoices = [] } = data as any;
  const isInspection = moduleType === "inspection";
  const isInspectionStage = isInspection || job.status === "on_hold";
  const isEstimationStage = job.status === "qc";
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

  const needsVin = job.status === "new" && !job.vin;
  const needsMileage = job.status === "new" && !(job.mileage_in ?? (job as any).vehicle_mileage);
  const needsAssignment = job.status === "waiting" && !job.technician_id && !job.advisor_id;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(backPath)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>

      {/* Header Card */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-muted/20 shadow-sm overflow-hidden">
        <div className="px-6 py-5 flex flex-col lg:flex-row lg:items-center gap-5">
          {/* Vehicle + customer info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0"
              style={isInspection ? { backgroundColor: "#fff0ef", borderColor: "#ffd0ce" } : undefined}>
              {isInspection
                ? <ClipboardList className="w-7 h-7" style={{ color: "#ff5349" }} />
                : <Car className="w-7 h-7 text-blue-500" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5">
                  {job.priority === "urgent" ? "VIP Client" : job.priority === "high" ? "Premium Client" : "Client"}
                </span>
                <span className="text-[11px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5">
                  #{job.ref}
                </span>
                {runningLog && (
                  <span className="text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2.5 py-0.5 flex items-center gap-1 animate-pulse">
                    <Clock className="w-3 h-3" />Timer running
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold leading-tight truncate">
                {job.client_name ?? <span className="text-muted-foreground/50 text-lg font-normal">No customer linked</span>}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                <span>{[job.year, job.make, job.model].filter(Boolean).join(" ")}</span>
                {job.color && <><span className="text-border">•</span><span>{job.color}</span></>}
                {job.plate_number && <><span className="text-border">•</span><span className="font-mono font-semibold text-foreground">{job.plate_number}</span></>}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-mono text-muted-foreground">VIN:</span>
                <span className="text-xs font-mono text-muted-foreground">{job.vin ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Info strip */}
          <div className="flex items-center gap-0 lg:gap-0 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 flex-wrap gap-y-3">

            {/* MILEAGE — read-only */}
            <div className="flex items-stretch">
              <div className="text-center min-w-[70px]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Mileage</p>
                <p className="text-sm font-semibold text-foreground">
                  {(() => { const val = job.mileage_in ?? (job as any).vehicle_mileage; return val ? `${parseInt(val).toLocaleString()} mi` : "—"; })()}
                </p>
              </div>
            </div>

            <div className="w-px bg-border mx-4 hidden sm:block" />

            {/* BAY — read-only */}
            <div className="flex items-stretch">
              <div className="text-center min-w-[70px]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Bay</p>
                <p className="text-sm font-semibold text-foreground">{job.bay ?? "—"}</p>
              </div>
            </div>

            <div className="w-px bg-border mx-4 hidden sm:block" />

            {/* ADVISOR — read-only */}
            <div className="flex items-stretch">
              <div className="text-center min-w-[70px]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Advisor</p>
                <p className={cn("text-sm", job.advisor_name ? "font-semibold text-foreground" : "text-muted-foreground")}>{job.advisor_name ?? "—"}</p>
              </div>
            </div>

            <div className="w-px bg-border mx-4 hidden sm:block" />

            {/* STATUS — static */}
            <div className="flex items-stretch">
              <div className="text-center min-w-[70px]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                <p className="text-sm font-semibold text-blue-600 leading-snug">
                  {jobStatusLabel(job.status, isInspection)}
                </p>
              </div>
            </div>

            <div className="w-px bg-border mx-4 hidden sm:block" />

            {/* EST. COMPLETION — static */}
            <div className="flex items-stretch">
              <div className="text-center min-w-[70px]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Est. Completion</p>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {job.scheduled_date ? (() => {
                    const d = new Date(job.scheduled_date);
                    const today = new Date();
                    return d.toDateString() === today.toDateString()
                      ? `Today, ${d.toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}`
                      : fmtDate(job.scheduled_date);
                  })() : "—"}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {!isInspection && (dirtyParts || (quotation && quotationOutOfSync)) && (
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={syncQuotationMutation.isPending} onClick={() => syncQuotationMutation.mutate()}>
                <FileText className="w-3.5 h-3.5" />
                {syncQuotationMutation.isPending ? "Updating…" : "Update quotation"}
              </Button>
            )}
            {!quotation && isInspection && (job.status === "completed" || job.status === "delivered") && (
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={createQuotationMutation.isPending} onClick={() => createQuotationMutation.mutate()}>
                <FileText className="w-3.5 h-3.5" />
                {createQuotationMutation.isPending ? "Creating…" : "Create quotation"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="px-2 h-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {job.status !== "cancelled" && (
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setCancelNote(""); setCancelOpen(true); }}>
                    <X className="w-3.5 h-3.5 mr-2" />Cancel job
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Service Flow Tracker */}
      <ServiceFlowTracker
        currentStatus={job.status}
        statusHistory={statusHistory}
        isInspection={isInspection}
        onStepClick={(key) => moveStatus(key)}
      />

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

      {/* Next Required Action — full width */}
      {job.status !== "cancelled" && (
        <div className="space-y-4">
          {(() => {
            const NEXT_ACTION: Record<string, { title: string; desc: string; btn: string; icon: React.ReactNode }> = {
              new:           { title: "Check In Vehicle",                desc: "Verify vehicle arrival, record mileage and start the job card.",                                              btn: "Start Check-in",       icon: <ClipboardCheck className="w-4 h-4" /> },
              waiting:       { title: "Begin Vehicle Inspection",        desc: "Vehicle is checked in. Assign a technician and start the multi-point inspection.",                            btn: "Start Inspection",     icon: <Eye className="w-4 h-4" /> },
              on_hold:       { title: "Complete Full Vehicle Inspection", desc: "Add required services and parts to the diagnosis list. Prices are hidden — focus on what the vehicle needs.", btn: "Start Inspection",     icon: <Eye className="w-4 h-4" /> },
              qc:            { title: "Prepare Estimation",              desc: "Review inspection findings and prepare a detailed cost estimate for the customer.",                           btn: "Create Quotation",     icon: <Calculator className="w-4 h-4" /> },
              in_progress:   { title: "Work In Progress",                desc: "Technician is actively working on the vehicle. Monitor progress and time logs.",                             btn: "Update Work Status",   icon: <Hammer className="w-4 h-4" /> },
              completed:     { title: "Ready for Invoicing",             desc: "Work is complete. Prepare and send the invoice to the customer.",                                             btn: "Mark as Invoiced",     icon: <Send className="w-4 h-4" /> },
              invoiced:      { title: "Invoiced — Ready for Delivery",  desc: "Invoice has been issued. Collect payment and prepare the vehicle for handover.",                             btn: "Mark as Delivered",     icon: <Truck className="w-4 h-4" /> },
              delivered:     { title: "Job Complete",                    desc: "The vehicle has been delivered to the customer. The job card is closed.",                                    btn: "",                      icon: <CheckCircle2 className="w-4 h-4" /> },
            };
            const action = NEXT_ACTION[job.status] ?? { title: "Update Status", desc: "Move this job to the next stage in the workflow.", btn: "Move Status", icon: <ArrowRight className="w-4 h-4" /> };

            const isReady = (() => {
              switch (job.status) {
                case "new": return !!(job.vin && (job.mileage_in ?? (job as any).vehicle_mileage));
                case "waiting": return !!(job.technician_id || job.advisor_id);
                case "on_hold": return parts.length > 0 || techNotes.length > 0;
                case "qc": return !!quotation;
                case "in_progress": return true;
                case "completed": return reportNotes.length > 0;
                case "invoiced": return true;
                default: return true;
              }
            })();

            return (
              <div className="rounded-xl border border-border bg-background px-6 py-5 flex items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-3">
                    <span className={cn("w-1.5 h-1.5 rounded-full inline-block", isReady ? "bg-blue-600" : "bg-gray-300")} />
                    Next required action
                  </p>
                  <h2 className="text-xl font-bold leading-tight text-foreground mb-2">{action.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{action.desc}</p>
                </div>
                {job.status !== "delivered" && (
                  <div className="flex flex-col gap-2 shrink-0 w-44">
                    {job.status === "on_hold" ? (
                      <button
                        onClick={() => moveStatus("qc")}
                        disabled={moveStatusMutation.isPending}
                        className={cn(
                          "w-full h-10 rounded-xl border-2 bg-transparent transition-colors flex items-center justify-center gap-2 disabled:opacity-50",
                          isReady ? "border-[#161aff] bg-[#161aff] text-white hover:bg-[#1014cc] hover:border-[#1014cc] hover:shadow-lg hover:scale-[1.03]" : "border-[#161aff]/40 text-[#161aff]/60 hover:border-[#161aff]/70 hover:text-[#161aff]/80"
                        )}
                      >
                        <Calculator className="w-4 h-4" />
                        <span className="text-xs font-bold">Move to Estimation</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (job.status === "qc") {
                            setActiveTab("cost");
                            setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                          } else {
                            moveToNext();
                          }
                        }}
                        disabled={moveStatusMutation.isPending}
                        className={cn(
                          "w-full h-10 rounded-xl border-2 bg-transparent transition-colors flex items-center justify-center gap-2 disabled:opacity-50",
                          isReady ? "border-[#161aff] bg-[#161aff] text-white hover:bg-[#1014cc] hover:border-[#1014cc] hover:shadow-lg hover:scale-[1.03]" : "border-[#161aff]/40 text-[#161aff]/60 hover:border-[#161aff]/70 hover:text-[#161aff]/80"
                        )}
                      >
                        {action.icon}
                        <span className="text-xs font-bold">{action.btn}</span>
                      </button>
                    )}
                    {job.status === "qc" && (() => {
                      const qApproved = quotation?.status === "approved";
                      return (
                        <button
                          onClick={() => qApproved && moveStatus("in_progress")}
                          disabled={moveStatusMutation.isPending || !qApproved}
                          className={cn(
                            "w-full h-10 rounded-xl border-2 bg-transparent transition-colors flex items-center justify-center gap-2 disabled:opacity-50",
                            qApproved ? "border-[#161aff] bg-[#161aff] text-white hover:bg-[#1014cc] hover:border-[#1014cc] hover:shadow-lg hover:scale-[1.03]" : "border-[#161aff]/40 text-[#161aff]/60 cursor-not-allowed"
                          )}
                        >
                          <Hammer className="w-4 h-4" />
                          <span className="text-xs font-bold">Start the Work</span>
                          {!qApproved && (
                            <span className="text-[9px] font-normal opacity-80">· Approval needed</span>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}

          <Dialog open={showFullTimeline} onOpenChange={setShowFullTimeline}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Activity Timeline</DialogTitle>
                <DialogDescription>{statusHistory.length} activities</DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 pr-2">
                <div className="space-y-0">
                  {[...statusHistory].reverse().map((h, idx, arr) => (
                    <div key={h.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0 mt-0.5" />
                        {idx < arr.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 my-1.5" />
                        )}
                      </div>
                      <div className={cn("min-w-0", idx < arr.length - 1 ? "pb-5" : "")}>
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {jobStatusLabel(h.to_status, isInspection)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {h.changed_by_name ? `${h.changed_by_name} · ` : ""}
                          {new Date(h.created_at).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="space-y-5">
        {/* Full-width tabs */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} ref={tabsRef}>
            {(() => {
              const s = job.status;
              const showInspection = !["new", "waiting"].includes(s);
              const showQuotation  = !["new", "waiting", "on_hold"].includes(s);
              const showReport     = !["new", "waiting", "on_hold", "qc"].includes(s);
              const showInvoices   = ["invoiced", "delivered"].includes(s);
              return (
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="work">Customer Concerns</TabsTrigger>
                  {showInspection && isInspection && (
                    <TabsTrigger value="parts">Diagnosis</TabsTrigger>
                  )}
                  {showInspection && !isInspection && job.source_inspection_id && (
                    <TabsTrigger value="inspection">Inspection</TabsTrigger>
                  )}
                  {showInspection && !isInspection && !job.source_inspection_id && (
                    <TabsTrigger value="parts">Inspection</TabsTrigger>
                  )}
                  {showQuotation && (
                    <TabsTrigger value="cost">Quotation</TabsTrigger>
                  )}
                  {showReport && (
                    <TabsTrigger value="report">Job Report</TabsTrigger>
                  )}
                  {showInvoices && (
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  )}
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
              );
            })()}

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

              {/* Add more details */}
              <div className="border border-border rounded-lg bg-background overflow-hidden">
                <button
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/30 transition-colors"
                  onClick={() => setInlineField(inlineField === "more_details" ? null : "more_details")}
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />Add more details
                  </span>
                  <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", inlineField === "more_details" && "rotate-90")} />
                </button>
                {inlineField === "more_details" && (
                  <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                    {job.internal_note && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded-md p-3">{job.internal_note}</p>
                    )}
                    <Textarea
                      rows={3}
                      placeholder="Add additional details, observations, or notes…"
                      value={inlineValue}
                      onChange={e => setInlineValue(e.target.value)}
                      className="text-sm resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={patchJobMutation.isPending || !inlineValue.trim()}
                        onClick={() => {
                          const updated = job.internal_note
                            ? `${job.internal_note}\n${inlineValue.trim()}`
                            : inlineValue.trim();
                          patchJobMutation.mutate({ internal_note: updated }, {
                            onSuccess: () => {
                              setInlineValue("");
                              toast.success("Details saved");
                            },
                          });
                        }}
                      >
                        {patchJobMutation.isPending ? "Saving…" : "Save Details"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* VIN / Mileage / Bay / Advisor */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={cn("border rounded-lg bg-background p-3 space-y-1.5", needsVin && "border-red-300 bg-red-50/50")}>
                  <p className={cn("text-[10px] font-semibold uppercase tracking-wide", needsVin ? "text-red-600" : "text-muted-foreground")}>VIN{needsVin ? " *" : ""}</p>
                  {inlineField === "tab_vin" ? (
                    <input
                      autoFocus
                      className="w-full text-sm font-mono bg-transparent outline-none border-b border-primary pb-0.5"
                      value={inlineValue}
                      placeholder="Enter VIN…"
                      onChange={e => setInlineValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") { setInlineField(null); }
                      }}
                      onBlur={() => {
                        const trimmed = inlineValue.trim();
                        if (trimmed !== (job.vin ?? "")) {
                          patchVehicleMutation.mutate({ vehicleId: job.vehicle_id, data: { vin: trimmed } });
                        } else {
                          setInlineField(null);
                        }
                      }}
                    />
                  ) : (
                    <button
                      className="w-full text-left text-sm font-mono flex items-center gap-1 group/tabvin hover:text-primary"
                      onClick={() => { setInlineField("tab_vin"); setInlineValue(job.vin ?? ""); }}
                    >
                      <span className={job.vin ? "text-foreground" : "text-muted-foreground/50 italic"}>{job.vin || "Not set"}</span>
                      <Pencil className="w-3 h-3 opacity-0 group-hover/tabvin:opacity-40 shrink-0" />
                    </button>
                  )}
                </div>

                <div className={cn("border rounded-lg bg-background p-3 space-y-1.5", needsMileage && "border-red-300 bg-red-50/50")}>
                  <p className={cn("text-[10px] font-semibold uppercase tracking-wide", needsMileage ? "text-red-600" : "text-muted-foreground")}>Mileage{needsMileage ? " *" : ""}</p>
                  {inlineField === "tab_mileage" ? (
                    <input
                      autoFocus
                      type="number"
                      className="w-full text-sm font-semibold bg-transparent outline-none border-b border-primary pb-0.5"
                      value={inlineValue}
                      placeholder="e.g. 45000"
                      onChange={e => setInlineValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") { setInlineField(null); }
                      }}
                      onBlur={() => {
                        const val = inlineValue.trim();
                        if (val !== (job.mileage_in ?? "")) {
                          patchJobMutation.mutate({ mileage_in: val });
                        } else {
                          setInlineField(null);
                        }
                      }}
                    />
                  ) : (
                    <button
                      className="w-full text-left text-sm font-semibold flex items-center gap-1 group/tabmil hover:text-primary"
                      onClick={() => { setInlineField("tab_mileage"); setInlineValue(job.mileage_in ?? (job as any).vehicle_mileage ?? ""); }}
                    >
                      <span className={job.mileage_in ? "text-foreground" : "text-muted-foreground/50 italic"}>
                        {(() => { const v = job.mileage_in ?? (job as any).vehicle_mileage; return v ? `${parseInt(v).toLocaleString()} mi` : "Not set"; })()}
                      </span>
                      <Pencil className="w-3 h-3 opacity-0 group-hover/tabmil:opacity-40 shrink-0" />
                    </button>
                  )}
                </div>

                <div className="border border-border rounded-lg bg-background p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bay</p>
                  {inlineField === "tab_bay" ? (
                    <input
                      autoFocus
                      className="w-full text-sm font-semibold bg-transparent outline-none border-b border-primary pb-0.5"
                      value={inlineValue}
                      placeholder="e.g. A1"
                      onChange={e => setInlineValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") { setInlineField(null); }
                      }}
                      onBlur={() => {
                        const val = inlineValue.trim();
                        if (val !== (job.bay ?? "")) {
                          patchJobMutation.mutate({ bay: val });
                        } else {
                          setInlineField(null);
                        }
                      }}
                    />
                  ) : (
                    <button
                      className="w-full text-left text-sm font-semibold flex items-center gap-1 group/tabbay hover:text-primary"
                      onClick={() => { setInlineField("tab_bay"); setInlineValue(job.bay ?? ""); }}
                    >
                      <span className={job.bay ? "text-foreground" : "text-muted-foreground/50 italic"}>{job.bay || "Not set"}</span>
                      <Pencil className="w-3 h-3 opacity-0 group-hover/tabbay:opacity-40 shrink-0" />
                    </button>
                  )}
                </div>

                <div className="border border-border rounded-lg bg-background p-3 space-y-1.5 relative">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Advisor</p>
                  <button
                    className="w-full text-left text-sm flex items-center justify-between gap-1 group/tabadv hover:text-primary"
                    onClick={() => { setInlineField(inlineField === "tab_advisor" ? null : "tab_advisor"); setInlineValue(""); }}
                  >
                    <span className={job.advisor_name ? "text-foreground font-semibold truncate" : "text-muted-foreground/50 italic"}>{job.advisor_name || "Not set"}</span>
                    <ChevronRight className="w-3 h-3 rotate-90 shrink-0 text-muted-foreground" />
                  </button>
                  {inlineField === "tab_advisor" && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setInlineField(null)} />
                      <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg w-full py-1">
                        <div className="px-2 py-1">
                          <input
                            autoFocus
                            className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/50 px-1"
                            placeholder="Search…"
                            value={inlineValue}
                            onChange={e => setInlineValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Escape") setInlineField(null); }}
                          />
                        </div>
                        <div className="border-t border-border max-h-40 overflow-y-auto">
                          <button
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors text-muted-foreground"
                            onMouseDown={e => { e.preventDefault(); patchJobMutation.mutate({ advisor_id: null }); setInlineField(null); }}
                          >
                            — None —
                          </button>
                          {teamMembers
                            .filter(m => !inlineValue || m.name.toLowerCase().includes(inlineValue.toLowerCase()))
                            .map(m => (
                            <button
                              key={m.id}
                              className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors", m.id === job.advisor_id ? "font-semibold" : "")}
                              onMouseDown={e => { e.preventDefault(); patchJobMutation.mutate({ advisor_id: m.id }); setInlineField(null); }}
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Technician assignment */}
              <div className={cn("border rounded-lg bg-background p-4 space-y-2", needsAssignment ? "border-red-300 bg-red-50/50" : "border-border")}>
                <p className={cn("text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5", needsAssignment ? "text-red-600" : "text-muted-foreground")}>
                  <Wrench className="w-3.5 h-3.5" />Technician{needsAssignment ? " *" : ""}
                </p>
                <div className="relative">
                  <button
                    className={cn("w-full flex items-center justify-between gap-2 text-sm border rounded-lg px-3 py-2 hover:border-foreground/30 transition-colors", needsAssignment ? "border-red-300" : "border-border")}
                    onClick={() => { setInlineField(inlineField === "tab_technician" ? null : "tab_technician"); setInlineValue(""); }}
                  >
                    <span className={cn("truncate", job.technician_name ? "text-foreground font-semibold" : "text-muted-foreground")}>
                      {job.technician_name ?? "Select technician"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 rotate-90 shrink-0 text-muted-foreground" />
                  </button>
                  {inlineField === "tab_technician" && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setInlineField(null)} />
                      <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg w-full py-1">
                        <div className="px-2 py-1">
                          <input
                            autoFocus
                            className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/50 px-1"
                            placeholder="Search…"
                            value={inlineValue}
                            onChange={e => setInlineValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Escape") setInlineField(null); }}
                          />
                        </div>
                        <div className="border-t border-border max-h-40 overflow-y-auto">
                          <button
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors text-muted-foreground"
                            onMouseDown={e => { e.preventDefault(); patchJobMutation.mutate({ technician_id: null }); setInlineField(null); }}
                          >
                            — None —
                          </button>
                          {teamMembers
                            .filter(m => !inlineValue || m.name.toLowerCase().includes(inlineValue.toLowerCase()))
                            .map(m => (
                            <button
                              key={m.id}
                              className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors", m.id === job.technician_id ? "font-semibold" : "")}
                              onMouseDown={e => { e.preventDefault(); patchJobMutation.mutate({ technician_id: m.id }); setInlineField(null); }}
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {needsAssignment && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Assign a technician or advisor to move to the inspection stage
                </p>
              )}

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
                    <Button size="sm" variant="outline" className="text-blue-700 border-blue-300" disabled={moveStatusMutation.isPending} onClick={() => moveStatusMutation.mutate("qc")}>
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
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700" disabled={moveStatusMutation.isPending} onClick={() => moveStatusMutation.mutate("delivered")}>
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
              {isInspectionStage && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => { setShowAddPart(true); setShowAddManualPart(false); }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-colors",
                      showAddPart ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30" : "border-border hover:border-blue-400 bg-background"
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
                    onClick={() => { setShowAddManualPart(true); setShowAddPart(false); }}
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
              )}

              {(showAddPart || showAddManualPart) && isInspectionStage && (
                <div className="mb-4">
                  {showAddPart && (
                    <AddDiagnosisForm jobId={job.id} onAdded={() => {
                      qc.invalidateQueries({ queryKey: ["job", id] });
                      setShowAddPart(false);
                    }} />
                  )}
                  {showAddManualPart && (
                    <AddManualPartForm jobId={job.id} onAdded={() => {
                      qc.invalidateQueries({ queryKey: ["job", id] });
                      setShowAddManualPart(false);
                    }} />
                  )}
                </div>
              )}

              <div className="border border-border rounded-lg bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {isInspectionStage ? "Inspection List" : "Inspection items"}
                  </p>
                </div>

                {parts.length === 0 && !showAddPart && !showAddManualPart ? (
                  <div className="p-8 text-center text-sm text-muted-foreground/50">
                    {isInspectionStage ? "No items added yet — use the buttons above to add services or parts" : "No inspection items added yet"}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
                        {!isInspectionStage && <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Part #</th>}
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                        {!isInspectionStage && <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Unit Price</th>}
                        {!isInspectionStage && <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Total</th>}
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map(p => {
                        const needsPrice = !isInspectionStage && parseFloat(p.unit_price) === 0;
                        const isCatalogItem = catalogSet.has(p.description.toLowerCase()) || (p.part_number && catalogSet.has(p.part_number.toLowerCase()));
                        const priceEditable = isEstimationStage && !isCatalogItem;
                        return (
                        <tr key={p.id} className={cn("border-b border-border last:border-0", needsPrice && isEstimationStage ? "bg-amber-50 dark:bg-amber-950/20" : "")}>
                          <td className="px-4 py-2.5 text-sm">{p.description}</td>
                          {!isInspectionStage && <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono hidden sm:table-cell">{p.part_number ?? "—"}</td>}
                          <td className="px-4 py-2.5 text-right text-sm">{parseFloat(p.qty).toFixed(2)}</td>
                          {!isInspectionStage && (
                            <td className="px-4 py-2.5 text-right text-sm">
                              {priceEditable ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  defaultValue={parseFloat(p.unit_price).toFixed(2)}
                                  className={cn(
                                    "w-24 text-right text-sm bg-transparent border border-transparent rounded px-2 py-1 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
                                    needsPrice ? "text-amber-600" : ""
                                  )}
                                  onBlur={e => {
                                    const val = e.target.value.trim();
                                    if (val === "" || isNaN(Number(val))) { e.target.value = parseFloat(p.unit_price).toFixed(2); return; }
                                    if (parseFloat(val).toFixed(2) !== parseFloat(p.unit_price).toFixed(2)) {
                                      updatePartPriceMutation.mutate({ partId: p.id, unit_price: val });
                                    }
                                  }}
                                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                />
                              ) : (
                                <span>{parseFloat(p.unit_price).toFixed(2)}</span>
                              )}
                            </td>
                          )}
                          {!isInspectionStage && <td className="px-4 py-2.5 text-right text-sm font-medium">{parseFloat(p.line_total).toFixed(2)}</td>}
                          <td className="px-2 py-2">
                            <button onClick={() => removePartMutation.mutate(p.id)}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                      {!isInspectionStage && parts.length > 0 && (
                        <tr className="bg-muted/30">
                          <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-right">Total</td>
                          <td className="px-4 py-2 text-right text-sm font-bold">{partsTotal.toFixed(2)} AED</td>
                          <td />
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
                {!isInspection && showAddPart && (
                  <div className="px-4 pb-4">
                    <AddDiagnosisForm jobId={job.id} onAdded={() => {
                      qc.invalidateQueries({ queryKey: ["job", id] });
                      setShowAddPart(false);
                      setDirtyParts(true);
                    }} />
                  </div>
                )}
                {!isInspection && showAddManualPart && (
                  <div className="px-4 pb-4">
                    <AddManualPartForm jobId={job.id} onAdded={() => {
                      qc.invalidateQueries({ queryKey: ["job", id] });
                      setShowAddManualPart(false);
                      setDirtyParts(true);
                    }} />
                  </div>
                )}
              </div>

              {isInspectionStage && (
                <div className="border border-border rounded-lg bg-background overflow-hidden mt-4">
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Technician Notes</p>
                  </div>
                  {techNotes.length > 0 && (
                    <div className="px-4 pt-3 space-y-2">
                      {(techNotes as TechNote[]).map((n) => (
                        <div key={n.id} className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground">
                              {n.created_by_name ?? "Technician"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(n.created_at).toLocaleString("en-AE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-3 space-y-2">
                    <Textarea
                      rows={2}
                      placeholder="Add a note about the inspection findings…"
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      className="text-sm resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={addNoteMutation.isPending || !newNote.trim()}
                        onClick={() => { if (newNote.trim()) addNoteMutation.mutate(newNote); }}
                      >
                        {addNoteMutation.isPending ? "Saving…" : "Add Note"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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

            {/* ── Quotation tab ──────────────────────────────────── */}
            <TabsContent value="cost" className="mt-0 space-y-4">
              {/* Quotation flow tracker with inline actions */}
              {(() => {
                const hasQuotation = !!quotation;
                const qStatus = quotation?.status ?? "";
                const isShared = ["sent","viewed","approved","rejected"].includes(qStatus);
                const isApproved = qStatus === "approved";
                const isRejected = qStatus === "rejected";

                return (
                  <div className="grid grid-cols-3 gap-3">
                    {/* ── Step 1: Create ── */}
                    <div className={cn(
                      "rounded-xl border p-4 text-center space-y-3",
                      hasQuotation ? "border-green-200 bg-green-50/50" : "border-blue-200 bg-blue-50/50"
                    )}>
                      <div className="flex items-center justify-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          hasQuotation ? "bg-green-500 text-white" : "bg-blue-500 text-white"
                        )}>
                          {createQuotationMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : hasQuotation ? "✓" : "1"}
                        </div>
                        <span className={cn("text-sm font-semibold", hasQuotation ? "text-green-700" : "text-blue-700")}>
                          {hasQuotation ? "Created" : "Create"}
                        </span>
                      </div>
                      {!hasQuotation && (
                        <Button
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={() => createQuotationMutation.mutate()}
                          disabled={createQuotationMutation.isPending}
                        >
                          {createQuotationMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          {createQuotationMutation.isPending ? "Creating…" : "Create Quotation"}
                        </Button>
                      )}
                      {hasQuotation && (
                        <p className="text-[11px] text-green-600/70">Quotation {quotation.ref}</p>
                      )}
                    </div>

                    {/* ── Step 2: Share ── */}
                    <div className={cn(
                      "rounded-xl border p-4 text-center space-y-3",
                      isShared ? "border-green-200 bg-green-50/50" :
                      hasQuotation ? "border-blue-200 bg-blue-50/50" :
                      "border-border bg-muted/20 opacity-50"
                    )}>
                      <div className="flex items-center justify-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          isShared ? "bg-green-500 text-white" :
                          hasQuotation ? "bg-blue-500 text-white" :
                          "bg-muted-foreground/20 text-muted-foreground/50"
                        )}>
                          {isShared ? "✓" : "2"}
                        </div>
                        <span className={cn("text-sm font-semibold",
                          isShared ? "text-green-700" :
                          hasQuotation ? "text-blue-700" : "text-muted-foreground/40"
                        )}>
                          {isShared ? "Shared" : "Share"}
                        </span>
                      </div>
                      {hasQuotation && !isShared && (
                        <div className="space-y-1.5">
                          {job.client_phone && (
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => { setShareChannels({ whatsapp: true, sms: false, email: false }); shareQuotationMutation.mutate({ whatsapp: true, sms: false, email: false }); }}>
                                💬 WhatsApp
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => { setShareChannels({ whatsapp: false, sms: true, email: false }); shareQuotationMutation.mutate({ whatsapp: false, sms: true, email: false }); }}>
                                📱 SMS
                              </Button>
                            </div>
                          )}
                          {job.client_email && (
                            <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1" onClick={() => { setShareChannels({ whatsapp: false, sms: false, email: true }); shareQuotationMutation.mutate({ whatsapp: false, sms: false, email: true }); }}>
                              📧 Email
                            </Button>
                          )}
                          {!job.client_phone && !job.client_email && (
                            <p className="text-[11px] text-muted-foreground">No contact info on file</p>
                          )}
                        </div>
                      )}
                      {isShared && !(isApproved || isRejected) && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-green-600/70">Sent to customer</p>
                          <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1" onClick={() => setShowShareModal(true)}>
                            Share Again
                          </Button>
                        </div>
                      )}
                      {(isApproved || isRejected) && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-green-600/70">Sent to customer</p>
                          <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1" onClick={() => setShowRevertShareModal(true)}>
                            Revert & Re-share
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* ── Step 3: Approve ── */}
                    <div className={cn(
                      "rounded-xl border p-4 text-center space-y-3",
                      isApproved ? "border-green-200 bg-green-50/50" :
                      isRejected ? "border-red-200 bg-red-50/50" :
                      isShared ? "border-blue-200 bg-blue-50/50" :
                      "border-border bg-muted/20 opacity-50"
                    )}>
                      <div className="flex items-center justify-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          isApproved ? "bg-green-500 text-white" :
                          isRejected ? "bg-red-500 text-white" :
                          isShared ? "bg-blue-500 text-white" :
                          "bg-muted-foreground/20 text-muted-foreground/50"
                        )}>
                          {isRejected ? "✕" : isApproved ? "✓" : "3"}
                        </div>
                        <span className={cn("text-sm font-semibold",
                          isApproved ? "text-green-700" :
                          isRejected ? "text-red-700" :
                          isShared ? "text-blue-700" : "text-muted-foreground/40"
                        )}>
                          {isApproved ? "Approved" : isRejected ? "Rejected" : "Approve"}
                        </span>
                      </div>
                      {isShared && !isApproved && !isRejected && (
                        <div className="space-y-1.5">
                          <Button
                            size="sm"
                            className="w-full gap-1.5"
                            onClick={() => setShowApproveConfirm(true)}
                            disabled={approveQuotationMutation.isPending}
                          >
                            {approveQuotationMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {approveQuotationMutation.isPending ? "Approving…" : "Force Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setShowRejectConfirm(true)}
                            disabled={rejectQuotationMutation.isPending}
                          >
                            {rejectQuotationMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CircleX className="w-3.5 h-3.5" />}
                            {rejectQuotationMutation.isPending ? "Rejecting…" : "Reject"}
                          </Button>
                        </div>
                      )}
                      {isApproved && (
                        <p className="text-[11px] text-green-600/70">Customer approved</p>
                      )}
                      {isRejected && (
                        <p className="text-[11px] text-red-600/70">Customer rejected — job cancelled</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {!quotation ? (
                <div className="border border-dashed border-border rounded-lg bg-muted/10 p-6 text-center">
                  <DollarSign className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground">Create a quotation above to get started.</p>
                </div>
              ) : (
                <>

                  {/* Summary card */}
                  <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quotation {quotation.ref}</p>
                      {quotationOutOfSync && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() => syncQuotationMutation.mutate()} disabled={syncQuotationMutation.isPending}>
                          {syncQuotationMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                          Sync from diagnosis
                        </Button>
                      )}
                    </div>
                    <dl className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Subtotal</dt>
                        <dd className="tabular-nums font-medium">{fmtAed(quotation.subtotal)}</dd>
                      </div>
                      {parseFloat(quotation.discount ?? "0") > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <dt>Discount</dt>
                          <dd className="tabular-nums">− {fmtAed(quotation.discount)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">VAT ({quotation.tax_rate ?? 5}%)</dt>
                        <dd className="tabular-nums">{fmtAed(quotation.tax_amount)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1.5 font-bold text-base">
                        <dt>Total</dt>
                        <dd className="tabular-nums">{fmtAed(quotation.total)}</dd>
                      </div>
                      {quoteTotalPaid > 0 && (
                        <>
                          <div className="flex justify-between text-green-700">
                            <dt>Advance paid</dt>
                            <dd className="tabular-nums">− {fmtAed(quoteTotalPaid)}</dd>
                          </div>
                          <div className={cn("flex justify-between border-t border-border pt-1.5 font-semibold", quoteBalance <= 0 ? "text-green-700" : "")}>
                            <dt>Balance due</dt>
                            <dd className="tabular-nums">{fmtAed(quoteBalance)}</dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </div>

                  {/* Line items */}
                  <div className="rounded-lg border border-border bg-background overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line items ({quoteLineItems.length})</p>
                      <div className="flex gap-2">
                        {!showAddQtLine && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { setShowAddQtLine(true); setShowAddQtDiscount(false); }}>
                            <Plus className="w-3 h-3" />Add item
                          </Button>
                        )}
                        {!showAddQtDiscount && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => { setShowAddQtDiscount(true); setShowAddQtLine(false); }}>
                            <Plus className="w-3 h-3" />Discount
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className={showAddQtLine ? "overflow-visible" : "overflow-x-auto"}>
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
                            <th className="px-4 py-2 text-xs font-medium text-muted-foreground w-16">Qty</th>
                            <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right w-32">Total</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {quoteLineItems.map((l: any) => (
                            <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                              <td className="px-4 py-2.5 text-sm font-medium">{l.description}</td>
                              <td className="px-4 py-2.5 tabular-nums text-sm">{parseFloat(l.qty)}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-sm font-medium">{fmtAed(l.line_total)}</td>
                              <td className="px-2 py-2.5">
                                <button onClick={() => deleteQuoteLineMutation.mutate(l.id)}
                                  className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {quoteLineItems.length === 0 && !showAddQtLine && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground/50">
                                No line items yet. Click "Add item" or sync from diagnosis.
                              </td>
                            </tr>
                          )}
                          {showAddQtLine && (
                            <AddQuoteLineInline
                              quotationId={quotation.id}
                              onAdded={() => { qc.invalidateQueries({ queryKey: ["job", id] }); setShowAddQtLine(false); }}
                              onCancel={() => setShowAddQtLine(false)}
                            />
                          )}
                        </tbody>
                      </table>
                    </div>
                    {showAddQtDiscount && (
                      <div className="px-4 py-3 border-t border-dashed border-orange-300 bg-orange-50/50 flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-medium text-orange-700 shrink-0">Discount line</span>
                        <Input className="h-7 text-xs w-40" placeholder="Label" id="qt-disc-label" defaultValue="Discount" />
                        <div className="relative flex items-center">
                          <Input className="h-7 text-xs w-20 tabular-nums pr-5" type="number" min="0" max="100" step="1" id="qt-disc-pct" defaultValue="10" />
                          <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none">%</span>
                        </div>
                        <div className="flex gap-1 ml-auto">
                          <Button size="sm" className="h-7 px-3 text-xs bg-orange-600 hover:bg-orange-700" onClick={() => {
                            const label = (document.getElementById("qt-disc-label") as HTMLInputElement).value || "Discount";
                            const pct = parseFloat((document.getElementById("qt-disc-pct") as HTMLInputElement).value || "0");
                            const sub = parseFloat(quotation.subtotal ?? "0");
                            const amt = sub * (pct / 100);
                            if (amt > 0) {
                              addQuoteLineMutation.mutate({ description: label, type: "labour", qty: "1", unit_price: (-amt).toFixed(2) });
                              setShowAddQtDiscount(false);
                            }
                          }}>Apply</Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowAddQtDiscount(false)}><X className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Advance payments */}
                  <div className="rounded-lg border border-border bg-background overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Advance payments ({quoteAdvancePayments.length})</p>
                      {!showAddAdvance && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setShowAddAdvance(true)}>
                          <Plus className="w-3 h-3" />Record payment
                        </Button>
                      )}
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {quoteAdvancePayments.length === 0 && !showAddAdvance && (
                        <p className="text-sm text-muted-foreground/50 py-4 text-center">No advance payments recorded.</p>
                      )}
                      {quoteAdvancePayments.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <p className="text-sm font-medium tabular-nums">{fmtAed(p.amount)}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {PAYMENT_METHODS.find(m => m.value === p.method)?.label ?? p.method}
                              {p.reference ? ` · ${p.reference}` : ""}
                              {p.note ? ` — ${p.note}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{fmtDate(p.paid_at)}</span>
                            <button onClick={() => deleteAdvancePaymentMutation.mutate(p.id)}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {showAddAdvance && (
                        <div className="mt-3 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">Record advance payment</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Amount (AED) *</Label>
                              <Input className="h-7 text-xs tabular-nums" type="number" step="0.01" min="0" placeholder="0.00" id="adv-amount" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Method</Label>
                              <Select defaultValue="cash" onValueChange={v => { (document.getElementById("adv-method-val") as HTMLInputElement).value = v; }}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                              </Select>
                              <input type="hidden" id="adv-method-val" defaultValue="cash" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Reference / Receipt #</Label>
                              <Input className="h-7 text-xs" placeholder="Optional" id="adv-ref" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Note</Label>
                              <Input className="h-7 text-xs" placeholder="Optional" id="adv-note" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddAdvance(false)}>Cancel</Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => {
                              const amount = (document.getElementById("adv-amount") as HTMLInputElement).value;
                              const method = (document.getElementById("adv-method-val") as HTMLInputElement).value || "cash";
                              const reference = (document.getElementById("adv-ref") as HTMLInputElement).value || undefined;
                              const note = (document.getElementById("adv-note") as HTMLInputElement).value || undefined;
                              if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
                              addAdvancePaymentMutation.mutate({ amount, method, reference, note });
                              setShowAddAdvance(false);
                            }} disabled={addAdvancePaymentMutation.isPending}>
                              {addAdvancePaymentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Record payment
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Job Report tab ──────────────────────────────────────── */}
            <TabsContent value="report" className="mt-0 space-y-4">
              <div className="border border-border rounded-lg bg-background overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />Job Report
                  </p>
                </div>
                {(reportNotes as TechNote[]).length > 0 && (
                  <div className="px-4 pt-3 space-y-2">
                    {(reportNotes as TechNote[]).map((n) => (
                      <div key={n.id} className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {n.created_by_name ?? "Unknown"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleString("en-AE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
                {(reportNotes as TechNote[]).length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                    <p className="text-sm text-muted-foreground/50 italic">No report entries yet</p>
                  </div>
                )}
                <div className="px-4 py-3 space-y-2 border-t border-border">
                  <Textarea
                    rows={3}
                    placeholder="Add a report, comment, or observation…"
                    value={newReportNote}
                    onChange={e => setNewReportNote(e.target.value)}
                    className="text-sm resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setShowAddPhoto(p => !p)}
                    >
                      <Upload className="w-3.5 h-3.5" />{showAddPhoto ? "Cancel Photo" : "Add Photo"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={addReportNoteMutation.isPending || !newReportNote.trim()}
                      onClick={() => { if (newReportNote.trim()) addReportNoteMutation.mutate(newReportNote); }}
                    >
                      {addReportNoteMutation.isPending ? "Saving…" : "Add Report Entry"}
                    </Button>
                  </div>
                </div>

                {showAddPhoto && (
                  <div className="px-4 py-3 border-t border-border">
                    <AddPhotoForm jobId={job.id} onAdded={() => {
                      qc.invalidateQueries({ queryKey: ["job", id] });
                      setShowAddPhoto(false);
                    }} />
                  </div>
                )}
              </div>

              {photos.length > 0 && (
                <div className="border border-border rounded-lg bg-background overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />Photos ({photos.length})
                    </p>
                  </div>
                  <div className="p-4">
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
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Invoices tab ────────────────────────────────────────── */}
            <TabsContent value="invoices" className="mt-0 space-y-4">
              {(invoices as any[]).length === 0 ? (
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
                    <p className="text-xs text-muted-foreground/40 mt-1">Create an invoice from this job's quotation or parts list</p>
                  </div>
                </div>
              ) : (
                (invoices as any[]).map((inv: any) => {
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

        {/* Activity Timeline + Linked — full width row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="border border-border rounded-lg bg-background p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity Timeline</p>
            {statusHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground/50 italic">No activity yet.</p>
            ) : (
              <>
                <div className="space-y-0">
                  {[...statusHistory].reverse().slice(0, 5).map((h, idx, arr) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1" />
                        {idx < arr.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className={cn("min-w-0 flex-1", idx < arr.length - 1 ? "pb-3" : "")}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {jobStatusLabel(h.to_status, isInspection)}
                          </p>
                          <p className="text-[10px] text-muted-foreground shrink-0">
                            {fmtDate(h.created_at)}
                          </p>
                        </div>
                        {h.changed_by_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{h.changed_by_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {statusHistory.length > 5 && (
                  <button
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    onClick={() => setShowFullTimeline(true)}
                  >
                    View all {statusHistory.length} activities
                  </button>
                )}
              </>
            )}
          </div>

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
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <JobDrawer open={editOpen} onOpenChange={setEditOpen} job={asJobRow} />

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

      {/* Force Approve Confirmation */}
      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Force Approve Quotation?</DialogTitle>
            <DialogDescription>
              Customer must approve this quotation. Are you sure you want to force approve?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApproveConfirm(false)}>Cancel</Button>
            <Button
              disabled={approveQuotationMutation.isPending}
              onClick={() => { approveQuotationMutation.mutate(); setShowApproveConfirm(false); }}
            >
              {approveQuotationMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Approving…</> : "Yes, Force Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Quotation Confirmation */}
      <Dialog open={showRejectConfirm} onOpenChange={(open) => { setShowRejectConfirm(open); if (!open) setRejectReason(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Quotation?</DialogTitle>
            <DialogDescription>
              Rejecting the quotation will cancel this job. Please provide the customer's reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Reason for rejection…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowRejectConfirm(false); setRejectReason(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={rejectQuotationMutation.isPending || !rejectReason.trim()}
              onClick={() => rejectQuotationMutation.mutate(rejectReason.trim())}
            >
              {rejectQuotationMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Rejecting…</> : "Reject & Cancel Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert & Re-share Modal */}
      <Dialog open={showRevertShareModal} onOpenChange={setShowRevertShareModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revert to Shared</DialogTitle>
            <DialogDescription>
              This will undo the approval and move the quotation back to "Shared" status. You can then share it again with the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              disabled={revertToSharedMutation.isPending}
              onClick={() => {
                revertToSharedMutation.mutate(undefined, {
                  onSuccess: () => setShowRevertShareModal(false),
                });
              }}
            >
              {revertToSharedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
              Revert to Shared
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => {
                revertToSharedMutation.mutate(undefined, {
                  onSuccess: () => {
                    setShowRevertShareModal(false);
                    setShowShareModal(true);
                  },
                });
              }}
              disabled={revertToSharedMutation.isPending}
            >
              {revertToSharedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Revert & Share Again
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevertShareModal(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Quotation Modal */}
      <Dialog open={showShareModal} onOpenChange={(v) => { if (!v) { setShowShareModal(false); setShareChannels({ whatsapp: false, sms: false, email: false }); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Quotation</DialogTitle>
            <DialogDescription>
              Choose how you'd like to share the quotation with the customer. Select at least one channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: "whatsapp" as const, label: "WhatsApp", desc: job.client_phone ? `Send to ${job.client_phone}` : "No phone number on file", icon: "💬", disabled: !job.client_phone },
              { key: "sms" as const,      label: "SMS",      desc: job.client_phone ? `Send to ${job.client_phone}` : "No phone number on file", icon: "📱", disabled: !job.client_phone },
              { key: "email" as const,    label: "Email",    desc: job.client_email ? `Send to ${job.client_email}` : "No email on file",         icon: "📧", disabled: !job.client_email },
            ].map(ch => (
              <button
                key={ch.key}
                type="button"
                disabled={ch.disabled}
                onClick={() => setShareChannels(prev => ({ ...prev, [ch.key]: !prev[ch.key] }))}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all",
                  ch.disabled
                    ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                    : shareChannels[ch.key]
                      ? "border-blue-500 bg-blue-50"
                      : "border-border hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
                )}
              >
                <span className="text-xl">{ch.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{ch.label}</span>
                    {shareChannels[ch.key] && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{ch.desc}</span>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowShareModal(false); setShareChannels({ whatsapp: false, sms: false, email: false }); }}>Cancel</Button>
            <Button
              disabled={!shareChannels.whatsapp && !shareChannels.sms && !shareChannels.email || shareQuotationMutation.isPending}
              onClick={() => shareQuotationMutation.mutate(shareChannels)}
            >
              {shareQuotationMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Sharing…</> : "Share Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
