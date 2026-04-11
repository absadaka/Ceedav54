import {
  UserPlus, UsersRound, Mail, MoreHorizontal, Search,
  Shield, UserX, UserCheck, Trash2, Clock, RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
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
import { useAuth } from "@/hooks/useAuth";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Member {
  id: string; name: string; email: string; role: string;
  is_active: boolean; avatar_url?: string; phone?: string;
  last_login_at?: string; created_at: string;
}
interface Invite {
  id: string; email: string; role: string; status: string;
  expires_at: string; created_at: string;
}
interface TeamData {
  members: Member[]; invites: Invite[];
  stats: { total: number; active: number; suspended: number; pending_invites: number };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}
function fmtDate(d?: string) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}
function fmtRelative(d?: string) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Invite dialog ─────────────────────────────────────────────────────── */
function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [name,  setName]  = useState("");
  const [role,  setRole]  = useState("service_advisor");

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/team/invite?tenant=${TENANT}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, name, role, invitedBy: user?.userId }),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to send invite");
      return d;
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", TENANT] });
      toast.success(`Invite sent to ${email}`);
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
        <form
          className="px-6 py-5 space-y-4"
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">Full name</Label>
            <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Khalid Hassan" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">Email address</Label>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="khalid@workshop.ae" required />
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
            <p className="text-xs text-muted-foreground">
              {role === "admin" && "Full access to all modules except platform admin."}
              {role === "service_advisor" && "Manages bookings, quotations, and job cards."}
              {role === "technician" && "View and update assigned job cards."}
              {role === "cashier" && "Handles invoices and payment collection."}
              {role === "parts_manager" && "Manages parts inventory and job parts."}
              {role === "receptionist" && "Front-desk: bookings and customer check-in."}
            </p>
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
function ChangeRoleDialog({
  open, onClose, member,
}: { open: boolean; onClose: () => void; member: Member | null }) {
  const qc = useQueryClient();
  const [role, setRole] = useState(member?.role ?? "service_advisor");

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/team/${member!.id}/role?tenant=${TENANT}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", TENANT] });
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

/* ─── Member row ─────────────────────────────────────────────────────────── */
function MemberRow({ member, isManager }: { member: Member; isManager: boolean }) {
  const qc = useQueryClient();
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (is_active: boolean) =>
      fetch(`${API}/api/team/${member.id}/status?tenant=${TENANT}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: (_d, is_active) => {
      qc.invalidateQueries({ queryKey: ["team", TENANT] });
      toast.success(is_active ? "Member reactivated" : "Member suspended");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/team/${member.id}?tenant=${TENANT}`, { method: "DELETE" })
      .then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.error); } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", TENANT] });
      toast.success("Member removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 shrink-0">
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
        <td className="px-4 py-3 hidden md:table-cell">
          <span className={cn(
            "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border",
            ROLE_COLORS[member.role] ?? "bg-muted text-muted-foreground border-border",
          )}>
            {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] ?? member.role}
          </span>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            member.is_active ? "text-emerald-700" : "text-muted-foreground",
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              member.is_active ? "bg-emerald-500" : "bg-muted-foreground/40",
            )} />
            {member.is_active ? "Active" : "Suspended"}
          </span>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {fmtRelative(member.last_login_at)}
          </span>
        </td>
        <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">
          {fmtDate(member.created_at)}
        </td>
        <td className="px-4 py-3 w-10">
          {member.role !== "owner" && isManager && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setChangeRoleOpen(true)}>
                  <Shield className="w-3.5 h-3.5 mr-2" />Change role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {member.is_active ? (
                  <DropdownMenuItem className="text-amber-600" onClick={() => statusMutation.mutate(false)}>
                    <UserX className="w-3.5 h-3.5 mr-2" />Suspend
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => statusMutation.mutate(true)}>
                    <UserCheck className="w-3.5 h-3.5 mr-2" />Reactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => {
                  if (confirm(`Remove ${member.name} from the team?`)) deleteMutation.mutate();
                }}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" />Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </td>
      </tr>
      <ChangeRoleDialog open={changeRoleOpen} onClose={() => setChangeRoleOpen(false)} member={member} />
    </>
  );
}

/* ─── Invite row ─────────────────────────────────────────────────────────── */
function InviteRow({ invite, isManager }: { invite: Invite; isManager: boolean }) {
  const qc = useQueryClient();
  const revoke = useMutation({
    mutationFn: () => fetch(`${API}/api/team/invites/${invite.id}?tenant=${TENANT}`, { method: "DELETE" })
      .then((r) => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team", TENANT] }); toast.success("Invite revoked"); },
    onError: () => toast.error("Failed to revoke invite"),
  });

  return (
    <tr className="border-b border-border last:border-0 bg-muted/20">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">
              {invite.email.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
            <p className="text-[10px] text-muted-foreground/60">Expires {fmtDate(invite.expires_at)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className={cn(
          "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border",
          ROLE_COLORS[invite.role] ?? "bg-muted text-muted-foreground border-border",
        )}>
          {ROLE_LABELS[invite.role as keyof typeof ROLE_LABELS] ?? invite.role}
        </span>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Pending invite
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
        Invited {fmtRelative(invite.created_at)}
      </td>
      <td className="px-4 py-3 hidden xl:table-cell" />
      <td className="px-4 py-3 w-10">
        {isManager && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="text-destructive" onClick={() => revoke.mutate()}>
                <Trash2 className="w-3.5 h-3.5 mr-2" />Revoke invite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function RowSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-36" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-24 rounded-full" /></td>
          <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-16" /></td>
          <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-3 w-20" /></td>
          <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-3 w-20" /></td>
          <td className="px-4 py-3 w-10" />
        </tr>
      ))}
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function TeamPage() {
  const { isManager } = useAuth();
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showInvite, setShowInvite] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery<TeamData>({
    queryKey: ["team", TENANT],
    queryFn: () => fetch(`${API}/api/team?tenant=${TENANT}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const members = data?.members ?? [];
  const invites = data?.invites ?? [];
  const stats   = data?.stats;

  const filtered = members.filter((m) => {
    const matchSearch = !search
      || m.name.toLowerCase().includes(search.toLowerCase())
      || m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      <div className="-mx-6 -mt-6 px-6 pt-6 pb-4 bg-white space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">Team</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage members, roles and access.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            </Button>
            {isManager && (
              <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
                <UserPlus className="w-4 h-4" />Invite member
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="-mx-6 h-6 bg-gradient-to-b from-white to-[#f2f3ff]" />

      <div className="-mx-6 -mb-6 px-6 pb-6 bg-[#f2f3ff] space-y-5">

      {/* Stats strip */}
      <div className="flex gap-3 flex-wrap">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-background border border-border rounded-lg px-4 py-3 space-y-1.5 min-w-[100px]">
                <Skeleton className="h-2.5 w-20" /><Skeleton className="h-5 w-8" />
              </div>
            ))
          : [
              { label: "Total members",   value: stats?.total           ?? members.length },
              { label: "Active",          value: stats?.active          ?? members.filter((m) => m.is_active).length },
              { label: "Suspended",       value: stats?.suspended       ?? members.filter((m) => !m.is_active).length },
              { label: "Pending invites", value: stats?.pending_invites ?? invites.length },
            ].map((s) => (
              <div key={s.label} className="bg-background border border-border rounded-lg px-4 py-3 min-w-[100px]">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold text-foreground mt-0.5">{s.value}</p>
              </div>
            ))
        }
      </div>

      {/* Role filter chips */}
      {!isLoading && members.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          {(["technician", "service_advisor", "cashier", "parts_manager", "receptionist", "admin"] as const)
            .map((r) => {
              const c = members.filter((m) => m.role === r).length;
              if (c === 0) return null;
              return (
                <button
                  key={r}
                  onClick={() => setRoleFilter(roleFilter === r ? "all" : r)}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all",
                    roleFilter === r
                      ? ROLE_COLORS[r]
                      : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  <span>{ROLE_LABELS[r]}</span>
                  <span className={cn("opacity-60", roleFilter === r && "opacity-80")}>{c}</span>
                </button>
              );
            })}
          {roleFilter !== "all" && (
            <button
              onClick={() => setRoleFilter("all")}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="w-full h-8 pl-9 pr-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Member</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Role</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Last active</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden xl:table-cell">Joined</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? <RowSkeleton />
              : filtered.length === 0 && invites.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <UsersRound className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search ? "No members match your search" : "No team members yet"}
                    </p>
                    {!search && isManager && (
                      <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowInvite(true)}>
                        <UserPlus className="w-3.5 h-3.5" />Invite first member
                      </Button>
                    )}
                  </td>
                </tr>
              )
              : (
                <>
                  {filtered.map((m) => (
                    <MemberRow key={m.id} member={m} isManager={isManager} />
                  ))}
                  {invites.map((inv) => (
                    <InviteRow key={inv.id} invite={inv} isManager={isManager} />
                  ))}
                </>
              )
            }
          </tbody>
        </table>
      </div>

      <InviteDialog open={showInvite} onClose={() => setShowInvite(false)} />
      </div>
    </div>
  );
}
