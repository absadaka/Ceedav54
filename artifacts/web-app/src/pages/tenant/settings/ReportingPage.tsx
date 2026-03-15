import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, BarChart2, Calendar } from "lucide-react";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const MONTHS = [
  { value: "01-01", label: "January 1" },
  { value: "02-01", label: "February 1" },
  { value: "03-01", label: "March 1" },
  { value: "04-01", label: "April 1" },
  { value: "05-01", label: "May 1" },
  { value: "06-01", label: "June 1" },
  { value: "07-01", label: "July 1" },
  { value: "08-01", label: "August 1" },
  { value: "09-01", label: "September 1" },
  { value: "10-01", label: "October 1" },
  { value: "11-01", label: "November 1" },
  { value: "12-01", label: "December 1" },
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

export default function ReportingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings", TENANT],
    queryFn: () => fetch(`${API}/api/settings?tenant=${TENANT}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const [form, setForm] = useState({ fiscal_year_start: "01-01" });

  useEffect(() => {
    if (!data?.settings) return;
    setForm({ fiscal_year_start: data.settings.fiscal_year_start ?? "01-01" });
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/settings/reporting?tenant=${TENANT}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => toast.success("Reporting settings saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (

        <div className="space-y-5 max-w-2xl">
          <Skeleton className="h-7 w-32" />
          <div className="border border-border rounded-lg p-6 space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-64" />
          </div>
        </div>

    );
  }

  return (

      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">Reporting</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure fiscal year, periods and report preferences.
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

        <Section title="Fiscal year" description="Determines the start of your financial year for reports and dashboards.">
          <div className="space-y-1.5">
            <Label>Fiscal year starts on</Label>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select
                value={form.fiscal_year_start}
                onValueChange={(v) => setForm((p) => ({ ...p, fiscal_year_start: v }))}
              >
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Affects revenue summaries, tax reporting periods, and dashboard date ranges.
            </p>
          </div>
        </Section>

        <Section title="Dashboard widgets" description="Choose which metrics appear on your dashboard overview.">
          <div className="space-y-3">
            {[
              { label: "Revenue by month",       hint: "Bar chart showing monthly invoice totals" },
              { label: "Top services",            hint: "Most billed services this period" },
              { label: "Technician performance",  hint: "Jobs completed per technician" },
              { label: "Customer retention",      hint: "Returning vs new customer ratio" },
            ].map(({ label, hint }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded border border-border">
                  Coming soon
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Exports" description="Configure scheduled report exports via email.">
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
            <BarChart2 className="w-5 h-5 text-muted-foreground/50 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Scheduled exports</p>
              <p className="text-xs text-muted-foreground">
                Automatically email reports on a schedule. Available on Professional and Enterprise plans.
              </p>
            </div>
            <Button size="sm" variant="outline" className="ml-auto shrink-0" disabled>
              Configure
            </Button>
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
