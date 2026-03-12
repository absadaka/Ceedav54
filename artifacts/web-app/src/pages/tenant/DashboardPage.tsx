import { CalendarCheck, Wrench, ReceiptText, TrendingUp, ArrowRight, Plus, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageLoad } from "@/hooks/usePageLoad";

const kpis = [
  { label: "Today's bookings",    icon: CalendarCheck, color: "text-blue-500",  bg: "bg-blue-50" },
  { label: "Active jobs",         icon: Wrench,        color: "text-amber-500", bg: "bg-amber-50" },
  { label: "Outstanding invoices",icon: ReceiptText,   color: "text-red-500",   bg: "bg-red-50" },
  { label: "Revenue this month",  icon: TrendingUp,    color: "text-emerald-500",bg: "bg-emerald-50" },
];

const quickActions = [
  { label: "New booking",   href: "/bookings/new",   desc: "Schedule an appointment" },
  { label: "New quotation", href: "/quotations/new", desc: "Create a price estimate" },
  { label: "Add customer",  href: "/customers/new",  desc: "Register a new customer" },
];

const setupSteps = [
  { label: "Add your first service",    href: "/settings" },
  { label: "Create your first booking", href: "/bookings/new" },
  { label: "Invite a team member",      href: "/team" },
];

function KpiSkeleton() {
  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-2.5 w-20" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const loading = usePageLoad();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Good morning — here's what's happening today.
          </p>
        </div>
        <Link href="/bookings/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />New booking
          </Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? kpis.map((k) => <KpiSkeleton key={k.label} />)
          : kpis.map((stat) => (
              <Card key={stat.label} className="border-border shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <div className={`w-8 h-8 rounded-md ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">—</p>
                  <p className="text-xs text-muted-foreground mt-1">No data yet</p>
                </CardContent>
              </Card>
            ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Setup checklist */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-[14px] font-semibold">Get started</CardTitle>
            <p className="text-xs text-muted-foreground">Complete these steps to set up your workshop.</p>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-1">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5">
                    <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                  </div>
                ))
              : setupSteps.map((step) => (
                  <Link href={step.href} key={step.label}>
                    <div className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors cursor-pointer group">
                      <div className="w-5 h-5 rounded-full border-2 border-border group-hover:border-primary transition-colors shrink-0" />
                      <span className="text-sm text-foreground flex-1">{step.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))
            }
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-[14px] font-semibold">Quick actions</CardTitle>
            <p className="text-xs text-muted-foreground">Jump to the most common tasks.</p>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-1">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5">
                    <Skeleton className="w-7 h-7 rounded-md shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-36" />
                    </div>
                  </div>
                ))
              : quickActions.map((action) => (
                  <Link href={action.href} key={action.href}>
                    <div className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors cursor-pointer group">
                      <div className="w-7 h-7 rounded-md bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        <Plus className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.desc}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))
            }
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-[14px] font-semibold">Recent activity</CardTitle>
            <p className="text-xs text-muted-foreground">Latest actions from your team.</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                    <Skeleton className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                ))
              : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Team actions will appear here.
                  </p>
                </div>
              )
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
