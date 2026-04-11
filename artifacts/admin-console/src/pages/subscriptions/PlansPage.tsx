import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Edit, Check, X, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const API = "/api";

function useAuthHeaders() {
  const { user } = useAdminAuth();
  return user ? { "X-Admin-Id": user.id } : {};
}

type Plan = {
  id: string;
  plan_key: string;
  name: string;
  monthly_price: string | null;
  annual_price: string | null;
  description: string;
  features: string[];
  badge: string | null;
  sort_order: number;
  is_active: boolean;
  tenants: number;
};

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-gray-100 text-gray-700",
  professional: "bg-primary/10 text-primary",
  enterprise: "bg-purple-100 text-purple-700",
};

export default function PlansPage() {
  const qc = useQueryClient();
  const authHeaders = useAuthHeaders();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["admin-plans"],
    queryFn: () =>
      fetch(`${API}/admin/plans`, { headers: authHeaders }).then((r) => r.json()),
  });

  const plans = data?.plans ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Plans Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage subscription plans and pricing. All prices in USD.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) =>
            editingId === plan.id ? (
              <EditPlanCard
                key={plan.id}
                plan={plan}
                authHeaders={authHeaders}
                onDone={() => {
                  setEditingId(null);
                  qc.invalidateQueries({ queryKey: ["admin-plans"] });
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => setEditingId(plan.id)}
                authHeaders={authHeaders}
                onToggle={() => qc.invalidateQueries({ queryKey: ["admin-plans"] })}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onEdit,
  authHeaders,
  onToggle,
}: {
  plan: Plan;
  onEdit: () => void;
  authHeaders: Record<string, string>;
  onToggle: () => void;
}) {
  const toggleMut = useMutation({
    mutationFn: () =>
      fetch(`${API}/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ is_active: !plan.is_active }),
      }).then((r) => r.json()),
    onSuccess: onToggle,
  });

  const monthlyPrice = plan.monthly_price ? Number(plan.monthly_price) : null;
  const annualPrice = plan.annual_price ? Number(plan.annual_price) : null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <Badge
            variant="outline"
            className={cn("text-xs font-semibold capitalize", PLAN_COLORS[plan.plan_key] ?? "bg-gray-100 text-gray-700")}
          >
            {plan.name}
          </Badge>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={plan.is_active}
              onCheckedChange={() => toggleMut.mutate()}
            />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          {monthlyPrice !== null ? (
            <>
              <span className="text-3xl font-bold text-foreground tabular-nums">${monthlyPrice}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </>
          ) : (
            <span className="text-3xl font-bold text-foreground">Custom</span>
          )}
        </div>
        {annualPrice !== null && (
          <p className="text-xs text-muted-foreground mt-1">${annualPrice}/mo billed annually</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {plan.tenants} active tenant{plan.tenants !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="p-5 space-y-2.5">
        {plan.features.map((f) => (
          <div key={f} className="flex items-center gap-2 text-sm">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-foreground">{f}</span>
          </div>
        ))}
      </div>
      <div className="px-5 pb-4">
        <Button size="sm" variant="outline" className="w-full gap-1" onClick={onEdit}>
          <Edit className="w-3 h-3" />
          Edit plan
        </Button>
      </div>
    </div>
  );
}

function EditPlanCard({
  plan,
  authHeaders,
  onDone,
  onCancel,
}: {
  plan: Plan;
  authHeaders: Record<string, string>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [monthly, setMonthly] = useState(plan.monthly_price ?? "");
  const [annual, setAnnual] = useState(plan.annual_price ?? "");
  const [description, setDescription] = useState(plan.description);
  const [badge, setBadge] = useState(plan.badge ?? "");
  const [features, setFeatures] = useState(plan.features);
  const [newFeature, setNewFeature] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`${API}/admin/plans/${plan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        name,
        monthly_price: monthly === "" ? null : Number(monthly),
        annual_price: annual === "" ? null : Number(annual),
        description,
        features,
        badge: badge || null,
      }),
    });
    setSaving(false);
    onDone();
  }

  function addFeature() {
    const trimmed = newFeature.trim();
    if (trimmed && !features.includes(trimmed)) {
      setFeatures([...features, trimmed]);
      setNewFeature("");
    }
  }

  function removeFeature(idx: number) {
    setFeatures(features.filter((_, i) => i !== idx));
  }

  return (
    <div className="bg-card border-2 border-primary rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-xs font-semibold capitalize", PLAN_COLORS[plan.plan_key])}>
            {plan.plan_key}
          </Badge>
          <span className="text-[10px] text-primary font-medium">Editing</span>
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-8 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Monthly ($)</label>
            <Input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              placeholder="Custom"
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Annual ($)</label>
            <Input
              type="number"
              value={annual}
              onChange={(e) => setAnnual(e.target.value)}
              placeholder="Custom"
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 text-sm resize-none" />
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Badge</label>
          <Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="e.g. Most popular" className="mt-1 h-8 text-sm" />
        </div>
      </div>

      <div className="p-5 space-y-2">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Features</label>
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="flex-1 text-foreground">{f}</span>
            <button onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-1.5 mt-1">
          <Input
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            placeholder="Add feature…"
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => e.key === "Enter" && addFeature()}
          />
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={addFeature}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-2">
        <Button size="sm" className="flex-1 gap-1" onClick={handleSave} disabled={saving}>
          <Save className="w-3 h-3" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
