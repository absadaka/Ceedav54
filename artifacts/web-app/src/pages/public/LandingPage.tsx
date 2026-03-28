import { useRef } from "react";
import { Link } from "wouter";
import {
  ArrowRight, CheckCircle2, ChevronRight, ChevronLeft, CalendarCheck,
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
  { value: "2,400+", label: "Workshops using ceeda>" },
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
    quote: "We went from 4 hours of admin per day to under 30 minutes. ceeda> paid for itself in the first week.",
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

const growStats = [
  {
    value: "26%",
    label: "More clients",
    body: "Win new customers and keep them coming back with automated reminders and a seamless booking experience.",
  },
  {
    value: "89%",
    label: "Fewer no-shows",
    body: "Reduce no-shows and last-minute cancellations by collecting deposits and sending WhatsApp reminders automatically.",
  },
  {
    value: "20%",
    label: "More revenue",
    body: "Upsell services during the job and capture add-ons through digital job cards that customers can approve instantly.",
  },
  {
    value: "290%",
    label: "More online bookings",
    body: "Your public booking page works 24/7 — capturing appointments while you sleep, weekend or weekday.",
  },
  {
    value: "12%",
    label: "Higher retention",
    body: "Customers who receive follow-up messages and service history summaries return more often and spend more.",
  },
  {
    value: "392%",
    label: "Return on investment",
    body: "Most workshops cover the full annual cost of ceeda> within the first month through time saved on admin.",
  },
  {
    value: "41%",
    label: "Booked after hours",
    body: "Your workshop keeps taking bookings overnight and on weekends through your online booking link.",
  },
];

/* ─── Subcomponents ───────────────────────────────────────────────────────── */

function AnnouncementBanner() {
  return (
    <div className="text-white text-center py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 bg-[#000000]">
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
    <section
      className="relative overflow-hidden bg-white flex flex-col items-center justify-center min-h-[92vh] py-24"
      style={{
        backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="relative w-full max-w-[1400px] mx-auto px-6 text-center">
        <h1
          className="font-black text-gray-950 tracking-tight leading-[0.88] mb-16 max-w-6xl mx-auto"
          style={{ fontSize: "clamp(3rem, 8.5vw, 8rem)" }}
        >
          Run Your Auto Workshop Smarter.
        </h1>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <button className="inline-flex items-center gap-3 px-12 py-4 rounded-full bg-emerald-300 text-gray-950 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-400 transition-colors">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
          <Link href="/pricing">
            <button className="inline-flex items-center gap-3 px-12 py-4 rounded-full border-2 border-gray-900 text-gray-900 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-gray-50 transition-colors">
              See pricing <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Link>
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
                <div className="rounded-2xl border border-border overflow-hidden h-72 lg:h-80">
                  <img
                    src={
                      i === 0
                        ? "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80"
                        : i === 1
                        ? "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=800&q=80"
                        : "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={feature.label}
                    className="w-full h-full object-cover"
                  />
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

function GrowSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function slide(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  }

  return (
    <section className="py-20 bg-white border-t border-border">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
            Grow Your Business
          </h2>
          <p className="text-base text-muted-foreground max-w-xl">
            At ceeda{">"}, we want to help you grow your workshop, attract new clients and boost revenue.{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              See how workshops grow with ceeda{">"} →
            </Link>
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {growStats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-[240px] max-w-[240px] border border-border rounded-xl p-6 flex flex-col gap-3 hover:border-primary/30 hover:shadow-md transition-all duration-200 bg-white shrink-0"
              >
                <p className="text-4xl font-bold text-primary leading-none">{stat.value}</p>
                <p className="text-sm font-semibold text-foreground">{stat.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{stat.body}</p>
              </div>
            ))}
          </div>

          {/* Arrows */}
          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={() => slide("left")}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => slide("right")}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section
      className="py-24 relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/cta-bg.webp')" }}
    >
      <div className="absolute inset-0 bg-black/40" />
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
          Join 2,400+ workshops that cut admin time by 70% and get paid faster with ceeda{">"}.
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
      <CtaSection />
      <GrowSection />
    </div>
  );
}
