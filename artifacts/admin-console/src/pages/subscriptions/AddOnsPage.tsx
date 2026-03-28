import { useState } from "react";
import { Puzzle, Plus, Edit, ToggleLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const ADDONS = [
  { id: "1", name: "WhatsApp Integration", description: "Send booking confirmations and updates via WhatsApp Business API.", price: 49, interval: "month", active: true, subscribers: 5, plans: ["professional", "enterprise"] },
  { id: "2", name: "SMS Pack (500)", description: "500 outbound SMS messages per month for appointment reminders.", price: 29, interval: "month", active: true, subscribers: 8, plans: ["starter", "professional", "enterprise"] },
  { id: "3", name: "Multi-Branch", description: "Add additional workshop branches under a single tenant account.", price: 99, interval: "month/branch", active: true, subscribers: 2, plans: ["enterprise"] },
  { id: "4", name: "Advanced Reporting", description: "Custom dashboards, scheduled reports, and data exports.", price: 39, interval: "month", active: true, subscribers: 4, plans: ["professional", "enterprise"] },
  { id: "5", name: "Priority Support", description: "Dedicated support channel with 2-hour response SLA.", price: 79, interval: "month", active: false, subscribers: 0, plans: ["professional", "enterprise"] },
  { id: "6", name: "API Access", description: "REST API access for custom integrations and data sync.", price: 59, interval: "month", active: true, subscribers: 3, plans: ["enterprise"] },
];

export default function AddOnsPage() {
  const [addons] = useState(ADDONS);
  const totalRevenue = addons.filter(a => a.active).reduce((s, a) => s + a.price * a.subscribers, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Add-Ons</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage optional add-on products for subscription plans.</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />Create Add-On
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Add-Ons</p>
          <p className="text-2xl font-semibold mt-1">{addons.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Subscriptions</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600">{addons.reduce((s, a) => s + a.subscribers, 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add-On MRR</p>
          <p className="text-2xl font-semibold mt-1">AED {totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addons.map(addon => (
          <div key={addon.id} className={cn(
            "bg-card border rounded-lg p-5",
            addon.active ? "border-border" : "border-border opacity-60"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Puzzle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{addon.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {addon.plans.map(p => (
                      <Badge key={p} variant="outline" className="text-[9px] capitalize">{p}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Switch checked={addon.active} />
            </div>
            <p className="text-sm text-muted-foreground mb-3">{addon.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-foreground tabular-nums">AED {addon.price}</span>
                <span className="text-xs text-muted-foreground">/{addon.interval}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {addon.subscribers} subscriber{addon.subscribers !== 1 ? "s" : ""}
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Edit className="w-3 h-3" />Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
