import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSession } from "@/hooks/useAuth";
import { useDistanceUnit } from "@/hooks/useSettings";
import {
  ArrowLeft, CalendarCheck, Edit, User, Car, Clock, Calendar,
  ChevronRight, FileText, MoreHorizontal, XCircle, CalendarClock,
  PlusCircle, CheckCheck, Ban, Eye, RefreshCw,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import BookingDrawer, { type BookingRow } from "@/components/BookingDrawer";
import QuotationDrawer from "@/components/QuotationDrawer";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_META: Record<string, { label: string; color: string; next: string[] }> = {
  pending:    { label: "Pending",     color: "bg-yellow-100 text-yellow-800 border-yellow-200",  next: ["confirmed", "checked_in"] },
  confirmed:  { label: "Confirmed",   color: "bg-blue-100 text-blue-800 border-blue-200",        next: ["checked_in", "pending"] },
  checked_in: { label: "Checked In",  color: "bg-indigo-100 text-indigo-800 border-indigo-200",  next: ["completed", "no_show"] },
  completed:  { label: "Completed",   color: "bg-green-100 text-green-800 border-green-200",     next: [] },
  cancelled:  { label: "Cancelled",   color: "bg-gray-100 text-gray-600 border-gray-300",        next: [] },
  no_show:    { label: "No Show",     color: "bg-red-100 text-red-700 border-red-200",            next: [] },
};

const CANCELLABLE = ["pending", "confirmed", "checked_in", "in_progress"];

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
  const distanceUnit = useDistanceUnit();

  const [editOpen,    setEditOpen]    = useState(false);
  const [quoteOpen,   setQuoteOpen]   = useState(false);
  const [cancelOpen,  setCancelOpen]  = useState(false);
  const [cancelNote,  setCancelNote]  = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetch(`${API}/api/bookings/${id}?tenant=${TENANT}`).then(r => r.json()),
    enabled: !!id,
  });

  const bk       = data?.booking  ?? null;
  const activity  = data?.activity ?? [];

  const transition = useMutation({
    mutationFn: async ({ status, cancellation_note }: { status: string; cancellation_note?: string }) => {
      const session = getSession();
      const res = await fetch(`${API}/api/bookings/${id}/status?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, cancellation_note, user_id: session?.userId ?? null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error ?? "Failed to update status");
      }
      return { status, result: await res.json() };
    },
    onSuccess: async ({ status }) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(status === "cancelled" ? "Booking cancelled" : "Status updated");

      if (status === "checked_in" && bk) {
        const rawType = bk.booking_type;
        const bookingType = rawType === "inspection" ? "quick_repair" : rawType;
        if (bookingType === "quick_repair" || bookingType === "service_job") {
          try {
            const existingRes = await fetch(`${API}/api/jobs?tenant=${TENANT}&booking_id=${id}&limit=1`).then(r => r.json());
            if ((existingRes?.data ?? []).length > 0) {
              toast.info("A job card already exists for this booking.");
              return;
            }
            const jobBody: Record<string, string | null> = {
              client_id: bk.client_id || null,
              vehicle_id: bk.vehicle_id || null,
              customer_concern: bk.notes || null,
              type: bookingType,
              booking_id: id,
              mileage_in: bk.mileage_in || null,
              scheduled_date: bk.scheduled_at ? bk.scheduled_at.slice(0, 10) : null,
            };
            const jobCreateRes = await fetch(`${API}/api/jobs?tenant=${TENANT}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(jobBody),
            });
            if (!jobCreateRes.ok) throw new Error("Failed to create job card");
            const jobRes = await jobCreateRes.json();
            qc.invalidateQueries({ queryKey: ["jobs"] });
            qc.invalidateQueries({ queryKey: ["jobs-kanban"] });
            qc.invalidateQueries({ queryKey: ["quick-repairs-kanban"] });
            const jobId = jobRes?.id ?? jobRes?.job?.id;
            const jobRef = jobRes?.ref ?? jobRes?.job?.ref ?? "Job";
            const linkPath = bookingType === "quick_repair" ? `/quick-repairs/${jobId}` : `/jobs/${jobId}`;
            toast.success(`${bookingType === "quick_repair" ? "Quick Repair" : "Service Job"} card ${jobRef} created`, {
              action: jobId ? { label: "View", onClick: () => navigate(linkPath) } : undefined,
            });
          } catch {
            toast.error("Failed to auto-create job card");
          }
        }
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBk = useMutation({
    mutationFn: () => fetch(`${API}/api/bookings/${id}?tenant=${TENANT}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { toast.success("Booking deleted"); navigate("/bookings"); },
  });

  function handleCancelSubmit() {
    transition.mutate({ status: "cancelled", cancellation_note: cancelNote.trim() || undefined });
    setCancelOpen(false);
    setCancelNote("");
  }

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
          {nextSteps.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5" disabled={transition.isPending}>
                  <RefreshCw className="w-3.5 h-3.5" />Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-sm w-44">
                {nextSteps.map(s => (
                  <DropdownMenuItem key={s} onClick={() => transition.mutate({ status: s })}>
                    {STATUS_META[s]?.label ?? s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm w-48">
              {!["cancelled", "no_show"].includes(bk.status) && (
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Edit className="w-3.5 h-3.5 mr-2" />Edit booking
                </DropdownMenuItem>
              )}
              {CANCELLABLE.includes(bk.status) && (
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <CalendarClock className="w-3.5 h-3.5 mr-2" />Reschedule
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setQuoteOpen(true)}>
                <FileText className="w-3.5 h-3.5 mr-2" />Create quotation
              </DropdownMenuItem>
              {nextSteps.includes("pending") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => transition.mutate({ status: "pending" })}>
                    Revert to Pending
                  </DropdownMenuItem>
                </>
              )}
              {CANCELLABLE.includes(bk.status) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => { setCancelNote(""); setCancelOpen(true); }}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-2" />Cancel booking
                  </DropdownMenuItem>
                </>
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
                <dd className="font-mono">{parseInt(bk.mileage_in).toLocaleString()} {distanceUnit}</dd>
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

      {/* Cancellation note */}
      {bk.status === "cancelled" && bk.cancellation_note && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-1.5">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wide flex items-center gap-1.5">
            <XCircle className="w-3 h-3" />Cancellation reason
          </p>
          <p className="text-sm whitespace-pre-wrap">{bk.cancellation_note}</p>
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

      {/* Activity log — always visible */}
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Activity history</p>

        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="relative space-y-0">
            {(() => {
              const STATUS_LABELS: Record<string, string> = {
                pending: "Pending", confirmed: "Confirmed", checked_in: "Checked In",
                in_progress: "In Progress", completed: "Completed",
                cancelled: "Cancelled", no_show: "No Show",
              };
              const STATUS_COLOR: Record<string, string> = {
                cancelled: "bg-destructive/10 text-destructive border-destructive/20",
                completed:  "bg-green-50 text-green-700 border-green-200",
                confirmed:  "bg-blue-50 text-blue-700 border-blue-200",
                checked_in: "bg-yellow-50 text-yellow-700 border-yellow-200",
              };

              return activity.map((ev: any, i: number) => {
                const isLast = i === activity.length - 1;
                const icon = ev.type === "created"
                  ? <PlusCircle className="w-4 h-4 text-primary" />
                  : ev.to_status === "cancelled"
                  ? <Ban className="w-4 h-4 text-destructive" />
                  : ev.to_status === "completed"
                  ? <CheckCheck className="w-4 h-4 text-green-600" />
                  : ev.to_status === "no_show"
                  ? <Eye className="w-4 h-4 text-orange-500" />
                  : <RefreshCw className="w-4 h-4 text-muted-foreground" />;

                const ts      = new Date(ev.created_at);
                const dateStr = ts.toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
                const timeStr = ts.toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" });
                const actor   = ev.created_by_name ?? "System";

                return (
                  <div key={ev.id} className="flex gap-3">
                    {/* dot + connecting line */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border border-border bg-muted/40 flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[16px]" />}
                    </div>

                    {/* content */}
                    <div className="pb-5 min-w-0 flex-1">
                      {/* event label */}
                      {ev.type === "created" ? (
                        <p className="text-sm font-semibold leading-tight">Booking created</p>
                      ) : ev.from_status && ev.to_status ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold mr-1">Status changed</p>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            {STATUS_LABELS[ev.from_status] ?? ev.from_status}
                          </span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[ev.to_status] ?? "bg-muted text-foreground border-border"}`}>
                            {STATUS_LABELS[ev.to_status] ?? ev.to_status}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold leading-tight">{ev.note}</p>
                      )}

                      {/* cancellation reason */}
                      {ev.to_status === "cancelled" && ev.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">Reason: "{ev.note}"</p>
                      )}

                      {/* meta row: date · time · user */}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground flex-wrap">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{dateStr}</span>
                        <span className="opacity-40 mx-0.5">·</span>
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{timeStr}</span>
                        <span className="opacity-40 mx-0.5">·</span>
                        <User className="w-3 h-3 shrink-0" />
                        <span className="font-medium text-foreground/70">{actor}</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
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

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel booking</DialogTitle>
            <DialogDescription>
              The booking will be marked as cancelled but kept in the customer's history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <label className="text-sm font-medium">Cancellation reason <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea
              placeholder="e.g. Customer requested cancellation, part unavailable…"
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep booking</Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubmit}
              disabled={transition.isPending}
            >
              {transition.isPending ? "Cancelling…" : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
