import { useState } from "react";
import { Search, Download, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─── Data ─────────────────────────────────────────────────────────────── */

type EventType =
  | "auth.sign_in" | "auth.sign_out" | "auth.failed"
  | "user.invited" | "user.role_changed" | "user.suspended"
  | "invoice.created" | "invoice.sent" | "invoice.paid"
  | "job.created" | "job.status_changed"
  | "settings.changed" | "api_key.created" | "api_key.revoked";

interface AuditEvent {
  id: string;
  type: EventType;
  actor: string;
  actorEmail: string;
  resource?: string;
  detail?: string;
  ipAddress: string;
  timestamp: Date;
}

function minsAgo(n: number) { return new Date(Date.now() - n * 60 * 1000); }

const EVENTS: AuditEvent[] = [
  { id: "1",  type: "auth.sign_in",       actor: "Ahmed Al-Rashidi", actorEmail: "ahmed@workshop.ae",  detail: "via Password",         ipAddress: "86.12.34.56", timestamp: minsAgo(2) },
  { id: "2",  type: "invoice.sent",       actor: "Khalid Hassan",    actorEmail: "khalid@workshop.ae", resource: "INV-2024-0088",      ipAddress: "86.12.34.57", timestamp: minsAgo(8), detail: "via WhatsApp" },
  { id: "3",  type: "job.status_changed", actor: "Omar Al-Farsi",    actorEmail: "omar@workshop.ae",   resource: "JC-2024-0021",       ipAddress: "86.12.34.58", timestamp: minsAgo(14), detail: "→ In Progress" },
  { id: "4",  type: "user.invited",       actor: "Ahmed Al-Rashidi", actorEmail: "ahmed@workshop.ae",  resource: "faisal@workshop.ae", ipAddress: "86.12.34.56", timestamp: minsAgo(45), detail: "as Cashier" },
  { id: "5",  type: "invoice.paid",       actor: "Sara Al-Nasser",   actorEmail: "sara@workshop.ae",   resource: "INV-2024-0087",      ipAddress: "86.12.34.60", timestamp: minsAgo(90), detail: "AED 1,200" },
  { id: "6",  type: "settings.changed",   actor: "Ahmed Al-Rashidi", actorEmail: "ahmed@workshop.ae",  detail: "Timezone updated",     ipAddress: "86.12.34.56", timestamp: minsAgo(120) },
  { id: "7",  type: "auth.failed",        actor: "Unknown",          actorEmail: "attacker@evil.com",  detail: "Invalid password (3x)", ipAddress: "45.200.11.5", timestamp: minsAgo(200) },
  { id: "8",  type: "api_key.created",    actor: "Ahmed Al-Rashidi", actorEmail: "ahmed@workshop.ae",  resource: "Integration key",    ipAddress: "86.12.34.56", timestamp: minsAgo(300) },
  { id: "9",  type: "job.created",        actor: "Khalid Hassan",    actorEmail: "khalid@workshop.ae", resource: "JC-2024-0022",       ipAddress: "86.12.34.57", timestamp: minsAgo(400) },
  { id: "10", type: "user.role_changed",  actor: "Ahmed Al-Rashidi", actorEmail: "ahmed@workshop.ae",  resource: "Omar Al-Farsi",      ipAddress: "86.12.34.56", timestamp: minsAgo(1440), detail: "Receptionist → Technician" },
  { id: "11", type: "invoice.created",    actor: "Khalid Hassan",    actorEmail: "khalid@workshop.ae", resource: "INV-2024-0089",      ipAddress: "86.12.34.57", timestamp: minsAgo(1500) },
  { id: "12", type: "auth.sign_out",      actor: "Rami Khalil",      actorEmail: "rami@workshop.ae",   ipAddress: "192.168.1.5",       timestamp: minsAgo(2880) },
];

const EVENT_STYLES: Record<string, { label: string; color: string }> = {
  "auth.sign_in":       { label: "Sign in",       color: "bg-blue-50 text-blue-700 border-blue-200" },
  "auth.sign_out":      { label: "Sign out",       color: "bg-gray-50 text-gray-600 border-gray-200" },
  "auth.failed":        { label: "Auth failed",    color: "bg-red-50 text-red-700 border-red-200" },
  "user.invited":       { label: "User invited",   color: "bg-violet-50 text-violet-700 border-violet-200" },
  "user.role_changed":  { label: "Role changed",   color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  "user.suspended":     { label: "User suspended", color: "bg-orange-50 text-orange-700 border-orange-200" },
  "invoice.created":    { label: "Invoice",        color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "invoice.sent":       { label: "Invoice sent",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "invoice.paid":       { label: "Payment",        color: "bg-green-50 text-green-700 border-green-200" },
  "job.created":        { label: "Job created",    color: "bg-amber-50 text-amber-700 border-amber-200" },
  "job.status_changed": { label: "Job updated",    color: "bg-amber-50 text-amber-700 border-amber-200" },
  "settings.changed":   { label: "Settings",       color: "bg-gray-50 text-gray-600 border-gray-200" },
  "api_key.created":    { label: "API key",        color: "bg-purple-50 text-purple-700 border-purple-200" },
  "api_key.revoked":    { label: "API key revoked",color: "bg-red-50 text-red-600 border-red-200" },
};

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString("en-AE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const EVENT_TYPE_GROUPS = [
  { label: "All events", value: "" },
  { label: "Authentication", value: "auth" },
  { label: "Users", value: "user" },
  { label: "Invoices", value: "invoice" },
  { label: "Jobs", value: "job" },
  { label: "Settings", value: "settings" },
  { label: "API keys", value: "api_key" },
];

export default function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = EVENTS.filter((e) => {
    const matchSearch = search === "" ||
      e.actor.toLowerCase().includes(search.toLowerCase()) ||
      e.actorEmail.toLowerCase().includes(search.toLowerCase()) ||
      (e.resource ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "" || e.type.startsWith(typeFilter);
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            A record of all significant actions taken in your workspace.
          </p>
        </div>
        <Button variant="outline" className="gap-2 shrink-0">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search actor, resource…" className="pl-9"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {EVENT_TYPE_GROUPS.map((g) => (
            <button key={g.value} type="button"
              onClick={() => setTypeFilter(g.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                typeFilter === g.value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Actor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Detail / Resource</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">IP</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">When</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev) => {
              const style = EVENT_STYLES[ev.type] ?? { label: ev.type, color: "bg-muted text-muted-foreground border-border" };
              return (
                <tr key={ev.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", style.color)}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm font-medium text-foreground leading-tight">{ev.actor}</p>
                    <p className="text-xs text-muted-foreground">{ev.actorEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    {ev.resource && <span className="font-mono mr-1.5 text-foreground">{ev.resource}</span>}
                    {ev.detail}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden sm:table-cell">{ev.ipAddress}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-right whitespace-nowrap">
                    {formatTime(ev.timestamp)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No events match your filters.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Audit logs are retained for 90 days on Professional and indefinitely on Enterprise.
      </p>
    </div>
  );
}
