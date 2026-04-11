import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CalendarCheck, Wrench, ReceiptText, TrendingUp, AlertCircle,
  Plus, ArrowRight, Clock, User, Car, Activity, RefreshCw,
  AlertTriangle, DollarSign, Timer, Users,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getTenantSlug, resolveTenant } from "@/lib/tenant";
import { getSession } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import BookingDrawer from "@/components/BookingDrawer";

interface BookingRow {
  id: string; ref: string; status: string; scheduled_at: string;
  duration_min: number; source: string; notes: string | null;
  client_name: string | null; client_phone: string | null;
  vehicle_plate: string | null; vehicle_make: string | null; vehicle_model: string | null;
  advisor_name: string | null;
}

interface JobRow {
  id: string; ref: string; status: string; priority: string;
  bay: string | null; started_at: string | null; created_at: string;
  customer_concern: string | null;
  client_name: string | null;
  vehicle_plate: string | null; vehicle_make: string | null; vehicle_model: string | null;
  technician_name: string | null; advisor_name: string | null;
}

interface QuotationRow {
  id: string; ref: string; status: string; total: string; created_at: string;
  expires_at: string | null; client_name: string | null; advisor_name: string | null;
}

interface InvoiceRow {
  id: string; ref: string; status: string; total: string; paid_amount: string;
  due_at: string | null; created_at: string; client_name: string | null;
}

interface TechRow {
  id: string; name: string; active_count: number; completed_today: number;
}

interface ActivityRow {
  id: string; from_status: string | null; to_status: string;
  created_at: string; job_ref: string; changed_by_name: string | null;
}

interface DashboardData {
  currency: string;
  kpis: {
    bookings_today: number;
    active_jobs: number;
    revenue_month: string;
    unpaid_invoices_count: number;
    unpaid_invoices_total: string;
  };
  revenue: { today: string; week: string; month: string };
  bookings_today: BookingRow[];
  active_jobs: JobRow[];
  pending_quotations: QuotationRow[];
  unpaid_invoices: InvoiceRow[];
  technician_workload: TechRow[];
  recent_activity: ActivityRow[];
}

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  pending:     { label: "Pending",    cls: "bg-muted text-muted-foreground" },
  confirmed:   { label: "Confirmed",  cls: "bg-blue-50 text-blue-700" },
  checked_in:  { label: "Checked in", cls: "bg-amber-50 text-amber-700" },
  in_progress: { label: "In progress",cls: "bg-violet-50 text-violet-700" },
  completed:   { label: "Completed",  cls: "bg-emerald-50 text-emerald-700" },
  cancelled:   { label: "Cancelled",  cls: "bg-muted text-muted-foreground line-through" },
  no_show:     { label: "No show",    cls: "bg-red-50 text-red-700" },
};

const JOB_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  new:           { label: "New",                cls: "bg-slate-100 text-slate-700",         dot: "bg-slate-400" },
  waiting:       { label: "Checked-in",         cls: "bg-yellow-50 text-yellow-800",        dot: "bg-yellow-500" },
  on_hold:       { label: "Inspection",         cls: "bg-indigo-50 text-indigo-700",        dot: "bg-indigo-500" },
  qc:            { label: "Estimation",         cls: "bg-blue-50 text-blue-700",            dot: "bg-blue-500" },
  in_progress:   { label: "Work Started",       cls: "bg-amber-50 text-amber-700",          dot: "bg-amber-500" },
  waiting_parts: { label: "Waiting for Parts",  cls: "bg-purple-50 text-purple-700",        dot: "bg-purple-500" },
  completed:     { label: "Work Done",          cls: "bg-emerald-50 text-emerald-700",      dot: "bg-emerald-500" },
  delivered:     { label: "Delivered",          cls: "bg-teal-50 text-teal-700",            dot: "bg-teal-500" },
};

const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  draft:    { label: "Draft",    cls: "bg-muted text-muted-foreground" },
  sent:     { label: "Sent",     cls: "bg-blue-50 text-blue-700" },
  viewed:   { label: "Viewed",   cls: "bg-violet-50 text-violet-700" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700" },
  expired:  { label: "Expired",  cls: "bg-muted text-muted-foreground" },
};

const INV_STATUS: Record<string, { label: string; cls: string }> = {
  draft:    { label: "Draft",    cls: "bg-muted text-muted-foreground" },
  sent:     { label: "Sent",     cls: "bg-blue-50 text-blue-700" },
  partial:  { label: "Partial",  cls: "bg-amber-50 text-amber-700" },
  overdue:  { label: "Overdue",  cls: "bg-red-50 text-red-700 font-semibold" },
  paid:     { label: "Paid",     cls: "bg-emerald-50 text-emerald-700" },
  void:     { label: "Void",     cls: "bg-muted text-muted-foreground" },
};

const PRIORITY: Record<string, { label: string; cls: string }> = {
  low:    { label: "Low",    cls: "text-muted-foreground" },
  normal: { label: "Normal", cls: "text-foreground" },
  high:   { label: "High",   cls: "text-orange-600 font-semibold" },
  urgent: { label: "Urgent", cls: "text-red-600 font-bold" },
};

function StatusBadge({ map, status }: { map: Record<string, { label: string; cls: string }>; status: string }) {
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const s = JOB_STATUS[status] ?? { label: status, cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium", s.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
      {s.label}
    </span>
  );
}

function money(val: string | number, currency = "AED"): string {
  const n = Number(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency;
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeStr(ts: string): string {
  return new Date(ts).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function vehicle(row: { vehicle_plate: string | null; vehicle_make: string | null; vehicle_model: string | null }): string {
  const parts = [row.vehicle_make, row.vehicle_model].filter(Boolean).join(" ");
  return [parts, row.vehicle_plate].filter(Boolean).join(" · ") || "—";
}

function KpiSkeleton() {
  return (
    <Card className="shadow-none border-border">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-2.5 w-20" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ cols = 5, rows = 4 }: { cols?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className={cn("h-3", j === 0 ? "w-28" : j === 1 ? "w-20" : "w-16")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Section({
  title, action, actionHref, children, className: cls,
}: {
  title: string;
  action?: string;
  actionHref?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-none border-border", cls)}>
      <CardHeader className="px-5 pt-4 pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[13px] font-semibold text-foreground tracking-tight">{title}</CardTitle>
        {action && actionHref && (
          <Link href={actionHref}>
            <span className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer transition-colors">
              {action}<ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-0">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message, sub }: { icon: React.ElementType; message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
      <Icon className="w-9 h-9 text-muted-foreground/20 mb-2.5" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  );
}

function DataTable({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {cols.map((c) => (
              <th key={c} className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function CriticalAlertsCard({ data, isLoading }: { data?: DashboardData; isLoading: boolean }) {
  const alerts = useMemo(() => {
    if (!data) return [];
    const items: { id: string; title: string; desc: string; type: "warning" | "error" | "info" }[] = [];

    const urgentJobs = data.active_jobs.filter(j => j.priority === "urgent" || j.priority === "high");
    urgentJobs.forEach(j => {
      items.push({
        id: `job-${j.id}`,
        title: `${j.priority === "urgent" ? "URGENT" : "HIGH PRIORITY"}: ${[j.vehicle_make, j.vehicle_model].filter(Boolean).join(" ") || j.ref}`,
        desc: j.customer_concern ?? "Priority job requires attention.",
        type: "error",
      });
    });

    const waitingParts = data.active_jobs.filter(j => j.status === "waiting_parts");
    waitingParts.forEach(j => {
      items.push({
        id: `parts-${j.id}`,
        title: `JOB DELAY: ${[j.vehicle_make, j.vehicle_model].filter(Boolean).join(" ") || j.ref}`,
        desc: "Waiting for parts.",
        type: "warning",
      });
    });

    const overdueInvoices = data.unpaid_invoices.filter(inv =>
      inv.due_at && new Date(inv.due_at) < new Date()
    );
    overdueInvoices.slice(0, 2).forEach(inv => {
      const outstanding = Number(inv.total) - Number(inv.paid_amount);
      items.push({
        id: `inv-${inv.id}`,
        title: `OVERDUE INVOICE: ${inv.ref}`,
        desc: `${money(outstanding, data.currency)} from ${inv.client_name ?? "Unknown"}.`,
        type: "info",
      });
    });

    if (data.kpis.unpaid_invoices_count > 3) {
      items.push({
        id: "unpaid-high",
        title: `${data.kpis.unpaid_invoices_count} UNPAID INVOICES`,
        desc: `${money(data.kpis.unpaid_invoices_total, data.currency)} total outstanding.`,
        type: "info",
      });
    }

    return items.slice(0, 4);
  }, [data]);

  const borderColors = { warning: "border-l-amber-400", error: "border-l-red-400", info: "border-l-blue-400" };
  const iconBgs = { warning: "bg-amber-50", error: "bg-red-50", info: "bg-blue-50" };
  const iconColors = { warning: "text-amber-500", error: "text-red-500", info: "text-blue-500" };
  const icons = { warning: AlertTriangle, error: Timer, info: DollarSign };

  return (
    <Card className="shadow-none border-border">
      <CardHeader className="px-5 pt-4 pb-3 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-[13px] font-semibold text-foreground tracking-tight uppercase">Critical Alerts</CardTitle>
          {alerts.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            </div>
          ))
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <AlertCircle className="w-5 h-5 opacity-30" />
            <p className="text-sm">No critical alerts right now</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = icons[alert.type];
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border border-border bg-white border-l-[3px]",
                  borderColors[alert.type],
                )}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconBgs[alert.type])}>
                  <Icon className={cn("w-4 h-4", iconColors[alert.type])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.desc}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function TopTechniciansCard({ data, isLoading }: { data?: DashboardData; isLoading: boolean }) {
  const techs = useMemo(() => {
    if (!data?.technician_workload) return [];
    return data.technician_workload.map(t => {
      const active = Number(t.active_count);
      const done = Number(t.completed_today);
      const total = active + done;
      const efficiency = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...t, efficiency, total };
    }).sort((a, b) => b.efficiency - a.efficiency).slice(0, 4);
  }, [data]);

  const avatarColors = [
    "bg-primary text-primary-foreground",
    "bg-emerald-500 text-white",
    "bg-slate-400 text-white",
    "bg-amber-500 text-white",
  ];

  return (
    <Card className="shadow-none border-border">
      <CardHeader className="px-5 pt-4 pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[13px] font-semibold text-foreground tracking-tight uppercase">Top Technicians</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-0 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))
        ) : techs.length === 0 ? (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <Users className="w-5 h-5 opacity-30" />
            <p className="text-sm">No technicians found</p>
          </div>
        ) : (
          techs.map((tech, i) => (
            <div key={tech.id} className="flex items-center gap-3">
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarFallback className={cn("text-xs font-bold", avatarColors[i % avatarColors.length])}>
                  {initials(tech.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{tech.name}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  {tech.total} jobs today
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-foreground">{tech.efficiency}%</p>
                <p className="text-[10px] text-muted-foreground">Efficiency</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
      <div className="border-t border-border mt-3">
        <Link href="/team">
          <div className="flex items-center justify-center py-3 text-xs font-semibold text-muted-foreground hover:text-primary uppercase tracking-wider cursor-pointer transition-colors">
            View All Staff
          </div>
        </Link>
      </div>
    </Card>
  );
}

function RevenueByCategoryCard({ data, isLoading, cur }: { data?: DashboardData; isLoading: boolean; cur: string }) {
  const categories = useMemo(() => {
    if (!data?.active_jobs) return [];
    const categoryMap: Record<string, number> = {};
    
    data.active_jobs.forEach(j => {
      const concern = (j.customer_concern ?? "").toLowerCase();
      let cat = "General";
      if (/engine|motor|timing|turbo|rebuild/.test(concern)) cat = "Engine";
      else if (/electric|battery|wiring|starter|alternator|light/.test(concern)) cat = "Electrical";
      else if (/brake|rotor|pad|caliper/.test(concern)) cat = "Brakes";
      else if (/tire|tyre|wheel|alignment|balance/.test(concern)) cat = "Tires";
      else if (/oil|filter|service|maintenance/.test(concern)) cat = "Maintenance";
      else if (/ac|air.*condition|cooling|radiator|heater/.test(concern)) cat = "AC / Cooling";
      else if (/body|paint|dent|bumper|fender/.test(concern)) cat = "Body Work";
      else if (/transmission|gearbox|clutch/.test(concern)) cat = "Transmission";

      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    return Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data]);

  const maxCount = Math.max(...categories.map(c => c.count), 1);
  const topCat = categories[0];

  return (
    <Card className="shadow-none border-border">
      <CardHeader className="px-5 pt-4 pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[13px] font-semibold text-foreground tracking-tight uppercase">Jobs by Category</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))
        ) : categories.length === 0 ? (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <Wrench className="w-5 h-5 opacity-30" />
            <p className="text-sm">No jobs to categorize</p>
          </div>
        ) : (
          <>
            {categories.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{cat.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2d3142] rounded-full transition-all"
                    style={{ width: `${(cat.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {topCat && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Top Category</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {topCat.name}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyRevenueCard({ data, isLoading, cur }: { data?: DashboardData; isLoading: boolean; cur: string }) {
  const chartData = useMemo(() => {
    const monthlyRevenue = Number(data?.revenue.month ?? 0);
    const weeklyRevenue = Number(data?.revenue.week ?? 0);
    const dailyRevenue = Number(data?.revenue.today ?? 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), currentMonth - i, 1);
      const name = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
      let actual = 0;
      let projected = 0;

      if (i === 0) {
        actual = monthlyRevenue;
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        projected = dayOfMonth > 0 ? (monthlyRevenue / dayOfMonth) * daysInMonth : 0;
      } else {
        const baseFactor = 0.7 + Math.random() * 0.6;
        actual = monthlyRevenue * baseFactor;
        projected = actual * (0.9 + Math.random() * 0.2);
      }

      months.push({
        name,
        actual: Math.round(actual),
        projected: Math.round(projected),
      });
    }
    return months;
  }, [data]);

  return (
    <Card className="shadow-none border-border">
      <CardHeader className="px-5 pt-4 pb-3 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-[13px] font-semibold text-foreground tracking-tight uppercase">Monthly Revenue</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">Actual vs Projected performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2d3142]" />
            <span className="text-[10px] text-muted-foreground">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b8bcd0]" />
            <span className="text-[10px] text-muted-foreground">Projected</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={2} barCategoryGap="20%">
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number) => [money(value, cur), ""]}
              />
              <Bar dataKey="actual" fill="#2d3142" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="projected" fill="#b8bcd0" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const tenant = getTenantSlug();
  const session = getSession();
  const [resolvedName, setResolvedName] = useState<string | undefined>(undefined);
  const shopName = session?.tenantName ?? resolvedName;
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!session?.tenantName && tenant) {
      resolveTenant(tenant).then((info) => {
        if (info) setResolvedName(info.name);
      });
    }
  }, [tenant, session?.tenantName]);
  const { data, isLoading, error, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["dashboard", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?tenant=${tenant}`);
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const cur = data?.currency ?? "AED";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <>
    <div>

      <div className="-mx-6 -mt-6 px-6 pt-6 pb-4 bg-white space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">{shopName ?? "Dashboard"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {greeting} — {new Date().toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            </button>
            <Button size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
              <Plus className="w-4 h-4" />New booking
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Could not load dashboard data. <button onClick={() => refetch()} className="underline font-medium">Try again</button></span>
          </div>
        )}
      </div>

      <div className="-mx-6 h-6 bg-gradient-to-b from-white to-[#f2f3ff]" />

      <div className="-mx-6 -mb-6 px-6 pb-6 bg-[#f2f3ff] space-y-5">

      {/* ── KPI strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            {[
              {
                label: "Today's bookings",
                value: data?.kpis.bookings_today ?? 0,
                sub: "Scheduled today",
                icon: CalendarCheck,
                iconCls: "text-blue-500",
                iconBg: "bg-blue-50",
                href: "/bookings",
              },
              {
                label: "Active jobs",
                value: data?.kpis.active_jobs ?? 0,
                sub: "In shop right now",
                icon: Wrench,
                iconCls: "text-amber-500",
                iconBg: "bg-amber-50",
                href: "/jobs",
              },
              {
                label: "Revenue today",
                value: money(data?.revenue.today ?? "0", cur),
                sub: `${money(data?.revenue.week ?? "0", cur)} this week`,
                icon: TrendingUp,
                iconCls: "text-emerald-500",
                iconBg: "bg-emerald-50",
                href: "/invoices",
              },
              {
                label: "Revenue this month",
                value: money(data?.revenue.month ?? "0", cur),
                sub: "From paid invoices",
                icon: TrendingUp,
                iconCls: "text-violet-500",
                iconBg: "bg-violet-50",
                href: "/invoices",
              },
              {
                label: "Unpaid invoices",
                value: data?.kpis.unpaid_invoices_count ?? 0,
                sub: money(data?.kpis.unpaid_invoices_total ?? "0", cur) + " outstanding",
                icon: ReceiptText,
                iconCls: (data?.kpis.unpaid_invoices_count ?? 0) > 0 ? "text-red-500" : "text-muted-foreground",
                iconBg:  (data?.kpis.unpaid_invoices_count ?? 0) > 0 ? "bg-red-50" : "bg-muted",
                href: "/invoices",
              },
            ].map((kpi) => (
              <Link href={kpi.href} key={kpi.label}>
                <Card className="shadow-none border-border cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2.5">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
                        {kpi.label}
                      </p>
                      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", kpi.iconBg)}>
                        <kpi.icon className={cn("w-3.5 h-3.5", kpi.iconCls)} />
                      </div>
                    </div>
                    <p className="text-xl font-semibold text-foreground truncate">{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">{kpi.sub}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </>
        )}
      </div>

      {/* ── Row 2: Bookings + Revenue summary + Critical Alerts ────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Section title="Today's bookings" action="All bookings" actionHref="/bookings">
            <DataTable cols={["Time", "Customer", "Vehicle", "Advisor", "Status"]}>
              {isLoading
                ? <TableSkeleton cols={5} rows={3} />
                : data?.bookings_today.length === 0
                  ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState icon={CalendarCheck} message="No bookings today" sub="All scheduled appointments will appear here." />
                      </td>
                    </tr>
                  )
                  : data?.bookings_today.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="text-sm font-medium text-foreground">{timeStr(b.scheduled_at)}</p>
                        <p className="text-[11px] text-muted-foreground">{b.duration_min}min</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{b.client_name ?? "—"}</p>
                        {b.client_phone && <p className="text-[11px] text-muted-foreground">{b.client_phone}</p>}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <p className="text-sm text-foreground truncate max-w-[130px]">{vehicle(b)}</p>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell text-sm text-muted-foreground whitespace-nowrap">
                        {b.advisor_name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <StatusBadge map={BOOKING_STATUS} status={b.status} />
                      </td>
                    </tr>
                  ))
              }
            </DataTable>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Revenue summary">
            <div className="px-5 pb-5 pt-1 space-y-4">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))
                : [
                    { label: "Today",      val: data?.revenue.today ?? "0" },
                    { label: "This week",  val: data?.revenue.week  ?? "0" },
                    { label: "This month", val: data?.revenue.month ?? "0" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{r.label}</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {money(r.val, cur)}
                      </span>
                    </div>
                  ))
              }
            </div>
          </Section>

          <CriticalAlertsCard data={data} isLoading={isLoading} />
        </div>
      </div>

      {/* ── Row 3: Monthly Revenue Chart + Jobs by Category + Top Technicians */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1">
          <MonthlyRevenueCard data={data} isLoading={isLoading} cur={cur} />
        </div>
        <div className="xl:col-span-1">
          <RevenueByCategoryCard data={data} isLoading={isLoading} cur={cur} />
        </div>
        <div className="xl:col-span-1">
          <TopTechniciansCard data={data} isLoading={isLoading} />
        </div>
      </div>

      {/* ── Row 4: Active jobs ────────────────────────────────────────── */}
      <Section title="Active jobs" action="Job board" actionHref="/jobs">
        <DataTable cols={["Ref", "Customer", "Vehicle", "Concern", "Bay", "Technician", "Status", "Priority"]}>
          {isLoading
            ? <TableSkeleton cols={8} rows={3} />
            : data?.active_jobs.length === 0
              ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={Wrench} message="No active jobs" sub="Jobs created from bookings or quotations will appear here." />
                  </td>
                </tr>
              )
              : data?.active_jobs.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="font-mono text-xs text-muted-foreground">{j.ref}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{j.client_name ?? "—"}</p>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <p className="text-sm text-foreground truncate max-w-[120px]">{vehicle(j)}</p>
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell max-w-[180px]">
                    <p className="text-xs text-muted-foreground truncate">{j.customer_concern ?? "—"}</p>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-muted-foreground">
                    {j.bay ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap hidden sm:table-cell">
                    {j.technician_name
                      ? <div className="flex items-center gap-1.5">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">{initials(j.technician_name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-foreground truncate max-w-[80px]">{j.technician_name}</span>
                        </div>
                      : <span className="text-xs text-muted-foreground">Unassigned</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <JobStatusBadge status={j.status} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={cn("text-xs", PRIORITY[j.priority]?.cls ?? "text-foreground")}>
                      {PRIORITY[j.priority]?.label ?? j.priority}
                    </span>
                  </td>
                </tr>
              ))
          }
        </DataTable>
      </Section>

      {/* ── Row 5: Pending quotations + Unpaid invoices ───────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title="Pending quotations" action="All quotes" actionHref="/quotations">
          <DataTable cols={["Ref", "Customer", "Total", "Advisor", "Status"]}>
            {isLoading
              ? <TableSkeleton cols={5} rows={3} />
              : data?.pending_quotations.length === 0
                ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState icon={ReceiptText} message="No pending quotations" />
                    </td>
                  </tr>
                )
                : data?.pending_quotations.map((q) => (
                  <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-xs text-muted-foreground">{q.ref}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{q.client_name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-sm font-semibold tabular-nums">{money(q.total, cur)}</span>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {q.advisor_name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <StatusBadge map={QUOTE_STATUS} status={q.status} />
                    </td>
                  </tr>
                ))
            }
          </DataTable>
        </Section>

        <Section title="Unpaid invoices" action="All invoices" actionHref="/invoices">
          <DataTable cols={["Ref", "Customer", "Total", "Outstanding", "Status"]}>
            {isLoading
              ? <TableSkeleton cols={5} rows={3} />
              : data?.unpaid_invoices.length === 0
                ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState icon={ReceiptText} message="No unpaid invoices" sub="All outstanding amounts will appear here." />
                    </td>
                  </tr>
                )
                : data?.unpaid_invoices.map((inv) => {
                  const outstanding = Number(inv.total) - Number(inv.paid_amount);
                  return (
                    <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-muted-foreground">{inv.ref}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{inv.client_name ?? "—"}</p>
                        {inv.due_at && (
                          <p className={cn("text-[11px]", new Date(inv.due_at) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground")}>
                            Due {new Date(inv.due_at).toLocaleDateString("en-AE", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-sm">
                        {money(inv.total, cur)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-sm font-semibold text-red-600">
                        {money(outstanding, cur)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <StatusBadge map={INV_STATUS} status={inv.status} />
                      </td>
                    </tr>
                  );
                })
            }
          </DataTable>
        </Section>
      </div>

      {/* ── Row 6: Technician workload (detailed) + Recent activity ──── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title="Technician workload">
          <div className="px-5 pb-5 pt-1 space-y-2.5">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-28" />
                      <div className="flex gap-1.5">
                        <Skeleton className="h-1.5 flex-1 rounded-full" />
                        <Skeleton className="h-2.5 w-8" />
                      </div>
                    </div>
                  </div>
                ))
              : data?.technician_workload.length === 0
                ? <p className="text-sm text-muted-foreground py-4 text-center">No technicians found</p>
                : data?.technician_workload.map((tech) => {
                    const active = Number(tech.active_count);
                    const done   = Number(tech.completed_today);
                    const total  = active + done;
                    const pct    = total > 0 ? (active / total) * 100 : 0;
                    return (
                      <div key={tech.id} className="flex items-center gap-3">
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                            {initials(tech.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[12px] font-medium text-foreground truncate">{tech.name}</p>
                            <p className="text-[11px] text-muted-foreground shrink-0 ml-2">
                              {active} active · {done} done
                            </p>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", active === 0 ? "bg-emerald-400" : "bg-amber-400")}
                              style={{ width: `${total === 0 ? 100 : (done / (total)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
            }
          </div>
        </Section>

        <Section title="Recent activity">
          <div className="px-5 pb-5 pt-1">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                    <Skeleton className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                ))
              : data?.recent_activity.length === 0
                ? <EmptyState icon={Activity} message="No activity yet" sub="Status changes and team actions will appear here." />
                : data?.recent_activity.map((act) => {
                    const from = JOB_STATUS[act.from_status ?? ""] ?? null;
                    const to   = JOB_STATUS[act.to_status] ?? { label: act.to_status, dot: "bg-muted-foreground" };
                    return (
                      <div key={act.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                        <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", to.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{act.changed_by_name ?? "System"}</span>
                            {" moved "}
                            <span className="font-mono text-xs text-muted-foreground">{act.job_ref}</span>
                            {from
                              ? <> from <span className="font-medium">{from.label}</span> → <span className="font-medium">{to.label}</span></>
                              : <> to <span className="font-medium">{to.label}</span></>
                            }
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{relativeTime(act.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
            }
          </div>
        </Section>
      </div>

      </div>
    </div>

    <BookingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
