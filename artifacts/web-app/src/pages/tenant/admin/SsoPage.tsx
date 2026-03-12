import { useState } from "react";
import { Building2, CheckCircle2, AlertCircle, ChevronDown, Copy, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { id: "entra", name: "Microsoft Entra ID", logo: "🔷" },
  { id: "okta", name: "Okta", logo: "🔵" },
  { id: "google", name: "Google Workspace", logo: "🔴" },
  { id: "saml", name: "Generic SAML 2.0", logo: "🔑" },
];

const SP_DETAILS = {
  entityId: "https://app.ceeda.io/saml/demo-workshop/metadata",
  acsUrl: "https://app.ceeda.io/saml/demo-workshop/acs",
  metadataUrl: "https://app.ceeda.io/saml/demo-workshop/metadata.xml",
  sloUrl: "https://app.ceeda.io/saml/demo-workshop/slo",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input value={value} readOnly className="font-mono text-xs bg-muted text-muted-foreground" />
        <Button variant="outline" size="icon" className="w-8 h-8 shrink-0" onClick={copy}>
          {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function AdminSsoPage() {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState("entra");
  const [entityId, setEntityId] = useState("");
  const [ssoUrl, setSsoUrl] = useState("");
  const [cert, setCert] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleTest = async () => {
    setTestStatus("testing");
    await new Promise((r) => setTimeout(r, 1500));
    setTestStatus(entityId && ssoUrl ? "ok" : "fail");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Single Sign-On (SSO)</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure SAML 2.0 SSO to let your team sign in with your identity provider.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-start justify-between gap-4 p-4 bg-background border border-border rounded-lg">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Enable SSO</p>
          <p className="text-xs text-muted-foreground">
            Once enabled, team members will be directed to your identity provider.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {!enabled && (
        <div className="bg-muted/40 border border-border rounded-lg px-4 py-8 text-center">
          <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">SSO is disabled</p>
          <p className="text-xs text-muted-foreground">Enable SSO above to configure your identity provider.</p>
        </div>
      )}

      {enabled && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Provider selection */}
          <div className="space-y-3">
            <Label>Identity provider</Label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button key={p.id} type="button" onClick={() => setProvider(p.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                    provider === p.id ? "border-primary bg-accent/40 ring-1 ring-primary/30" : "border-border hover:bg-muted/30"
                  )}>
                  <span className="text-xl">{p.logo}</span>
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Service Provider details (readonly) */}
          <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Your service provider details</p>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Copy these values into your identity provider's SAML application.
            </p>
            <CopyField label="Entity ID (Audience URI)" value={SP_DETAILS.entityId} />
            <CopyField label="ACS URL (Reply URL)" value={SP_DETAILS.acsUrl} />
            <CopyField label="Metadata URL" value={SP_DETAILS.metadataUrl} />
            <Button type="button" variant="outline" size="sm" className="gap-2 text-xs" asChild>
              <a href={SP_DETAILS.metadataUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" /> Download metadata XML
              </a>
            </Button>
          </div>

          {/* IdP configuration */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Identity provider configuration</p>
            <div className="space-y-1.5">
              <Label htmlFor="idp-entity">IdP Entity ID</Label>
              <Input id="idp-entity" placeholder="https://login.microsoftonline.com/…"
                value={entityId} onChange={(e) => setEntityId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idp-sso">SSO URL (SAML endpoint)</Label>
              <Input id="idp-sso" placeholder="https://login.microsoftonline.com/…/saml2"
                value={ssoUrl} onChange={(e) => setSsoUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idp-cert">X.509 Certificate</Label>
              <Textarea id="idp-cert"
                placeholder="-----BEGIN CERTIFICATE-----&#10;MIIEADCCAuigAwIBAgIJA...&#10;-----END CERTIFICATE-----"
                rows={5} className="font-mono text-xs" value={cert} onChange={(e) => setCert(e.target.value)} />
            </div>
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={handleTest} disabled={testStatus === "testing"}>
              {testStatus === "testing" ? "Testing…" : "Test connection"}
            </Button>
            {testStatus === "ok" && (
              <span className="flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4" /> Connected successfully
              </span>
            )}
            {testStatus === "fail" && (
              <span className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" /> Connection failed — check your configuration
              </span>
            )}
          </div>

          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? "Saving…" : saved ? "Saved!" : "Save configuration"}
            {saved && <CheckCircle2 className="w-4 h-4" />}
          </Button>
        </form>
      )}
    </div>
  );
}
