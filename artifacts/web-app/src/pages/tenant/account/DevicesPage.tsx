import { useState, useEffect } from "react";
import { Monitor, Smartphone, Tablet, MapPin, Clock, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { authService, type AuthSession, type DeviceInfo } from "@/lib/auth";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function DeviceIcon({ info }: { info: DeviceInfo }) {
  const cls = "w-5 h-5 text-muted-foreground";
  if (info.deviceType === "mobile") return <Smartphone className={cls} />;
  if (info.deviceType === "tablet") return <Tablet className={cls} />;
  return <Monitor className={cls} />;
}

function DeviceCard({
  session,
  onRevoke,
}: {
  session: AuthSession;
  onRevoke: (id: string) => void;
}) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    setRevoking(true);
    await authService.revokeSession(session.id);
    onRevoke(session.id);
  };

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
        session.isCurrent
          ? "border-primary/30 bg-accent/40"
          : "border-border bg-background hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <DeviceIcon info={session.deviceInfo} />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {session.deviceInfo.browser} · {session.deviceInfo.os}
            </span>
            {session.isCurrent && (
              <Badge variant="secondary" className="text-[10px] font-semibold text-primary bg-accent border-primary/20">
                This device
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {session.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {session.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeAgo(session.lastActiveAt)}
            </span>
            <span className="font-mono">{session.ipAddress}</span>
          </div>
        </div>
      </div>

      {!session.isCurrent && (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={handleRevoke}
          disabled={revoking}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          {revoking ? "Removing…" : "Remove"}
        </Button>
      )}
    </div>
  );
}

export default function DevicesPage() {
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    authService.listSessions().then((s) => {
      setSessions(s);
      setLoading(false);
    });
  }, []);

  const handleRevoke = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    await authService.revokeAllOtherSessions();
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    setRevokingAll(false);
  };

  const others = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Trusted devices</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Devices with an active session in your account.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Current device */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current device</p>
            {sessions.filter((s) => s.isCurrent).map((s) => (
              <DeviceCard key={s.id} session={s} onRevoke={handleRevoke} />
            ))}
          </div>

          {/* Other devices */}
          {others.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Other devices ({others.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7"
                  onClick={handleRevokeAll}
                  disabled={revokingAll}
                >
                  {revokingAll ? "Removing all…" : "Remove all"}
                </Button>
              </div>
              {others.map((s) => (
                <DeviceCard key={s.id} session={s} onRevoke={handleRevoke} />
              ))}
            </div>
          )}

          {others.length === 0 && (
            <div className="border border-border rounded-lg px-5 py-8 text-center">
              <ShieldAlert className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No other active devices</p>
              <p className="text-xs text-muted-foreground mt-1">
                Only this device has an active session.
              </p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              If you see a device you don't recognise, remove it and{" "}
              <button className="underline underline-offset-2 font-medium">change your password</button>{" "}
              immediately.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
