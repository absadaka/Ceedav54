import {
  ArrowLeft, Receipt, User, Car, Edit, Trash2, Send, CheckCircle2,
  CreditCard, Plus, X, MoreHorizontal, ExternalLink, AlertTriangle,
  Clock, FileText, RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn }        from "@/lib/utils";
import { statusClass } from "@/lib/status";
import { toast }     from "sonner";
import InvoiceDrawer from "@/components/InvoiceDrawer";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const PAYMENT_METHODS = [
  { value: "cash",         label: "Cash" },
  { value: "card",         label: "Card" },
  { value: "bank_transfer",label: "Bank Transfer" },
  { value: "online_link",  label: "Online Link" },
  { value: "insurance",    label: "Insurance" },
];

const LINE_TYPES = [
  { value: "labour",     label: "Labour" },
  { value: "part",       label: "Part" },
  { value: "consumable", label: "Consumable" },
  { value: "sublet",     label: "Sublet" },
  { value: "package",    label: "Package" },
];

function fmtAed(val: string | number | null) {
  return `AED ${parseFloat(String(val ?? 0)).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

interface InvoiceDetail {
  id: string; ref: string; seq: number; status: string;
  subtotal: string; discount: string; tax_rate: string; tax_amount: string;
  total: string; paid_amount: string;
  notes: string | null; due_at: string | null; sent_at: string | null; paid_at: string | null; voided_at: string | null;
  created_at: string; updated_at: string;
  client_id: string | null; client_name: string | null; client_phone: string | null; client_email: string | null;
  vehicle_id: string | null; plate_number: string | null; make: string | null; model: string | null; year: string | null;
  job_id: string | null; quotation_id: string | null;
  cashier_id: string | null; cashier_name: string | null;
}
interface LineItem {
  id: string; sort_order: number; description: string; type: string;
  part_number: string | null; qty: string; unit_price: string; discount: string; line_total: string; notes: string | null;
}
interface Payment {
  id: string; method: string; amount: string; reference: string | null;
  notes: string | null; paid_at: string; created_at: string; cashier_name: string | null;
}
interface JobReportNote {
  note: string;
  created_at: string;
}
interface InvoiceData {
  invoice: InvoiceDetail;
  lineItems: LineItem[];
  payments: Payment[];
  jobReport?: JobReportNote[];
}

/* ─── AddLineForm ────────────────────────────────────────────────────────── */
function AddLineForm({ invoiceId, onDone }: { invoiceId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [desc, setDesc]   = useState("");
  const [type, setType]   = useState("labour");
  const [partNo, setPartNo] = useState("");
  const [qty,  setQty]    = useState("1");
  const [price, setPrice] = useState("0");
  const [disc,  setDisc]  = useState("0");

  const lineTotal = Math.max(0, parseFloat(qty || "0") * parseFloat(price || "0") - parseFloat(disc || "0"));

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/invoices/${invoiceId}/lines?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc, type, part_number: partNo || null, qty, unit_price: price, discount: disc }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      toast.success("Line item added");
      setDesc(""); setPartNo(""); setQty("1"); setPrice("0"); setDisc("0"); setType("labour");
      onDone();
    },
    onError: () => toast.error("Failed to add line item"),
  });

  return (
    <tr className="border-t border-dashed border-primary/30 bg-primary/5">
      <td className="px-3 py-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{LINE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Input placeholder="Description *" value={desc} onChange={e => setDesc(e.target.value)} className="h-7 text-xs" />
      </td>
      <td className="px-3 py-2 hidden sm:table-cell">
        <Input placeholder="Part #" value={partNo} onChange={e => setPartNo(e.target.value)} className="h-7 text-xs w-20" />
      </td>
      <td className="px-3 py-2">
        <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="h-7 text-xs w-16 text-right" />
      </td>
      <td className="px-3 py-2">
        <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="h-7 text-xs w-20 text-right" />
      </td>
      <td className="px-3 py-2">
        <Input type="number" value={disc} onChange={e => setDisc(e.target.value)} className="h-7 text-xs w-16 text-right" />
      </td>
      <td className="px-3 py-2 text-right text-xs font-medium">{lineTotal.toFixed(2)}</td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="sm" className="h-6 text-xs px-2" disabled={!desc || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "…" : "Add"}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={onDone}>×</Button>
        </div>
      </td>
    </tr>
  );
}

/* ─── RecordPaymentDialog ────────────────────────────────────────────────── */
function RecordPaymentDialog({
  invoiceId, balance, open, onClose,
}: { invoiceId: string; balance: number; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [ref, setRef]       = useState("");
  const [notes, setNotes]   = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/invoices/${invoiceId}/payments?tenant=${TENANT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, amount, reference: ref || null, notes: notes || null, paid_at: paidAt }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      toast.success(`Payment of ${fmtAed(amount)} recorded`);
      if (data.invoice?.status === "paid") toast.success("Invoice fully paid!");
      onClose();
    },
    onError: () => toast.error("Failed to record payment"),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (AED)</Label>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            {balance > 0 && (
              <p className="text-xs text-muted-foreground">
                Balance due: <button className="text-primary underline" onClick={() => setAmount(balance.toFixed(2))}>{fmtAed(balance)}</button>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reference <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="Cheque #, transaction ID…" value={ref} onChange={e => setRef(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="resize-none text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!amount || parseFloat(amount) <= 0 || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── SendPaymentLinkDialog ──────────────────────────────────────────────── */
function SendPaymentLinkDialog({ invoiceRef, clientName, open, onClose }: {
  invoiceRef: string; clientName: string | null; open: boolean; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Send payment link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-mono font-semibold">{invoiceRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span>{clientName ?? "—"}</span>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
            <ExternalLink className="w-8 h-8 mx-auto text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">Stripe payment link</p>
            <p className="text-xs text-muted-foreground/60">
              Stripe integration is abstracted and ready. Connect your Stripe account in Settings → Payments to enable online payment links via WhatsApp or email.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-1.5" disabled>
              <Send className="w-3.5 h-3.5" />Send via WhatsApp
            </Button>
            <Button variant="outline" className="flex-1 gap-1.5" disabled>
              <Send className="w-3.5 h-3.5" />Send via email
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function InvoiceDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc        = useQueryClient();

  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [payOpen,     setPayOpen]     = useState(false);
  const [sendOpen,    setSendOpen]    = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);

  const { data, isLoading } = useQuery<InvoiceData>({
    queryKey: ["invoice", id],
    queryFn:  () => fetch(`${API}/api/invoices/${id}?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 10_000,
  });

  const sendMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/invoices/${id}/send?tenant=${TENANT}`, { method: "POST" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice marked as sent");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const voidMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/invoices/${id}/void?tenant=${TENANT}`, { method: "POST" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice voided");
    },
    onError: () => toast.error("Failed to void invoice"),
  });

  const syncMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/invoices/${id}/sync?tenant=${TENANT}`, { method: "POST" })
      .then(async r => { if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "Failed"); } return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice synced with quotation");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to sync invoice"),
  });

  const deleteLineMutation = useMutation({
    mutationFn: (lineId: string) => fetch(`${API}/api/invoices/${id}/lines/${lineId}?tenant=${TENANT}`, { method: "DELETE" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      toast.success("Line removed");
    },
    onError: () => toast.error("Failed to remove line"),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (payId: string) => fetch(`${API}/api/invoices/${id}/payments/${payId}?tenant=${TENANT}`, { method: "DELETE" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      toast.success("Payment removed");
    },
    onError: () => toast.error("Failed to remove payment"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/invoices/${id}?tenant=${TENANT}`, { method: "DELETE" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      toast.success("Invoice deleted");
      navigate("/invoices");
    },
    onError: () => toast.error("Failed to delete invoice"),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-5xl">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!data?.invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Receipt className="w-12 h-12 text-muted-foreground/20" />
        <p className="text-muted-foreground">Invoice not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/invoices")}>Back to invoices</Button>
      </div>
    );
  }

  const { invoice, lineItems, payments, jobReport = [] } = data;
  const subtotal   = parseFloat(invoice.subtotal ?? "0");
  const discount   = parseFloat(invoice.discount ?? "0");
  const taxAmt     = parseFloat(invoice.tax_amount ?? "0");
  const total      = parseFloat(invoice.total ?? "0");
  const paidAmt    = parseFloat(invoice.paid_amount ?? "0");
  const balance    = Math.max(0, total - paidAmt);
  const isPaid     = invoice.status === "paid";
  const isVoid     = invoice.status === "void";
  const canEdit    = invoice.status === "draft";

  const statusMeta: Record<string, string> = {
    draft:   "bg-gray-100 text-gray-700 border-gray-300",
    sent:    "bg-blue-100 text-blue-800 border-blue-200",
    partial: "bg-orange-100 text-orange-800 border-orange-200",
    paid:    "bg-green-100 text-green-800 border-green-200",
    overdue: "bg-red-100 text-red-800 border-red-200",
    void:    "bg-gray-100 text-gray-400 border-gray-200",
  };

  const invoiceRow = {
    id: invoice.id, ref: invoice.ref, status: invoice.status,
    client_id: invoice.client_id, client_name: invoice.client_name,
    vehicle_id: invoice.vehicle_id, job_id: invoice.job_id,
    tax_rate: invoice.tax_rate, discount: invoice.discount,
    total: invoice.total, notes: invoice.notes, due_at: invoice.due_at,
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <button onClick={() => navigate("/invoices")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Invoices
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold font-mono">{invoice.ref}</h1>
              <Badge variant="outline" className={cn("text-xs border capitalize", statusMeta[invoice.status] ?? "")}>
                {invoice.status}
              </Badge>
              {invoice.due_at && !isPaid && !isVoid && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded border",
                  new Date(invoice.due_at) < new Date()
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-muted text-muted-foreground border-border",
                )}>
                  Due {fmtDate(invoice.due_at)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Created {fmtDate(invoice.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isPaid && !isVoid && (
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => setPayOpen(true)}>
              <CreditCard className="w-3.5 h-3.5" />Record payment
            </Button>
          )}
          {invoice.status === "draft" && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
              <Send className="w-3.5 h-3.5" />{sendMutation.isPending ? "Marking…" : "Mark sent"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSendOpen(true)}>
            <ExternalLink className="w-3.5 h-3.5" />Payment link
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="px-2"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && <DropdownMenuItem onClick={() => setEditOpen(true)}><Edit className="w-3.5 h-3.5 mr-2" />Edit invoice</DropdownMenuItem>}
              {(invoice.job_id || invoice.quotation_id) && !isPaid && !isVoid && (
                <DropdownMenuItem onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                  <RefreshCw className={cn("w-3.5 h-3.5 mr-2", syncMutation.isPending && "animate-spin")} />
                  {syncMutation.isPending ? "Syncing…" : "Sync from quotation"}
                </DropdownMenuItem>
              )}
              {!isVoid && !isPaid && (
                <DropdownMenuItem onClick={() => voidMutation.mutate()}>
                  <X className="w-3.5 h-3.5 mr-2" />Void invoice
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="border border-border rounded-lg bg-background p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</p>
            {invoice.client_name ? (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                  {invoice.client_name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{invoice.client_name}</p>
                  {invoice.client_phone && <p className="text-xs text-muted-foreground">{invoice.client_phone}</p>}
                  {invoice.client_email && <p className="text-xs text-muted-foreground">{invoice.client_email}</p>}
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground/50 italic">No customer linked</p>}
          </div>

          {/* Vehicle */}
          {invoice.plate_number && (
            <div className="border border-border rounded-lg bg-background p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle</p>
              <div className="flex items-start gap-2">
                <Car className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold font-mono">{invoice.plate_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {[invoice.year, invoice.make, invoice.model].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Linked documents */}
          {(invoice.job_id || invoice.quotation_id) && (
            <div className="border border-border rounded-lg bg-background p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linked to</p>
              {invoice.job_id && (
                <button
                  onClick={() => navigate(`/jobs/${invoice.job_id}`)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <FileText className="w-3 h-3" />View job card
                </button>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="border border-border rounded-lg bg-background p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmtAed(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>− {fmtAed(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({parseFloat(invoice.tax_rate ?? "0").toFixed(1)}%)</span>
                <span>{fmtAed(taxAmt)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
                <span>Total</span>
                <span>{fmtAed(total)}</span>
              </div>
              {paidAmt > 0 && (
                <div className="flex justify-between text-green-700 font-medium">
                  <span>Paid</span>
                  <span>− {fmtAed(paidAmt)}</span>
                </div>
              )}
              {balance > 0.01 && (
                <div className={cn(
                  "flex justify-between font-semibold rounded px-2 py-1.5 -mx-2",
                  invoice.status === "overdue" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700",
                )}>
                  <span>Balance due</span>
                  <span>{fmtAed(balance)}</span>
                </div>
              )}
              {isPaid && (
                <div className="flex justify-between items-center text-green-700 bg-green-50 rounded px-2 py-1.5 -mx-2 font-semibold">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Fully paid</span>
                  <span>{fmtDate(invoice.paid_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Job Report */}
          {jobReport.length > 0 && (
            <div className="border border-blue-200 rounded-lg bg-blue-50/50 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />Job Report
              </p>
              <ul className="space-y-1.5">
                {jobReport.map((r, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{r.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="border border-border rounded-lg bg-background p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Stripe placeholder */}
          <div className="border border-dashed border-border rounded-lg p-4 space-y-2 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />Stripe integration
            </p>
            <p className="text-xs text-muted-foreground/70">
              Architecture is ready for Stripe. Connect a Stripe account in Settings → Payments to enable payment links, automatic reconciliation, and advance settlements.
            </p>
            <Button size="sm" variant="outline" className="w-full text-xs h-7" disabled>
              Connect Stripe
            </Button>
          </div>
        </div>

        {/* Right: line items + payments */}
        <div className="lg:col-span-2 space-y-5">
          {/* Line items */}
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line items</p>
              {canEdit && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddLine(p => !p)}>
                  <Plus className="w-3 h-3" />{showAddLine ? "Cancel" : "Add line"}
                </Button>
              )}
            </div>
            {lineItems.length === 0 && !showAddLine ? (
              <div className="p-8 text-center text-sm text-muted-foreground/50">No line items yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Part #</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Unit</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Disc</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Total</th>
                      {canEdit && <th className="px-2 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(l => (
                      <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">{l.type}</td>
                        <td className="px-3 py-2.5 text-sm">
                          <div>{l.description}</div>
                          {l.notes && <div className="text-xs text-muted-foreground">{l.notes}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground hidden sm:table-cell">{l.part_number ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right text-sm">{parseFloat(l.qty).toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-sm">{parseFloat(l.unit_price).toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-sm text-red-500">{parseFloat(l.discount ?? "0") > 0 ? `−${parseFloat(l.discount).toFixed(2)}` : "—"}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-semibold">{parseFloat(l.line_total).toFixed(2)}</td>
                        {canEdit && (
                          <td className="px-2 py-2">
                            <button onClick={() => deleteLineMutation.mutate(l.id)}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {showAddLine && <AddLineForm invoiceId={invoice.id} onDone={() => setShowAddLine(false)} />}
                  </tbody>
                </table>
              </div>
            )}
            {lineItems.length > 0 && (
              <div className="border-t border-border px-4 py-3 bg-muted/30">
                <div className="flex justify-end">
                  <div className="space-y-1 text-sm w-64">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span><span>{fmtAed(subtotal)}</span>
                    </div>
                    {discount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>−{fmtAed(discount)}</span></div>}
                    <div className="flex justify-between text-muted-foreground">
                      <span>VAT ({parseFloat(invoice.tax_rate ?? "0").toFixed(1)}%)</span><span>{fmtAed(taxAmt)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t border-border pt-1">
                      <span>Total</span><span>{fmtAed(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment history */}
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment history</p>
              {!isPaid && !isVoid && (
                <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => setPayOpen(true)}>
                  <Plus className="w-3 h-3" />Record payment
                </Button>
              )}
            </div>
            {payments.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground/50">No payments recorded yet</p>
                {!isPaid && !isVoid && balance > 0 && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setPayOpen(true)}>
                    Record first payment
                  </Button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Method</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Reference</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 group">
                      <td className="px-4 py-2.5 text-xs">{fmtDate(p.paid_at)}</td>
                      <td className="px-4 py-2.5 text-xs capitalize">{p.method.replace(/_/g," ")}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{p.reference ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-green-700">{fmtAed(p.amount)}</td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => deletePaymentMutation.mutate(p.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <InvoiceDrawer open={editOpen} onOpenChange={setEditOpen} invoice={invoiceRow} />

      <RecordPaymentDialog
        invoiceId={invoice.id}
        balance={balance}
        open={payOpen}
        onClose={() => setPayOpen(false)}
      />

      <SendPaymentLinkDialog
        invoiceRef={invoice.ref}
        clientName={invoice.client_name}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {invoice.status === "draft" ? `Delete ${invoice.ref}?` : `Void ${invoice.ref}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {invoice.status === "draft"
                ? "This will permanently delete the invoice and all its line items."
                : "Non-draft invoices cannot be deleted — they will be voided instead to preserve the audit trail."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Processing…" : invoice.status === "draft" ? "Delete" : "Void invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
