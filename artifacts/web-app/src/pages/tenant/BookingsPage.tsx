import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  CalendarCheck, Plus, Search, Calendar, Clock,
  User, Car, ChevronRight, MoreHorizontal, CheckCircle2,
  XCircle, RefreshCw, List, ChevronLeft,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import BookingDrawer, { type BookingRow } from "@/components/BookingDrawer";
import { cn } from "@/lib/utils";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  pending:     { label: "Pending",     color: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-400" },
  confirmed:   { label: "Confirmed",   color: "bg-blue-100 text-blue-800 border-blue-200",       dot: "bg-blue-400" },
  checked_in:  { label: "Checked In",  color: "bg-indigo-100 text-indigo-800 border-indigo-200", dot: "bg-indigo-400" },
  in_progress: { label: "In Progress", color: "bg-violet-100 text-violet-800 border-violet-200", dot: "bg-violet-400" },
  completed:   { label: "Completed",   color: "bg-green-100 text-green-800 border-green-200",    dot: "bg-green-500" },
  cancelled:   { label: "Cancelled",   color: "bg-red-100 text-red-800 border-red-200",          dot: "bg-red-400" },
  no_show:     { label: "No-show",     color: "bg-gray-100 text-gray-600 border-gray-200",       dot: "bg-gray-400" },
};

const SOURCE_LABEL: Record<string, string> = {
  phone: "Phone", walk_in: "Walk-in", online: "Online", whatsapp: "WhatsApp", referral: "Referral",
};

const DATE_PRESETS = [
  { value: "today",     label: "Today" },
  { value: "tomorrow",  label: "Tomorrow" },
  { value: "this_week", label: "This week" },
  { value: "all",       label: "All dates" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function d0(d: Date) { return d.toISOString().slice(0, 10); }

function dateRange(preset: string): { date_from?: string; date_to?: string } {
  const now = new Date();
  if (preset === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { date_from: d0(start), date_to: d0(new Date(start.getTime() + 86400000)) };
  }
  if (preset === "tomorrow") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { date_from: d0(start), date_to: d0(new Date(start.getTime() + 86400000)) };
  }
  if (preset === "this_week") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return { date_from: d0(start), date_to: d0(new Date(start.getTime() + 7 * 86400000)) };
  }
  return {};
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end   = new Date(year, month + 1, 1);
  return { date_from: d0(start), date_to: d0(end) };
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-5 py-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

/* ─── Calendar View ────────────────────────────────────────────────────── */
function CalendarView({
  year, month, rows, onNavigate, onBookingClick,
}: {
  year: number; month: number; rows: BookingRow[];
  onNavigate: (dir: -1 | 1) => void;
  onBookingClick: (row: BookingRow) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = d0(new Date());

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const byDay = new Map<string, BookingRow[]>();
  for (const row of rows) {
    const key = row.scheduled_at.slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(row);
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNavigate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNavigate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map(wd => (
          <div key={wd} className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 divide-x divide-border">
        {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
          cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
            const key = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
            const dayRows = key ? (byDay.get(key) ?? []) : [];
            const isToday = key === today;
            const visible = dayRows.slice(0, 3);
            const overflow = dayRows.length - visible.length;

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={cn(
                  "min-h-[96px] p-1.5 border-b border-border relative",
                  !day && "bg-muted/20",
                )}
              >
                {day && (
                  <>
                    <span className={cn(
                      "inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1",
                      isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {visible.map(row => {
                        const sm = STATUS_META[row.status] ?? { color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" };
                        return (
                          <button
                            key={row.id}
                            className={cn(
                              "w-full text-left rounded px-1.5 py-0.5 flex items-center gap-1 text-[11px] font-medium truncate",
                              sm.color,
                              "border hover:opacity-80 transition-opacity",
                            )}
                            onClick={() => onBookingClick(row)}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sm.dot)} />
                            <span className="truncate">{fmtTime(row.scheduled_at)} {row.client_name ?? "Walk-in"}</span>
                          </button>
                        );
                      })}
                      {overflow > 0 && (
                        <p className="text-[10px] text-muted-foreground px-1">+{overflow} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function BookingsPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [viewMode,     setViewMode]     = useState<"list" | "calendar">("list");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset,   setDatePreset]   = useState("today");
  const [calDate,      setCalDate]      = useState(() => new Date());
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editing,      setEditing]      = useState<BookingRow | null>(null);

  const calYear  = calDate.getFullYear();
  const calMonth = calDate.getMonth();

  const range = viewMode === "calendar"
    ? monthRange(calYear, calMonth)
    : dateRange(datePreset);

  const params = new URLSearchParams({
    tenant: TENANT,
    ...(search && viewMode === "list" ? { q: search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(range.date_from ? { date_from: range.date_from } : {}),
    ...(range.date_to   ? { date_to:   range.date_to   } : {}),
    limit: "200",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", search, statusFilter, datePreset, viewMode, calYear, calMonth],
    queryFn: () => fetch(`${API}/api/bookings?${params}`).then(r => r.json()),
    refetchInterval: 60_000,
  });

  const rows: BookingRow[] = data?.rows    ?? [];
  const summary: any[]     = data?.summary ?? [];
  const sumFor = (s: string) => summary.find((x: any) => x.status === s)?.count ?? 0;

  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`${API}/api/bookings/${id}/status?tenant=${TENANT}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBk = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/api/bookings/${id}?tenant=${TENANT}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); toast.success("Booking deleted"); },
  });

  const handleSearch = useCallback((v: string) => setSearch(v), []);

  const navigateMonth = (dir: -1 | 1) => {
    setCalDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Bookings</h1>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
          <Plus className="w-4 h-4" />New booking
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today · Pending"     value={sumFor("pending")}     color="text-yellow-600" />
        <StatCard label="Today · Confirmed"   value={sumFor("confirmed")}   color="text-blue-600" />
        <StatCard label="Today · In Progress" value={sumFor("in_progress")} color="text-violet-600" />
        <StatCard label="Today · Completed"   value={sumFor("completed")}   color="text-green-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 text-sm transition-colors",
              viewMode === "list" ? "bg-muted font-medium" : "hover:bg-muted/50 text-muted-foreground",
            )}
            onClick={() => setViewMode("list")}
          >
            <List className="w-3.5 h-3.5" />List
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 text-sm border-l border-border transition-colors",
              viewMode === "calendar" ? "bg-muted font-medium" : "hover:bg-muted/50 text-muted-foreground",
            )}
            onClick={() => setViewMode("calendar")}
          >
            <Calendar className="w-3.5 h-3.5" />Calendar
          </button>
        </div>

        {/* Only show list filters in list mode */}
        {viewMode === "list" && (
          <>
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search bookings…"
                className="pl-9 h-8 text-sm"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>

            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_META).map(([v, m]) => (
              <SelectItem key={v} value={v}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Calendar View ── */}
      {viewMode === "calendar" ? (
        isLoading ? (
          <div className="rounded-lg border border-border bg-background p-8 flex items-center justify-center">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <CalendarView
            year={calYear}
            month={calMonth}
            rows={rows}
            onNavigate={navigateMonth}
            onBookingClick={row => navigate(`/bookings/${row.id}`)}
          />
        )
      ) : (
        /* ── List / Table View ── */
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date & time</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Vehicle</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Source</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Advisor</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-full" /></td>
                      ))}
                      <td />
                    </tr>
                  ))
                : rows.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <CalendarCheck className="w-10 h-10 text-muted-foreground/20" />
                          <p className="text-[15px] font-medium text-muted-foreground">No bookings found</p>
                          <p className="text-sm text-muted-foreground/70">Try a different date range or create a new booking.</p>
                          <Button size="sm" className="mt-1 gap-1.5" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
                            <Plus className="w-4 h-4" />New booking
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                  : rows.map(row => {
                    const sm = STATUS_META[row.status] ?? { label: row.status, color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" };
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/bookings/${row.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {fmt(row.scheduled_at)}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{row.ref} · {row.duration_min} min</p>
                        </td>
                        <td className="px-4 py-3">
                          {row.client_name
                            ? <div className="flex items-center gap-1.5"><User className="w-3 h-3 text-muted-foreground" /><span className="font-medium">{row.client_name}</span></div>
                            : <span className="text-muted-foreground text-xs italic">Walk-in</span>
                          }
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {row.plate_number
                            ? <div className="flex items-center gap-1.5 text-xs"><Car className="w-3 h-3 text-muted-foreground" /><span className="font-mono font-medium">{row.plate_number}</span>{row.vehicle_make ? <span className="text-muted-foreground">· {row.vehicle_make}</span> : null}</div>
                            : <span className="text-muted-foreground text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${sm.color}`}>
                            {sm.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                          {SOURCE_LABEL[row.source] ?? row.source}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {row.advisor_name ?? <span className="italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-sm w-44">
                              <DropdownMenuItem onClick={() => navigate(`/bookings/${row.id}`)}>
                                <ChevronRight className="w-3.5 h-3.5 mr-2" />View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditing(row); setDrawerOpen(true); }}>
                                Edit booking
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {row.status === "pending" && (
                                <DropdownMenuItem onClick={() => transition.mutate({ id: row.id, status: "confirmed" })}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-blue-600" />Confirm
                                </DropdownMenuItem>
                              )}
                              {(row.status === "confirmed" || row.status === "pending") && (
                                <DropdownMenuItem onClick={() => transition.mutate({ id: row.id, status: "checked_in" })}>
                                  Check in
                                </DropdownMenuItem>
                              )}
                              {row.status === "checked_in" && (
                                <DropdownMenuItem onClick={() => transition.mutate({ id: row.id, status: "in_progress" })}>
                                  <RefreshCw className="w-3.5 h-3.5 mr-2 text-violet-600" />Start service
                                </DropdownMenuItem>
                              )}
                              {!["completed", "cancelled", "no_show"].includes(row.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => transition.mutate({ id: row.id, status: "completed" })}>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-green-600" />Mark completed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => transition.mutate({ id: row.id, status: "cancelled" })} className="text-red-600">
                                    <XCircle className="w-3.5 h-3.5 mr-2" />Cancel
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => transition.mutate({ id: row.id, status: "no_show" })} className="text-muted-foreground">
                                    No-show
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { if (confirm("Delete this booking?")) deleteBk.mutate(row.id); }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      )}

      <BookingDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        booking={editing}
      />
    </div>
  );
}
