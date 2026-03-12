import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const TENANT = "demo-workshop";
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface QuotationRow {
  id: string;
  ref: string;
  status: string;
  estimated_hours: string | null;
  subtotal: string;
  discount: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
  notes: string | null;
  internal_note: string | null;
  expires_at: string | null;
  client_id: string | null;
  client_name: string | null;
  vehicle_id: string | null;
  plate_number: string | null;
  advisor_id: string | null;
  advisor_name: string | null;
  booking_id: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  quotation?: QuotationRow | null;
}

export default function QuotationDrawer({ open, onClose, quotation }: Props) {
  const qc = useQueryClient();
  const isEdit = !!quotation?.id;

  const [clientId,        setClientId]        = useState("");
  const [vehicleId,       setVehicleId]       = useState("");
  const [advisorId,       setAdvisorId]       = useState("");
  const [estimatedHours,  setEstimatedHours]  = useState("");
  const [notes,           setNotes]           = useState("");
  const [internalNote,    setInternalNote]    = useState("");
  const [taxRate,         setTaxRate]         = useState("5.00");
  const [discount,        setDiscount]        = useState("0.00");
  const [expiresAt,       setExpiresAt]       = useState("");

  useEffect(() => {
    if (quotation) {
      setClientId(quotation.client_id ?? "");
      setVehicleId(quotation.vehicle_id ?? "");
      setAdvisorId(quotation.advisor_id ?? "");
      setEstimatedHours(quotation.estimated_hours ?? "");
      setNotes(quotation.notes ?? "");
      setInternalNote(quotation.internal_note ?? "");
      setTaxRate(quotation.tax_rate ?? "5.00");
      setDiscount(quotation.discount ?? "0.00");
      setExpiresAt(quotation.expires_at ? quotation.expires_at.slice(0, 10) : "");
    } else {
      setClientId(""); setVehicleId(""); setAdvisorId("");
      setEstimatedHours(""); setNotes(""); setInternalNote("");
      setTaxRate("5.00"); setDiscount("0.00");
      const d = new Date(); d.setDate(d.getDate() + 14);
      setExpiresAt(d.toISOString().slice(0, 10));
    }
  }, [quotation, open]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => fetch(`${API}/api/clients?tenant=${TENANT}&limit=200`).then(r => r.json()).then(d => d.rows ?? []),
    enabled: open,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-by-client", clientId],
    queryFn: () => fetch(`${API}/api/vehicles?tenant=${TENANT}&client_id=${clientId}&limit=50`).then(r => r.json()).then(d => d.rows ?? []),
    enabled: open && !!clientId,
  });

  const { data: advisors = [] } = useQuery({
    queryKey: ["quotation-advisors"],
    queryFn: () => fetch(`${API}/api/quotations/meta/advisors?tenant=${TENANT}`).then(r => r.json()),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        client_id:       clientId       || null,
        vehicle_id:      vehicleId      || null,
        advisor_id:      advisorId      || null,
        estimated_hours: estimatedHours || null,
        notes:           notes          || null,
        internal_note:   internalNote   || null,
        tax_rate:        taxRate,
        discount:        discount,
        expires_at:      expiresAt      || null,
      };
      const url    = isEdit ? `${API}/api/quotations/${quotation!.id}?tenant=${TENANT}` : `${API}/api/quotations?tenant=${TENANT}`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "Failed"); }
      return r.json();
    },
    onSuccess: (data) => {
      toast.success(isEdit ? "Quotation updated" : "Quotation created");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      onClose();
      return data;
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[520px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b border-border">
          <SheetTitle>{isEdit ? "Edit quotation" : "New quotation"}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Editing ${quotation!.ref}` : "Create a service price estimate"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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

          {/* Estimated hours + Expires at */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estimated hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 2.5"
                value={estimatedHours}
                onChange={e => setEstimatedHours(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valid until</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>

          {/* Tax rate + Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tax rate (%)</Label>
              <Select value={taxRate} onValueChange={setTaxRate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.00">0% (Exempt)</SelectItem>
                  <SelectItem value="5.00">5% (VAT)</SelectItem>
                  <SelectItem value="10.00">10%</SelectItem>
                  <SelectItem value="15.00">15%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Discount (AED)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Customer-visible notes</Label>
            <Textarea
              placeholder="Service description, recommendations, terms…"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Internal note */}
          <div className="space-y-1.5">
            <Label>Internal note <span className="text-muted-foreground font-normal">(not shown to customer)</span></Label>
            <Textarea
              placeholder="Internal workshop notes…"
              rows={2}
              value={internalNote}
              onChange={e => setInternalNote(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create quotation"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
