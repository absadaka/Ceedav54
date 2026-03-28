import { useState } from "react";
import { Package, Plus, Edit, Trash2, Check, X, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    interval: "month",
    active: true,
    features: ["1 workshop", "Up to 3 team members", "Basic reports", "Email support"],
    tenants: 12,
    color: "bg-gray-100 text-gray-700",
  },
  {
    id: "professional",
    name: "Professional",
    price: 149,
    interval: "month",
    active: true,
    features: ["1 workshop", "Unlimited team", "Advanced reports", "WhatsApp integration", "Priority support"],
    tenants: 8,
    color: "bg-primary/10 text-primary",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    interval: "month",
    active: true,
    features: ["Multi-branch", "Unlimited everything", "SSO / SAML", "Custom integrations", "Dedicated support", "SLA guarantee"],
    tenants: 3,
    color: "bg-purple-100 text-purple-700",
  },
];

export default function PlansPage() {
  const [plans] = useState(PLANS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Plans Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage subscription plans and pricing.</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />Add Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map(plan => (
          <div key={plan.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className={cn("text-xs font-semibold capitalize", plan.color)}>{plan.name}</Badge>
                <div className="flex items-center gap-1.5">
                  <Switch checked={plan.active} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground tabular-nums">AED {plan.price}</span>
                {plan.price > 0 && <span className="text-sm text-muted-foreground">/{plan.interval}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{plan.tenants} active tenant{plan.tenants !== 1 ? "s" : ""}</p>
            </div>
            <div className="p-5 space-y-2.5">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1"><Edit className="w-3 h-3" />Edit</Button>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
