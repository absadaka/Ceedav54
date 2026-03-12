import { Building2, Users, CreditCard, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const kpis = [
  { label: "Total tenants",        value: "—",  icon: Building2,   color: "text-blue-500" },
  { label: "Active users",          value: "—",  icon: Users,       color: "text-green-500" },
  { label: "MRR",                   value: "—",  icon: CreditCard,  color: "text-primary" },
  { label: "Growth (30d)",          value: "—",  icon: TrendingUp,  color: "text-emerald-500" },
];

const alerts = [
  { level: "warn",  message: "3 tenants approaching storage limit" },
  { level: "info",  message: "Scheduled maintenance: Sunday 02:00–04:00 UTC" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time health of the CEEDA platform.</p>
      </div>

      {/* Alerts */}
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm ${
            alert.level === "warn"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {alert.message}
        </div>
      ))}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-3xl font-semibold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">No data yet</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Recent tenant signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Building2 className="w-8 h-8 text-muted-foreground/25 mb-3" />
              <p className="text-sm text-muted-foreground">No signups yet</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Revenue trend (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground/25 mb-3" />
              <p className="text-sm text-muted-foreground">No billing data yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
