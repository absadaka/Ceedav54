import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Zap, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface BookingRow {
  id: string;
  ref: string;
  status: string;
  source: string;
  scheduled_at: string;
  duration_min: number;
  notes: string | null;
  mileage_in: string | null;
  client_id: string | null;
  client_name: string | null;
  vehicle_id: string | null;
  plate_number: string | null;
  vehicle_make?: string | null;
  advisor_id: string | null;
  advisor_name: string | null;
  booking_type?: string | null;
  deleted_at?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  booking?: BookingRow | null;
}

const SOURCES = [
  { value: "phone",    label: "Phone" },
  { value: "walk_in",  label: "Walk-in" },
  { value: "online",   label: "Online" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "referral", label: "Referral" },
];

export default function BookingDrawer({ open, onClose, booking }: Props) {
  const qc = useQueryClient();
  const isEdit = !!booking?.id;

  const [bookingType, setBookingType] = useState<"quick_repair" | "service_job" | "">("");
  const [clientId,    setClientId]    = useState("");
  const [vehicleId,   setVehicleId]   = useState("");
  const [date,        setDate]        = useState("");
  const [time,        setTime]        = useState("09:00");
  const [source,      setSource]      = useState("phone");
  const [notes,       setNotes]       = useState("");

  useEffect(() => {
    if (!open) return;
    if (booking) {
      setBookingType((booking.booking_type === "quick_repair" || booking.booking_type === "service_job") ? booking.booking_type : booking.booking_type === "inspection" ? "quick_repair" : "");
      setClientId(booking.client_id ?? "");
      setVehicleId(booking.vehicle_id ?? "");
      const dt = booking.scheduled_at ? new Date(booking.scheduled_at) : new Date();
      setDate(dt.toISOString().slice(0, 10));
      setTime(dt.toTimeString().slice(0, 5));
      setSource(booking.source ?? "phone");
      setNotes(booking.notes ?? "");
    } else {
      setBookingType("");
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      setDate(now.toISOString().slice(0, 10));
      setTime(now.toTimeString().slice(0, 5));
      setClientId(""); setVehicleId("");
      setSource("phone"); setNotes("");
    }
  }, [booking, open]);

  /* ── Data fetching ──────────────────────────────────────────────────── */

  const { data: clientsRaw = [] } = useQuery({
    queryKey: ["clients-list", TENANT],
    queryFn: () =>
      fetch(`${API}/api/clients?tenant=${TENANT}&limit=200`)
        .then(r => r.json())
        .then(d => d.data ?? d.rows ?? []),   // API returns { data: [...] }
    enabled: open,
  });

  const { data: vehiclesRaw = [] } = useQuery({
    queryKey: ["vehicles-by-client", clientId, TENANT],
    queryFn: () =>
      fetch(`${API}/api/vehicles?tenant=${TENANT}&client_id=${clientId}&limit=50`)
        .then(r => r.json())
        .then(d => d.rows ?? d.data ?? []),
    enabled: open && !!clientId,
  });

  /* ── Normalise to SelectOption[] ────────────────────────────────────── */

  const clientOptions: SelectOption[] = useMemo(
    () => (clientsRaw as any[]).map(c => ({
      value: c.id,
      label: c.name + (c.phone ? ` · ${c.phone}` : ""),
    })),
    [clientsRaw],
  );

  const vehicleOptions: SelectOption[] = useMemo(
    () => (vehiclesRaw as any[]).map(v => ({
      value: v.id,
      label: [v.plate, v.year, v.make, v.model].filter(Boolean).join(" "),
    })),
    [vehiclesRaw],
  );

  /* ── Handlers ───────────────────────────────────────────────────────── */

  function handleClientChange(id: string) {
    setClientId(id);
    setVehicleId("");   // reset vehicle when customer changes
  }

  /* ── Submit ─────────────────────────────────────────────────────────── */

  const save = useMutation({
    mutationFn: async () => {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const body = {
        client_id:    clientId   || null,
        vehicle_id:   vehicleId  || null,
        advisor_id:   null,
        scheduled_at,
        duration_min: null,
        source,
        notes:        notes      || null,
        mileage_in:   null,
        booking_type: bookingType || null,
      };
      const url    = isEdit
        ? `${API}/api/bookings/${booking!.id}?tenant=${TENANT}`
        : `${API}/api/bookings?tenant=${TENANT}`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      toast.success(isEdit ? "Booking updated" : "Booking created");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const showTypeStep = !isEdit && !bookingType;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <DialogTitle>{isEdit ? "Edit booking" : "New booking"}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Editing ${booking!.ref}` : showTypeStep ? "What type of booking is this?" : "Schedule a service appointment"}
          </DialogDescription>
        </DialogHeader>

        {showTypeStep ? (
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setBookingType("service_job")}
                className={cn(
                  "flex items-center gap-4 rounded-xl border-2 border-border p-5 transition-all hover:border-primary/60 hover:shadow-md cursor-pointer text-left"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Wrench className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Service Job</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Full service with quotation and inspection</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setBookingType("quick_repair")}
                className={cn(
                  "flex items-center gap-4 rounded-xl border-2 border-border p-5 transition-all hover:border-primary/60 hover:shadow-md cursor-pointer text-left"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Quick Repair</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Fast repair — no quotation or inspection needed</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {!isEdit && bookingType && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                bookingType === "quick_repair"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-orange-50 text-orange-700 border-orange-200"
              )}>
                {bookingType === "quick_repair" ? <Zap className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                {bookingType === "quick_repair" ? "Quick Repair" : "Service Job"}
              </span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                onClick={() => setBookingType("")}
              >
                Change
              </button>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Time *</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <SearchableSelect
              value={clientId}
              onValueChange={handleClientChange}
              options={clientOptions}
              placeholder={clientOptions.length === 0 ? "No customers yet" : "Search customer…"}
              searchPlaceholder="Search by name or phone…"
            />
            {clientOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add a customer first from the Customers page.
              </p>
            )}
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <Label>Vehicle</Label>
            <SearchableSelect
              value={vehicleId}
              onValueChange={setVehicleId}
              options={vehicleOptions}
              placeholder={
                !clientId
                  ? "Select a customer first"
                  : vehicleOptions.length === 0
                  ? "No vehicles for this customer"
                  : "Search vehicle…"
              }
              searchPlaceholder="Search by plate or model…"
              disabled={!clientId}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes / Service request</Label>
            <Textarea
              placeholder="Customer concern or service description…"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
        )}

        {!showTypeStep && (
        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !date || !time}
          >
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create booking"}
          </Button>
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
