import { Link } from "wouter";
import { CheckCircle2, Minus, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { CtaBanner } from "@/components/CtaBanner";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Plan = {
  plan_key: string;
  name: string;
  monthly_price: number | null;
  annual_price: number | null;
  description: string;
  features: string[];
  badge: string | null;
};

const faqs = [
  ["Can I switch plans anytime?", "Yes. Upgrade or downgrade from billing settings. Changes take effect at the next billing cycle."],
  ["Is there a setup fee?", "No. Get started in under 5 minutes. No setup fee, no contracts."],
  ["What payment methods do you accept?", "All major cards via Stripe. Bank transfer available on Enterprise."],
  ["Can I export my data?", "Anytime. Export clients, bookings, and invoices as CSV."],
  ["Is my data secure?", "Encrypted in transit and at rest. ISO 27001-certified infrastructure."],
  ["Do you support multiple locations?", "Yes, on Enterprise. Contact us for multi-location pricing."],
  ["What's included in the free trial?", "Full access to your chosen plan for 14 days. No credit card needed."],
  ["Can I use ceeda> in Arabic?", "Arabic (RTL) support is on the roadmap. Contact us if you need it sooner."],
];

function planColor(p: Plan) {
  if (p.badge) return "border-primary ring-2 ring-primary/20";
  return "border-border";
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  const { data, isLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["public-plans"],
    queryFn: () => fetch(`${API}/api/plans`).then((r) => r.json()),
    staleTime: 300_000,
  });

  const plans = data?.plans ?? [];

  return (
    <div className="bg-white">
      <section className="pt-16 pb-12 text-center bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            No hidden fees. No per-seat surprises. 14-day free trial on every plan.
          </p>

          <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                !annual ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                annual ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <span className="text-[10px] font-bold text-primary bg-accent px-1.5 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-14">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const price = annual ? plan.annual_price : plan.monthly_price;
              return (
                <div
                  key={plan.plan_key}
                  className={cn(
                    "rounded-2xl border bg-white p-7 flex flex-col relative",
                    planColor(plan)
                  )}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className="text-[15px] font-semibold text-foreground">{plan.name}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      {price !== null ? (
                        <>
                          <span className="text-4xl font-bold text-foreground">${price}</span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </>
                      ) : (
                        <span className="text-3xl font-bold text-foreground">Custom</span>
                      )}
                    </div>
                    {annual && price !== null && (
                      <p className="text-xs text-muted-foreground mt-1">Billed annually (${price * 12}/year)</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="flex-1" />

                  <Link href={plan.plan_key === "enterprise" ? "/auth" : `/register?plan=${plan.plan_key}`}>
                    <Button
                      variant={plan.badge ? "default" : "outline"}
                      size="sm"
                      className={cn("w-full gap-2 mb-6", plan.badge && "shadow-md shadow-primary/20")}
                    >
                      {plan.plan_key === "enterprise" ? "Talk to sales" : "Start free trial"}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>

                  <ul className="space-y-2.5 border-t border-border pt-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t border-border bg-muted/20 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-foreground mb-10 text-center">Frequently asked questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {faqs.map(([q, a]) => (
              <div key={q}>
                <p className="text-[14px] font-semibold text-foreground mb-2">{q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner
        title="Ready to get started?"
        description="Join hundreds of maintenance shops already running on ceeda. First 14 days are on us — no credit card needed."
      />
    </div>
  );
}
