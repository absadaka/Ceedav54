import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";

export interface ClientRow {
  id: string;
  type: "individual" | "company";
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  id_number?: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  client?: ClientRow | null;
  onSuccess?: () => void;
}

interface FormState {
  type: "individual" | "company";
  name: string; company: string; phone: string;
  email: string; whatsapp: string; id_number: string; notes: string;
}

const EMPTY: FormState = {
  type: "individual", name: "", company: "", phone: "",
  email: "", whatsapp: "", id_number: "", notes: "",
};

function toForm(c: ClientRow): FormState {
  return {
    type:      c.type,
    name:      c.name,
    company:   c.company   ?? "",
    phone:     c.phone     ?? "",
    email:     c.email     ?? "",
    whatsapp:  c.whatsapp  ?? "",
    id_number: (c as ClientRow & { id_number?: string | null }).id_number ?? "",
    notes:     c.notes     ?? "",
  };
}

export default function CustomerDrawer({ open, onClose, client, onSuccess }: Props) {
  const qc     = useQueryClient();
  const isEdit = Boolean(client);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [err,  setErr]  = useState<string | null>(null);

  useEffect(() => {
    if (open) { setErr(null); setForm(client ? toForm(client) : EMPTY); }
  }, [open, client]);

  const field =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isEdit
        ? `/api/clients/${client!.id}?tenant=${TENANT}`
        : `/api/clients?tenant=${TENANT}`;
      const res = await fetch(url, {
        method:  isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Request failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client"] });
      onSuccess?.();
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Name is required"); return; }
    setErr(null);
    mutation.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? "Edit customer" : "New customer"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update the customer's contact details." : "Add a new customer to your CRM."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="space-y-5">
          {/* Type toggle */}
          <div className="space-y-1.5">
            <Label>Account type</Label>
            <div className="flex gap-2">
              {(["individual", "company"] as const).map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={cn(
                    "flex-1 py-2 rounded-md border text-sm font-medium transition-colors",
                    form.type === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted text-muted-foreground",
                  )}
                >
                  {t === "individual" ? "Individual" : "Company"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cn">Full name <span className="text-destructive">*</span></Label>
            <Input id="cn" value={form.name} onChange={field("name")} placeholder="Ahmed Al-Mansoori" />
          </div>

          {form.type === "company" && (
            <div className="space-y-1.5">
              <Label htmlFor="cc">Company name</Label>
              <Input id="cc" value={form.company} onChange={field("company")} placeholder="Gulf Motors LLC" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cph">Phone</Label>
              <Input id="cph" value={form.phone} onChange={field("phone")} placeholder="+971 50 000 0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cwa">WhatsApp</Label>
              <Input id="cwa" value={form.whatsapp} onChange={field("whatsapp")} placeholder="+971 50 000 0000" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cem">Email</Label>
            <Input id="cem" type="email" value={form.email} onChange={field("email")} placeholder="ahmed@example.com" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cid">Emirates ID / Passport</Label>
            <Input id="cid" value={form.id_number} onChange={field("id_number")} placeholder="784-XXXX-XXXXXXX-X" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cnotes">Notes</Label>
            <Textarea id="cnotes" value={form.notes} onChange={field("notes")} rows={3} placeholder="Any notes about this customer…" />
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create customer"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
