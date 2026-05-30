import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus, Shield, Eye, HeadphonesIcon, Wallet,
  MoreHorizontal, CheckCircle2, XCircle, Trash2, Search, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const API = "/api";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLES = [
  { value: "platform_admin",    label: "Admin",    desc: "Full access to everything", icon: Shield, color: "text-red-500" },
  { value: "platform_support",  label: "Support",  desc: "Tenant support & impersonation", icon: HeadphonesIcon, color: "text-blue-500" },
  { value: "platform_finance",  label: "Finance",  desc: "Billing & revenue data", icon: Wallet, color: "text-green-500" },
  { value: "platform_readonly", label: "Read-only", desc: "View-only access", icon: Eye, color: "text-gray-500" },
];

function roleMeta(role: string) {
  return ROLES.find((r) => r.value === role) ?? ROLES[3];
}

function useAuthHeaders() {
  const { user } = useAdminAuth();
  return user ? { "X-Admin-Id": user.id } : {};
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const authHeaders = useAuthHeaders();

  const { data, isLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin-users"],
    queryFn: () => fetch(`${API}/admin/users`, { headers: authHeaders }).then((r) => r.json()),
  });

  const users = (data?.users ?? []).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActive = useMutation({
    mutationFn: (u: AdminUser) =>
      fetch(`${API}/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ is_active: !u.is_active }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated");
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      fetch(`${API}/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ role }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
    },
  });

  const resetPassword = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: authHeaders,
      }).then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Password reset email sent");
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers: authHeaders }).then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User removed");
    },
  });

  return (
    <div className="p-6 lg:p-10 max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Admin Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who can access this platform admin console
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {ROLES.map((r) => {
            const c = users.filter((u) => u.role === r.value).length;
            return (
              <div key={r.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <r.icon className={`w-3.5 h-3.5 ${r.color}`} />
                <span>{c} {r.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No admin users found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border bg-card">
          {users.map((u) => {
            const meta = roleMeta(u.role);
            const RoleIcon = meta.icon;
            return (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{u.name}</span>
                    {!u.is_active && (
                      <Badge variant="outline" className="text-[10px] border-red-200 text-red-500">Deactivated</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <RoleIcon className={`w-3.5 h-3.5 ${meta.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                </div>
                <div className="hidden md:block text-xs text-muted-foreground shrink-0 w-28 text-right">
                  {u.last_login_at
                    ? new Date(u.last_login_at).toLocaleDateString()
                    : "Never logged in"}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 w-8 h-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {ROLES.filter((r) => r.value !== u.role).map((r) => (
                      <DropdownMenuItem
                        key={r.value}
                        onClick={() => changeRole.mutate({ id: u.id, role: r.value })}
                      >
                        <r.icon className={`w-3.5 h-3.5 mr-2 ${r.color}`} />
                        Set as {r.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => resetPassword.mutate(u.id)}>
                      <KeyRound className="w-3.5 h-3.5 mr-2 text-violet-500" /> Send Password Reset
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleActive.mutate(u)}>
                      {u.is_active ? (
                        <><XCircle className="w-3.5 h-3.5 mr-2 text-orange-500" /> Deactivate</>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5 mr-2 text-green-500" /> Activate</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => {
                        if (confirm(`Remove ${u.name}? This cannot be undone.`)) {
                          deleteUser.mutate(u.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const authHeaders = useAuthHeaders();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("platform_support");

  const create = useMutation({
    mutationFn: () =>
      fetch(`${API}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name, email, role }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to create user");
        return data;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User added. An invite email has been sent to set their password.");
      setName(""); setEmail(""); setRole("platform_support");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Admin User</DialogTitle>
          <DialogDescription>
            The new user will set their password on their first login.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" placeholder="john@ceer.me" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <r.icon className={`w-3.5 h-3.5 ${r.color}`} />
                      <span>{r.label}</span>
                      <span className="text-muted-foreground ml-1">— {r.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={!name.trim() || !email.trim() || create.isPending}>
            {create.isPending ? "Adding..." : "Add User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
