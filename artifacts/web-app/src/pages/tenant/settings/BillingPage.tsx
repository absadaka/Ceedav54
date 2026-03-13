import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Zap, Check, ArrowRight, Receipt, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: "Free",
    period: "",
    description: "For single-bay workshops getting started.",
    features: ["Up to 3 team members", "Bookings & job cards", "Basic invoicing", "5 GB storage"],
    color: "border-border",
    badge: null,
  },
  {
    key: "professional",
    name: "Professional",
    price: "AED 149",
    period: "/month",
    description: "For growing workshops with a full team.",
    features: [
      "Unlimited team members",
      "WhatsApp integration",
      "Advanced reporting",
      "Services catalog",
      "SMS notifications",
      "20 GB storage",
    ],
    color: "border-primary",
    badge: "Most popular",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Multi-location fleets and franchise groups.",
    features: [
      "Everything in Professional",
      "Multi-location support",
      "SSO / SAML",
      "Dedicated support",
      "Custom integrations",
      "Unlimited storage",
    ],
    color: "border-border",
    badge: null,
  },
];

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

  const plan     = data?.tenant?.plan    ?? "starter";
  const status   = data?.tenant?.status  ?? "trial";
  const trialEnd = data?.tenant?.trial_ends_at;

  return (

      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="page-title">Billing & plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your subscription, payment methods and billing history.
          </p>
        </div>

        {/* Current plan status */}
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

        {/* Plans */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Available plans
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map((p) => {
              const isCurrent = p.key === plan;
              return (
                <div
                  key={p.key}
                  className={cn(
                    "relative rounded-lg border p-5 flex flex-col gap-4 bg-background",
                    p.color,
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
                      <span className="text-xl font-bold text-foreground">{p.price}</span>
                      {p.period && <span className="text-xs text-muted-foreground">{p.period}</span>}
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
                    variant={isCurrent ? "outline" : p.key === "professional" ? "default" : "outline"}
                    disabled={isCurrent}
                    className="w-full gap-1.5"
                  >
                    {isCurrent ? "Current plan" : (
                      <>{p.key === "enterprise" ? "Contact sales" : "Upgrade"}<ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment method */}
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

        {/* Invoice history */}
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
