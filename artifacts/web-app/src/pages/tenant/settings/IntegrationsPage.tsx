import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CreditCard, MessageSquare, Phone, ChevronRight,
  CheckCircle2, AlertCircle, ExternalLink, Plug2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Integration definitions ────────────────────────────────────────────── */

interface IntegrationDef {
  type: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  docsUrl: string;
  fields: { key: string; label: string; type?: string; placeholder: string; hint?: string }[];
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    type: "stripe",
    name: "Stripe",
    tagline: "Accept online payments",
    description:
      "Connect Stripe to send payment links directly to customers and collect online payments for invoices.",
    icon: CreditCard,
    iconBg: "bg-[#635BFF]/10 text-[#635BFF]",
    docsUrl: "https://stripe.com/docs",
    fields: [
      {
        key: "publishable_key",
        label: "Publishable key",
        placeholder: "pk_live_…",
        hint: "Found in your Stripe dashboard → API keys.",
      },
      {
        key: "secret_key",
        label: "Secret key",
        type: "password",
        placeholder: "sk_live_…",
        hint: "Keep this secret. Never share it publicly.",
      },
      {
        key: "webhook_secret",
        label: "Webhook signing secret",
        type: "password",
        placeholder: "whsec_…",
        hint: "Add endpoint: https://your-domain/api/webhooks/stripe",
      },
    ],
  },
  {
    type: "whatsapp",
    name: "WhatsApp Business",
    tagline: "Message customers on WhatsApp",
    description:
      "Use the WhatsApp Business API to send booking confirmations, job updates, invoices and custom messages.",
    icon: MessageSquare,
    iconBg: "bg-[#25D366]/10 text-[#25D366]",
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
    fields: [
      {
        key: "phone_number_id",
        label: "Phone number ID",
        placeholder: "12345678901234",
        hint: "From WhatsApp Business API → Phone numbers.",
      },
      {
        key: "access_token",
        label: "Permanent access token",
        type: "password",
        placeholder: "EAAxxxxxxxx…",
        hint: "Generate a long-lived token in Meta Business Manager.",
      },
      {
        key: "waba_id",
        label: "WhatsApp Business Account ID",
        placeholder: "98765432109876",
      },
    ],
  },
  {
    type: "sms",
    name: "SMS (Twilio)",
    tagline: "Send SMS notifications",
    description:
      "Use Twilio to send SMS booking reminders, status updates and service due alerts to customers.",
    icon: Phone,
    iconBg: "bg-[#F22F46]/10 text-[#F22F46]",
    docsUrl: "https://www.twilio.com/docs/sms",
    fields: [
      {
        key: "account_sid",
        label: "Account SID",
        placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        hint: "From Twilio Console → Account info.",
      },
      {
        key: "auth_token",
        label: "Auth token",
        type: "password",
        placeholder: "your_auth_token",
      },
      {
        key: "from_number",
        label: "From number",
        placeholder: "+971xxxxxxxxx",
        hint: "Your Twilio phone number.",
      },
    ],
  },
];

/* ─── Config dialog ────────────────────────────────────────────────────────── */

function ConfigDialog({
  intg, open, onClose, currentConfig,
}: {
  intg: IntegrationDef; open: boolean; onClose: () => void;
  currentConfig: Record<string, string>;
}) {
  const qc = useQueryClient();
  const [fields, setFields] = useState<Record<string, string>>(() =>
    intg.fields.reduce((acc, f) => ({ ...acc, [f.key]: currentConfig[f.key] ?? "" }), {}),
  );
  const [enabled, setEnabled] = useState(Boolean(currentConfig?.enabled ?? false));

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/settings/integrations/${intg.type}?tenant=${TENANT}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, config: fields }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", TENANT] });
      toast.success(`${intg.name} settings saved`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", intg.iconBg)}>
              <intg.icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <DialogTitle>{intg.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">{intg.tagline}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Enable toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium">Enable {intg.name}</p>
              <p className="text-xs text-muted-foreground">Turn on to activate this integration.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Fields */}
          {intg.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input
                type={f.type ?? "text"}
                value={fields[f.key] ?? ""}
                onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
              {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
            </div>
          ))}

          <a
            href={intg.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />View {intg.name} documentation
          </a>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Integration card ────────────────────────────────────────────────────── */

function IntegrationCard({
  intg, config, onConfigure,
}: {
  intg: IntegrationDef;
  config: Record<string, string> & { enabled?: boolean };
  onConfigure: () => void;
}) {
  const isConnected = Boolean(config?.enabled);
  const hasFields = intg.fields.some((f) => Boolean(config?.[f.key]));

  return (
    <div className={cn(
      "bg-background border rounded-lg p-5 flex items-start gap-4 transition-colors",
      isConnected ? "border-emerald-200" : "border-border",
    )}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", intg.iconBg)}>
        <intg.icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{intg.name}</p>
          {isConnected ? (
            <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-0.5" />Connected
            </Badge>
          ) : hasFields ? (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">
              <AlertCircle className="w-3 h-3 mr-0.5" />Configured (disabled)
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{intg.tagline}</p>
        <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2">{intg.description}</p>
      </div>

      <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={onConfigure}>
        {isConnected || hasFields ? "Configure" : "Set up"}
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function IntegrationsPage() {
  const [configuring, setConfiguring] = useState<IntegrationDef | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["settings", TENANT],
    queryFn: () => fetch(`${API}/api/settings?tenant=${TENANT}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const integrations: Record<string, Record<string, string> & { enabled?: boolean }> =
    data?.integrations ?? {};

  const connectedCount = INTEGRATIONS.filter((i) => integrations[i.type]?.enabled).length;

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect third-party services to extend your workshop platform.
          </p>
        </div>

        {/* Status strip */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Plug2 className="w-4 h-4" />
          <span>
            {connectedCount} of {INTEGRATIONS.length} integration{INTEGRATIONS.length !== 1 ? "s" : ""} connected
          </span>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded-lg p-5 flex items-start gap-4">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-8 w-20 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {INTEGRATIONS.map((intg) => (
              <IntegrationCard
                key={intg.type}
                intg={intg}
                config={integrations[intg.type] ?? {}}
                onConfigure={() => setConfiguring(intg)}
              />
            ))}
          </div>
        )}

        {/* Coming soon */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Coming soon
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              "Google Calendar",
              "Xero / QuickBooks",
              "Parts supplier EDI",
              "Vehicle history lookup",
            ].map((name) => (
              <div
                key={name}
                className="border border-dashed border-border rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground/60"
              >
                <Plug2 className="w-3.5 h-3.5 shrink-0" />
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {configuring && (
        <ConfigDialog
          intg={configuring}
          open={true}
          onClose={() => setConfiguring(null)}
          currentConfig={integrations[configuring.type] ?? {}}
        />
      )}
    </>
  );
}
