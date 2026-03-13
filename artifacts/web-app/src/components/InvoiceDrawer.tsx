import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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

export interface InvoiceRow {
  id:          string;
  ref:         string;
  status:      string;
  client_id:   string | null;
  client_name: string | null;
  vehicle_id:  string | null;
  job_id:      string | null;
  tax_rate:    string;
  discount:    string;
  total:       string;
  notes:       string | null;
  due_at:      string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: InvoiceRow | null;
  defaultJobId?: string;
  defaultClientId?: string;
  defaultVehicleId?: string;
  onCreated?: (id: string) => void;
}

export default function InvoiceDrawer({
  open, onOpenChange, invoice, defaultJobId, defaultClientId, defaultVehicleId, onCreated,
}: Props) {
  const qc      = useQueryClient();
  const isEdit  = !!invoice;

  const [clientId,  setClientId]  = useState(defaultClientId ?? "");
  const [vehicleId, setVehicleId] = useState(defaultVehicleId ?? "");
  const [taxRate,   setTaxRate]   = useState("5.00");
  const [discount,  setDiscount]  = useState("0.00");
  const [dueAt,     setDueAt]     = useState("");
  const [notes,     setNotes]     = useState("");

  useEffect(() => {
    if (invoice) {
      setClientId(invoice.client_id ?? "");
      setVehicleId(invoice.vehicle_id ?? "");
      setTaxRate(invoice.tax_rate ?? "5.00");
      setDiscount(invoice.discount ?? "0.00");
      setDueAt(invoice.due_at ? invoice.due_at.split("T")[0] : "");
      setNotes(invoice.notes ?? "");
    } else {
      setClientId(defaultClientId ?? "");
      setVehicleId(defaultVehicleId ?? "");
      setTaxRate("5.00");
      setDiscount("0.00");
      setDueAt("");
      setNotes("");
    }
  }, [invoice, defaultClientId, defaultVehicleId, open]);

  const { data: clientData } = useQuery({
    queryKey: ["clients-simple"],
    queryFn:  () => fetch(`${API}/api/clients?tenant=${TENANT}&limit=200`).then(r => r.json()),
    staleTime: 60_000,
  });
  const clients: Array<{ id: string; name: string; phone: string }> = clientData?.data ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        client_id:  clientId  || null,
        vehicle_id: vehicleId || null,
        job_id:     defaultJobId || null,
        tax_rate:   taxRate,
        discount:   discount,
        due_at:     dueAt || null,
        notes:      notes || null,
      };
      if (isEdit) {
        const r = await fetch(`${API}/api/invoices/${invoice!.id}?tenant=${TENANT}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error("Failed to update invoice");
        return r.json();
      } else {
        const r = await fetch(`${API}/api/invoices?tenant=${TENANT}`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error("Failed to create invoice");
        return r.json();
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", invoice?.id] });
      toast.success(isEdit ? "Invoice updated" : `Invoice ${data.invoice?.ref} created`);
      onCreated?.(data.invoice?.id);
      onOpenChange(false);
    },
    onError: () => toast.error(isEdit ? "Failed to update invoice" : "Failed to create invoice"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle>{isEdit ? `Edit ${invoice!.ref}` : "New invoice"}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— No customer —</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} {c.phone && `· ${c.phone}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tax rate (%)</Label>
              <Input type="number" min="0" max="100" step="0.5" value={taxRate}
                onChange={e => setTaxRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Discount (AED)</Label>
              <Input type="number" min="0" step="0.01" value={discount}
                onChange={e => setDiscount(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea rows={3} placeholder="Terms, notes, payment instructions…" value={notes}
              onChange={e => setNotes(e.target.value)} className="resize-none text-sm" />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
