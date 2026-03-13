import { useState } from "react";
import { Monitor, Smartphone, Tablet, MapPin, Clock, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { authService, type AuthSession } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function DeviceIcon({ type }: { type: string }) {
  if (type === "mobile")  return <Smartphone className="w-8 h-8 text-muted-foreground/50" />;
  if (type === "tablet")  return <Tablet      className="w-8 h-8 text-muted-foreground/50" />;
  return                         <Monitor     className="w-8 h-8 text-muted-foreground/50" />;
}

function fmtRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Active now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SessionCard({ session, onRevoke }: { session: AuthSession; onRevoke: (id: string) => void }) {
  return (
    <div className={cn(
      "flex items-start gap-4 p-4 rounded-lg border transition-colors",
      session.isCurrent
        ? "border-primary/30 bg-primary/5"
        : "border-border bg-background hover:bg-muted/30",
    )}>
      <DeviceIcon type={session.deviceInfo.deviceType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">
            {session.deviceInfo.browser} on {session.deviceInfo.os}
          </p>
          {session.isCurrent && (
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">This device</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {(session.ipAddress || session.city) && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {[session.city, session.ipAddress].filter(Boolean).join(" · ")}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {fmtRelative(session.lastActiveAt)}
          </span>
        </div>
      </div>
      {!session.isCurrent && (
        <Button
          size="sm" variant="ghost"
          className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRevoke(session.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

export default function AccountSessionsPage() {
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<AuthSession[]>({
    queryKey: ["sessions"],
    queryFn: () => authService.listSessions(),
    staleTime: 30_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => authService.revokeSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sessions"] }); toast.success("Session revoked"); },
    onError: () => toast.error("Failed to revoke session"),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => authService.revokeAllOtherSessions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sessions"] }); toast.success("All other sessions revoked"); },
    onError: () => toast.error("Failed to revoke sessions"),
  });

  const current = sessions.find((s) => s.isCurrent);
  const others  = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Active sessions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every browser and device where your account is currently signed in.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 border border-border rounded-lg">
              <Skeleton className="w-8 h-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current session */}
          {current && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current session
              </p>
              <SessionCard session={current} onRevoke={() => {}} />
            </div>
          )}

          {/* Other sessions */}
          {others.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Other sessions ({others.length})
                </p>
                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7"
                  onClick={() => revokeAllMutation.mutate()}
                  disabled={revokeAllMutation.isPending}
                >
                  <LogOut className="w-3 h-3 mr-1.5" />
                  {revokeAllMutation.isPending ? "Removing…" : "Revoke all"}
                </Button>
              </div>
              <div className="space-y-2">
                {others.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onRevoke={(id) => revokeMutation.mutate(id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-lg px-5 py-8 text-center bg-background">
              <Monitor className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Only this device is signed in</p>
              <p className="text-xs text-muted-foreground mt-1">No other active sessions found.</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Sessions expire after 30 days of inactivity. If you see an unfamiliar session,{" "}
            <button
              className="underline underline-offset-2 hover:text-foreground transition-colors"
              onClick={() => revokeAllMutation.mutate()}
            >
              revoke all other sessions
            </button>{" "}
            and change your password.
          </p>
        </div>
      )}
    </div>
  );
}
