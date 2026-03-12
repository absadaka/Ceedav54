import { useState } from "react";
import {
  Users, Plus, Search, MoreHorizontal, Mail, Shield,
  UserCheck, UserX, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type UserRole } from "@/lib/auth";

/* ─── Data ─────────────────────────────────────────────────────────────── */

const ROLES_FOR_INVITE: UserRole[] = [
  "admin", "service_advisor", "technician", "cashier", "parts_manager", "receptionist",
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "suspended";
  lastActive?: string;
  avatarInitials: string;
}

const MOCK_MEMBERS: TeamMember[] = [
  { id: "1", name: "Ahmed Al-Rashidi", email: "ahmed@workshop.ae", role: "owner", status: "active", lastActive: "Now", avatarInitials: "AA" },
  { id: "2", name: "Khalid Hassan", email: "khalid@workshop.ae", role: "service_advisor", status: "active", lastActive: "2h ago", avatarInitials: "KH" },
  { id: "3", name: "Omar Al-Farsi", email: "omar@workshop.ae", role: "technician", status: "active", lastActive: "1d ago", avatarInitials: "OA" },
  { id: "4", name: "Rami Khalil", email: "rami@workshop.ae", role: "technician", status: "active", lastActive: "3h ago", avatarInitials: "RK" },
  { id: "5", name: "Sara Al-Nasser", email: "sara@workshop.ae", role: "receptionist", status: "active", lastActive: "5m ago", avatarInitials: "SN" },
  { id: "6", name: "Faisal Al-Mutairi", email: "faisal@workshop.ae", role: "cashier", status: "invited", lastActive: undefined, avatarInitials: "FM" },
  { id: "7", name: "Layla Ibrahim", email: "layla@workshop.ae", role: "parts_manager", status: "suspended", lastActive: "14d ago", avatarInitials: "LI" },
];

const STATUS_STYLES: Record<TeamMember["status"], string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  invited: "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-muted text-muted-foreground border-border",
};

const ROLE_STYLES: Partial<Record<UserRole, string>> = {
  owner: "bg-violet-50 text-violet-700 border-violet-200",
  admin: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

/* ─── Invite dialog ─────────────────────────────────────────────────────── */
function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("service_advisor");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 900));
    setSending(false);
    setDone(true);
    setTimeout(() => { setDone(false); setInviteEmail(""); onClose(); }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="text-center py-6">
            <UserCheck className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">Invitation sent!</p>
          </div>
        ) : (
          <form onSubmit={handle} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input id="invite-email" type="email" className="pl-9" placeholder="colleague@workshop.ae"
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ROLES_FOR_INVITE.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="bg-muted/50 border border-border rounded-md px-3 py-2.5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{ROLE_LABELS[inviteRole]}</span> — can{" "}
                {inviteRole === "admin" ? "manage most workshop settings and team members" :
                  inviteRole === "service_advisor" ? "create bookings, quotes, and job cards" :
                    inviteRole === "technician" ? "view and update job cards assigned to them" :
                      inviteRole === "cashier" ? "process payments and manage invoices" :
                        inviteRole === "parts_manager" ? "manage the parts catalogue and inventory" :
                          "manage bookings and customer check-ins"}.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={sending} className="gap-2">
                {sending ? "Sending…" : "Send invitation"}
                {!sending && <Mail className="w-4 h-4" />}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS);
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSuspend = (id: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "suspended" ? "active" : "suspended" }
          : m
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Team members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage who has access to your workspace.
          </p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Invite member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 max-w-sm">
        {[
          { label: "Total", val: members.length },
          { label: "Active", val: members.filter((m) => m.status === "active").length },
          { label: "Pending", val: members.filter((m) => m.status === "invited").length },
        ].map((s) => (
          <div key={s.label} className="bg-background border border-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{s.val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Search by name or email…" className="pl-9"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Last active</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <tr key={member.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      {member.avatarInitials}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                    ROLE_STYLES[member.role] ?? "bg-muted text-muted-foreground border-border"
                  )}>
                    {ROLE_LABELS[member.role]}
                  </span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize", STATUS_STYLES[member.status])}>
                    {member.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                  {member.lastActive ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {member.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem>
                          <Shield className="w-3.5 h-3.5 mr-2" /> Change role
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-3.5 h-3.5 mr-2" /> Resend invite
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={member.status === "suspended" ? "text-foreground" : "text-destructive"}
                          onClick={() => toggleSuspend(member.id)}
                        >
                          {member.status === "suspended" ? (
                            <><UserCheck className="w-3.5 h-3.5 mr-2" /> Reactivate</>
                          ) : (
                            <><UserX className="w-3.5 h-3.5 mr-2" /> Suspend</>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InviteDialog open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}
