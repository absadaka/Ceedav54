import { TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const MRR_DATA = [1045, 1194, 1343, 1641, 1790, 2088];
const NEW_MRR = [149, 149, 298, 149, 298, 149];
const CHURNED = [0, 0, 0, -149, 0, 0];
const EXPANSION = [0, 0, 0, 298, 0, 149];

function StatCard({ label, value, change, positive, icon: Icon }: {
  label: string; value: string; change?: string; positive?: boolean; icon: React.ElementType;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-3xl font-semibold text-foreground tabular-nums">{value}</p>
      {change && (
        <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", positive ? "text-emerald-600" : "text-red-500")}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
  );
}

function BarChart({ data, labels, color, maxVal }: { data: number[]; labels: string[]; color: string; maxVal?: number }) {
  const max = maxVal ?? Math.max(...data.map(Math.abs), 1);
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
            {v >= 0 ? `${v}` : `${v}`}
          </span>
          <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
            <div
              className={cn("w-full rounded-t", color)}
              style={{ height: `${Math.max((Math.abs(v) / max) * 100, 2)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueAnalyticsPage() {
  const currentMrr = MRR_DATA[MRR_DATA.length - 1];
  const prevMrr = MRR_DATA[MRR_DATA.length - 2];
  const mrrGrowth = ((currentMrr - prevMrr) / prevMrr * 100).toFixed(1);
  const arr = currentMrr * 12;
  const netNew = NEW_MRR[NEW_MRR.length - 1] + (CHURNED[CHURNED.length - 1]) + (EXPANSION[EXPANSION.length - 1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">MRR / ARR Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Monthly and annual recurring revenue metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Current MRR" value={`AED ${currentMrr.toLocaleString()}`} change={`${mrrGrowth}% vs last month`} positive={parseFloat(mrrGrowth) > 0} icon={DollarSign} />
        <StatCard label="ARR" value={`AED ${arr.toLocaleString()}`} change="Annualized MRR" positive icon={TrendingUp} />
        <StatCard label="Net New MRR" value={`AED ${netNew}`} change="This month" positive={netNew > 0} icon={BarChart3} />
        <StatCard label="MRR Growth Rate" value={`${mrrGrowth}%`} change="Month-over-month" positive={parseFloat(mrrGrowth) > 0} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm font-semibold text-foreground mb-4">MRR Trend</p>
          <BarChart data={MRR_DATA} labels={MONTHS} color="bg-primary" />
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm font-semibold text-foreground mb-4">New MRR</p>
          <BarChart data={NEW_MRR} labels={MONTHS} color="bg-emerald-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Expansion MRR</p>
          <BarChart data={EXPANSION} labels={MONTHS} color="bg-blue-400" />
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm font-semibold text-foreground mb-1">MRR Breakdown</p>
          <p className="text-xs text-muted-foreground mb-4">Current month composition</p>
          <div className="space-y-3">
            {[
              { label: "Professional (14)", value: "AED 2,086", pct: 83, color: "bg-primary" },
              { label: "Enterprise (3)", value: "AED 1,497", pct: 60, color: "bg-purple-500" },
              { label: "Add-ons", value: "AED 505", pct: 20, color: "bg-emerald-400" },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground">{row.label}</span>
                  <span className="font-medium text-foreground tabular-nums">{row.value}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", row.color)} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
