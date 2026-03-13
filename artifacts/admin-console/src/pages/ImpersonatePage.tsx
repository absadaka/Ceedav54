import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  UserSearch, AlertTriangle, Search, ExternalLink, Clock, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api";

interface Tenant {
  id: string; slug: string; name: string; plan: string; status: string;
  email: string | null; country: string | null; user_count: number; created_at: string;
}

interface LogEntry {
  id: string; tenant_id: string | null; meta: any;
  ip_address: string | null; created_at: string;
  tenant: { id: string; name: string; slug: string } | null;
}

/* ─── Confirmation Dialog ─────────────────────────────────────────────── */
function ConfirmImpersonateDialog({ open, onClose, tenant }: {
  open: boolean; onClose: () => void; tenant: Tenant;
}) {
  const [reason, setReason]   = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!open) { setReason(""); setConfirm(""); }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/admin/impersonate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_slug: tenant.slug, reason }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: (data) => {
      toast.success(`Session started — opening ${tenant.name} in new tab`);
      window.open(data.redirect_url, "_blank");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = reason.trim().length >= 10 && confirm === "CONFIRM" && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <UserSearch className="w-4 h-4 text-amber-600" />
            Impersonate tenant
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Audit warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">This action is permanently logged</p>
              <p className="text-xs mt-1 leading-relaxed">
                Your admin session, IP address, timestamp and stated reason are recorded in the audit log.
                This access is reviewed regularly. Misuse is a policy violation.
              </p>
            </div>
          </div>

          {/* Target tenant */}
          <div className="flex items-center gap-3 p-3.5 bg-muted/40 rounded-lg border border-border">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary">
                {tenant.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{tenant.name}</p>
              <p className="text-xs text-muted-foreground">{tenant.slug} · {tenant.user_count} users</p>
            </div>
            <span className={cn(
              "ml-auto text-[10px] font-medium px-2 py-0.5 rounded border capitalize",
              tenant.status === "active"    ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
              tenant.status === "trial"     ? "text-blue-700 bg-blue-50 border-blue-200" :
                                               "text-amber-700 bg-amber-50 border-amber-200",
            )}>
              {tenant.status}
            </span>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="imp-reason">
              Reason for access <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="imp-reason"
              className="w-full h-20 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
              placeholder="e.g. Debugging invoice display issue — related to support ticket #4521"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className={cn(
              "text-xs transition-colors",
              reason.trim().length < 10 ? "text-muted-foreground" : "text-emerald-600",
            )}>
              {reason.trim().length < 10
                ? `${Math.max(0, 10 - reason.trim().length)} more characters required`
                : "✓ Reason accepted"
              }
            </p>
          </div>

          {/* Confirmation */}
          <div className="space-y-1.5">
            <Label htmlFor="imp-confirm">Type <span className="font-mono font-bold">CONFIRM</span> to proceed</Label>
            <Input
              id="imp-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.toUpperCase())}
              placeholder="CONFIRM"
              className="font-mono tracking-widest"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!canSubmit}
            className="gap-1.5"
            onClick={() => mutation.mutate()}
          >
            <UserSearch className="w-3.5 h-3.5" />
            {mutation.isPending ? "Starting session…" : "Start impersonation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function ImpersonatePage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<Tenant | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: tenantsData, isLoading: searchLoading } = useQuery<{ tenants: Tenant[] }>({
    queryKey: ["admin-tenants-search", search],
    queryFn: () => fetch(`${API}/admin/tenants?search=${encodeURIComponent(search)}&limit=8`).then((r) => r.json()),
    enabled: search.length >= 2,
    staleTime: 30_000,
  });

  const { data: logData, isLoading: logLoading } = useQuery<{ log: LogEntry[] }>({
    queryKey: ["admin-impersonation-log"],
    queryFn: () => fetch(`${API}/admin/impersonation-log`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const tenants  = tenantsData?.tenants ?? [];
  const logItems = logData?.log ?? [];

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Support impersonation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Access a tenant's workspace to assist with debugging and support.
        </p>
      </div>

      {/* Audit banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">All sessions are logged and audited</p>
          <p className="text-xs mt-0.5">
            Each impersonation is permanently recorded with your identity, IP address, and stated reason.
            Use only for legitimate support purposes.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">Find tenant to impersonate</p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by tenant name, slug or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Search results */}
        {searchInput.length >= 2 && (
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {searchLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : tenants.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                No tenants match "{searchInput}"
              </div>
            ) : (
              tenants.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(t)}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">
                      {t.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.slug}{t.email ? ` · ${t.email}` : ""} · {t.user_count} users
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize",
                      t.status === "active"    ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                      t.status === "trial"     ? "text-blue-700 bg-blue-50 border-blue-200" :
                                                  "text-amber-700 bg-amber-50 border-amber-200",
                    )}>
                      {t.status}
                    </span>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <UserSearch className="w-3 h-3" />Select
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Recent log */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Recent impersonation sessions</p>
          <p className="text-xs text-muted-foreground">{logItems.length} recorded</p>
        </div>

        {logLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : logItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <UserSearch className="w-8 h-8 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">No impersonation sessions</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Activity will appear here after sessions are started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logItems.map((entry) => {
              const meta = entry.meta ?? {};
              return (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <UserSearch className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">
                        {entry.tenant?.name ?? meta.target_tenant ?? "Unknown tenant"}
                      </p>
                      {entry.tenant?.slug && (
                        <span className="text-xs text-muted-foreground">{entry.tenant.slug}</span>
                      )}
                    </div>
                    {meta.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{meta.reason}"</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/70">
                      {entry.ip_address && (
                        <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{entry.ip_address}</span>
                      )}
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{fmtDate(entry.created_at)}</span>
                      {meta.admin && <span>by {meta.admin}</span>}
                    </div>
                  </div>
                  {entry.tenant?.slug && (
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => window.open(`/dashboard?tenant=${entry.tenant!.slug}`, "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <ConfirmImpersonateDialog
          open={true}
          onClose={() => setSelected(null)}
          tenant={selected}
        />
      )}
    </div>
  );
}
