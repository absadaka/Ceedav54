import { useState, useEffect } from "react";
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
import { toast } from "sonner";

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";
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
    if (booking) {
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
      setClientId(""); setVehicleId(""); setAdvisorId("");
      setDuration("60"); setSource("phone"); setNotes(""); setMileageIn("");
    }
  }, [booking, open]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () =>
      fetch(`${API}/api/clients?tenant=${TENANT}&limit=200`)
        .then(r => r.json()).then(d => d.rows ?? []),
    enabled: open,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-by-client", clientId],
    queryFn: () =>
      fetch(`${API}/api/vehicles?tenant=${TENANT}&client_id=${clientId}&limit=50`)
        .then(r => r.json()).then(d => d.rows ?? []),
    enabled: open && !!clientId,
  });

  const { data: advisorsRaw = [] } = useQuery({
    queryKey: ["booking-advisors"],
    queryFn: () =>
      fetch(`${API}/api/bookings/meta/advisors?tenant=${TENANT}`).then(r => r.json()),
    enabled: open,
  });
  const advisors: any[] = Array.isArray(advisorsRaw) ? advisorsRaw : [];

  const save = useMutation({
    mutationFn: async () => {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const body = {
        client_id:   clientId   || null,
        vehicle_id:  vehicleId  || null,
        advisor_id:  advisorId  || null,
        scheduled_at,
        duration_min: Number(duration),
        source,
        notes:      notes      || null,
        mileage_in: mileageIn  || null,
      };
      const url    = isEdit ? `${API}/api/bookings/${booking!.id}?tenant=${TENANT}` : `${API}/api/bookings?tenant=${TENANT}`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
                  {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={clientId || "__none"} onValueChange={v => { setClientId(v === "__none" ? "" : v); setVehicleId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No customer</SelectItem>
                {clients.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <Label>Vehicle</Label>
            <Select
              value={vehicleId || "__none"}
              onValueChange={v => setVehicleId(v === "__none" ? "" : v)}
              disabled={!clientId}
            >
              <SelectTrigger>
                <SelectValue placeholder={clientId ? "Select vehicle…" : "Select customer first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No vehicle</SelectItem>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>{v.plate} — {v.year} {v.make} {v.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advisor */}
          <div className="space-y-1.5">
            <Label>Assigned advisor</Label>
            <Select value={advisorId || "__none"} onValueChange={v => setAdvisorId(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {advisors.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} ({a.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button onClick={() => save.mutate()} disabled={save.isPending || !date || !time}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
