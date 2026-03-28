import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Mail, MessageSquare, Bell, Phone, CheckCircle2, XCircle } from "lucide-react";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

function Section({ title, description, icon: Icon, badge, children }: {
  title: string; description?: string; icon: React.ElementType; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {badge}
          </div>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> Enabled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
      <XCircle className="w-3 h-3" /> Disabled
    </span>
  );
}

export default function CommsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", TENANT],
    queryFn: () => fetch(`${API}/api/settings?tenant=${TENANT}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const [form, setForm] = useState({
    email_from_name: "",
    email_reply_to: "",
    sms_sender_id: "",
  });

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [waEnabled, setWaEnabled] = useState(false);

  const [notifications, setNotifications] = useState({
    booking_confirmation_email: true,
    booking_confirmation_sms: false,
    booking_confirmation_whatsapp: true,
    job_status_email: true,
    job_status_whatsapp: true,
    invoice_email: true,
    invoice_whatsapp: false,
    quote_email: true,
    quote_whatsapp: true,
    reminder_email: true,
    reminder_sms: false,
  });

  useEffect(() => {
    if (!data?.settings) return;
    const s = data.settings;
    setForm({
      email_from_name: s.email_from_name ?? "",
      email_reply_to:  s.email_reply_to  ?? "",
      sms_sender_id:   s.sms_sender_id   ?? "",
    });
    if (data.integrations?.sms) {
      setSmsEnabled(data.integrations.sms.enabled ?? false);
    }
    if (data.integrations?.whatsapp) {
      setWaEnabled(data.integrations.whatsapp.enabled ?? false);
    }
  }, [data]);

  const commsMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/settings/comms?tenant=${TENANT}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => toast.success("Communication settings saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  const smsMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/settings/integrations/sms?tenant=${TENANT}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: smsEnabled }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      toast.success("SMS settings saved");
      queryClient.invalidateQueries({ queryKey: ["settings", TENANT] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const waMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/settings/integrations/whatsapp?tenant=${TENANT}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: waEnabled }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      toast.success("WhatsApp settings saved");
      queryClient.invalidateQueries({ queryKey: ["settings", TENANT] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAll = () => {
    commsMutation.mutate();
    smsMutation.mutate();
    waMutation.mutate();
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const isSaving = commsMutation.isPending || smsMutation.isPending || waMutation.isPending;

  if (isLoading) {
    return (
        <div className="space-y-5 max-w-2xl">
          <Skeleton className="h-7 w-40" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-lg p-6 space-y-4">
              <Skeleton className="h-4 w-28" />
              {[1, 2].map((j) => <Skeleton key={j} className="h-10" />)}
            </div>
          ))}
        </div>
    );
  }

  return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">Communication setup</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure email, SMS, WhatsApp and notification delivery for your customers.
            </p>
          </div>
          <Button
            size="sm" className="gap-1.5 shrink-0"
            onClick={saveAll} disabled={isSaving}
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {/* Email */}
        <Section title="Email" description="Configure outbound email sender details." icon={Mail}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="from-name">From name</Label>
              <Input
                id="from-name"
                value={form.email_from_name}
                onChange={set("email_from_name")}
                placeholder="Al-Rashidi Auto Services"
              />
              <p className="text-xs text-muted-foreground">Displayed as the sender name in customer emails.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-to">Reply-to address</Label>
              <Input
                id="reply-to"
                type="email"
                value={form.email_reply_to}
                onChange={set("email_reply_to")}
                placeholder="service@workshop.ae"
              />
              <p className="text-xs text-muted-foreground">Customer replies go to this address.</p>
            </div>
          </div>
        </Section>

        {/* SMS */}
        <Section
          title="SMS"
          description="Send SMS notifications to customers. Messages are sent from ceeda>."
          icon={Phone}
          badge={<StatusBadge enabled={smsEnabled} />}
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-foreground">Enable SMS notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Booking confirmations, quotations, and invoices will be sent via SMS to customers who have a phone number.
              </p>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
            />
          </div>
        </Section>

        {/* WhatsApp */}
        <Section
          title="WhatsApp"
          description="Send WhatsApp messages to customers. Messages are sent from ceeda>."
          icon={MessageSquare}
          badge={<StatusBadge enabled={waEnabled} />}
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-foreground">Enable WhatsApp notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Booking confirmations, quotations, and invoices will be sent via WhatsApp to customers who have a phone number.
              </p>
            </div>
            <Switch
              checked={waEnabled}
              onCheckedChange={setWaEnabled}
            />
          </div>
        </Section>

        {/* Notification triggers */}
        <Section title="Notification triggers" description="Which events send automatic messages to customers." icon={Bell}>
          <div className="space-y-1 divide-y divide-border -my-1">
            {[
              {
                category: "Bookings",
                rows: [
                  { key: "booking_confirmation_email",     label: "Booking confirmation",     channel: "Email" },
                  { key: "booking_confirmation_sms",       label: "Booking confirmation",     channel: "SMS" },
                  { key: "booking_confirmation_whatsapp",  label: "Booking confirmation",     channel: "WhatsApp" },
                ],
              },
              {
                category: "Job updates",
                rows: [
                  { key: "job_status_email",     label: "Job status change", channel: "Email" },
                  { key: "job_status_whatsapp",  label: "Job status change", channel: "WhatsApp" },
                ],
              },
              {
                category: "Quotes & Invoices",
                rows: [
                  { key: "quote_email",    label: "Quotation sent",  channel: "Email" },
                  { key: "quote_whatsapp", label: "Quotation sent",  channel: "WhatsApp" },
                  { key: "invoice_email",  label: "Invoice sent",    channel: "Email" },
                  { key: "invoice_whatsapp", label: "Invoice sent",  channel: "WhatsApp" },
                ],
              },
              {
                category: "Reminders",
                rows: [
                  { key: "reminder_email", label: "Service due reminder", channel: "Email" },
                  { key: "reminder_sms",   label: "Service due reminder", channel: "SMS" },
                ],
              },
            ].map(({ category, rows }) => (
              <div key={category} className="py-3 first:pt-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">{category}</p>
                <div className="space-y-2">
                  {rows.map(({ key, label, channel }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70">
                          {channel}
                        </span>
                      </div>
                      <Switch
                        checked={notifications[key as keyof typeof notifications]}
                        onCheckedChange={(v) => setNotifications((p) => ({ ...p, [key]: v }))}
                        className="scale-90"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="flex justify-end">
          <Button className="gap-1.5" onClick={saveAll} disabled={isSaving}>
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
  );
}
