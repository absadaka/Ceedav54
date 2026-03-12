import { Users, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Clients</h1>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> New client
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients…" className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicles</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Last visit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Users className="w-10 h-10 text-muted-foreground/25" />
                  <p className="text-[15px] font-medium text-muted-foreground">No clients yet</p>
                  <p className="text-sm text-muted-foreground/70">Add your first client to start managing your CRM.</p>
                  <Button size="sm" className="mt-1 gap-1.5">
                    <Plus className="w-4 h-4" /> Add client
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
