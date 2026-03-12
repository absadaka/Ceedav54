import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockSessions = [
  { id: "1", device: "Chrome on macOS", ip: "185.134.x.x", location: "Dubai, UAE", lastActive: "Now", current: true },
];

export default function AccountSessionsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Active sessions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage all devices where you're currently signed in.</p>
      </div>

      <div className="bg-background border border-border rounded-lg divide-y divide-border">
        {mockSessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Monitor className="w-8 h-8 text-muted-foreground/50 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{session.device}</p>
                  {session.current && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">This device</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{session.ip} · {session.location} · {session.lastActive}</p>
              </div>
            </div>
            {!session.current && (
              <Button size="sm" variant="outline" className="shrink-0">Revoke</Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
        Revoke all other sessions
      </Button>
    </div>
  );
}
