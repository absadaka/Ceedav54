import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Flag, Plus, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api";

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  rollout_pct: string;
  created_at: string;
  updated_at: string;
}

function ToggleConfirmDialog({ flag, open, onClose }: {
  flag: FeatureFlag; open: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/admin/flags/${flag.key}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !flag.enabled }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-flags"] });
      toast.success(`${flag.label} ${!flag.enabled ? "enabled" : "disabled"}`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const action = flag.enabled ? "Disable" : "Enable";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle>{action} {flag.label}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <div className={cn(
            "flex items-start gap-3 p-3.5 rounded-lg border text-sm",
            flag.enabled
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800",
          )}>
            {flag.enabled
              ? <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            }
            <div>
              <p className="font-medium">{action} <span className="font-mono text-xs">{flag.key}</span></p>
              {flag.enabled
                ? <p className="text-xs mt-0.5">This will immediately disable the feature for all tenants.</p>
                : <p className="text-xs mt-0.5">This will make the feature available to all tenants (or per rollout %).</p>
              }
            </div>
          </div>
          {flag.description && (
            <p className="text-sm text-muted-foreground">{flag.description}</p>
          )}
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={mutation.isPending}
            variant={flag.enabled ? "destructive" : "default"}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : `${action} flag`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewFlagDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ key: "", label: "", description: "" });

  const mutation = useMutation({
    mutationFn: () =>
      fetch(`${API}/admin/flags/${form.key}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-flags"] });
      toast.success("Flag created");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle>New feature flag</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Key <span className="text-destructive">*</span></Label>
            <Input
              value={form.key}
              onChange={(e) => setForm((p) => ({ ...p, key: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") }))}
              placeholder="feature_key_snake_case"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">Lowercase snake_case. Cannot be changed after creation.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Label <span className="text-destructive">*</span></Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="My Feature"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              className="resize-none"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What does this flag control?"
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.key || !form.label || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Creating…" : "Create flag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FlagsPage() {
  const qc = useQueryClient();
  const [toggling, setToggling] = useState<FeatureFlag | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ flags: FeatureFlag[] }>({
    queryKey: ["admin-flags"],
    queryFn: () => fetch(`${API}/admin/flags`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const flags = data?.flags ?? [];
  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Feature flags</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control platform-wide feature availability.
            {!isLoading && ` ${enabledCount} of ${flags.length} enabled.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4" />New flag
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>Changes to feature flags take effect immediately for all tenants. Review before toggling in production.</p>
      </div>

      <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-4 h-4" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
              <Skeleton className="w-10 h-5 rounded-full shrink-0" />
            </div>
          ))
        ) : flags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Flag className="w-8 h-8 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">No flags configured</p>
          </div>
        ) : (
          flags.map((flag) => (
            <div key={flag.key} className={cn(
              "flex items-center justify-between p-4 gap-4 transition-colors",
              flag.enabled ? "bg-background" : "bg-muted/10",
            )}>
              <div className="flex items-start gap-3 min-w-0">
                <Flag className={cn("w-4 h-4 shrink-0 mt-0.5", flag.enabled ? "text-primary" : "text-muted-foreground/40")} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm font-medium", flag.enabled ? "text-foreground" : "text-muted-foreground")}>
                      {flag.label}
                    </p>
                    {flag.enabled && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        On
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
                    {flag.description ?? "No description"}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">{flag.key}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {flag.rollout_pct !== "100" && flag.enabled && (
                  <span className="text-[10px] text-muted-foreground">
                    {flag.rollout_pct}% rollout
                  </span>
                )}
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={() => setToggling(flag)}
                  aria-label={`Toggle ${flag.label}`}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {toggling && (
        <ToggleConfirmDialog flag={toggling} open onClose={() => setToggling(null)} />
      )}
      {newOpen && <NewFlagDialog open onClose={() => setNewOpen(false)} />}
    </div>
  );
}
