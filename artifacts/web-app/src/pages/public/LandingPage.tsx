import { Link } from "wouter";
import {
  ArrowRight, CheckCircle2, ChevronRight, CalendarCheck,
  FileText, Wrench, Receipt, MessageSquare, BarChart3,
  Star, TrendingUp, Clock, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Data ────────────────────────────────────────────────────────────────── */
const features = [
  {
    icon: CalendarCheck,
    label: "Bookings",
    title: "Calendar-based scheduling your team will actually use",
    body: "Walk-in fast mode for receptionists. Online booking for customers. One shared calendar so nobody double-books a bay.",
    bullets: ["Walk-in check-in in under 30 seconds", "Online booking link for customers", "Advisor-level calendar views"],
    accent: "bg-blue-50 text-blue-600",
  },
  {
    icon: FileText,
    label: "Quotations",
    title: "Quotes that sell — built and sent in minutes",
    body: "Drag-in services from your catalogue. Apply discounts. Send via WhatsApp. Collect a deposit before work starts.",
    bullets: ["Itemised line-item quotes", "Customer approval via link", "Auto-convert to job card on approval"],
    accent: "bg-violet-50 text-violet-600",
  },
  {
    icon: Receipt,
    label: "Invoices",
    title: "Get paid faster with online payment links",
    body: "Invoices are auto-generated from completed jobs. One tap to send via WhatsApp with a payment link. No chasing.",
    bullets: ["Auto-generated from job cards", "WhatsApp delivery", "Online payment link"],
    accent: "bg-emerald-50 text-emerald-600",
  },
];

const stats = [
  { value: "2,400+", label: "Workshops using CEEDA" },
  { value: "1.2M+", label: "Job cards processed" },
  { value: "AED 840M+", label: "Invoices managed" },
  { value: "4.9 / 5", label: "Average customer rating" },
];

const journey = [
  { num: "01", title: "Check in",    body: "Advisor creates a booking in seconds. Vehicle details auto-fill from the CRM." },
  { num: "02", title: "Quote",       body: "Drag services from catalogue. Set price. Send via WhatsApp — customer approves with one tap." },
  { num: "03", title: "Job card",    body: "Auto-created on approval. Technician sees it on their phone. Kanban board tracks status." },
  { num: "04", title: "Invoice",     body: "Generated automatically when job is marked complete. Payment link included." },
];

const testimonials = [
  {
    quote: "We went from 4 hours of admin per day to under 30 minutes. CEEDA paid for itself in the first week.",
    author: "Mohammed Al-Harbi",
    role: "Owner, Al-Harbi Auto Centre — Riyadh",
    avatar: "MA",
  },
  {
    quote: "The WhatsApp invoicing alone changed everything. Customers pay the same day now.",
    author: "Priya Nair",
    role: "Workshop Manager, FastFix — Dubai",
    avatar: "PN",
  },
  {
    quote: "My technicians can update job status from their phones. No more shouting across the workshop.",
    author: "Ahmed Mansour",
    role: "Owner, Mansour Motors — Abu Dhabi",
    avatar: "AM",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    description: "For single-bay workshops ready to go digital.",
    features: ["3 users", "Bookings & job cards", "Quotations & invoices", "Email notifications", "Client & vehicle CRM"],
    cta: "Start free trial",
    href: "/register?plan=starter",
  },
  {
    name: "Professional",
    price: "$99",
    period: "/mo",
    description: "The full toolkit for growing workshops.",
    features: ["10 users", "Everything in Starter", "WhatsApp notifications", "Advanced analytics", "API access", "Priority support"],
    cta: "Start free trial",
    href: "/register?plan=professional",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Multi-location chains and franchise operations.",
    features: ["Unlimited users", "Everything in Pro", "SSO & custom domain", "Dedicated account manager", "SLA guarantee"],
    cta: "Talk to sales",
    href: "/auth",
  },
];

/* ─── Subcomponents ───────────────────────────────────────────────────────── */

function AnnouncementBanner() {
  return (
    <div className="bg-primary text-white text-center py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2">
      <span className="hidden sm:inline">New: WhatsApp invoice delivery with instant payment collection.</span>
      <span className="sm:hidden">New: WhatsApp invoicing →</span>
      <Link href="/pricing" className="underline underline-offset-2 font-semibold inline-flex items-center gap-1 opacity-90 hover:opacity-100">
        See plans <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pt-16 pb-24 md:pt-24 md:pb-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)]" />
      <div className="relative max-w-6xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent border border-primary/20 text-primary text-xs font-medium mb-8">
          <Star className="w-3 h-3 fill-primary" />
          Rated 4.9/5 by 2,400+ workshops across the Gulf
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
          Run your workshop.{" "}
          <span className="text-primary">Not your paperwork.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          CEEDA replaces paper job cards, WhatsApp chaos, and unpaid estimates with one clean system — bookings, quotes, job cards, invoices, and WhatsApp in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto gap-2 shadow-md shadow-primary/20 text-base px-8">
              Create your shop <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8">
              See pricing
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          14-day free trial · No credit card required · Set up in 5 minutes
        </p>

        {/* Product preview mockup */}
        <div className="mt-16 mx-auto max-w-5xl">
          <div className="relative rounded-xl border border-border shadow-2xl shadow-black/10 overflow-hidden bg-white">
            {/* Browser chrome */}
            <div className="bg-muted border-b border-border px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-3">
                <div className="bg-white rounded border border-border px-3 py-1 text-xs text-muted-foreground text-center max-w-xs mx-auto">
                  app.ceeda.io/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="flex h-[340px] sm:h-[420px]">
              {/* Sidebar */}
              <div className="w-14 sm:w-52 bg-white border-r border-border flex flex-col py-4 shrink-0">
                <div className="px-3 mb-4 hidden sm:block">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                      <Wrench className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-foreground">CEEDA</span>
                  </div>
                </div>
                {[
                  { icon: BarChart3, label: "Dashboard", active: true },
                  { icon: CalendarCheck, label: "Bookings", active: false },
                  { icon: Wrench, label: "Jobs", active: false },
                  { icon: Receipt, label: "Invoices", active: false },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-2.5 mx-2 px-2 py-2 rounded-md mb-0.5 ${item.active ? "bg-accent text-primary" : "text-muted-foreground"}`}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium hidden sm:block">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 bg-muted/30 p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Dashboard</p>
                    <p className="text-xs text-muted-foreground">Good morning — here's today's overview</p>
                  </div>
                  <div className="h-6 w-24 bg-primary rounded-md flex items-center justify-center">
                    <span className="text-[10px] text-white font-medium">+ New booking</span>
                  </div>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Today's bookings", val: "8", color: "text-blue-600" },
                    { label: "Active jobs", val: "5", color: "text-amber-600" },
                    { label: "Outstanding", val: "AED 4,200", color: "text-red-500" },
                    { label: "Revenue (MTD)", val: "AED 48k", color: "text-green-600" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-lg border border-border p-3">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
                      <p className={`text-sm font-bold ${kpi.color}`}>{kpi.val}</p>
                    </div>
                  ))}
                </div>

                {/* Job list preview */}
                <div className="bg-white rounded-lg border border-border overflow-hidden">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-[11px] font-semibold text-foreground">Active jobs today</p>
                  </div>
                  {[
                    { ref: "JC-2024-0021", plate: "B 44291 A", make: "Toyota Camry", tech: "Khalid", status: "In progress", statusColor: "bg-amber-100 text-amber-700" },
                    { ref: "JC-2024-0020", plate: "C 88102 B", make: "Nissan Patrol", tech: "Omar", status: "QC", statusColor: "bg-blue-100 text-blue-700" },
                    { ref: "JC-2024-0019", plate: "A 12345 C", make: "BMW X5", tech: "Rami", status: "Waiting", statusColor: "bg-gray-100 text-gray-600" },
                  ].map((job) => (
                    <div key={job.ref} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0 text-[10px] hover:bg-muted/30 transition-colors">
                      <span className="font-mono text-muted-foreground w-24 hidden sm:block">{job.ref}</span>
                      <span className="font-medium text-foreground w-16">{job.plate}</span>
                      <span className="text-muted-foreground hidden sm:block flex-1 px-2">{job.make}</span>
                      <span className="text-muted-foreground w-12 hidden sm:block">{job.tech}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${job.statusColor}`}>{job.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Live preview of the CEEDA workshop dashboard
          </p>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">The full toolkit</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            Everything from check-in to payment
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            One platform that covers every step of your workshop workflow, built for speed.
          </p>
        </div>

        <div className="space-y-24">
          {features.map((feature, i) => (
            <div
              key={feature.label}
              className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
            >
              <div className="flex-1 space-y-5">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${feature.accent} bg-opacity-10`}>
                  <feature.icon className="w-3.5 h-3.5" />
                  {feature.label}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-snug">
                  {feature.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">{feature.body}</p>
                <ul className="space-y-2.5">
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-2">
                  Get started free <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex-1 w-full max-w-md lg:max-w-none">
                <div className={`rounded-2xl border border-border bg-gradient-to-br p-8 h-64 flex items-center justify-center ${
                  i === 0 ? "from-blue-50 to-indigo-50" :
                  i === 1 ? "from-violet-50 to-purple-50" :
                  "from-emerald-50 to-green-50"
                }`}>
                  <feature.icon className={`w-24 h-24 ${feature.accent.split(" ")[1]} opacity-30`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function JourneySection() {
  return (
    <section className="py-24 bg-muted/20 border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            One complete customer journey
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From the moment a customer books to the moment payment clears — every step is handled.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {journey.map((step, idx) => (
            <div key={step.num} className="relative">
              {idx < journey.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[calc(100%_-_1rem)] w-8 border-t-2 border-dashed border-border z-10" />
              )}
              <div className="bg-white border border-border rounded-xl p-6 h-full hover:border-primary/30 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {step.num}
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/register">
            <Button size="lg" className="gap-2 shadow-md shadow-primary/20">
              Start your workshop today <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Workshops that made the switch
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.author} className="bg-white border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-[15px] text-foreground leading-relaxed mb-5">
                "{t.quote}"
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="py-24 bg-muted/20 border-y border-border">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground">No setup fees. No hidden charges. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col bg-white transition-shadow hover:shadow-lg ${
                plan.popular
                  ? "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-accent px-2 py-0.5 rounded-full">
                    Most popular
                  </span>
                </div>
              )}
              <p className="text-[15px] font-semibold text-foreground">{plan.name}</p>
              <div className="mt-3 mb-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">{plan.description}</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href}>
                <Button variant={plan.popular ? "default" : "outline"} size="sm" className="w-full">
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans include a 14-day free trial.{" "}
          <Link href="/pricing" className="text-primary hover:underline font-medium">
            Compare all features →
          </Link>
        </p>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-24 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          {[Clock, Shield, TrendingUp].map((Icon, i) => (
            <div key={i} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
          ))}
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
          Ready to modernise your workshop?
        </h2>
        <p className="text-primary-foreground/75 text-lg mb-10 leading-relaxed">
          Join 2,400+ workshops that cut admin time by 70% and get paid faster with CEEDA.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register">
            <Button variant="secondary" size="lg" className="gap-2 w-full sm:w-auto font-semibold shadow-lg">
              Create your shop — it's free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="ghost" size="lg" className="gap-2 w-full sm:w-auto text-white hover:bg-white/10 hover:text-white">
              See pricing
            </Button>
          </Link>
        </div>
        <p className="text-primary-foreground/50 text-xs mt-5">
          14 days free. No credit card required. Set up in minutes.
        </p>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div>
      <AnnouncementBanner />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <JourneySection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
    </div>
  );
}
