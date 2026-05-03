import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LifeBuoy, Search, Loader2, Send, ArrowLeft, MessageSquare,
  Clock, CheckCircle2, AlertCircle, Plus, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getTenantSlug } from "@/lib/tenant";
import { SupportDialog } from "@/components/SupportDialog";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TicketRow {
  id: string;
  ref: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  reply_count: number;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  unread: boolean;
}

interface Message {
  id: string;
  author_type: "tenant" | "platform" | "system";
  author_name: string;
  body: string;
  created_at: string;
}

interface TicketDetail {
  id: string;
  ref: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  reply_count: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, { label: string; tone: string; icon: any }> = {
  open:                { label: "Open",            tone: "bg-blue-50 text-blue-700 border-blue-200",       icon: AlertCircle },
  in_progress:         { label: "In progress",     tone: "bg-amber-50 text-amber-700 border-amber-200",    icon: Loader2 },
  waiting_on_customer: { label: "Waiting on you",  tone: "bg-violet-50 text-violet-700 border-violet-200", icon: Clock },
  resolved:            { label: "Resolved",        tone: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  closed:              { label: "Closed",          tone: "bg-gray-100 text-gray-600 border-gray-200",      icon: CheckCircle2 },
};

const PRIORITY_TONE: Record<string, string> = {
  low:    "text-gray-500",
  medium: "text-blue-600",
  high:   "text-orange-600",
  urgent: "text-red-600",
};

function fmtRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SupportPage() {
  const { user } = useAuth();
  const tenantSlug = getTenantSlug();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ tickets: TicketRow[]; unread_total: number }>({
    queryKey: ["tenant-tickets", tenantSlug, user?.userId, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenant_slug: tenantSlug,
        user_id: user?.userId ?? "",
      });
      if (filter !== "all") params.set("status", filter);
      const r = await fetch(`${API}/api/support/tickets?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load tickets");
      return r.json();
    },
    enabled: !!user?.userId,
    refetchInterval: 30_000,
  });

  const tickets = useMemo(() => {
    const list = data?.tickets ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (t) => t.ref.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-primary" />
            Support tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your conversations with the CEEDA support team and reply to ongoing tickets.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New ticket
        </Button>
      </div>

      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by reference or subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="waiting_on_customer">Waiting on you</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <LifeBuoy className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No tickets yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              When you open a ticket with CEEDA support, it will appear here so you can track replies and continue the conversation.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Open your first ticket
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {tickets.map((t) => {
              const meta = STATUS_META[t.status] ?? STATUS_META.open;
              const Icon = meta.icon;
              return (
                <li
                  key={t.id}
                  onClick={() => setOpenId(t.id)}
                  className="px-4 py-3.5 hover:bg-muted/40 cursor-pointer flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-medium text-muted-foreground">{t.ref}</span>
                      <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0 h-4 border", meta.tone)}>
                        <Icon className={cn("w-2.5 h-2.5 mr-1", t.status === "in_progress" && "animate-spin")} />
                        {meta.label}
                      </Badge>
                      {t.unread && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground border-0">
                          New reply
                        </Badge>
                      )}
                    </div>
                    <p className={cn("text-sm truncate", t.unread ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                      {t.subject}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className={cn("capitalize", PRIORITY_TONE[t.priority])}>{t.priority} priority</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {t.reply_count + 1} message{t.reply_count + 1 === 1 ? "" : "s"}
                      </span>
                      <span>·</span>
                      <span>Updated {fmtRelative(t.updated_at)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TicketThreadDialog
        ticketId={openId}
        onClose={() => { setOpenId(null); refetch(); }}
      />
      <SupportDialog open={newOpen} onOpenChange={(v) => { setNewOpen(v); if (!v) refetch(); }} />
    </div>
  );
}

/* ─── Thread dialog ─────────────────────────────────────────────────────── */

function TicketThreadDialog({ ticketId, onClose }: { ticketId: string | null; onClose: () => void }) {
  const { user } = useAuth();
  const tenantSlug = getTenantSlug();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ ticket: TicketDetail; messages: Message[] }>({
    queryKey: ["tenant-ticket", ticketId],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenant_slug: tenantSlug,
        user_id: user?.userId ?? "",
      });
      const r = await fetch(`${API}/api/support/tickets/${ticketId}?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load ticket");
      return r.json();
    },
    enabled: !!ticketId && !!user?.userId,
    refetchInterval: 15_000,
  });

  // Auto-scroll to the most recent message whenever new ones arrive.
  useEffect(() => {
    if (data?.messages?.length && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.messages?.length]);

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      const r = await fetch(`${API}/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          user_id: user?.userId,
          body,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to send reply.");
      }
      return r.json();
    },
    onSuccess: () => {
      setReply("");
      toast.success("Reply sent.");
      qc.invalidateQueries({ queryKey: ["tenant-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["tenant-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ticket   = data?.ticket;
  const messages = data?.messages ?? [];
  const meta     = ticket ? (STATUS_META[ticket.status] ?? STATUS_META.open) : null;
  const closed   = ticket?.status === "closed";

  return (
    <Dialog open={!!ticketId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-7 h-7 -ml-2 sm:hidden" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono text-muted-foreground">{ticket?.ref ?? "…"}</span>
            {meta && (
              <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0 h-4 border", meta.tone)}>
                {meta.label}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-base leading-tight pr-6">
            {isLoading ? <Skeleton className="h-5 w-2/3" /> : ticket?.subject}
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-muted/30">
          {isLoading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-3/4 ml-auto" />
            </>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
        </div>

        <div className="border-t border-border p-4 bg-background shrink-0">
          {closed ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              This ticket is closed. Please open a new one if you need further help.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (reply.trim().length === 0) return;
                replyMutation.mutate(reply.trim());
              }}
              className="space-y-2"
            >
              <Textarea
                placeholder="Reply to CEEDA support…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                maxLength={4000}
                disabled={replyMutation.isPending}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Replies are visible to the CEEDA support team only.
                </p>
                <Button
                  type="submit"
                  size="sm"
                  disabled={replyMutation.isPending || reply.trim().length === 0}
                >
                  {replyMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
                  ) : (
                    <><Send className="w-3.5 h-3.5 mr-1.5" />Send reply</>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isPlatform = message.author_type === "platform";
  const isSystem   = message.author_type === "system";

  if (isSystem) {
    return (
      <div className="text-center">
        <p className="text-[11px] text-muted-foreground italic">{message.body}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{fmtDateTime(message.created_at)}</p>
      </div>
    );
  }

  const initials = message.author_name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className={cn("flex gap-2.5", isPlatform ? "" : "flex-row-reverse")}>
      <Avatar className="w-7 h-7 shrink-0">
        <AvatarFallback className={cn(
          "text-[10px] font-semibold",
          isPlatform ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          {isPlatform ? "CS" : initials}
        </AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[78%] space-y-1", isPlatform ? "" : "items-end flex flex-col")}>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-foreground">
            {isPlatform ? "CEEDA Support" : message.author_name}
          </span>
          <span className="text-[10px] text-muted-foreground">{fmtDateTime(message.created_at)}</span>
        </div>
        <div className={cn(
          "text-sm whitespace-pre-wrap rounded-lg px-3 py-2 border",
          isPlatform
            ? "bg-background border-border text-foreground"
            : "bg-primary text-primary-foreground border-primary",
        )}>
          {message.body}
        </div>
      </div>
    </div>
  );
}
