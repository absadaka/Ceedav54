import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Check, X, Save, Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const API = "/api";

function useAuthHeaders(): Record<string, string> {
  const { user } = useAdminAuth();
  const h: Record<string, string> = {};
  if (user) h["X-Admin-Id"] = user.id;
  return h;
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

type FeatureItem = { id: string; text: string };

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-gray-100 text-gray-700",
  professional: "bg-primary/10 text-primary",
  enterprise: "bg-purple-100 text-purple-700",
};

let _featureIdCounter = 0;
function newFeatureId() {
  _featureIdCounter += 1;
  return `f_${Date.now().toString(36)}_${_featureIdCounter}`;
}

export default function PlansPage() {
  const qc = useQueryClient();
  const authHeaders = useAuthHeaders();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderedPlans, setOrderedPlans] = useState<Plan[]>([]);
  // Snapshot before optimistic reorder, for rollback on save failure
  const previousPlansRef = useRef<Plan[] | null>(null);

  const { data, isLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["admin-plans"],
    queryFn: () =>
      fetch(`${API}/admin/plans`, { headers: authHeaders }).then((r) => r.json()),
  });

  // Sync server data into local state — but never clobber an in-flight optimistic order.
  useEffect(() => {
    if (data?.plans && !reorderMut.isPending) setOrderedPlans(data.plans);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.plans]);

  const reorderMut = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch(`${API}/admin/plans/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ ids: orderedIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Reorder failed (${res.status})`);
      }
      return res.json();
    },
    onError: (err: Error) => {
      // Roll back to the snapshot we captured at drag start.
      if (previousPlansRef.current) setOrderedPlans(previousPlansRef.current);
      toast.error(err.message || "Could not save the new order. Please try again.");
    },
    onSettled: () => {
      previousPlansRef.current = null;
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedPlans.findIndex((p) => p.id === active.id);
    const newIndex = orderedPlans.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(orderedPlans, oldIndex, newIndex);
    previousPlansRef.current = orderedPlans;
    setOrderedPlans(next);
    reorderMut.mutate(next.map((p) => p.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Plans Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage subscription plans and pricing. Drag the grip handle to change the order shown on the public pricing page.
          </p>
        </div>
        {reorderMut.isPending && (
          <span className="text-xs text-muted-foreground">Saving order…</span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedPlans.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {orderedPlans.map((plan) =>
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
                  <SortablePlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => setEditingId(plan.id)}
                    authHeaders={authHeaders}
                    onToggle={() => qc.invalidateQueries({ queryKey: ["admin-plans"] })}
                  />
                )
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Sortable plan card (whole card reorderable)
─────────────────────────────────────────────────────────── */
function SortablePlanCard(props: {
  plan: Plan;
  onEdit: () => void;
  authHeaders: Record<string, string>;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.plan.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PlanCard {...props} dragHandleProps={{ attributes, listeners }} />
    </div>
  );
}

function PlanCard({
  plan,
  onEdit,
  authHeaders,
  onToggle,
  dragHandleProps,
}: {
  plan: Plan;
  onEdit: () => void;
  authHeaders: Record<string, string>;
  onToggle: () => void;
  dragHandleProps?: { attributes: any; listeners: any };
}) {
  const toggleMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      if (!res.ok) throw new Error(`Toggle failed (${res.status})`);
      return res.json();
    },
    onError: (err: Error) => toast.error(err.message),
    onSuccess: onToggle,
  });

  const monthlyPrice = plan.monthly_price ? Number(plan.monthly_price) : null;
  const annualPrice = plan.annual_price ? Number(plan.annual_price) : null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden relative">
      {dragHandleProps && (
        <button
          type="button"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          aria-label="Drag to reorder plan"
          title="Drag to reorder"
          className="absolute top-3 left-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-3 pl-8">
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
        {plan.features.map((f, i) => (
          <div key={`${i}-${f}`} className="flex items-center gap-2 text-sm">
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

/* ───────────────────────────────────────────────────────────
   Edit card with sortable feature list (stable per-row IDs)
─────────────────────────────────────────────────────────── */
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
  const [features, setFeatures] = useState<FeatureItem[]>(() =>
    plan.features.map((text) => ({ id: newFeatureId(), text }))
  );
  const [newFeature, setNewFeature] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          name,
          monthly_price: monthly === "" ? null : Number(monthly),
          annual_price: annual === "" ? null : Number(annual),
          description,
          features: features.map((f) => f.text),
          badge: badge || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Save failed (${res.status})`);
      }
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Could not save plan.");
    } finally {
      setSaving(false);
    }
  }

  function addFeature() {
    const trimmed = newFeature.trim();
    if (!trimmed) return;
    setFeatures([...features, { id: newFeatureId(), text: trimmed }]);
    setNewFeature("");
  }

  function removeFeature(id: string) {
    setFeatures(features.filter((f) => f.id !== id));
  }

  function handleFeatureDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = features.findIndex((f) => f.id === active.id);
    const newIndex = features.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setFeatures(arrayMove(features, oldIndex, newIndex));
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
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Features</label>
          <span className="text-[10px] text-muted-foreground">drag to reorder</span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFeatureDragEnd}>
          <SortableContext items={features.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {features.map((f) => (
                <SortableFeatureRow key={f.id} id={f.id} label={f.text} onRemove={() => removeFeature(f.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

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

function SortableFeatureRow({
  id,
  label,
  onRemove,
}: {
  id: string;
  label: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1.5 text-sm py-1 px-1 -mx-1 rounded hover:bg-muted/40"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag feature"
        className="text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing touch-none p-0.5"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span className="flex-1 text-foreground truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove feature"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
