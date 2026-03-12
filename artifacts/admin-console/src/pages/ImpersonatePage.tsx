import { UserSearch, Search, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ImpersonatePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Impersonate</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Sign in as a tenant user for debugging and support.</p>
      </div>

      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        All impersonation sessions are logged and audited. Use responsibly.
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <p className="text-sm font-medium text-foreground">Find a tenant or user</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by email, tenant slug, or user ID…" className="pl-9" />
        </div>
        <Button className="gap-2" disabled>
          <UserSearch className="w-4 h-4" />
          Start impersonation
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent impersonation sessions</p>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <UserSearch className="w-8 h-8 text-muted-foreground/25 mb-3" />
          <p className="text-sm text-muted-foreground">No recent sessions</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Impersonation activity will appear here.</p>
        </div>
      </div>
    </div>
  );
}
