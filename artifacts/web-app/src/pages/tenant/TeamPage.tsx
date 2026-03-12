import { UserPlus, UsersRound, Mail, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { usePageLoad } from "@/hooks/usePageLoad";

const roleColors: Record<string, string> = {
  owner:           "bg-primary/10 text-primary border-primary/20",
  service_advisor: "bg-blue-50 text-blue-700 border-blue-200",
  technician:      "bg-amber-50 text-amber-700 border-amber-200",
  cashier:         "bg-green-50 text-green-700 border-green-200",
  parts_manager:   "bg-purple-50 text-purple-700 border-purple-200",
  receptionist:    "bg-rose-50 text-rose-700 border-rose-200",
};

function RowSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-36" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-24 rounded-full" /></td>
          <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-3 w-20" /></td>
          <td className="px-4 py-3 w-10"><Skeleton className="h-6 w-6 rounded" /></td>
        </tr>
      ))}
    </>
  );
}

export default function TeamPage() {
  const loading = usePageLoad();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage team members, roles and permissions.
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="w-4 h-4" />Invite member
        </Button>
      </div>

      {/* Stats strip */}
      {loading
        ? (
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-background border border-border rounded-lg px-4 py-3 space-y-1.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
        )
        : (
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total members", value: "1" },
              { label: "Active",        value: "1" },
              { label: "Pending invite",value: "0" },
            ].map((s) => (
              <div key={s.label} className="bg-background border border-border rounded-lg px-4 py-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold text-foreground mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        )
      }

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search members…" className="pl-9 h-8 text-sm" />
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
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading
              ? <RowSkeleton />
              : (
                <>
                  {/* Demo owner row */}
                  <tr className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">DA</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">Demo Admin</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />demo@ceeda.io
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors.owner}`}>
                        Owner
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">Today</td>
                    <td className="px-4 py-3">
                      <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {/* Invite placeholder */}
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <UserPlus className="w-4 h-4" />
                        Invite more team members
                      </button>
                    </td>
                  </tr>
                </>
              )
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
