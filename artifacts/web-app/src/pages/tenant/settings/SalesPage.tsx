import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const PAYMENT_TERMS = [
  "Due on receipt",
  "Net 7 days",
  "Net 15 days",
  "Net 30 days",
  "Net 45 days",
  "Net 60 days",
];

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function Row({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1 min-w-0">
        <Label>{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SalesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings", TENANT],
    queryFn: () => fetch(`${API}/api/settings?tenant=${TENANT}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const [form, setForm] = useState({
    default_tax_pct: "5.00",
    invoice_notes: "",
    quote_validity_days: "7",
    payment_terms: "Due on receipt",
    auto_invoice: false,
    show_cost_on_quote: false,
  });

  useEffect(() => {
    if (!data?.settings) return;
    const s = data.settings;
    setForm({
      default_tax_pct:     s.default_tax_pct     ?? "5.00",
      invoice_notes:       s.invoice_notes        ?? "",
      quote_validity_days: String(s.quote_validity_days ?? 7),
      payment_terms:       s.payment_terms        ?? "Due on receipt",
      auto_invoice:        s.auto_invoice         ?? false,
      show_cost_on_quote:  s.show_cost_on_quote   ?? false,
    });
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/settings/sales?tenant=${TENANT}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        quote_validity_days: parseInt(form.quote_validity_days),
      }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => toast.success("Sales settings saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (

        <div className="space-y-5 max-w-2xl">
          <Skeleton className="h-7 w-32" />
          {[1, 2].map((i) => (
            <div key={i} className="border border-border rounded-lg p-6 space-y-4">
              <Skeleton className="h-4 w-28" />
              {[1, 2, 3].map((j) => <Skeleton key={j} className="h-10" />)}
            </div>
          ))}
        </div>

    );
  }

  return (

      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">Sales settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tax rates, invoicing defaults and quotation settings.
            </p>
          </div>
          <Button
            size="sm" className="gap-1.5 shrink-0"
            onClick={() => mutation.mutate()} disabled={mutation.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <Section title="Tax & pricing">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tax-pct">Default VAT rate (%)</Label>
              <Input
                id="tax-pct"
                type="number" min="0" max="100" step="0.5"
                value={form.default_tax_pct}
                onChange={(e) => setForm((p) => ({ ...p, default_tax_pct: e.target.value }))}
                placeholder="5.00"
              />
              <p className="text-xs text-muted-foreground">Applied to taxable line items on quotes and invoices.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validity">Quote validity (days)</Label>
              <Input
                id="validity"
                type="number" min="1" max="365"
                value={form.quote_validity_days}
                onChange={(e) => setForm((p) => ({ ...p, quote_validity_days: e.target.value }))}
                placeholder="7"
              />
              <p className="text-xs text-muted-foreground">How long a quotation is valid after being sent.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Default payment terms</Label>
            <Select value={form.payment_terms} onValueChange={(v) => setForm((p) => ({ ...p, payment_terms: v }))}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title="Invoicing">
          <Row
            label="Auto-create invoice when job is completed"
            description="Automatically generate a draft invoice when a job card status changes to Completed."
          >
            <Switch
              checked={form.auto_invoice}
              onCheckedChange={(v) => setForm((p) => ({ ...p, auto_invoice: v }))}
            />
          </Row>
          <Row
            label="Show cost price on quotations"
            description="Display internal cost prices on quotation PDFs sent to customers."
          >
            <Switch
              checked={form.show_cost_on_quote}
              onCheckedChange={(v) => setForm((p) => ({ ...p, show_cost_on_quote: v }))}
            />
          </Row>
          <div className="space-y-1.5">
            <Label htmlFor="inv-notes">Default invoice notes</Label>
            <Textarea
              id="inv-notes"
              rows={3}
              className="resize-none"
              value={form.invoice_notes}
              onChange={(e) => setForm((p) => ({ ...p, invoice_notes: e.target.value }))}
              placeholder="Thank you for your business. All payments are due within 30 days."
            />
            <p className="text-xs text-muted-foreground">Printed at the bottom of every invoice.</p>
          </div>
        </Section>

        <div className="flex justify-end">
          <Button className="gap-1.5" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Save className="w-3.5 h-3.5" />
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

  );
}
