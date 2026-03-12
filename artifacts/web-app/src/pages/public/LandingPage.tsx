import { Link } from "wouter";
import {
  CalendarCheck, FileText, Wrench, Receipt, MessageSquare, BarChart3,
  ArrowRight, CheckCircle2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: CalendarCheck,
    title: "Smart Bookings",
    description: "Calendar-based scheduling with walk-in fast mode. Advisors see their day at a glance.",
  },
  {
    icon: FileText,
    title: "Quotations",
    description: "Build itemised quotes in seconds. Send via WhatsApp. Collect advance deposits online.",
  },
  {
    icon: Wrench,
    title: "Job Cards",
    description: "Kanban job board for the workshop floor. Technicians update status from their phone.",
  },
  {
    icon: Receipt,
    title: "Invoices",
    description: "Auto-generated from approved quotes. Online payment link. Bank transfer support.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp",
    description: "Automated notifications for bookings, quote approvals, and payment confirmations.",
  },
  {
    icon: BarChart3,
    title: "Reports",
    description: "Revenue, bookings, and technician performance. All the numbers you care about.",
  },
];

const journey = [
  { step: "1", label: "Check In", desc: "Customer arrives, advisor creates booking" },
  { step: "2", label: "Quote",    desc: "Itemised quote sent via WhatsApp" },
  { step: "3", label: "Approve",  desc: "Customer approves and pays deposit online" },
  { step: "4", label: "Job",      desc: "Technicians work the job card" },
  { step: "5", label: "Invoice",  desc: "Invoice auto-generated on completion" },
  { step: "6", label: "Paid",     desc: "Online payment link closes the loop" },
];

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "Perfect for single-bay workshops just getting started.",
    features: ["Up to 3 users", "Bookings & job cards", "Quotations & invoices", "Email notifications"],
    cta: "Start free trial",
    plan: "starter",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "For growing workshops that need the full toolkit.",
    features: ["Up to 10 users", "All Starter features", "WhatsApp notifications", "Advanced reports", "API access"],
    cta: "Start free trial",
    plan: "professional",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Multi-location chains and franchise operations.",
    features: ["Unlimited users", "All Professional features", "SSO & custom domain", "Dedicated support", "SLA"],
    cta: "Contact sales",
    plan: "enterprise",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="text-foreground">
      {/* Hero */}
      <section className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Now with WhatsApp integration
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground max-w-3xl mx-auto leading-tight mb-6">
            The workshop management platform built for speed
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            From check-in to invoice — CEEDA replaces paper job cards, WhatsApp chaos, and unpaid estimates with one clean system.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth?plan=starter">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                See pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-semibold text-foreground mb-3">Everything your workshop needs</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              One platform covers your entire workflow. Stop stitching together WhatsApp, spreadsheets, and paper.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background border border-border rounded-lg p-6 hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center mb-4">
                  <feature.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer journey */}
      <section className="py-20 bg-background border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-semibold text-foreground mb-3">A complete customer journey</h2>
            <p className="text-muted-foreground">From the moment a customer calls to the moment payment clears.</p>
          </div>
          <div className="flex flex-col md:flex-row items-start gap-0">
            {journey.map((step, idx) => (
              <div key={step.step} className="flex items-start gap-3 flex-1 relative">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center shrink-0 z-10">
                    {step.step}
                  </div>
                  {idx < journey.length - 1 && (
                    <div className="hidden md:block absolute top-4 left-8 w-full h-px bg-border" />
                  )}
                </div>
                <div className="pb-8 md:pb-0 pr-6">
                  <p className="text-sm font-semibold text-foreground mb-0.5">{step.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-semibold text-foreground mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border ${
                  plan.highlighted
                    ? "border-primary bg-accent/40 ring-1 ring-primary/30"
                    : "border-border bg-background"
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-medium text-primary mb-3">Most popular</div>
                )}
                <p className="text-[15px] font-semibold text-foreground">{plan.name}</p>
                <div className="mt-2 mb-3">
                  <span className="text-3xl font-semibold text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.plan === "enterprise" ? "/auth" : `/auth?plan=${plan.plan}`}>
                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              View full comparison <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Ready to modernise your workshop?</h2>
          <p className="text-primary-foreground/80 mb-8">
            Join hundreds of workshops that have already cut admin time in half with CEEDA.
          </p>
          <Link href="/auth?plan=starter">
            <Button variant="secondary" size="lg" className="gap-2">
              Start your free trial <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="mt-4 text-xs text-primary-foreground/60">14 days free. No credit card required.</p>
        </div>
      </section>
    </div>
  );
}
