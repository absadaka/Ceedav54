import { Link } from "wouter";
import { CheckCircle2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 49,
    annualPrice: 39,
    description: "For single-bay workshops getting started with digital management.",
    plan: "starter",
    features: {
      users: "3",
      locations: "1",
      bookings: true,
      jobCards: true,
      quotations: true,
      invoices: true,
      whatsapp: false,
      reports: "Basic",
      api: false,
      sso: false,
      support: "Email",
    },
  },
  {
    name: "Professional",
    monthlyPrice: 99,
    annualPrice: 79,
    description: "For growing workshops that need the full toolkit.",
    plan: "professional",
    highlighted: true,
    features: {
      users: "10",
      locations: "1",
      bookings: true,
      jobCards: true,
      quotations: true,
      invoices: true,
      whatsapp: true,
      reports: "Advanced",
      api: true,
      sso: false,
      support: "Priority email",
    },
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    description: "For multi-location chains and franchise operations.",
    plan: "enterprise",
    features: {
      users: "Unlimited",
      locations: "Unlimited",
      bookings: true,
      jobCards: true,
      quotations: true,
      invoices: true,
      whatsapp: true,
      reports: "Custom",
      api: true,
      sso: true,
      support: "Dedicated",
    },
  },
];

type FeatureRow = {
  label: string;
  key: keyof typeof plans[0]["features"];
  format?: (v: string | boolean) => React.ReactNode;
};

const featureRows: FeatureRow[] = [
  { label: "Users", key: "users" },
  { label: "Locations", key: "locations" },
  { label: "Bookings & calendar", key: "bookings" },
  { label: "Job cards", key: "jobCards" },
  { label: "Quotations", key: "quotations" },
  { label: "Invoices", key: "invoices" },
  { label: "WhatsApp notifications", key: "whatsapp" },
  { label: "Reports", key: "reports" },
  { label: "API access", key: "api" },
  { label: "SSO", key: "sso" },
  { label: "Support", key: "support" },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) return <CheckCircle2 className="w-4 h-4 text-primary mx-auto" />;
  if (value === false) return <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-sm text-foreground">{value}</span>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-semibold text-foreground mb-3">Simple, transparent pricing</h1>
        <p className="text-muted-foreground mb-6">No hidden fees. Cancel anytime. 14-day free trial on all plans.</p>
        <div className="inline-flex items-center gap-2 bg-muted rounded-full p-1 text-sm">
          <button
            className={cn("px-4 py-1.5 rounded-full transition-colors", !annual ? "bg-background shadow-xs font-medium text-foreground" : "text-muted-foreground")}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={cn("px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5", annual ? "bg-background shadow-xs font-medium text-foreground" : "text-muted-foreground")}
            onClick={() => setAnnual(true)}
          >
            Annual
            <span className="text-[10px] font-medium text-primary bg-accent px-1.5 py-0.5 rounded-full">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        {plans.map((plan) => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          return (
            <div
              key={plan.name}
              className={cn(
                "rounded-xl border p-6 flex flex-col",
                plan.highlighted ? "border-primary ring-1 ring-primary/30 bg-accent/20" : "border-border bg-background"
              )}
            >
              {plan.highlighted && (
                <div className="text-xs font-medium text-primary mb-2">Most popular</div>
              )}
              <p className="text-[15px] font-semibold text-foreground">{plan.name}</p>
              <div className="mt-3 mb-4">
                {price !== null ? (
                  <>
                    <span className="text-3xl font-semibold text-foreground">${price}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                    {annual && (
                      <p className="text-xs text-muted-foreground mt-0.5">Billed annually</p>
                    )}
                  </>
                ) : (
                  <span className="text-2xl font-semibold text-foreground">Custom</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6 flex-1">{plan.description}</p>
              <Link href={plan.plan === "enterprise" ? "/auth" : `/auth?plan=${plan.plan}`}>
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                >
                  {plan.plan === "enterprise" ? "Contact sales" : "Start free trial"}
                </Button>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-48">Feature</th>
              {plans.map((p) => (
                <th key={p.name} className={cn("px-4 py-3 text-center text-xs font-medium uppercase tracking-wider", p.highlighted ? "text-primary" : "text-muted-foreground")}>
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {featureRows.map((row) => (
              <tr key={row.key} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 text-foreground">{row.label}</td>
                {plans.map((p) => (
                  <td key={p.name} className="px-4 py-3 text-center">
                    <FeatureValue value={p.features[row.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="text-xl font-semibold text-foreground mb-6 text-center">Frequently asked questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[
            ["Can I switch plans?", "Yes. You can upgrade or downgrade at any time from your billing settings. Changes take effect at the next billing cycle."],
            ["Is there a setup fee?", "No. You can be up and running in under 5 minutes. No setup fee, no onboarding cost."],
            ["What payment methods are accepted?", "We accept all major credit and debit cards via Stripe. Bank transfer available on Enterprise."],
            ["Can I export my data?", "Yes. You can export your clients, bookings, and invoices at any time as CSV files."],
            ["Is my data secure?", "All data is encrypted in transit (TLS) and at rest. We're hosted on ISO 27001-certified infrastructure."],
            ["Do you offer a discount for multiple locations?", "Yes. Contact us for multi-location pricing on the Enterprise plan."],
          ].map(([q, a]) => (
            <div key={q} className="space-y-1.5">
              <p className="text-[14px] font-medium text-foreground">{q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
