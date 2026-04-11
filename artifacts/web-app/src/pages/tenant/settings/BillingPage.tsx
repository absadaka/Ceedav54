import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Check, ArrowRight, Receipt, CalendarClock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type PlanData = {
  plan_key: string;
  name: string;
  monthly_price: number | null;
  annual_price: number | null;
  description: string;
  features: string[];
  badge: string | null;
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" });
}

export default function BillingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings", TENANT],
    queryFn: () => fetch(`${API}/api/settings?tenant=${TENANT}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: PlanData[] }>({
    queryKey: ["public-plans"],
    queryFn: () => fetch(`${API}/api/plans`).then((r) => r.json()),
    staleTime: 300_000,
  });

  const plan     = data?.tenant?.plan    ?? "starter";
  const status   = data?.tenant?.status  ?? "trial";
  const trialEnd = data?.tenant?.trial_ends_at;
  const plans    = plansData?.plans ?? [];

  return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="page-title">Billing & plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your subscription, payment methods and billing history.
          </p>
        </div>

        {isLoading ? (
          <div className="border border-border rounded-lg p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-8 w-28" />
          </div>
        ) : (
          <div className="bg-background border border-border rounded-lg p-5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground capitalize">{plan} plan</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-medium capitalize",
                    status === "active"   && "text-emerald-600 border-emerald-200 bg-emerald-50",
                    status === "trial"    && "text-blue-600 border-blue-200 bg-blue-50",
                    status === "past_due" && "text-amber-600 border-amber-200 bg-amber-50",
                    status === "suspended"&& "text-destructive border-destructive/20 bg-destructive/5",
                  )}
                >
                  {status.replace("_", " ")}
                </Badge>
              </div>
              {status === "trial" && trialEnd && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Trial ends {fmtDate(trialEnd)}
                </p>
              )}
              {status === "past_due" && (
                <p className="text-xs text-amber-600">Payment overdue — please update your payment method.</p>
              )}
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
              <CreditCard className="w-3.5 h-3.5" />Manage billing
            </Button>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Available plans
          </p>
          {plansLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {plans.map((p) => {
                const isCurrent = p.plan_key === plan;
                return (
                  <div
                    key={p.plan_key}
                    className={cn(
                      "relative rounded-lg border p-5 flex flex-col gap-4 bg-background",
                      p.badge ? "border-primary" : "border-border",
                      isCurrent && "ring-2 ring-primary/20",
                    )}
                  >
                    {p.badge && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                        {p.badge}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute top-3 right-3 text-[10px] font-medium text-primary">Current</span>
                    )}

                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      <div className="flex items-baseline gap-0.5 mt-1">
                        {p.monthly_price !== null ? (
                          <>
                            <span className="text-xl font-bold text-foreground">${p.monthly_price}</span>
                            <span className="text-xs text-muted-foreground">/month</span>
                          </>
                        ) : (
                          <span className="text-xl font-bold text-foreground">Custom</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    </div>

                    <ul className="space-y-1.5 flex-1">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Button
                      size="sm"
                      variant={isCurrent ? "outline" : p.badge ? "default" : "outline"}
                      disabled={isCurrent}
                      className="w-full gap-1.5"
                    >
                      {isCurrent ? "Current plan" : (
                        <>{p.plan_key === "enterprise" ? "Contact sales" : "Upgrade"}<ArrowRight className="w-3.5 h-3.5" /></>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-background border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Payment method</h2>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-8 rounded border border-border bg-muted/30 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">No payment method on file</p>
              <p className="text-xs text-muted-foreground/60">Add a card to activate your subscription.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0">Add card</Button>
          </div>
        </div>

        <div className="bg-background border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Invoice history</h2>
          </div>
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <Receipt className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Billing invoices will appear here after your first payment.</p>
          </div>
        </div>
      </div>
  );
}
