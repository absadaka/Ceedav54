import { useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  CalendarCheck, Wrench, Zap, FileText, Users, Receipt, ClipboardCheck,
  ArrowRight, CheckCircle2, Sparkles, Clock, Car, Phone, Tag, Plus,
  Cog, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import workshopHeroImg from "@/assets/workshop-hero.jpg";
import { CtaBanner } from "@/components/CtaBanner";

/* ─── Feature catalogue ──────────────────────────────────────────────────── */

type Feature = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  icon: React.ElementType;
  visual: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    slug: "bookings",
    label: "Bookings",
    eyebrow: "Front desk",
    title: "Bookings that fit how your shop actually runs.",
    description:
      "Take walk-ins, phone bookings and online requests in one calendar. Assign bays, send confirmations by SMS, and turn any booking into a job in one tap.",
    bullets: [
      "Day, week and bay views with drag-to-reschedule",
      "SMS & email confirmations and reminders",
      "Convert a booking to a service job in one click",
      "Block off bays for breaks, training or downtime",
    ],
    icon: CalendarCheck,
    visual: <BookingsVisual />,
  },
  {
    slug: "service-jobs",
    label: "Service Jobs",
    eyebrow: "Bay floor",
    title: "Every job, from check-in to delivery.",
    description:
      "A single record per vehicle that walks through inspection, estimation, repair, QC, invoicing and delivery — with assigned techs, time tracking and customer history attached.",
    bullets: [
      "Status flow: new → waiting → in-progress → QC → completed → delivered",
      "Built-in technician timer with start/stop on every task",
      "Photos, parts, notes and reports — all in one place",
      "Auto-update the customer when status changes",
    ],
    icon: Wrench,
    visual: <ServiceJobsVisual />,
  },
  {
    slug: "quick-repair",
    label: "Quick Repair",
    eyebrow: "Express lane",
    title: "Quick repairs without the paperwork.",
    description:
      "For oil changes, tyre swaps and small jobs that don't need a full inspection. Add parts, share a quote by SMS, get it approved and invoice — all in under a minute.",
    bullets: [
      "Lightweight workflow: parts → quote → invoice",
      "Reusable service catalogue with pre-set prices",
      "Approve, reject or revise quotes from the customer's phone",
      "Auto-syncs with the main invoice system",
    ],
    icon: Zap,
    visual: <QuickRepairVisual />,
  },
  {
    slug: "quotations",
    label: "Quotations",
    eyebrow: "Sales",
    title: "Quotations your customers actually understand.",
    description:
      "Build itemised estimates with parts, labour, tax and discounts. Share via SMS or email and watch in real time as the customer approves or rejects each line.",
    bullets: [
      "Drag-and-drop line items with VAT/tax handled automatically",
      "Customer-facing approval page with line-level accept/reject",
      "Versions and revisions — never lose what was sent",
      "Convert an approved quote into a service job in one tap",
    ],
    icon: FileText,
    visual: <QuotationsVisual />,
  },
  {
    slug: "customers",
    label: "Customers",
    eyebrow: "CRM",
    title: "A clean record of every customer and their cars.",
    description:
      "Customer profiles linked to all their vehicles, with full service history, total lifetime spend, preferred contact channel and notes the team can see at check-in.",
    bullets: [
      "Multi-vehicle profiles with VIN, plate, mileage and colour",
      "Full service timeline per vehicle",
      "Tags for fleet, VIP, dealer and warranty customers",
      "GDPR-friendly customer search and export",
    ],
    icon: Users,
    visual: <CustomersVisual />,
  },
  {
    slug: "invoices",
    label: "Invoices",
    eyebrow: "Billing",
    title: "Invoices that match the work you actually did.",
    description:
      "Auto-generated from approved quotes and completed jobs, with VAT, discounts and deposits handled. Share branded PDFs over SMS or email in a click.",
    bullets: [
      "Auto-sync with the related job and quotation",
      "PDF and HTML versions on a tenant-branded template",
      "Deposits and balances tracked per invoice",
      "Status: draft → sent → partially paid → paid",
    ],
    icon: Receipt,
    visual: <InvoicesVisual />,
  },
  {
    slug: "inspections",
    label: "Inspections",
    eyebrow: "Diagnostics",
    title: "Multi-point inspections that build trust.",
    description:
      "A guided checklist with photos and notes for every section of the vehicle. The customer gets a shareable report and a quote built from the findings — no awkward phone calls.",
    bullets: [
      "Configurable templates per vehicle category",
      "Photo and video evidence for every finding",
      "Auto-build a quotation from inspection findings",
      "Customer-facing inspection report on a private link",
    ],
    icon: ClipboardCheck,
    visual: <InspectionsVisual />,
  },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function FeaturesPage() {
  // Smooth-scroll to anchor on first paint and whenever hash changes.
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      const el = document.getElementById(hash);
      if (!el) return;
      // Small delay to let layout settle (web fonts, images, etc.)
      requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return (
    <div className="bg-white">
      {/* Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-white via-white to-muted/30">
        {/* Workshop photo backdrop — layered so text stays crisp */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <img
            src={workshopHeroImg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-[0.55] saturate-[0.85] [filter:contrast(1.05)]"
          />
          {/* Horizontal wash: keeps the left (text) crisp, lets the photo show through on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-white/10" />
          {/* Vertical wash: softens the top and blends the bottom into the next section */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white" />
          {/* Brand tint on the right to pull the photo into the ceer&gt; palette */}
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#161aff]/[0.08] to-transparent" />
        </div>
        <BackgroundGrid />
        <TireTrack className="hidden md:block absolute bottom-0 left-0 right-0 h-8 opacity-[0.07]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-foreground/70">
              <Wrench className="h-3.5 w-3.5" /> Built for the workshop floor
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
              The full workshop, in one place.
            </h1>
            <p className="mt-5 text-lg text-foreground/70 leading-relaxed max-w-2xl">
              From the first phone call to the final invoice, ceer&gt; is the
              operating system for modern auto workshops. Bookings, jobs,
              inspections, quotes and invoices — all built for the
              way your team actually works on the floor.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-[#161aff] hover:bg-[#1216cc] text-white border-0 font-medium shadow-sm">
                  Start free trial
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-border bg-white text-foreground hover:bg-muted/60">
                  Compare plans
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick-jump pills */}
          <div className="mt-12 flex flex-wrap gap-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <a
                  key={f.slug}
                  href={`#${f.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {f.label}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature sections ────────────────────────────────────────────── */}
      <div className="divide-y divide-border relative">
        {FEATURES.map((feature, i) => (
          <FeatureSection key={feature.slug} feature={feature} index={i} />
        ))}
      </div>

      {/* Bottom CTA ──────────────────────────────────────────────────── */}
      <CtaBanner
        title="Ready to run your shop on ceeda?"
        description="Get every feature on this page free for 14 days. No credit card, no setup fee — set up in under 5 minutes."
      />
    </div>
  );
}

/* ─── Section template ───────────────────────────────────────────────────── */

function FeatureSection({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;
  const reverse = index % 2 === 1;
  const sectionRef = useRef<HTMLElement>(null);
  // Rotate through subtle workshop-themed background icons per section.
  const BgIcon = [Cog, Wrench, Car, Gauge][index % 4];

  return (
    <section
      ref={sectionRef}
      id={feature.slug}
      className="scroll-mt-24 py-20 lg:py-24 relative overflow-hidden"
    >
      {/* Faint workshop-icon watermark */}
      <BgIcon
        aria-hidden
        className={cn(
          "absolute pointer-events-none text-foreground/[0.03] -z-0",
          reverse ? "left-[-2rem] top-10" : "right-[-2rem] top-10",
        )}
        style={{ width: 220, height: 220 }}
        strokeWidth={1}
      />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className={cn("grid lg:grid-cols-2 gap-12 lg:gap-16 items-center", reverse && "lg:[&>*:first-child]:order-2")}>
          {/* Text */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/60">
              <Icon className="h-3.5 w-3.5" />
              {feature.eyebrow}
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.1]">
              {feature.title}
            </h2>
            <p className="mt-5 text-base text-foreground/70 leading-relaxed">
              {feature.description}
            </p>
            <ul className="mt-6 space-y-3">
              {feature.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Link href="/register">
                <Button size="sm" variant="outline" className="border-border bg-white text-foreground hover:bg-muted/60">
                  Try {feature.label.toLowerCase()}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-[#161aff]/[0.06] to-emerald-500/[0.06] blur-2xl" />
            <div className="relative rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              {feature.visual}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Decorative workshop-themed accents ─────────────────────────────────── */

function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-0 opacity-[0.7] pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(22,26,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(22,26,255,0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
      }}
    />
  );
}

/** Faded silhouette of a side-view sedan, used as a hero accent. */
function CarSilhouette() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 640 200"
      className="absolute right-[-3rem] bottom-2 w-[420px] sm:w-[520px] md:w-[640px] text-foreground/[0.05] pointer-events-none -z-0"
      fill="currentColor"
    >
      {/* Body */}
      <path d="M40 140 C 80 90, 180 70, 260 70 L 400 70 C 460 70, 520 90, 580 140 L 600 150 L 600 165 L 40 165 Z" />
      {/* Windows cut-out (drawn as light overlay using even-odd not available; use stroke instead) */}
      <path
        d="M150 95 L 250 80 L 380 80 L 460 95 L 460 120 L 150 120 Z"
        fill="#ffffff"
        opacity="0.35"
      />
      <line x1="280" y1="80" x2="280" y2="120" stroke="#ffffff" strokeWidth="3" opacity="0.5" />
      {/* Wheels */}
      <circle cx="160" cy="165" r="28" />
      <circle cx="160" cy="165" r="14" fill="#ffffff" opacity="0.5" />
      <circle cx="490" cy="165" r="28" />
      <circle cx="490" cy="165" r="14" fill="#ffffff" opacity="0.5" />
    </svg>
  );
}

/** A thin tire-tread pattern strip — used as a subtle section divider. */
function TireTrack({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("text-foreground pointer-events-none", className)}
      preserveAspectRatio="none"
      viewBox="0 0 200 16"
      fill="currentColor"
    >
      {Array.from({ length: 40 }).map((_, i) => (
        <rect key={i} x={i * 5 + 0.6} y="2"  width="3" height="4" rx="0.6" />
      ))}
      {Array.from({ length: 40 }).map((_, i) => (
        <rect key={`b${i}`} x={i * 5 + 0.6} y="10" width="3" height="4" rx="0.6" />
      ))}
    </svg>
  );
}

/* ─── Visual mock components (one per feature) ───────────────────────────── */

function MockHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs font-semibold text-foreground/70">{title}</span>
      </div>
      {badge && (
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-foreground/60">
          {badge}
        </span>
      )}
    </div>
  );
}

function BookingsVisual() {
  const slots = [
    { time: "09:00", name: "Toyota Camry · Ahmed",   bay: "Bay 1", color: "bg-[#161aff]/10 text-[#161aff]" },
    { time: "10:30", name: "Nissan Patrol · Sara",   bay: "Bay 2", color: "bg-emerald-100 text-emerald-700" },
    { time: "12:00", name: "BMW 3 Series · Khalid",  bay: "Bay 1", color: "bg-amber-100 text-amber-700" },
    { time: "14:00", name: "Lexus LX · Omar",        bay: "Bay 3", color: "bg-pink-100 text-pink-700" },
  ];
  return (
    <div>
      <MockHeader title="Bookings · Today" badge="4 jobs" />
      <div className="p-4 space-y-2">
        {slots.map((s) => (
          <div key={s.time} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <span className="text-xs font-semibold tabular-nums text-foreground/60 w-12">{s.time}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{s.name}</p>
              <p className="text-[11px] text-foreground/50">{s.bay}</p>
            </div>
            <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", s.color)}>
              Confirmed
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceJobsVisual() {
  const cols: { title: string; count: number; color: string; cards: string[] }[] = [
    { title: "Waiting",     count: 2, color: "bg-amber-500",   cards: ["#J-1042 · Camry", "#J-1043 · Patrol"] },
    { title: "In progress", count: 3, color: "bg-[#161aff]",   cards: ["#J-1038 · BMW", "#J-1039 · LX", "#J-1040 · GMC"] },
    { title: "QC",          count: 1, color: "bg-purple-500",  cards: ["#J-1031 · Audi"] },
    { title: "Completed",   count: 2, color: "bg-emerald-500", cards: ["#J-1025 · Land Cruiser", "#J-1027 · Hilux"] },
  ];
  return (
    <div>
      <MockHeader title="Service Jobs · Kanban" badge="8 active" />
      <div className="p-4 grid grid-cols-2 gap-2.5">
        {cols.map((c) => (
          <div key={c.title} className="rounded-lg border border-border bg-muted/20 p-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", c.color)} />
                <span className="text-[11px] font-semibold text-foreground/70">{c.title}</span>
              </div>
              <span className="text-[10px] text-foreground/50 tabular-nums">{c.count}</span>
            </div>
            <div className="space-y-1.5">
              {c.cards.map((card) => (
                <div key={card} className="rounded-md border border-border bg-white px-2 py-1.5 text-[11px] font-medium text-foreground/80">
                  {card}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickRepairVisual() {
  return (
    <div>
      <MockHeader title="Quick Repair · #QR-208" badge="Approved" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
          <Car className="h-5 w-5 text-foreground/50" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Toyota Hilux · 2021</p>
            <p className="text-[11px] text-foreground/50">Plate AB-12345 · 84,200 km</p>
          </div>
        </div>
        <div className="rounded-lg border border-border">
          {[
            ["Engine oil 5W-30 (5L)",  "1", "180.00"],
            ["Oil filter (premium)",    "1",  "45.00"],
            ["Labour · Oil change",     "1",  "75.00"],
          ].map(([item, qty, total]) => (
            <div key={item} className="flex items-center justify-between border-b last:border-0 border-border px-3 py-2 text-xs">
              <span className="text-foreground/80">{item}</span>
              <span className="flex items-center gap-3 text-foreground/60 tabular-nums">
                <span>×{qty}</span>
                <span className="font-semibold text-foreground">{total}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
          <span className="text-xs font-semibold text-emerald-700">Total (incl. VAT)</span>
          <span className="text-sm font-bold tabular-nums text-emerald-700">AED 315.00</span>
        </div>
      </div>
    </div>
  );
}

function QuotationsVisual() {
  return (
    <div>
      <MockHeader title="Quotation · #Q-1042" badge="Sent" />
      <div className="p-4 space-y-3">
        {[
          { label: "Brake pads · front",  status: "approved", price: "420.00" },
          { label: "Brake disc machining", status: "approved", price: "180.00" },
          { label: "Suspension bushing kit", status: "pending", price: "650.00" },
          { label: "Wheel alignment",      status: "rejected", price: "120.00" },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{row.label}</p>
              <p className="text-[11px] text-foreground/50">Parts + labour</p>
            </div>
            <span className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize",
              row.status === "approved" && "bg-emerald-100 text-emerald-700",
              row.status === "pending" && "bg-amber-100 text-amber-700",
              row.status === "rejected" && "bg-red-100 text-red-700",
            )}>
              {row.status}
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground w-20 text-right">
              {row.price}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomersVisual() {
  return (
    <div>
      <MockHeader title="Customer · Ahmed Al Mansoori" badge="VIP" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#161aff] text-white font-semibold flex items-center justify-center text-sm">
            AM
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Ahmed Al Mansoori</p>
            <p className="text-[11px] text-foreground/50 flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> +971 50 123 4567
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-foreground/50">Lifetime spend</p>
            <p className="text-sm font-bold tabular-nums text-foreground">AED 14,820</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { car: "Toyota Camry 2019",   plate: "AB-12345", visits: 8 },
            { car: "Nissan Patrol 2022",  plate: "CD-67890", visits: 3 },
          ].map((v) => (
            <div key={v.plate} className="rounded-lg border border-border p-2.5">
              <p className="text-xs font-semibold text-foreground">{v.car}</p>
              <p className="text-[10px] text-foreground/50 mt-0.5">{v.plate}</p>
              <p className="text-[10px] text-foreground/50 mt-1.5 tabular-nums">{v.visits} visits</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvoicesVisual() {
  return (
    <div>
      <MockHeader title="Invoice · #INV-1042" badge="Paid" />
      <div className="p-4 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-foreground/50">Total</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">AED 1,820.00</p>
          </div>
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[10px] font-semibold">
            Paid in full
          </span>
        </div>
        <div className="rounded-lg border border-border">
          {[
            ["Subtotal", "1,733.33"],
            ["VAT (5%)",     "86.67"],
            ["Discount",   "-0.00"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b last:border-0 border-border px-3 py-2 text-xs">
              <span className="text-foreground/60">{label}</span>
              <span className="font-medium tabular-nums text-foreground">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-foreground/60">
          <Clock className="h-3 w-3" /> Sent · SMS · 2 days ago
        </div>
      </div>
    </div>
  );
}

function InspectionsVisual() {
  const groups: { name: string; items: { label: string; status: "ok" | "warn" | "fail" }[] }[] = [
    { name: "Engine bay",  items: [
      { label: "Oil level",        status: "ok" },
      { label: "Coolant level",    status: "warn" },
      { label: "Battery voltage",  status: "ok" },
    ]},
    { name: "Brakes",      items: [
      { label: "Front pads (mm)",  status: "fail" },
      { label: "Rear pads (mm)",   status: "ok" },
      { label: "Disc thickness",   status: "warn" },
    ]},
  ];
  const colorOf: Record<"ok" | "warn" | "fail", string> = {
    ok:   "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100   text-amber-700",
    fail: "bg-red-100     text-red-700",
  };
  return (
    <div>
      <MockHeader title="Inspection · #INS-308" badge="In progress" />
      <div className="p-4 space-y-3">
        {groups.map((g) => (
          <div key={g.name} className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-xs font-semibold text-foreground">{g.name}</p>
              <Plus className="h-3 w-3 text-foreground/40" />
            </div>
            {g.items.map((it) => (
              <div key={it.label} className="flex items-center justify-between border-b last:border-0 border-border px-3 py-1.5 text-xs">
                <span className="text-foreground/80">{it.label}</span>
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize", colorOf[it.status])}>
                  <Tag className="inline h-2.5 w-2.5 mr-1" />{it.status}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
