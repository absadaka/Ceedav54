import { Link } from "wouter";
import { CheckCircle2, Minus, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

/* ─── Data ────────────────────────────────────────────────────────────────── */
const plans = [
  {
    name: "Starter",
    monthly: 49,
    annual: 39,
    desc: "For single-bay workshops getting started with digital management.",
    plan: "starter",
    color: "border-border",
    badge: null,
    features: {
      users: "3 users",
      locations: "1 location",
      bookings: true,
      jobCards: true,
      quotations: true,
      invoices: true,
      whatsapp: false,
      reports: "Basic",
      api: false,
      sso: false,
      support: "Email",
      onboarding: false,
      sla: false,
    },
  },
  {
    name: "Professional",
    monthly: 99,
    annual: 79,
    desc: "The full toolkit for growing workshops that need everything.",
    plan: "professional",
    color: "border-primary ring-2 ring-primary/20",
    badge: "Most popular",
    features: {
      users: "10 users",
      locations: "1 location",
      bookings: true,
      jobCards: true,
      quotations: true,
      invoices: true,
      whatsapp: true,
      reports: "Advanced",
      api: true,
      sso: false,
      support: "Priority email",
      onboarding: false,
      sla: false,
    },
  },
  {
    name: "Enterprise",
    monthly: null,
    annual: null,
    desc: "Multi-location chains, dealerships, and franchise operations.",
    plan: "enterprise",
    color: "border-border",
    badge: null,
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
      support: "Dedicated CSM",
      onboarding: true,
      sla: true,
    },
  },
];

const featureRows = [
  { section: "Core", rows: [
    { label: "Users", key: "users" as const },
    { label: "Locations", key: "locations" as const },
    { label: "Bookings & calendar", key: "bookings" as const },
    { label: "Job cards & Kanban board", key: "jobCards" as const },
    { label: "Quotations", key: "quotations" as const },
    { label: "Invoices", key: "invoices" as const },
  ]},
  { section: "Communications", rows: [
    { label: "WhatsApp notifications", key: "whatsapp" as const },
  ]},
  { section: "Insights", rows: [
    { label: "Reports & analytics", key: "reports" as const },
    { label: "API access", key: "api" as const },
  ]},
  { section: "Security & support", rows: [
    { label: "SSO / SAML", key: "sso" as const },
    { label: "Support", key: "support" as const },
    { label: "Dedicated onboarding", key: "onboarding" as const },
    { label: "SLA guarantee", key: "sla" as const },
  ]},
];

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

type PlanFeatures = typeof plans[0]["features"];
type FeatureKey = keyof PlanFeatures;

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true) return <CheckCircle2 className="w-4.5 h-4.5 text-primary mx-auto" />;
  if (value === false) return <Minus className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
  return <span className="text-sm text-foreground font-medium">{value}</span>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="bg-white">
      {/* Header */}
      <section className="pt-16 pb-12 text-center bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            No hidden fees. No per-seat surprises. 14-day free trial on every plan.
          </p>

          {/* Billing toggle */}
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

      {/* Plan cards */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const price = annual ? plan.annual : plan.monthly;
            return (
              <div
                key={plan.name}
                className={cn(
                  "rounded-2xl border bg-white p-7 flex flex-col relative",
                  plan.color
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
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{plan.desc}</p>
                </div>

                <div className="flex-1" />

                <Link href={plan.plan === "enterprise" ? "/auth" : `/register?plan=${plan.plan}`}>
                  <Button
                    variant={plan.badge ? "default" : "outline"}
                    size="sm"
                    className={cn("w-full gap-2 mb-6", plan.badge && "shadow-md shadow-primary/20")}
                  >
                    {plan.plan === "enterprise" ? "Talk to sales" : "Start free trial"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                {/* Feature highlights */}
                <ul className="space-y-2.5 border-t border-border pt-5">
                  {featureRows.flatMap(g => g.rows as { label: string; key: FeatureKey }[]).slice(0, 5).map((row) => {
                    const val = plan.features[row.key];
                    if (val === false) return null;
                    return (
                      <li key={`${plan.name}-${row.key}`} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        {typeof val === "string" ? val : row.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-xl font-bold text-foreground mb-6">Full feature comparison</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-52">Feature</th>
                {plans.map((p) => (
                  <th key={p.name} className={cn(
                    "px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider",
                    p.badge ? "text-primary" : "text-muted-foreground"
                  )}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((group) => (
                <>
                  <tr key={`section-${group.section}`} className="bg-muted/40">
                    <td colSpan={4} className="px-5 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.section}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.key} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 text-foreground font-medium">{row.label}</td>
                      {plans.map((p) => (
                        <td key={p.name} className="px-5 py-3 text-center">
                          <FeatureCell value={p.features[row.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
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

      {/* CTA */}
      <section className="py-20 bg-primary text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-primary-foreground/75 mb-8">Join 2,400+ workshops. First 14 days are on us.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button variant="secondary" size="lg" className="gap-2 font-semibold">
                Create your shop — free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="lg" className="text-white hover:bg-white/10 gap-2">
              <MessageSquare className="w-4 h-4" /> Talk to sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
