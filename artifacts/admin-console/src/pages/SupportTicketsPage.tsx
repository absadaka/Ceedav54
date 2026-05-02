import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  LifeBuoy, Search, MessageSquare, Clock, AlertCircle,
  CheckCircle2, ArrowRight, Loader2, X, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api";

function useAuthHeaders(): Record<string, string> {
  const { user } = useAdminAuth();
  return user ? { "X-Admin-Id": user.id } : {};
}

interface TicketRow {
  id: string;
  ref: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  contact_name: string;
  contact_email: string;
  reply_count: number;
  acknowledged_at: string | null;
  created_at: string;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
}

interface TicketDetail extends TicketRow {
  description: string;
  resolved_at: string | null;
  updated_at: string;
}

interface Message {
  id: string;
  author_type: "tenant" | "platform" | "system";
  author_name: string;
  body: string;
  created_at: string;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all",                 label: "All" },
  { value: "open",                label: "Open" },
  { value: "in_progress",         label: "In progress" },
  { value: "waiting_on_customer", label: "Waiting" },
  { value: "resolved",            label: "Resolved" },
  { value: "closed",              label: "Closed" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-700 bg-red-50 border-red-200",
  high:   "text-orange-700 bg-orange-50 border-orange-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low:    "text-slate-600 bg-slate-50 border-slate-200",
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:                { label: "Open",         color: "text-blue-700 bg-blue-50 border-blue-200",         icon: AlertCircle },
  in_progress:         { label: "In progress",  color: "text-amber-700 bg-amber-50 border-amber-200",      icon: Clock },
  waiting_on_customer: { label: "Waiting",      color: "text-purple-700 bg-purple-50 border-purple-200",   icon: Clock },
  resolved:            { label: "Resolved",     color: "text-emerald-700 bg-emerald-50 border-emerald-200",icon: CheckCircle2 },
  closed:              { label: "Closed",       color: "text-slate-600 bg-slate-50 border-slate-200",      icon: CheckCircle2 },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function SupportTicketsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const authHeaders = useAuthHeaders();

  const { data, isLoading } = useQuery<{
    tickets: TicketRow[]; total: number; counts: Record<string, number>;
  }>({
    queryKey: ["admin-tickets", filter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("search", search);
      params.set("limit", "100");
      const res = await fetch(`${API}/admin/support/tickets?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load tickets");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const tickets = data?.tickets ?? [];
  const counts  = data?.counts ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Support tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cases raised by workshop operators from inside their portal.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open",        value: counts.open        ?? 0, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "In progress", value: counts.in_progress ?? 0, color: "text-amber-600 bg-amber-50 border-amber-200" },
          { label: "Waiting",     value: counts.waiting_on_customer ?? 0, color: "text-purple-600 bg-purple-50 border-purple-200" },
          { label: "Resolved",    value: counts.resolved    ?? 0, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                filter === f.value
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-64" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <LifeBuoy className="w-10 h-10 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">No tickets match your filters</p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const sm = STATUS_META[ticket.status] ?? STATUS_META.open;
            const StatusIcon = sm.icon;
            const isUnread = !ticket.acknowledged_at;
            return (
              <button
                key={ticket.id}
                onClick={() => setOpenId(ticket.id)}
                className="w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 relative",
                  isUnread ? "bg-red-50" : "bg-primary/10",
                )}>
                  <MessageSquare className={cn(
                    "w-3.5 h-3.5",
                    isUnread ? "text-red-600" : "text-primary",
                  )} />
                  {isUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">{ticket.ref}</span>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize",
                      PRIORITY_COLORS[ticket.priority],
                    )}>
                      {ticket.priority}
                    </span>
                    {isUnread && (
                      <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">New</span>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm mt-0.5 group-hover:text-primary transition-colors truncate",
                    isUnread ? "font-semibold text-foreground" : "font-medium text-foreground",
                  )}>
                    {ticket.subject}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="truncate">{ticket.tenant_name ?? "Unknown workshop"}</span>
                    <span>·</span>
                    <span>{fmtDate(ticket.created_at)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" />{ticket.reply_count}
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
              </button>
            );
          })
        )}
      </div>

      <TicketDetailDialog
        ticketId={openId}
        authHeaders={authHeaders}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Detail dialog with thread + reply box
───────────────────────────────────────────────────────────────────────── */

function TicketDetailDialog({ ticketId, authHeaders, onClose }: {
  ticketId: string | null;
  authHeaders: Record<string, string>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery<{ ticket: TicketDetail; messages: Message[] }>({
    queryKey: ["admin-ticket", ticketId],
    queryFn: async () => {
      const r = await fetch(`${API}/admin/support/tickets/${ticketId}`, { headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load ticket");
      return r.json();
    },
    enabled: !!ticketId,
  });

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      const r = await fetch(`${API}/admin/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ body }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to send reply.");
      }
      return r.json();
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      qc.invalidateQueries({ queryKey: ["admin-support-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Reply sent.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send."),
  });

  const statusMutation = useMutation({
    mutationFn: async (next: { status?: string; priority?: string }) => {
      const r = await fetch(`${API}/admin/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(next),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update.");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      qc.invalidateQueries({ queryKey: ["admin-support-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Ticket updated.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update."),
  });

  const t = data?.ticket;
  const messages = data?.messages ?? [];

  return (
    <Dialog open={!!ticketId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        {isLoading || !t ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 py-4 border-b border-border space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{t.ref}</span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize",
                  PRIORITY_COLORS[t.priority],
                )}>
                  {t.priority}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground capitalize">
                  {t.category.replace("_", " ")}
                </span>
              </div>
              <DialogTitle className="text-base">{t.subject}</DialogTitle>
              <DialogDescription className="text-xs">
                {t.tenant_name ?? "Unknown workshop"} · {t.contact_name} ({t.contact_email}) · opened {fmtDateTime(t.created_at)}
              </DialogDescription>
            </DialogHeader>

            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-border flex items-center gap-2 flex-wrap bg-muted/20">
              <Select
                value={t.status}
                onValueChange={(v) => statusMutation.mutate({ status: v })}
                disabled={statusMutation.isPending}
              >
                <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="waiting_on_customer">Waiting on customer</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={t.priority}
                onValueChange={(v) => statusMutation.mutate({ priority: v })}
                disabled={statusMutation.isPending}
              >
                <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="ml-auto w-8 h-8" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[200px]">
              {messages.map((m) => (
                <div key={m.id} className={cn(
                  "rounded-lg border p-3.5 text-sm",
                  m.author_type === "platform"
                    ? "bg-primary/5 border-primary/20 ml-6"
                    : "bg-muted/30 border-border mr-6",
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {m.author_name}
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground capitalize">
                        · {m.author_type === "platform" ? "Support" : "Workshop"}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{fmtDateTime(m.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No messages yet.</p>
              )}
            </div>

            {/* Reply box */}
            <div className="border-t border-border px-6 py-3 space-y-2 bg-background">
              <Textarea
                placeholder="Reply to the workshop…"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={replyMutation.isPending}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => reply.trim() && replyMutation.mutate(reply.trim())}
                  disabled={!reply.trim() || replyMutation.isPending}
                  className="gap-1.5"
                >
                  {replyMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
                    : <><Send className="w-3.5 h-3.5" />Send reply</>}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
