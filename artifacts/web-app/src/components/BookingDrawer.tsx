import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Wrench } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { toast } from "sonner";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface BookingRow {
  id: string;
  ref: string;
  booking_type: "service" | "inspection";
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
  advisor_id: string | null;
  advisor_name: string | null;
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

const DURATIONS = [
  { value: "30",  label: "30 minutes" },
  { value: "60",  label: "1 hour" },
  { value: "90",  label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
  { value: "480", label: "Full day (8 hrs)" },
];

export default function BookingDrawer({ open, onClose, booking }: Props) {
  const qc = useQueryClient();
  const isEdit = !!booking?.id;

  const [bookingType, setBookingType] = useState<"service" | "inspection">("service");
  const [clientId,    setClientId]    = useState("");
  const [vehicleId,   setVehicleId]   = useState("");
  const [advisorId,   setAdvisorId]   = useState("");
  const [date,        setDate]        = useState("");
  const [time,        setTime]        = useState("09:00");
  const [duration,    setDuration]    = useState("60");
  const [source,      setSource]      = useState("phone");
  const [notes,       setNotes]       = useState("");
  const [mileageIn,   setMileageIn]   = useState("");

  useEffect(() => {
    if (!open) return;
    if (booking) {
      setBookingType(booking.booking_type ?? "service");
      setClientId(booking.client_id ?? "");
      setVehicleId(booking.vehicle_id ?? "");
      setAdvisorId(booking.advisor_id ?? "");
      const dt = booking.scheduled_at ? new Date(booking.scheduled_at) : new Date();
      setDate(dt.toISOString().slice(0, 10));
      setTime(dt.toTimeString().slice(0, 5));
      setDuration(String(booking.duration_min ?? 60));
      setSource(booking.source ?? "phone");
      setNotes(booking.notes ?? "");
      setMileageIn(booking.mileage_in ?? "");
    } else {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      setDate(now.toISOString().slice(0, 10));
      setTime(now.toTimeString().slice(0, 5));
      setBookingType("service");
      setClientId(""); setVehicleId(""); setAdvisorId("");
      setDuration("60"); setSource("phone"); setNotes(""); setMileageIn("");
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

  const { data: advisorsRaw = [] } = useQuery({
    queryKey: ["booking-advisors", TENANT],
    queryFn: () =>
      fetch(`${API}/api/bookings/meta/advisors?tenant=${TENANT}`).then(r => r.json()),
    enabled: open,
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

  const advisorOptions: SelectOption[] = useMemo(
    () => (Array.isArray(advisorsRaw) ? advisorsRaw as any[] : []).map((a: any) => ({
      value: a.id,
      label: `${a.name} (${a.role})`,
    })),
    [advisorsRaw],
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
        booking_type: bookingType,
        client_id:    clientId   || null,
        vehicle_id:   vehicleId  || null,
        advisor_id:   advisorId  || null,
        scheduled_at,
        duration_min: Number(duration),
        source,
        notes:        notes      || null,
        mileage_in:   mileageIn  || null,
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

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <DialogTitle>{isEdit ? "Edit booking" : "New booking"}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Editing ${booking!.ref}` : "Schedule a service appointment"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Booking type */}
          <div className="space-y-1.5">
            <Label>Appointment type</Label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "service",    label: "Service",    icon: Wrench,        desc: "Maintenance or repair work" },
                { value: "inspection", label: "Inspection", icon: ClipboardList, desc: "Diagnostic or vehicle check" },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBookingType(value)}
                  className={`flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-all ${
                    bookingType === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${bookingType === value ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold ${bookingType === value ? "text-primary" : "text-foreground"}`}>{label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground leading-snug">{desc}</span>
                </button>
              ))}
            </div>
          </div>

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

          {/* Duration & Source */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          {/* Advisor */}
          <div className="space-y-1.5">
            <Label>Assigned advisor</Label>
            <SearchableSelect
              value={advisorId}
              onValueChange={setAdvisorId}
              options={advisorOptions}
              placeholder="Unassigned"
              searchPlaceholder="Search advisor…"
            />
          </div>

          {/* Mileage */}
          <div className="space-y-1.5">
            <Label>Mileage in (km)</Label>
            <Input
              type="number"
              placeholder="e.g. 45230"
              value={mileageIn}
              onChange={e => setMileageIn(e.target.value)}
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

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !date || !time}
          >
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
