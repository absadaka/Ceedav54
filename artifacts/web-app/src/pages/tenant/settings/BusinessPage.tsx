import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Upload, Save, Globe, Phone, Mail, MapPin, Building2, Instagram, Facebook, Twitter, Linkedin, Youtube } from "lucide-react";
import SettingsLayout from "@/layouts/SettingsLayout";
import { cn } from "@/lib/utils";

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const TIMEZONES = [
  "Asia/Dubai", "Asia/Riyadh", "Asia/Kuwait", "Asia/Bahrain", "Asia/Qatar",
  "Asia/Muscat", "Africa/Cairo", "Europe/London", "America/New_York",
];
const CURRENCIES = ["AED", "SAR", "KWD", "BHD", "QAR", "OMR", "EGP", "USD", "EUR", "GBP"];
const COUNTRIES  = [
  "United Arab Emirates", "Saudi Arabia", "Kuwait", "Bahrain", "Qatar",
  "Oman", "Egypt", "Jordan", "Lebanon", "Morocco", "United Kingdom", "United States",
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
      <div className="p-6">{children}</div>
    </div>
  );
}

function FieldGroup({ children, cols = 1 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={cn(
      "grid gap-4",
      cols === 2 && "sm:grid-cols-2",
      cols === 3 && "sm:grid-cols-3",
    )}>
      {children}
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function BusinessPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings", TENANT],
    queryFn: () => fetch(`${API}/api/settings?tenant=${TENANT}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", country: "United Arab Emirates",
    currency: "AED", timezone: "Asia/Dubai", locale: "en",
    vat_number: "", website: "", maps_url: "",
    social_instagram: "", social_facebook: "", social_twitter: "",
    social_linkedin: "", social_tiktok: "", social_youtube: "",
  });

  useEffect(() => {
    if (!data) return;
    const { tenant, settings } = data;
    setForm({
      name:      tenant?.name        ?? "",
      phone:     tenant?.phone       ?? "",
      email:     tenant?.email       ?? "",
      address:   tenant?.address     ?? "",
      country:   tenant?.country     ?? "United Arab Emirates",
      currency:  tenant?.currency    ?? "AED",
      timezone:  tenant?.timezone    ?? "Asia/Dubai",
      locale:    tenant?.locale      ?? "en",
      vat_number: tenant?.vat_number ?? "",
      website:   settings?.website   ?? "",
      maps_url:  settings?.maps_url  ?? "",
      social_instagram: settings?.social_instagram ?? "",
      social_facebook:  settings?.social_facebook  ?? "",
      social_twitter:   settings?.social_twitter   ?? "",
      social_linkedin:  settings?.social_linkedin  ?? "",
      social_tiktok:    settings?.social_tiktok    ?? "",
      social_youtube:   settings?.social_youtube   ?? "",
    });
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/settings/business?tenant=${TENANT}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => toast.success("Business profile saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="space-y-5 max-w-2xl">
          <Skeleton className="h-7 w-40" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-lg p-6 space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-9" />)}
              </div>
            </div>
          ))}
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">Business profile</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your workshop's identity, contact details and social presence.
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

        {/* Logo */}
        <Section title="Logo" description="Shown on invoices, quotes and customer-facing documents.">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center shrink-0">
              {data?.tenant?.logo_url
                ? <img src={data.tenant.logo_url} alt="logo" className="w-full h-full object-contain rounded-lg" />
                : <Building2 className="w-7 h-7 text-muted-foreground/30" />
              }
            </div>
            <div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Upload className="w-3.5 h-3.5" />Upload logo
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">PNG or SVG, max 2 MB. Recommended 512×512 px.</p>
            </div>
          </div>
        </Section>

        {/* Identity */}
        <Section title="Business identity">
          <div className="space-y-4">
            <Field label="Workshop name" required>
              <Input value={form.name} onChange={set("name")} placeholder="Al-Rashidi Auto Services" />
            </Field>
            <FieldGroup cols={2}>
              <Field label="Country">
                <Select value={form.country} onValueChange={(v) => setForm((p) => ({ ...p, country: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="VAT / Tax number">
                <Input value={form.vat_number} onChange={set("vat_number")} placeholder="TRN123456789" />
              </Field>
              <Field label="Currency">
                <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Timezone">
                <Select value={form.timezone} onValueChange={(v) => setForm((p) => ({ ...p, timezone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact information">
          <div className="space-y-4">
            <FieldGroup cols={2}>
              <Field label="Phone number">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input className="pl-9" value={form.phone} onChange={set("phone")} placeholder="+971 4 XXX XXXX" type="tel" />
                </div>
              </Field>
              <Field label="Email address">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input className="pl-9" value={form.email} onChange={set("email")} placeholder="info@workshop.ae" type="email" />
                </div>
              </Field>
            </FieldGroup>
            <Field label="Website">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input className="pl-9" value={form.website} onChange={set("website")} placeholder="https://workshop.ae" type="url" />
              </div>
            </Field>
            <Field label="Address">
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Textarea className="pl-9 resize-none" rows={2} value={form.address} onChange={set("address")} placeholder="Al Quoz Industrial Area 3, Dubai, UAE" />
              </div>
            </Field>
            <Field label="Google Maps link" hint="Paste the share link from Google Maps to show your location to customers.">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input className="pl-9" value={form.maps_url} onChange={set("maps_url")} placeholder="https://maps.app.goo.gl/..." />
              </div>
            </Field>
          </div>
        </Section>

        {/* Social */}
        <Section title="Social media" description="Links shown on your public profile and customer-facing pages.">
          <div className="space-y-3">
            {[
              { key: "social_instagram", label: "Instagram", icon: Instagram,  placeholder: "https://instagram.com/yourworkshop" },
              { key: "social_facebook",  label: "Facebook",  icon: Facebook,   placeholder: "https://facebook.com/yourworkshop" },
              { key: "social_tiktok",    label: "TikTok",    icon: null,       placeholder: "https://tiktok.com/@yourworkshop" },
              { key: "social_twitter",   label: "X / Twitter", icon: Twitter, placeholder: "https://x.com/yourworkshop" },
              { key: "social_linkedin",  label: "LinkedIn",  icon: Linkedin,   placeholder: "https://linkedin.com/company/yourworkshop" },
              { key: "social_youtube",   label: "YouTube",   icon: Youtube,    placeholder: "https://youtube.com/@yourworkshop" },
            ].map(({ key, label, icon: Icon, placeholder }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <Input
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </Section>

        <div className="flex justify-end pt-2">
          <Button className="gap-1.5" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Save className="w-3.5 h-3.5" />
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </SettingsLayout>
  );
}
