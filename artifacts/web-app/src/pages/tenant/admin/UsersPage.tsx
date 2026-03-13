import { useState } from "react";
import {
  Users, Search, MoreHorizontal, Mail, Shield,
  UserCheck, UserX, UserPlus, Trash2, RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/auth";
import { ROLE_COLORS, TENANT_ROLES_FOR_INVITE } from "@/lib/permissions";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "wouter";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Member {
  id: string; name: string; email: string; role: string;
  is_active: boolean; last_login_at?: string; created_at: string;
}
interface Invite {
  id: string; email: string; role: string; status: string;
  expires_at: string; created_at: string;
}
interface TeamData {
  members: Member[]; invites: Invite[];
  stats: { total: number; active: number; suspended: number; pending_invites: number };
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}
function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

/* ─── Invite dialog ─────────────────────────────────────────────────────── */
function InviteDialog({ open, onClose, tenantSlug }: { open: boolean; onClose: () => void; tenantSlug: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [name,  setName]  = useState("");
  const [role,  setRole]  = useState("service_advisor");

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/team/invite?tenant=${tenantSlug}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role, invitedBy: user?.userId }),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      return d;
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", tenantSlug] });
      toast.success("Invite sent");
      setEmail(""); setName(""); setRole("service_advisor");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle>Invite team member</DialogTitle>
        </DialogHeader>
        <form className="px-6 py-5 space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Khalid Hassan" required />
          </div>
          <div className="space-y-1.5">
            <Label>Email address</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="khalid@workshop.ae" required />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TENANT_ROLES_FOR_INVITE.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Change role dialog ────────────────────────────────────────────────── */
function ChangeRoleDialog({ open, onClose, member, tenantSlug }: {
  open: boolean; onClose: () => void; member: Member | null; tenantSlug: string;
}) {
  const qc = useQueryClient();
  const [role, setRole] = useState(member?.role ?? "service_advisor");

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/team/${member!.id}/role?tenant=${tenantSlug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", tenantSlug] });
      toast.success("Role updated"); onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!member) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle>Change role — {member.name}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label>New role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TENANT_ROLES_FOR_INVITE.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={mutation.isPending || role === member.role} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const slug = tenantSlug ?? "demo-workshop";
  const [search,         setSearch]         = useState("");
  const [showInvite,     setShowInvite]     = useState(false);
  const [changeRoleMember, setChangeRoleMember] = useState<Member | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery<TeamData>({
    queryKey: ["team", slug],
    queryFn: () => fetch(`${API}/api/team?tenant=${slug}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      fetch(`${API}/api/team/${id}/status?tenant=${slug}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: (_d, { is_active }) => {
      qc.invalidateQueries({ queryKey: ["team", slug] });
      toast.success(is_active ? "User reactivated" : "User suspended");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`${API}/api/team/${id}?tenant=${slug}`, { method: "DELETE" })
      .then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.error); } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", slug] });
      toast.success("User removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const members = data?.members ?? [];
  const invites = data?.invites ?? [];
  const stats   = data?.stats;

  const filtered = members.filter((m) =>
    !search
    || m.name.toLowerCase().includes(search.toLowerCase())
    || m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard module="admin_users">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">Users</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage team members for <span className="font-medium">{slug}</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
              <UserPlus className="w-4 h-4" />Invite member
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-background border border-border rounded-lg p-4 space-y-2">
                  <Skeleton className="h-2.5 w-20" /><Skeleton className="h-6 w-8" />
                </div>
              ))
            : [
                { label: "Total",    value: stats?.total           ?? members.length,           color: "text-foreground" },
                { label: "Active",   value: stats?.active          ?? members.filter((m) => m.is_active).length, color: "text-emerald-600" },
                { label: "Suspended",value: stats?.suspended       ?? members.filter((m) => !m.is_active).length, color: "text-amber-600" },
                { label: "Invites",  value: stats?.pending_invites ?? invites.length,            color: "text-blue-600" },
              ].map((s) => (
                <div key={s.label} className="bg-background border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
                </div>
              ))
          }
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9" placeholder="Search by name or email…"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filtered.length} member{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Last login</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden xl:table-cell">Joined</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-28 rounded-full" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-3 w-24" /></td>
                    <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-3 w-24" /></td>
                    <td className="px-4 py-3 w-12" />
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search ? "No users match your search" : "No users yet"}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 shrink-0">
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {initials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 shrink-0" />{member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn(
                        "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border",
                        ROLE_COLORS[member.role] ?? "bg-muted text-muted-foreground border-border",
                      )}>
                        {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] ?? member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border",
                        member.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-muted text-muted-foreground border-border",
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          member.is_active ? "bg-emerald-500" : "bg-muted-foreground/40",
                        )} />
                        {member.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {fmtDate(member.last_login_at)}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">
                      {fmtDate(member.created_at)}
                    </td>
                    <td className="px-4 py-3 w-12">
                      {member.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setChangeRoleMember(member)}>
                              <Shield className="w-3.5 h-3.5 mr-2" />Change role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {member.is_active ? (
                              <DropdownMenuItem
                                className="text-amber-600"
                                onClick={() => statusMutation.mutate({ id: member.id, is_active: false })}
                              >
                                <UserX className="w-3.5 h-3.5 mr-2" />Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: member.id, is_active: true })}
                              >
                                <UserCheck className="w-3.5 h-3.5 mr-2" />Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Remove ${member.name}?`)) deleteMutation.mutate(member.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />Remove user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Pending invites
              <Badge variant="secondary" className="text-xs">{invites.length}</Badge>
            </h2>
            <div className="rounded-lg border border-border bg-background overflow-hidden divide-y divide-border">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {inv.email.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground/60">
                        {ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS] ?? inv.role} · Expires {fmtDate(inv.expires_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[10px] shrink-0">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <InviteDialog open={showInvite} onClose={() => setShowInvite(false)} tenantSlug={slug} />
      <ChangeRoleDialog
        open={!!changeRoleMember}
        onClose={() => setChangeRoleMember(null)}
        member={changeRoleMember}
        tenantSlug={slug}
      />
    </RoleGuard>
  );
}
