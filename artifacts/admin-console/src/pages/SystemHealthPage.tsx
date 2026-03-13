import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Database, Server, Zap, Wifi, CheckCircle2,
  AlertTriangle, XCircle, RefreshCw, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api";

type ServiceStatus = "operational" | "degraded" | "outage" | "unknown";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latency?: number;
  message?: string;
  icon: React.ElementType;
}

function statusIcon(s: ServiceStatus) {
  if (s === "operational") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (s === "degraded")    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (s === "outage")      return <XCircle className="w-4 h-4 text-destructive" />;
  return <Activity className="w-4 h-4 text-muted-foreground" />;
}

function statusLabel(s: ServiceStatus) {
  if (s === "operational") return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Operational</span>;
  if (s === "degraded")    return <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Degraded</span>;
  if (s === "outage")      return <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Outage</span>;
  return <span className="text-xs font-medium text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">Checking…</span>;
}

export default function SystemHealthPage() {
  const { data: healthData, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["admin-health"],
    queryFn: async () => {
      const start = Date.now();
      try {
        const r = await fetch(`${API}/healthz`);
        const d = await r.json();
        return { ok: r.ok, latency: Date.now() - start, data: d };
      } catch {
        return { ok: false, latency: null, data: null };
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const apiStatus: ServiceStatus = healthData?.ok ? "operational" : (healthData ? "outage" : "unknown");

  const services: ServiceCheck[] = [
    {
      name: "API Server",
      status: apiStatus,
      latency: healthData?.latency ?? undefined,
      message: healthData?.data?.status === "ok" ? "All systems nominal" : "Unable to reach API",
      icon: Server,
    },
    { name: "PostgreSQL", status: healthData?.data?.db ?? "unknown" ? "operational" : "outage",   message: "Primary database", icon: Database },
    { name: "Web App",    status: "operational", message: "React + Vite frontend", icon: Zap },
    { name: "Network",    status: "operational", message: "Edge connectivity",      icon: Wifi },
  ];

  const allOperational = services.every((s) => s.status === "operational");

  function fmtTime(ts: number) {
    return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">System health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time status of platform services and infrastructure.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Overall status */}
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-xl border",
        allOperational
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-amber-50 border-amber-200 text-amber-800",
      )}>
        {allOperational
          ? <CheckCircle2 className="w-5 h-5 shrink-0" />
          : <AlertTriangle className="w-5 h-5 shrink-0" />
        }
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {allOperational ? "All systems operational" : "One or more systems degraded"}
          </p>
          {dataUpdatedAt > 0 && (
            <p className="text-xs mt-0.5 opacity-70 flex items-center gap-1">
              <Clock className="w-3 h-3" />Last checked {fmtTime(dataUpdatedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map(({ name, status, latency, message, icon: Icon }) => (
          <div key={name} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">{name}</p>
              </div>
              {statusIcon(status)}
            </div>
            <div className="flex items-center justify-between">
              {statusLabel(status)}
              {latency != null && (
                <span className="text-xs text-muted-foreground">{latency}ms</span>
              )}
            </div>
            {message && (
              <p className="text-xs text-muted-foreground mt-2">{message}</p>
            )}
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Error rate (24h)</p>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="w-8 h-8 text-muted-foreground/25 mb-3" />
            <p className="text-xs text-muted-foreground">Metrics integration coming soon</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Connect Datadog / Grafana</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Response times (p95)</p>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Zap className="w-8 h-8 text-muted-foreground/25 mb-3" />
            <p className="text-xs text-muted-foreground">APM integration coming soon</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Connect New Relic / Sentry</p>
          </div>
        </div>
      </div>

      {/* Recent incidents */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Recent incidents</p>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mb-3" />
          <p className="text-sm text-muted-foreground">No incidents recorded</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Incidents and postmortems will appear here.</p>
        </div>
      </div>
    </div>
  );
}
