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

export interface JobRow {
  id: string;
  ref: string;
  status: string;
  priority: string;
  bay: string | null;
  client_id: string | null;
  client_name: string | null;
  vehicle_id: string | null;
  plate_number: string | null;
  advisor_id: string | null;
  technician_id: string | null;
  customer_concern: string | null;
  internal_note: string | null;
  mileage_in: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: JobRow | null;
  defaultClientId?: string;
  defaultVehicleId?: string;
}

export default function JobDrawer({ open, onOpenChange, job, defaultClientId, defaultVehicleId }: Props) {
  const qc = useQueryClient();
  const isEdit = !!job;

  const [form, setForm] = useState({
    client_id:       "",
    vehicle_id:      "",
    advisor_id:      "",
    technician_id:   "",
    priority:        "normal",
    bay:             "",
    customer_concern: "",
    internal_note:   "",
    mileage_in:      "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        client_id:        job?.client_id        ?? defaultClientId ?? "",
        vehicle_id:       job?.vehicle_id       ?? defaultVehicleId ?? "",
        advisor_id:       job?.advisor_id       ?? "",
        technician_id:    job?.technician_id    ?? "",
        priority:         job?.priority         ?? "normal",
        bay:              job?.bay              ?? "",
        customer_concern: job?.customer_concern ?? "",
        internal_note:    job?.internal_note    ?? "",
        mileage_in:       job?.mileage_in       ?? "",
      });
    }
  }, [open, job, defaultClientId, defaultVehicleId]);

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const { data: clientsData } = useQuery({
    queryKey: ["clients-brief"],
    queryFn: async () => {
      const r = await fetch(`${API}/api/clients?tenant=${TENANT}&limit=200`);
      return r.json() as Promise<{ data: Array<{ id: string; name: string }> }>;
    },
    staleTime: 30_000,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles-brief", form.client_id],
    queryFn: async () => {
      const qs = form.client_id ? `&client_id=${form.client_id}` : "";
      const r = await fetch(`${API}/api/vehicles?tenant=${TENANT}&limit=200${qs}`);
      return r.json() as Promise<{ data: Array<{ id: string; plate_number: string; make: string; model: string }> }>;
    },
    staleTime: 30_000,
  });

  const { data: techData } = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const r = await fetch(`${API}/api/jobs/meta/technicians?tenant=${TENANT}`);
      return r.json() as Promise<{ data: Array<{ id: string; name: string; role: string }> }>;
    },
    staleTime: 60_000,
  });

  const clients     = clientsData?.data ?? [];
  const vehicles    = vehiclesData?.data ?? [];
  const technicians = techData?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const url    = isEdit ? `${API}/api/jobs/${job!.id}?tenant=${TENANT}` : `${API}/api/jobs?tenant=${TENANT}`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to save job");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-kanban"] });
      toast.success(isEdit ? "Job updated" : "Job created");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to save job"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <DialogTitle>{isEdit ? `Edit ${job!.ref}` : "New job card"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update job details and assignments." : "Create a new job card for the workshop."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bay / Lift</Label>
              <Input
                placeholder="e.g. Bay 3"
                value={form.bay}
                onChange={e => set("bay", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={form.client_id} onValueChange={v => { set("client_id", v); set("vehicle_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Vehicle</Label>
            <Select value={form.vehicle_id} onValueChange={v => set("vehicle_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select vehicle…" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate_number} — {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Assign technician</Label>
            <Select value={form.technician_id} onValueChange={v => set("technician_id", v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {technicians.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Mileage in</Label>
            <Input
              placeholder="e.g. 45230"
              value={form.mileage_in}
              onChange={e => set("mileage_in", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Customer concern / complaint</Label>
            <Textarea
              rows={3}
              placeholder="Describe the issue as reported by the customer…"
              value={form.customer_concern}
              onChange={e => set("customer_concern", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Internal note</Label>
            <Textarea
              rows={2}
              placeholder="Internal workshop notes (not visible to customer)…"
              value={form.internal_note}
              onChange={e => set("internal_note", e.target.value)}
            />
          </div>
        </form>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : isEdit ? "Update job" : "Create job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
