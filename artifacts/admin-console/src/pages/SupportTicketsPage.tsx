import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LifeBuoy, Plus, Search, ExternalLink, MessageSquare,
  Clock, AlertCircle, CheckCircle2, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* Placeholder page — tickets will be wired to Intercom / Zendesk / Linear */

const DEMO_TICKETS = [
  {
    id: "TK-1021",
    subject: "Invoice PDF not generating",
    tenant: "Al-Rashidi Auto Services",
    status: "open",
    priority: "high",
    created_at: "2026-03-12T10:30:00Z",
    replies: 3,
  },
  {
    id: "TK-1018",
    subject: "WhatsApp notifications not sending",
    tenant: "Quick Lube Dubai",
    status: "in_progress",
    priority: "medium",
    created_at: "2026-03-11T14:00:00Z",
    replies: 7,
  },
  {
    id: "TK-1015",
    subject: "Unable to add technician — role error",
    tenant: "Apex Motors",
    status: "resolved",
    priority: "low",
    created_at: "2026-03-10T09:15:00Z",
    replies: 2,
  },
  {
    id: "TK-1009",
    subject: "Request for data export (GDPR)",
    tenant: "Emirates Auto Care",
    status: "open",
    priority: "medium",
    created_at: "2026-03-09T16:45:00Z",
    replies: 1,
  },
];

const STATUS_FILTERS = ["All", "Open", "In progress", "Resolved"] as const;
const PRIORITY_COLORS: Record<string, string> = {
  high:   "text-red-700 bg-red-50 border-red-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low:    "text-slate-600 bg-slate-50 border-slate-200",
};
const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:        { label: "Open",        color: "text-blue-700 bg-blue-50 border-blue-200",     icon: AlertCircle },
  in_progress: { label: "In progress", color: "text-amber-700 bg-amber-50 border-amber-200",  icon: Clock },
  resolved:    { label: "Resolved",    color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function SupportTicketsPage() {
  const [filter, setFilter]       = useState("All");
  const [search, setSearch]       = useState("");

  const filtered = DEMO_TICKETS.filter((t) => {
    const matchStatus = filter === "All" || t.status.replace("_", " ") === filter.toLowerCase();
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase())
      || t.tenant.toLowerCase().includes(search.toLowerCase())
      || t.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openCount       = DEMO_TICKETS.filter((t) => t.status === "open").length;
  const inProgressCount = DEMO_TICKETS.filter((t) => t.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Support tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage support requests from workshop operators.
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />New ticket
        </Button>
      </div>

      {/* Integration notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <LifeBuoy className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Support integration coming soon</p>
          <p className="text-xs mt-0.5">
            This page will connect to your helpdesk (Intercom, Zendesk or Linear).
            Sample data is shown below.
          </p>
          <Button variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1.5 bg-white border-blue-300 text-blue-700 hover:bg-blue-50">
            Connect helpdesk <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open",        value: openCount,                            color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "In progress", value: inProgressCount,                      color: "text-amber-600 bg-amber-50 border-amber-200" },
          { label: "Total",       value: DEMO_TICKETS.length,                  color: "text-foreground bg-muted/30 border-border" },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn("rounded-lg border p-4 text-center", color)}>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-9 h-8 text-sm"
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                filter === f
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <LifeBuoy className="w-10 h-10 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">No tickets match your filters</p>
          </div>
        ) : (
          filtered.map((ticket) => {
            const sm = STATUS_META[ticket.status] ?? STATUS_META.open;
            const StatusIcon = sm.icon;
            return (
              <div key={ticket.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer group">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">{ticket.id}</span>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize",
                      PRIORITY_COLORS[ticket.priority],
                    )}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5 group-hover:text-primary transition-colors">
                    {ticket.subject}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{ticket.tenant}</span>
                    <span>·</span>
                    <span>{fmtDate(ticket.created_at)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" />{ticket.replies}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border",
                    sm.color,
                  )}>
                    <StatusIcon className="w-3 h-3" />
                    {sm.label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
