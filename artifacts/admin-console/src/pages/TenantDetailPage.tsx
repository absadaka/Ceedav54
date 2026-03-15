import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin, Calendar,
  Users, CreditCard, ExternalLink, UserSearch, Pencil, AlertTriangle,
  CheckCircle2, XCircle, Clock, Ban, Car, UserRound,
  CalendarCheck, ClipboardList, Wrench, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api";

type TenantStatus = "active" | "trial" | "suspended" | "cancelled";
type TenantPlan   = "starter" | "professional" | "enterprise";

interface User {
  id: string; name: string; email: string; role: string;
  is_active: boolean; last_login_at: string | null; created_at: string;
}

interface Tenant {
  id: string; slug: string; name: string; email: string | null; phone: string | null;
  plan: TenantPlan; status: TenantStatus; country: string | null; currency: string;
  logo_url: string | null; trial_ends_at: string | null; created_at: string;
  address: string | null; vat_number: string | null; website: string | null;
}

const STATUS_META: Record<TenantStatus, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: "Active",    color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  trial:     { label: "Trial",     color: "text-blue-700 bg-blue-50 border-blue-200",          icon: Clock },
  suspended: { label: "Suspended", color: "text-amber-700 bg-amber-50 border-amber-200",       icon: Ban },
  cancelled: { label: "Cancelled", color: "text-red-700 bg-red-50 border-red-200",             icon: XCircle },
};

const PLAN_META: Record<TenantPlan, { label: string; color: string }> = {
  starter:      { label: "Starter",      color: "text-muted-foreground bg-muted" },
  professional: { label: "Professional", color: "text-primary bg-primary/10" },
  enterprise:   { label: "Enterprise",   color: "text-purple-700 bg-purple-100" },
};

const ROLE_COLORS: Record<string, string> = {
  owner:           "text-purple-700 bg-purple-50 border-purple-200",
  admin:           "text-blue-700 bg-blue-50 border-blue-200",
  service_advisor: "text-emerald-700 bg-emerald-50 border-emerald-200",
  technician:      "text-amber-700 bg-amber-50 border-amber-200",
  parts_staff:     "text-orange-700 bg-orange-50 border-orange-200",
  cashier:         "text-pink-700 bg-pink-50 border-pink-200",
  viewer:          "text-slate-700 bg-slate-50 border-slate-200",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Edit Plan/Status Dialog ──────────────────────────────────────────── */
function EditPlanStatusDialog({ open, onClose, tenant }: {
  open: boolean; onClose: () => void; tenant: Tenant;
}) {
  const qc = useQueryClient();
  const [plan, setPlan]     = useState<TenantPlan>(tenant.plan);
  const [status, setStatus] = useState<TenantStatus>(tenant.status);

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/admin/tenants/${tenant.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, status }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenant", tenant.id] });
      toast.success("Tenant updated");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle>Update plan & status</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as TenantPlan)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TenantStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "suspended" && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Suspending a tenant will block all their users from logging in.
            </div>
          )}
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Impersonate Dialog ────────────────────────────────────────────────── */
function ImpersonateDialog({ open, onClose, tenant }: {
  open: boolean; onClose: () => void; tenant: Tenant;
}) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/admin/impersonate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_slug: tenant.slug, reason }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: (data) => {
      toast.success(`Impersonating ${tenant.name}`);
      window.open(data.redirect_url, "_blank");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = reason.trim().length >= 10 && confirm === "CONFIRM";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <UserSearch className="w-4 h-4 text-amber-600" />
            Impersonate tenant
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 space-y-1">
              <p className="font-medium">This action is audited</p>
              <p className="text-xs">
                Your session will be recorded including IP address, timestamp, and the reason provided.
                Misuse of impersonation access is a serious policy violation.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-muted/40 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">Tenant</p>
            <p className="text-sm font-medium text-foreground mt-0.5">{tenant.name}</p>
            <p className="text-xs text-muted-foreground">{tenant.slug}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imp-reason">Reason for impersonation <span className="text-destructive">*</span></Label>
            <textarea
              id="imp-reason"
              className="w-full h-20 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
              placeholder="e.g. Customer reported invoice not loading — debugging on behalf of ticket #1234"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters. Be specific.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imp-confirm">Type CONFIRM to proceed</Label>
            <Input
              id="imp-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.toUpperCase())}
              placeholder="CONFIRM"
              className="font-mono"
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!canSubmit || mutation.isPending}
            className="gap-1.5"
            onClick={() => mutation.mutate()}
          >
            <UserSearch className="w-3.5 h-3.5" />
            {mutation.isPending ? "Starting…" : "Start impersonation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function TenantDetailPage() {
  const [, params] = useRoute("/tenants/:id");
  const id = params?.id ?? "";
  const [, setLocation] = useLocation();
  const [editOpen, setEditOpen]           = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenant", id],
    queryFn: () => fetch(`${API}/admin/tenants/${id}`).then((r) => r.json()),
    enabled: Boolean(id),
  });

  const tenant: Tenant | undefined = data?.tenant;
  const users: User[] = data?.users ?? [];
  const stats = data?.stats ?? {
    client_count: 0, vehicle_count: 0, booking_count: 0,
    inspection_count: 0, completed_jobs_count: 0, total_revenue: 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Building2 className="w-10 h-10 text-muted-foreground/25 mb-3" />
        <p className="text-sm text-muted-foreground">Tenant not found</p>
        <Link href="/tenants">
          <Button variant="outline" size="sm" className="mt-4 gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />Back to tenants
          </Button>
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[tenant.status] ?? STATUS_META.active;
  const planMeta   = PLAN_META[tenant.plan]   ?? PLAN_META.starter;
  const StatusIcon = statusMeta.icon;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/tenants">
            <button className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {tenant.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{tenant.name}</h1>
            <p className="text-sm text-muted-foreground">{tenant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={() => window.open(`/dashboard?tenant=${tenant.slug}`, "_blank")}
          >
            <ExternalLink className="w-3.5 h-3.5" />Open app
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={() => setImpersonateOpen(true)}
          >
            <UserSearch className="w-3.5 h-3.5" />Impersonate
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />Edit
          </Button>
        </div>
      </div>

      {/* Status + plan strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
          statusMeta.color,
        )}>
          <StatusIcon className="w-3 h-3" />
          {statusMeta.label}
        </span>
        <span className={cn(
          "inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full capitalize",
          planMeta.color,
        )}>
          {planMeta.label}
        </span>
        {tenant.trial_ends_at && tenant.status === "trial" && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Trial ends {fmtDate(tenant.trial_ends_at)}
          </span>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Profile</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { icon: Mail,     value: tenant.email,      label: "Email" },
              { icon: Phone,    value: tenant.phone,      label: "Phone" },
              { icon: MapPin,   value: tenant.country,    label: "Country" },
              { icon: Globe,    value: tenant.website,    label: "Website" },
              { icon: CreditCard, value: `${tenant.currency} · ${tenant.vat_number ?? "No VAT#"}`, label: "Currency / VAT" },
              { icon: Calendar, value: fmtDate(tenant.created_at), label: "Joined" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-foreground">{value ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage summary */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Usage summary</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Car,           label: "Vehicles",        value: stats.vehicle_count,        color: "text-blue-600" },
                { icon: UserRound,     label: "Clients",         value: stats.client_count,         color: "text-emerald-600" },
                { icon: CalendarCheck, label: "Bookings",        value: stats.booking_count,        color: "text-violet-600" },
                { icon: ClipboardList, label: "Inspections",     value: stats.inspection_count,     color: "text-amber-600" },
                { icon: Wrench,        label: "Jobs completed",  value: stats.completed_jobs_count, color: "text-indigo-600" },
                { icon: Users,         label: "Team members",    value: users.length,               color: "text-foreground" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-muted/30 rounded-lg p-3 text-center">
                  <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
                  <p className={cn("text-xl font-bold tabular-nums", color)}>{value.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* Revenue */}
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-emerald-700 font-medium">Total revenue collected</p>
                <p className="text-xl font-bold text-emerald-800 tabular-nums">
                  {tenant.currency} {stats.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Module access</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Bookings", "Quotations", "Jobs", "Invoices", "Clients",
                  ...(tenant.plan !== "starter" ? ["WhatsApp", "Advanced Reports"] : []),
                  ...(tenant.plan === "enterprise" ? ["Multi-location", "SSO"] : []),
                ].map((m) => (
                  <span key={m} className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground/80">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Users <span className="text-muted-foreground font-normal">({users.length})</span></p>
        </div>
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="w-8 h-8 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">No users</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Last login</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden xl:table-cell">Joined</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                      ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground border-border",
                    )}>
                      {u.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                    {fmtDateTime(u.last_login_at)}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={cn(
                      "inline-block w-2 h-2 rounded-full",
                      u.is_active ? "bg-emerald-500" : "bg-muted-foreground/30",
                    )} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editOpen && <EditPlanStatusDialog open onClose={() => setEditOpen(false)} tenant={tenant} />}
      {impersonateOpen && <ImpersonateDialog open onClose={() => setImpersonateOpen(false)} tenant={tenant} />}
    </div>
  );
}
