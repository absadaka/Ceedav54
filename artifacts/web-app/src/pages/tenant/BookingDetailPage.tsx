import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarCheck, Edit, User, Car, Clock, Calendar,
  CheckCircle2, XCircle, RefreshCw, ChevronRight, FileText, MoreHorizontal,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import BookingDrawer, { type BookingRow } from "@/components/BookingDrawer";
import QuotationDrawer from "@/components/QuotationDrawer";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_META: Record<string, { label: string; color: string; next: string[] }> = {
  pending:    { label: "Pending",     color: "bg-yellow-100 text-yellow-800 border-yellow-200", next: ["confirmed", "checked_in", "cancelled", "no_show"] },
  confirmed:  { label: "Confirmed",   color: "bg-blue-100 text-blue-800 border-blue-200",       next: ["checked_in", "cancelled", "no_show"] },
  checked_in: { label: "Checked In",  color: "bg-indigo-100 text-indigo-800 border-indigo-200", next: ["in_progress", "cancelled"] },
  in_progress:{ label: "In Progress", color: "bg-violet-100 text-violet-800 border-violet-200", next: ["completed"] },
  completed:  { label: "Completed",   color: "bg-green-100 text-green-800 border-green-200",    next: [] },
  cancelled:  { label: "Cancelled",   color: "bg-red-100 text-red-800 border-red-200",          next: [] },
  no_show:    { label: "No-show",     color: "bg-gray-100 text-gray-600 border-gray-200",       next: [] },
};

const SOURCE_LABEL: Record<string, string> = {
  phone: "Phone", walk_in: "Walk-in", online: "Online", whatsapp: "WhatsApp", referral: "Referral",
};

function fmt(iso: string | null, fallback = "—") {
  if (!iso) return fallback;
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string | null, fallback = "—") {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BookingDetailPage() {
  const [, params]   = useRoute("/bookings/:id");
  const [, navigate] = useLocation();
  const id  = params?.id ?? "";
  const qc  = useQueryClient();

  const [editOpen,    setEditOpen]    = useState(false);
  const [quoteOpen,   setQuoteOpen]   = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetch(`${API}/api/bookings/${id}?tenant=${TENANT}`).then(r => r.json()),
    enabled: !!id,
  });

  const bk = data?.booking ?? null;

  const transition = useMutation({
    mutationFn: (status: string) =>
      fetch(`${API}/api/bookings/${id}/status?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["booking", id] }); qc.invalidateQueries({ queryKey: ["bookings"] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBk = useMutation({
    mutationFn: () => fetch(`${API}/api/bookings/${id}?tenant=${TENANT}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { toast.success("Booking deleted"); navigate("/bookings"); },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!bk) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <CalendarCheck className="w-12 h-12 text-muted-foreground/20" />
        <p className="text-[15px] font-medium text-muted-foreground">Booking not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/bookings")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />Back to bookings
        </Button>
      </div>
    );
  }

  const sm       = STATUS_META[bk.status] ?? { label: bk.status, color: "bg-gray-100 text-gray-700 border-gray-200", next: [] };
  const nextSteps= sm.next;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 shrink-0" onClick={() => navigate("/bookings")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">{bk.ref}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${sm.color}`}>
                {sm.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{fmt(bk.scheduled_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {nextSteps.includes("confirmed") && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => transition.mutate("confirmed")} disabled={transition.isPending}>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />Confirm
            </Button>
          )}
          {nextSteps.includes("checked_in") && (
            <Button size="sm" className="gap-1.5" onClick={() => transition.mutate("checked_in")} disabled={transition.isPending}>
              Check in
            </Button>
          )}
          {nextSteps.includes("in_progress") && (
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={() => transition.mutate("in_progress")} disabled={transition.isPending}>
              <RefreshCw className="w-3.5 h-3.5" />Start service
            </Button>
          )}
          {nextSteps.includes("completed") && (
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => transition.mutate("completed")} disabled={transition.isPending}>
              <CheckCircle2 className="w-3.5 h-3.5" />Complete
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm w-44">
              <DropdownMenuItem onClick={() => setEditOpen(true)}><Edit className="w-3.5 h-3.5 mr-2" />Edit booking</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setQuoteOpen(true)}>
                <FileText className="w-3.5 h-3.5 mr-2" />Create quotation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {nextSteps.includes("cancelled") && (
                <DropdownMenuItem className="text-red-600" onClick={() => transition.mutate("cancelled")}>
                  <XCircle className="w-3.5 h-3.5 mr-2" />Cancel
                </DropdownMenuItem>
              )}
              {nextSteps.includes("no_show") && (
                <DropdownMenuItem className="text-muted-foreground" onClick={() => transition.mutate("no_show")}>
                  No-show
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Delete this booking?")) deleteBk.mutate(); }}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Customer */}
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</p>
          {bk.client_name
            ? (
              <button className="flex items-start gap-2 group w-full text-left" onClick={() => bk.client_id && navigate(`/customers/${bk.client_id}`)}>
                <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                    {bk.client_name}<ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                  </p>
                  {bk.client_phone && <p className="text-xs text-muted-foreground">{bk.client_phone}</p>}
                  {bk.client_email && <p className="text-xs text-muted-foreground">{bk.client_email}</p>}
                </div>
              </button>
            )
            : <p className="text-sm text-muted-foreground italic">Walk-in / no customer</p>
          }
        </div>

        {/* Vehicle */}
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle</p>
          {bk.plate_number
            ? (
              <button className="flex items-start gap-2 group w-full text-left" onClick={() => bk.vehicle_id && navigate(`/vehicles/${bk.vehicle_id}`)}>
                <Car className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm font-mono group-hover:text-primary transition-colors flex items-center gap-1">
                    {bk.plate_number}<ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                  </p>
                  <p className="text-xs text-muted-foreground">{bk.vehicle_year} {bk.vehicle_make} {bk.vehicle_model}</p>
                  {bk.vehicle_color && <p className="text-xs text-muted-foreground capitalize">{bk.vehicle_color}</p>}
                </div>
              </button>
            )
            : <p className="text-sm text-muted-foreground italic">No vehicle linked</p>
          }
        </div>

        {/* Appointment details */}
        <div className="rounded-lg border border-border bg-background p-4 space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Appointment</p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <dd className="font-medium">{new Date(bk.scheduled_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</dd>
                <dd className="text-xs text-muted-foreground">{new Date(bk.scheduled_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {bk.duration_min} min</dd>
              </div>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Source</dt>
              <dd>{SOURCE_LABEL[bk.source] ?? bk.source}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Advisor</dt>
              <dd className="font-medium">{bk.advisor_name ?? <span className="text-muted-foreground italic">Unassigned</span>}</dd>
            </div>
            {bk.mileage_in && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Mileage in</dt>
                <dd className="font-mono">{parseInt(bk.mileage_in).toLocaleString()} km</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-xs">{fmtDate(bk.created_at)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Notes */}
      {bk.notes && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3 h-3" />Service notes
          </p>
          <p className="text-sm whitespace-pre-wrap">{bk.notes}</p>
        </div>
      )}

      {/* Status timeline */}
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Status flow</p>
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(STATUS_META).map(([s, m], i, arr) => {
            const isCurrent = s === bk.status;
            const isPast    = Object.keys(STATUS_META).indexOf(bk.status) > i && !["cancelled", "no_show"].includes(bk.status);
            return (
              <div key={s} className="flex items-center gap-1">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                  isCurrent ? m.color : isPast ? "bg-muted text-muted-foreground/60 border-border" : "border-border text-muted-foreground/40 bg-background"
                }`}>
                  {m.label}
                </span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drawers */}
      <BookingDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        booking={bk as BookingRow}
      />
      <QuotationDrawer
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        quotation={{ id: "", ref: "", status: "draft", client_id: bk.client_id, client_name: bk.client_name, vehicle_id: bk.vehicle_id, plate_number: bk.plate_number, advisor_id: bk.advisor_id, advisor_name: bk.advisor_name, booking_id: bk.id, estimated_hours: null, subtotal: "0", discount: "0", tax_rate: "5", tax_amount: "0", total: "0", notes: bk.notes, internal_note: null, expires_at: null } as any}
      />
    </div>
  );
}
