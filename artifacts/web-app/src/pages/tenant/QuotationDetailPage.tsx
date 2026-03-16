import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, FileText, Edit, Trash2, Send, CheckCircle2, XCircle,
  ArrowRight, Plus, X, User, Car, Clock, Loader2,
  MoreHorizontal, AlertTriangle,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import QuotationDrawer, { type QuotationRow } from "@/components/QuotationDrawer";

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

const LINE_TYPES = [
  { value: "labour",      label: "Labour" },
  { value: "part",        label: "Part" },
  { value: "consumable",  label: "Consumable" },
  { value: "sublet",      label: "Sublet" },
  { value: "package",     label: "Package" },
];

const PAYMENT_METHODS = [
  { value: "cash",         label: "Cash" },
  { value: "card",         label: "Card" },
  { value: "bank_transfer",label: "Bank Transfer" },
  { value: "cheque",       label: "Cheque" },
  { value: "online",       label: "Online" },
];

function fmt(iso: string | null, fallback = "—") {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtAed(val: string | number | null) {
  return `AED ${parseFloat(String(val ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── inline line item add form ─────────────────────────────────────────── */
function AddLineForm({ quotationId, onDone }: { quotationId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [type,        setType]        = useState("labour");
  const [partNumber,  setPartNumber]  = useState("");
  const [qty,         setQty]         = useState("1");
  const [unitPrice,   setUnitPrice]   = useState("0.00");
  const [discount,    setDiscount]    = useState("0.00");

  const lineTotal = Math.max(0, parseFloat(qty || "0") * parseFloat(unitPrice || "0") - parseFloat(discount || "0"));

  const add = useMutation({
    mutationFn: () => fetch(`${API}/api/quotations/${quotationId}/lines?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, type, part_number: partNumber || null, qty, unit_price: unitPrice, discount }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      toast.success("Line item added");
      setDescription(""); setPartNumber(""); setQty("1"); setUnitPrice("0.00"); setDiscount("0.00"); setType("labour");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <tr className="border-t border-dashed border-primary/30 bg-primary/5">
      <td className="px-3 py-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{LINE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Input className="h-7 text-xs" placeholder="Description *" value={description} onChange={e => setDescription(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-7 text-xs w-24 font-mono" placeholder="Part #" value={partNumber} onChange={e => setPartNumber(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-7 text-xs w-16 tabular-nums" type="number" step="0.01" min="0" value={qty} onChange={e => setQty(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-7 text-xs w-24 tabular-nums" type="number" step="0.01" min="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-7 text-xs w-20 tabular-nums" type="number" step="0.01" min="0" value={discount} onChange={e => setDiscount(e.target.value)} />
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

/* ─── add advance payment form ───────────────────────────────────────────── */
function AddAdvanceForm({ quotationId, onDone }: { quotationId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [amount,    setAmount]    = useState("");
  const [method,    setMethod]    = useState("cash");
  const [reference, setReference] = useState("");
  const [note,      setNote]      = useState("");

  const add = useMutation({
    mutationFn: () => fetch(`${API}/api/quotations/${quotationId}/advance?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method, reference: reference || null, note: note || null }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      toast.success("Payment recorded");
      setAmount(""); setReference(""); setNote(""); setMethod("cash");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mt-3 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Record advance payment</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Amount (AED) *</Label>
          <Input className="h-7 text-xs tabular-nums" type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Reference / Receipt #</Label>
          <Input className="h-7 text-xs" placeholder="Optional" value={reference} onChange={e => setReference(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Note</Label>
          <Input className="h-7 text-xs" placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDone}>Cancel</Button>
        <Button size="sm" className="h-7 text-xs" onClick={() => add.mutate()} disabled={!amount || parseFloat(amount) <= 0 || add.isPending}>
          {add.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Record payment
        </Button>
      </div>
    </div>
  );
}

/* ─── convert to job dialog ───────────────────────────────────────────────── */
function ConvertDialog({ quotationId, quotationRef, open, onClose }: { quotationId: string; quotationRef: string; open: boolean; onClose: () => void; }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [priority, setPriority] = useState("normal");
  const [bay,      setBay]      = useState("");
  const [concern,  setConcern]  = useState("");

  const convert = useMutation({
    mutationFn: () => fetch(`${API}/api/quotations/${quotationId}/convert?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority, bay: bay || null, customer_concern: concern || null }),
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
      toast.success(`Job ${data.job.ref} created`);
      onClose();
      navigate(`/jobs/${data.job.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AlertDialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Convert to job card</AlertDialogTitle>
          <AlertDialogDescription>
            {quotationRef} will be converted to a new job card. You can assign more details once the job is created.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bay / Lift</Label>
              <Input className="h-8 text-sm" placeholder="e.g. Bay 3" value={bay} onChange={e => setBay(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Customer concern / job description</Label>
            <Textarea
              rows={2}
              className="text-sm"
              placeholder="Carry over description from quotation…"
              value={concern}
              onChange={e => setConcern(e.target.value)}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => convert.mutate()} disabled={convert.isPending}>
            {convert.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Create job card
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ─── main page ─────────────────────────────────────────────────────────── */
export default function QuotationDetailPage() {
  const [, params] = useRoute("/quotations/:id");
  const [, navigate] = useLocation();
  const id  = params?.id ?? "";
  const qc  = useQueryClient();

  const [editOpen,    setEditOpen]    = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [addPayOpen,  setAddPayOpen]  = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["quotation", id],
    queryFn: () => fetch(`${API}/api/quotations/${id}?tenant=${TENANT}`).then(r => r.json()),
    enabled: !!id,
  });

  const qt   = data?.quotation     ?? null;
  const lines = data?.lineItems    ?? [];
  const advs  = data?.advancePayments ?? [];
  const totalPaid = data?.totalPaid ?? 0;
  const balance   = data?.balance   ?? 0;

  const action = useMutation({
    mutationFn: ({ act, body = {} }: { act: string; body?: any }) =>
      fetch(`${API}/api/quotations/${id}/${act}?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", id] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLine = useMutation({
    mutationFn: (lid: string) =>
      fetch(`${API}/api/quotations/${id}/lines/${lid}?tenant=${TENANT}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotation", id] }); toast.success("Line removed"); },
  });

  const deleteAdv = useMutation({
    mutationFn: (aid: string) =>
      fetch(`${API}/api/quotations/${id}/advance/${aid}?tenant=${TENANT}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotation", id] }); toast.success("Payment removed"); },
  });

  const deleteQt = useMutation({
    mutationFn: () =>
      fetch(`${API}/api/quotations/${id}?tenant=${TENANT}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotations"] }); toast.success("Deleted"); navigate("/quotations"); },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!qt) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <FileText className="w-12 h-12 text-muted-foreground/20" />
        <p className="text-[15px] font-medium text-muted-foreground">Quotation not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/quotations")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />Back
        </Button>
      </div>
    );
  }

  const sm  = STATUS_META[qt.status] ?? { label: qt.status, color: "bg-gray-100 text-gray-700 border-gray-200" };
  const editable = ["draft", "sent", "viewed"].includes(qt.status);

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="grid grid-cols-3 items-center gap-4">
        {/* Left: back + ref */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 shrink-0" onClick={() => navigate("/quotations")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">{qt.ref}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${sm.color}`}>
                {sm.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {fmt(qt.created_at)}{qt.expires_at ? ` · Valid until ${fmt(qt.expires_at)}` : ""}
            </p>
          </div>
        </div>

        {/* Center: shop name */}
        <div className="flex flex-col items-center justify-center text-center">
          {getSession()?.tenantName && (
            <p className="text-base font-bold tracking-wide text-foreground">{getSession()?.tenantName}</p>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center justify-end gap-2">
          {qt.status === "draft" && (
            <Button size="sm" className="gap-1.5" onClick={() => action.mutate({ act: "send" })} disabled={action.isPending}>
              <Send className="w-3.5 h-3.5" />Send to customer
            </Button>
          )}
          {(qt.status === "sent" || qt.status === "viewed") && (
            <>
              <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => action.mutate({ act: "approve" })} disabled={action.isPending}>
                <CheckCircle2 className="w-3.5 h-3.5" />Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => action.mutate({ act: "reject" })} disabled={action.isPending}>
                <XCircle className="w-3.5 h-3.5" />Reject
              </Button>
            </>
          )}
          {qt.status === "approved" && !qt.converted_job_id && (
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={() => setConvertOpen(true)}>
              <ArrowRight className="w-3.5 h-3.5" />Convert to job
            </Button>
          )}
          {qt.converted_job_id && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/jobs/${qt.converted_job_id}`)}>
              <ArrowRight className="w-3.5 h-3.5" />View job card
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm w-40">
              <DropdownMenuItem onClick={() => setEditOpen(true)}><Edit className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-5">

        {/* ── Row 1: Customer & vehicle + Quote details ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Customer & vehicle */}
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
                  </div>
                </button>
              )
              : <p className="text-sm text-muted-foreground italic">No vehicle</p>
            }
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-background p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{fmtAed(qt.subtotal)}</dd>
              </div>
              {parseFloat(qt.discount) > 0 && (
                <div className="flex justify-between text-green-700">
                  <dt>Discount</dt>
                  <dd className="tabular-nums">− {fmtAed(qt.discount)}</dd>
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
              {totalPaid > 0 && (
                <>
                  <div className="flex justify-between text-green-700">
                    <dt>Advance paid</dt>
                    <dd className="tabular-nums">− {fmtAed(totalPaid)}</dd>
                  </div>
                  <div className={`flex justify-between border-t border-border pt-1.5 font-semibold ${balance <= 0 ? "text-green-700" : ""}`}>
                    <dt>Balance due</dt>
                    <dd className="tabular-nums">{fmtAed(balance)}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* ── Row 2: Line items — full width ─────────────────── */}
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <p className="text-sm font-semibold">Line items ({lines.length})</p>
            {editable && !addLineOpen && (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAddLineOpen(true)}>
                <Plus className="w-3 h-3" />Add item
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-24">Type</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-24">Part #</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-16">Qty</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-28">Unit price</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-24">Discount</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right w-32">Total</th>
                  {editable && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {lines.map((l: any) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{l.type}</span>
                    </td>
                    <td className="px-3 py-2.5 font-medium">{l.description}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{l.part_number ?? "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{parseFloat(l.qty)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtAed(l.unit_price)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-green-700">
                      {parseFloat(l.discount) > 0 ? `− ${fmtAed(l.discount)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{fmtAed(l.line_total)}</td>
                    {editable && (
                      <td className="px-3 py-2.5">
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteLine.mutate(l.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {lines.length === 0 && !addLineOpen && (
                  <tr>
                    <td colSpan={editable ? 8 : 7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {editable ? 'No line items yet. Click "Add item" to get started.' : 'No line items yet.'}
                    </td>
                  </tr>
                )}
                {addLineOpen && <AddLineForm quotationId={id} onDone={() => setAddLineOpen(false)} />}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Row 3: Notes + Advance payments ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Notes */}
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

          {/* Advance payments */}
          <div className="rounded-lg border border-border bg-background overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <p className="text-sm font-semibold">Advance payments ({advs.length})</p>
              {!addPayOpen && (
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAddPayOpen(true)}>
                  <Plus className="w-3 h-3" />Record payment
                </Button>
              )}
            </div>
            <div className="px-4 py-3 space-y-2">
              {advs.length === 0 && !addPayOpen && (
                <p className="text-sm text-muted-foreground py-4 text-center">No advance payments recorded.</p>
              )}
              {advs.map((p: any) => (
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
                    <span className="text-xs text-muted-foreground">{fmt(p.paid_at)}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAdv.mutate(p.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {addPayOpen && <AddAdvanceForm quotationId={id} onDone={() => setAddPayOpen(false)} />}
            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      <QuotationDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        quotation={qt as QuotationRow}
      />

      <ConvertDialog
        quotationId={id}
        quotationRef={qt.ref}
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {qt.ref}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All line items and advance payments will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteQt.mutate()}>
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
