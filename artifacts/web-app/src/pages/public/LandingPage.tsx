import { useRef } from "react";
import { Link } from "wouter";
import {
  ArrowRight, CheckCircle2, ChevronRight, ChevronLeft, CalendarCheck,
  Star, TrendingUp, Clock, Shield, LayoutDashboard, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import screenshotDashboard from "@assets/Screenshot_2026-04-08_at_7.25.04_PM_1775662471561.png";
import screenshotBookings from "@assets/Screenshot_2026-04-08_at_7.25.20_PM_1775662466917.png";
import screenshotJobs from "@assets/Screenshot_2026-04-08_at_7.44.51_PM_1775663129834.png";
import photoMechanic from "@assets/photo-1526626607369-f89fe1ed77a9_1775662796364.avif";
import photoBay from "@assets/photo-1702146713882-2579afb0bfba_1775662796365.avif";
import { CtaBanner } from "@/components/CtaBanner";
import photoShop from "@assets/premium_photo-1661602003497-7e918e0259b2_1775662796365.avif";

/* ─── Data ────────────────────────────────────────────────────────────────── */
const features = [
  {
    icon: LayoutDashboard,
    label: "Real-time Dashboard",
    title: "Your entire workshop at a glance",
    body: "See today's bookings, active jobs, revenue and unpaid invoices in one live view. Know exactly what's happening on the floor without leaving your desk.",
    bullets: ["Live booking and job counters", "Daily and monthly revenue tracking", "Technician workload overview"],
    accent: "bg-blue-50 text-blue-600",
    screenshot: screenshotDashboard,
    photo: photoShop,
  },
  {
    icon: CalendarCheck,
    label: "Smart Scheduling",
    title: "Bookings, inspections and estimates",
    body: "A calendar built for workshops — not generic scheduling. Walk-ins, online bookings and advisor assignments all in one place. No double-booking, no missed appointments.",
    bullets: ["Calendar and list views with status filters", "Walk-in check-in in under 30 seconds", "Online booking link you can share with customers"],
    accent: "bg-violet-50 text-violet-600",
    screenshot: screenshotBookings,
    photo: photoBay,
  },
  {
    icon: ClipboardList,
    label: "Job Tracking",
    title: "Manage your job cards",
    body: "Every service job flows through a visual pipeline — from check-in to estimation, work in progress and invoicing. Your team always knows what's next.",
    bullets: ["Drag-and-drop Kanban workflow", "Priority and urgency flags", "Full job history with time tracking"],
    accent: "bg-emerald-50 text-emerald-600",
    screenshot: screenshotJobs,
    photo: photoMechanic,
  },
];

const stats = [
  { value: "2,400+", label: "Workshops using ceeda&gt;" },
  { value: "1.2M+", label: "Job cards processed" },
  { value: "AED 840M+", label: "Invoices managed" },
  { value: "4.9 / 5", label: "Average customer rating" },
];

const journey = [
  { num: "01", title: "Check in",    body: "Advisor creates a booking in seconds. Vehicle details auto-fill from the CRM." },
  { num: "02", title: "Quote",       body: "Drag services from catalogue. Set price. Send via SMS or email — customer approves with one tap." },
  { num: "03", title: "Job card",    body: "Auto-created on approval. Technician sees it on their phone. Kanban board tracks status." },
  { num: "04", title: "Invoice",     body: "Generated automatically when job is marked complete. Sent to the customer in a click." },
];

const testimonials = [
  {
    quote: "We went from 4 hours of admin per day to under 30 minutes. ceeda&gt; paid for itself in the first week.",
    author: "Mohammed Al-Harbi",
    role: "Owner, Al-Harbi Auto Centre — Riyadh",
    avatar: "MA",
  },
  {
    quote: "The instant invoicing alone changed everything. Customers pay the same day now.",
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

const growStats = [
  {
    value: "26%",
    label: "More clients",
    body: "Win new customers and keep them coming back with automated reminders and a seamless booking experience.",
  },
  {
    value: "89%",
    label: "Fewer no-shows",
    body: "Reduce no-shows and last-minute cancellations by collecting deposits and sending SMS reminders automatically.",
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
    body: "Most workshops cover the full annual cost of ceeda&gt; within the first month through time saved on admin.",
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
      <span className="hidden sm:inline">New: instant invoice delivery by SMS and email.</span>
      <span className="sm:hidden">New: instant invoicing →</span>
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
          <span className="block sm:text-base font-semibold uppercase tracking-widest mb-4 text-[#050505] text-[26px]">The #1 Software for Auto Shops</span>
          Run Your Garage Smarter.
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
        <div className="text-center mb-20">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Built for workshops</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            Every tool your workshop needs, in one place
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From the dashboard to the final invoice — ceeda&gt; replaces spreadsheets, group chats, and paper job cards with one clean system.
          </p>
        </div>

        <div className="space-y-32">
          {features.map((feature, i) => (
            <div
              key={feature.label}
              className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
            >
              <div className="flex-1 space-y-5">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${feature.accent}`}>
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
                  Try it free <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex-1 w-full max-w-md lg:max-w-none">
                {feature.screenshot ? (
                  <div className="relative">
                    <div className="rounded-2xl overflow-hidden h-56 lg:h-64">
                      <img
                        src={feature.photo}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-black/5 rounded-2xl" />
                    </div>
                    <div className="absolute -bottom-8 left-4 right-4 lg:left-6 lg:right-6 rounded-xl border border-border/60 bg-white p-1.5 shadow-2xl shadow-gray-300/50">
                      <img
                        src={feature.screenshot}
                        alt={`${feature.label} — ceeda screenshot`}
                        className="w-full rounded-lg"
                      />
                    </div>
                    <div className="h-10" />
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden h-72 lg:h-80 relative">
                    <img
                      src={feature.photo}
                      alt={feature.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
                  </div>
                )}
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
            From the moment a customer books to the final invoice — every step is handled.
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
            At ceeda&gt;, we want to help you grow your workshop, attract new clients and boost revenue.{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              See how workshops grow with ceeda&gt; →
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
  return <CtaBanner />;
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
