import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";

export interface VehicleRow {
  id: string;
  client_id: string;
  plate: string;
  make: string | null;
  model: string | null;
  year: string | null;
  vin: string | null;
  color: string | null;
  mileage: string | null;
  fuel_type: string | null;
  transmission: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle?: VehicleRow | null;
  clientId?: string;
  onSuccess?: () => void;
}

interface FormState {
  plate: string; make: string; model: string; year: string;
  vin: string; color: string; mileage: string;
  fuel_type: string; transmission: string; notes: string;
}

const EMPTY: FormState = {
  plate: "", make: "", model: "", year: "",
  vin: "", color: "", mileage: "", fuel_type: "", transmission: "", notes: "",
};

function toForm(v: VehicleRow): FormState {
  return {
    plate:        v.plate,
    make:         v.make         ?? "",
    model:        v.model        ?? "",
    year:         v.year         ?? "",
    vin:          v.vin          ?? "",
    color:        v.color        ?? "",
    mileage:      v.mileage      ?? "",
    fuel_type:    v.fuel_type    ?? "",
    transmission: v.transmission ?? "",
    notes:        v.notes        ?? "",
  };
}

export default function VehicleDrawer({ open, onClose, vehicle, clientId, onSuccess }: Props) {
  const qc     = useQueryClient();
  const isEdit = Boolean(vehicle);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [err,  setErr]  = useState<string | null>(null);

  useEffect(() => {
    if (open) { setErr(null); setForm(vehicle ? toForm(vehicle) : EMPTY); }
  }, [open, vehicle]);

  const field =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isEdit
        ? `/api/vehicles/${vehicle!.id}?tenant=${TENANT}`
        : `/api/vehicles?tenant=${TENANT}`;
      const body = isEdit
        ? form
        : { ...form, client_id: vehicle?.client_id ?? clientId };
      const res = await fetch(url, {
        method:  isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Request failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["vehicle"] });
      qc.invalidateQueries({ queryKey: ["client"] });
      onSuccess?.();
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plate.trim()) { setErr("Plate number is required"); return; }
    setErr(null);
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <DialogTitle>{isEdit ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update vehicle details." : "Register a new vehicle for this customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="vplate">Plate number <span className="text-destructive">*</span></Label>
            <Input id="vplate" value={form.plate} onChange={field("plate")} placeholder="e.g. A 12345 B" className="uppercase" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vmake">Make</Label>
              <Input id="vmake" value={form.make} onChange={field("make")} placeholder="Toyota" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vmodel">Model</Label>
              <Input id="vmodel" value={form.model} onChange={field("model")} placeholder="Camry" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vyear">Year</Label>
              <Input id="vyear" value={form.year} onChange={field("year")} placeholder="2022" maxLength={4} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vcolor">Color</Label>
              <Input id="vcolor" value={form.color} onChange={field("color")} placeholder="White" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vvin">VIN</Label>
            <Input id="vvin" value={form.vin} onChange={field("vin")} placeholder="1HGBH41JXMN109186" className="font-mono text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fuel type</Label>
              <Select value={form.fuel_type} onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Transmission</Label>
              <Select value={form.transmission} onValueChange={v => setForm(f => ({ ...f, transmission: v }))}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="cvt">CVT</SelectItem>
                  <SelectItem value="semi_automatic">Semi-auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vmil">Current mileage (km)</Label>
            <Input id="vmil" value={form.mileage} onChange={field("mileage")} placeholder="85000" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vnotes">Notes</Label>
            <Textarea id="vnotes" value={form.notes} onChange={field("notes")} rows={3} placeholder="Any notes about this vehicle…" />
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
        </form>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
