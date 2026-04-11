import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Trash2, Send, CheckCircle2, XCircle,
  Plus, X, User, Car, Loader2, AlertTriangle, Download, Pencil, Check,
  CreditCard, Percent, BadgeDollarSign,
} from "lucide-react";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { getTenantSlug } from "@/lib/tenant";
import { getSession }    from "@/hooks/useAuth";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft:    { label: "Draft",    color: "bg-gray-100 text-gray-700 border-gray-300" },
  sent:     { label: "Sent",     color: "bg-blue-100 text-blue-800 border-blue-200" },
  viewed:   { label: "Viewed",   color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
  expired:  { label: "Expired",  color: "bg-orange-100 text-orange-700 border-orange-200" },
};


function fmt(iso: string | null, fallback = "—") {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtAed(val: string | number | null) {
  return `AED ${parseFloat(String(val ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AddLineForm({ quotationId, onDone }: { quotationId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [type,        setType]        = useState("labour");
  const [partNumber,  setPartNumber]  = useState("");
  const [qty,         setQty]         = useState("1");
  const [unitPrice,   setUnitPrice]   = useState("0.00");
  const [search,      setSearch]      = useState("");
  const [showDrop,    setShowDrop]    = useState(false);

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
  ).slice(0, 8);

  function pickItem(item: any) {
    setDescription(item.name);
    setType(item.type);
    setPartNumber(item.sku ?? "");
    setUnitPrice(parseFloat(item.unit_price).toFixed(2));
    setSearch(item.name);
    setShowDrop(false);
  }

  const lineTotal = Math.max(0, parseFloat(qty || "0") * parseFloat(unitPrice || "0"));

  const add = useMutation({
    mutationFn: () => fetch(`${API}/api/quotations/${quotationId}/lines?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, type, part_number: partNumber || null, qty, unit_price: unitPrice, discount: "0.00" }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Line item added");
      setDescription(""); setPartNumber(""); setQty("1"); setUnitPrice("0.00"); setType("labour"); setSearch("");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
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
                <button
                  key={item.id}
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent text-left gap-3"
                  onMouseDown={() => pickItem(item)}
                >
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
          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => add.mutate()} disabled={!description || add.isPending}>
            {add.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDone}><X className="w-3 h-3" /></Button>
        </div>
      </td>
    </tr>
  );
}

function AddDiscountLine({ quotationId, subtotal, onDone }: { quotationId: string; subtotal: number; onDone: () => void }) {
  const qc = useQueryClient();
  const [label,  setLabel]  = useState("Discount");
  const [pct,    setPct]    = useState("10");

  const discountAed = subtotal * (parseFloat(pct || "0") / 100);

  const add = useMutation({
    mutationFn: () => fetch(`${API}/api/quotations/${quotationId}/lines?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: label, type: "labour", qty: "1", unit_price: (-discountAed).toFixed(2), discount: "0.00" }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Discount line added");
      setLabel("Discount"); setPct("10");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="px-4 py-3 border-t border-dashed border-orange-300 bg-orange-50/50 flex items-center gap-3 flex-wrap">
      <span className="text-xs font-medium text-orange-700 shrink-0">Discount line</span>
      <Input className="h-7 text-xs w-40" placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} />
      <div className="relative flex items-center">
        <Input className="h-7 text-xs w-20 tabular-nums pr-5" type="number" min="0" max="100" step="1" value={pct} onChange={e => setPct(e.target.value)} />
        <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none">%</span>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">= − {fmtAed(discountAed)}</span>
      <div className="flex gap-1 ml-auto">
        <Button size="sm" className="h-7 px-3 text-xs bg-orange-600 hover:bg-orange-700" onClick={() => add.mutate()} disabled={!label || discountAed <= 0 || add.isPending}>
          {add.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDone}><X className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}


export default function QuotationTabEmbed({ quotationId, jobId }: { quotationId: string; jobId: string }) {
  const [, navigate] = useLocation();
  const qc  = useQueryClient();

  const [addLineOpen,    setAddLineOpen]    = useState(false);
  const [addDiscountOpen,setAddDiscountOpen]= useState(false);
  const [editingLineId,  setEditingLineId]  = useState<string | null>(null);
  const [editQty,        setEditQty]        = useState("");
  const [editPrice,      setEditPrice]      = useState("");
  const [advOpen,        setAdvOpen]        = useState(false);
  const [advType,        setAdvType]        = useState<"value" | "percentage">("percentage");
  const [advValue,       setAdvValue]       = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["quotation", quotationId],
    queryFn: () => fetch(`${API}/api/quotations/${quotationId}?tenant=${TENANT}`).then(r => r.json()),
    enabled: !!quotationId,
  });

  const qt    = data?.quotation        ?? null;
  const lines = data?.lineItems        ?? [];
  const lineDiscount = lines.reduce((sum: number, l: any) => {
    const lt = parseFloat(l.line_total ?? "0");
    return lt < 0 ? sum + Math.abs(lt) : sum;
  }, 0);

  function downloadPDF() {
    if (!qt) return;
    window.open(`${API}/api/quotations/${quotationId}/pdf?tenant=${TENANT}`, "_blank");
  }

  const action = useMutation({
    mutationFn: ({ act, body = {} }: { act: string; body?: any }) =>
      fetch(`${API}/api/quotations/${quotationId}/${act}?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLine = useMutation({
    mutationFn: (lid: string) =>
      fetch(`${API}/api/quotations/${quotationId}/lines/${lid}?tenant=${TENANT}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotation", quotationId] }); qc.invalidateQueries({ queryKey: ["job", jobId] }); toast.success("Line removed"); },
  });

  const updateLine = useMutation({
    mutationFn: ({ lid, qty, unit_price }: { lid: string; qty: string; unit_price: string }) =>
      fetch(`${API}/api/quotations/${quotationId}/lines/${lid}?tenant=${TENANT}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty, unit_price }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      setEditingLineId(null);
      toast.success("Price updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setAdvance = useMutation({
    mutationFn: (body: { advance_type: string; advance_value?: string }) =>
      fetch(`${API}/api/quotations/${quotationId}/set-advance?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      setAdvOpen(false);
      setAdvValue("");
      toast.success("Advance payment updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!qt) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <FileText className="w-8 h-8 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">Quotation not found</p>
      </div>
    );
  }

  const sm  = STATUS_META[qt.status] ?? { label: qt.status, color: "bg-gray-100 text-gray-700 border-gray-200" };
  const editable = ["draft", "sent", "viewed"].includes(qt.status);

  return (
    <div className="space-y-4">

      {/* Header row: ref + status + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold tracking-tight">{qt.ref}</h3>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${sm.color}`}>
            {sm.label}
          </span>
          <span className="text-xs text-muted-foreground">Created {fmt(qt.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          {qt.status === "draft" && (
            <Button size="sm" className="gap-1.5 h-8 bg-[#161aff] hover:bg-[#1014cc] text-white" onClick={() => action.mutate({ act: "send" })} disabled={action.isPending}>
              {action.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Create Quotation
            </Button>
          )}
          {qt.status !== "draft" && (
            <Button size="sm" className="gap-1.5 h-8" onClick={() => action.mutate({ act: "send" })} disabled={action.isPending}>
              <Send className="w-3.5 h-3.5" />Send to customer
            </Button>
          )}
          {(qt.status === "sent" || qt.status === "viewed") && (
            <>
              <Button size="sm" className="gap-1.5 h-8 bg-green-600 hover:bg-green-700" onClick={() => action.mutate({ act: "approve" })} disabled={action.isPending}>
                <CheckCircle2 className="w-3.5 h-3.5" />Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => action.mutate({ act: "reject" })} disabled={action.isPending}>
                <XCircle className="w-3.5 h-3.5" />Reject
              </Button>
            </>
          )}
          {qt.status !== "draft" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8"
              onClick={downloadPDF}
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>
          )}
        </div>
      </div>

      {/* Customer & vehicle + Summary row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer & vehicle</p>
          {qt.client_name
            ? (
              <button className="flex items-start gap-2 group w-full text-left" onClick={() => qt.client_id && navigate(`/customers/${qt.client_id}`)}>
                <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">{qt.client_name}</p>
                  {qt.client_phone && <p className="text-xs text-muted-foreground">{qt.client_phone}</p>}
                </div>
              </button>
            )
            : <p className="text-sm text-muted-foreground italic">No customer</p>
          }
          {qt.plate_number
            ? (
              <button className="flex items-start gap-2 group w-full text-left" onClick={() => qt.vehicle_id && navigate(`/vehicles/${qt.vehicle_id}`)}>
                <Car className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm font-mono group-hover:text-primary transition-colors">{qt.plate_number}</p>
                  <p className="text-xs text-muted-foreground">{qt.vehicle_year} {qt.vehicle_make} {qt.vehicle_model}</p>
                  {qt.vehicle_mileage && (
                    <p className="text-xs text-muted-foreground">{parseInt(qt.vehicle_mileage).toLocaleString()} km</p>
                  )}
                </div>
              </button>
            )
            : <p className="text-sm text-muted-foreground italic">No vehicle</p>
          }
        </div>

        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{fmtAed(qt.subtotal)}</dd>
            </div>
            {lineDiscount > 0 && (
              <div className="flex justify-between text-orange-600">
                <dt>Discount</dt>
                <dd className="tabular-nums">− {fmtAed(lineDiscount.toFixed(2))}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">VAT ({qt.tax_rate}%)</dt>
              <dd className="tabular-nums">{fmtAed(qt.tax_amount)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-bold text-base">
              <dt>Total</dt>
              <dd className="tabular-nums">{fmtAed(qt.total)}</dd>
            </div>
          </dl>

          {qt.advance_type && qt.advance_type !== "none" && qt.advance_amount && (
            <div className={`mt-3 rounded-md p-3 text-sm space-y-1 ${qt.advance_paid === "true" ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"}`}>
              <div className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wide">
                <CreditCard className="w-3.5 h-3.5" />
                Advance Payment
                {qt.advance_paid === "true" && (
                  <span className="ml-auto inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                    <CheckCircle2 className="w-3 h-3" /> Paid
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {qt.advance_type === "percentage" ? `${parseFloat(qt.advance_value ?? "0").toFixed(0)}% of total` : "Fixed amount"}
                </span>
                <span className="font-semibold tabular-nums">{fmtAed(qt.advance_amount)}</span>
              </div>
              {qt.advance_paid === "true" && qt.advance_paid_at && (
                <div className="text-xs text-green-700 mt-0.5">
                  Paid on {new Date(qt.advance_paid_at).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              )}
              {qt.advance_paid !== "true" && qt.advance_stripe_url && (
                <a href={qt.advance_stripe_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">
                  Payment link
                </a>
              )}
            </div>
          )}

          {editable && !advOpen && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2 gap-1.5 h-8 text-xs"
              onClick={() => {
                setAdvOpen(true);
                if (qt.advance_type && qt.advance_type !== "none") {
                  setAdvType(qt.advance_type === "percentage" ? "percentage" : "value");
                  setAdvValue(parseFloat(qt.advance_value ?? "0").toString());
                }
              }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              {qt.advance_type && qt.advance_type !== "none" ? "Edit advance payment" : "Set advance payment"}
            </Button>
          )}

          {advOpen && (
            <div className="mt-2 p-3 rounded-md border border-border bg-muted/30 space-y-2">
              <p className="text-xs font-semibold">Advance Payment</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={advType === "percentage" ? "default" : "outline"}
                  className="h-7 text-xs gap-1 flex-1"
                  onClick={() => setAdvType("percentage")}
                >
                  <Percent className="w-3 h-3" /> Percentage
                </Button>
                <Button
                  size="sm"
                  variant={advType === "value" ? "default" : "outline"}
                  className="h-7 text-xs gap-1 flex-1"
                  onClick={() => setAdvType("value")}
                >
                  <BadgeDollarSign className="w-3 h-3" /> Value
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step={advType === "percentage" ? "1" : "0.01"}
                  max={advType === "percentage" ? "100" : undefined}
                  placeholder={advType === "percentage" ? "e.g. 25" : "e.g. 500.00"}
                  className="h-8 text-sm tabular-nums"
                  value={advValue}
                  onChange={e => setAdvValue(e.target.value)}
                />
                <span className="text-xs text-muted-foreground shrink-0">
                  {advType === "percentage" ? "%" : "AED"}
                </span>
              </div>
              {advType === "percentage" && advValue && parseFloat(qt.total) > 0 && (
                <p className="text-xs text-muted-foreground">
                  = AED {(parseFloat(qt.total) * parseFloat(advValue || "0") / 100).toFixed(2)}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  disabled={!advValue || parseFloat(advValue) <= 0 || setAdvance.isPending}
                  onClick={() => setAdvance.mutate({ advance_type: advType, advance_value: advValue })}
                >
                  {setAdvance.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                </Button>
                {qt.advance_type && qt.advance_type !== "none" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    disabled={setAdvance.isPending}
                    onClick={() => setAdvance.mutate({ advance_type: "none" })}
                  >
                    Remove
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setAdvOpen(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <p className="text-sm font-semibold">Line items ({lines.length})</p>
          {editable && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { setAddLineOpen(true); setAddDiscountOpen(false); }}>
                <Plus className="w-3 h-3" />Add item
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => { setAddDiscountOpen(true); setAddLineOpen(false); }}>
                <Plus className="w-3 h-3" />Add discount
              </Button>
            </div>
          )}
        </div>
        <div className={addLineOpen ? "overflow-visible" : "overflow-x-auto"}>
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-16">Qty</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right w-28">Unit Price</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right w-28">Total</th>
                {editable && <th className="w-16" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((l: any) => {
                const isEditing = editingLineId === l.id;
                return (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{l.description}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {isEditing ? (
                      <Input
                        type="number" min="0.01" step="0.01"
                        className="h-7 text-xs w-16 tabular-nums"
                        value={editQty}
                        onChange={e => setEditQty(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") updateLine.mutate({ lid: l.id, qty: editQty, unit_price: editPrice }); if (e.key === "Escape") setEditingLineId(null); }}
                      />
                    ) : (
                      <span
                        className={editable ? "cursor-pointer hover:text-primary" : ""}
                        onClick={() => { if (editable) { setEditingLineId(l.id); setEditQty(String(parseFloat(l.qty))); setEditPrice(parseFloat(l.unit_price).toFixed(2)); } }}
                      >{parseFloat(l.qty)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {isEditing ? (
                      <Input
                        type="number" min="0" step="0.01"
                        className="h-7 text-xs w-24 tabular-nums text-right ml-auto"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") updateLine.mutate({ lid: l.id, qty: editQty, unit_price: editPrice }); if (e.key === "Escape") setEditingLineId(null); }}
                      />
                    ) : (
                      <span
                        className={editable ? "cursor-pointer hover:text-primary" : ""}
                        onClick={() => { if (editable) { setEditingLineId(l.id); setEditQty(String(parseFloat(l.qty))); setEditPrice(parseFloat(l.unit_price).toFixed(2)); } }}
                      >{fmtAed(l.unit_price)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{fmtAed(l.line_total)}</td>
                  {editable && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5 justify-end">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700"
                              disabled={updateLine.isPending}
                              onClick={() => updateLine.mutate({ lid: l.id, qty: editQty, unit_price: editPrice })}
                            >
                              {updateLine.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingLineId(null)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={() => { setEditingLineId(l.id); setEditQty(String(parseFloat(l.qty))); setEditPrice(parseFloat(l.unit_price).toFixed(2)); }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteLine.mutate(l.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
                );
              })}
              {lines.length === 0 && !addLineOpen && (
                <tr>
                  <td colSpan={editable ? 5 : 4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {editable ? 'No line items yet. Click "Add item" to get started.' : 'No line items yet.'}
                  </td>
                </tr>
              )}
              {addLineOpen && <AddLineForm quotationId={quotationId} onDone={() => setAddLineOpen(false)} />}
            </tbody>
          </table>
        </div>
        {addDiscountOpen && (
          <AddDiscountLine
            quotationId={quotationId}
            subtotal={parseFloat(qt.subtotal || "0")}
            onDone={() => setAddDiscountOpen(false)}
          />
        )}
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <div className="space-y-3">
          {qt.notes && (
            <div className="rounded-lg border border-border bg-background p-4 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{qt.notes}</p>
            </div>
          )}
          {qt.internal_note && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />Internal note
              </p>
              <p className="text-sm whitespace-pre-wrap text-amber-900">{qt.internal_note}</p>
            </div>
          )}
          {!qt.notes && !qt.internal_note && (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-muted-foreground italic">No notes added.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
