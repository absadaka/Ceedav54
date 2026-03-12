import { CalendarCheck, Wrench, ReceiptText, TrendingUp, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Today's bookings",    value: "—", sub: "No data yet",   icon: CalendarCheck, color: "text-blue-500" },
  { label: "Active jobs",         value: "—", sub: "No data yet",   icon: Wrench,        color: "text-amber-500" },
  { label: "Outstanding invoices",value: "—", sub: "No data yet",   icon: ReceiptText,   color: "text-red-500" },
  { label: "Revenue this month",  value: "—", sub: "No data yet",   icon: TrendingUp,    color: "text-green-500" },
];

const quickActions = [
  { label: "New booking",   href: "/bookings/new",   desc: "Schedule an appointment" },
  { label: "New quotation", href: "/quotations/new", desc: "Create a price estimate" },
  { label: "Add client",    href: "/clients/new",    desc: "Register a new customer" },
];

const setupSteps = [
  { done: false, label: "Add your first service",    href: "/settings/services" },
  { done: false, label: "Create your first booking", href: "/bookings/new" },
  { done: false, label: "Invite a team member",      href: "/settings/team" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Good morning — here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings/new">
            <Button size="sm">New booking</Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-3xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Setup checklist */}
        <Card className="border-border shadow-none lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Get started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {setupSteps.map((step, i) => (
              <Link href={step.href} key={i}>
                <div className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors cursor-pointer group">
                  <div className="w-5 h-5 rounded-full border-2 border-border group-hover:border-primary transition-colors shrink-0" />
                  <span className="text-sm text-foreground">{step.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-border shadow-none lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Link href={action.href} key={action.href}>
                <div className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors cursor-pointer group">
                  <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent activity placeholder */}
        <Card className="border-border shadow-none lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarCheck className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">Actions taken by your team will appear here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
