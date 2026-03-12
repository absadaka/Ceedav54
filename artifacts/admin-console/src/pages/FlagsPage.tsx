import { Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const demoFlags = [
  { key: "whatsapp_integration", label: "WhatsApp Integration", description: "Enable WhatsApp Cloud API notifications", enabled: false, env: "all" },
  { key: "online_payments",      label: "Online Payments",       description: "Stripe payment links on invoices",          enabled: false, env: "all" },
  { key: "ai_service_suggest",   label: "AI Service Suggestions",description: "GPT-powered service recommendation engine",  enabled: false, env: "staging" },
  { key: "multi_location",       label: "Multi-location Support", description: "Multiple workshop branches per account",    enabled: false, env: "all" },
];

export default function FlagsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Feature Flags</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control platform-wide feature availability.</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> New flag
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {demoFlags.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Flag className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{flag.label}</p>
                  <Badge variant="outline" className="text-[10px]">{flag.env}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{flag.description}</p>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{flag.key}</p>
              </div>
            </div>
            <Switch checked={flag.enabled} aria-label={`Toggle ${flag.label}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
