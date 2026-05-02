import { useEffect } from "react";
import { Link } from "wouter";
import {
  Wrench, SprayCan, Paintbrush, CircleDot, Droplets, Gauge,
  BatteryCharging, Truck, Bike, MapPin, Building2, ShieldCheck,
  ArrowRight, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Auto-shop photos — one per solution, no repeats
import photoEngineBay      from "@assets/serjan-midili-7tqN3HvUswQ-unsplash_1777741356306.jpg";
import photoBodyTeam       from "@assets/Hero_Photo_1777741356303.jpg";
import photoDetailingShop  from "@assets/deniz-demirci-dlJelFmdpOc-unsplash_1777742323781.jpg";
import photoOnLiftWheels   from "@assets/smitty-sGmZ5IMXV_s-unsplash_1777741356307.jpg";
import photoMechanic       from "@assets/photo-1526626607369-f89fe1ed77a9_1777741356304.avif";
import photoPerfDark       from "@assets/lorenzo-hamers-wtXnp09Q86w-unsplash_1777741356304.jpg";
import photoModernShop     from "@assets/zaptec-owAi6NkSnW8-unsplash_1777742039813.jpg";
import photoServiceBay     from "@assets/photo-1702146713882-2579afb0bfba_1777741356305.avif";
import photoMotor          from "@assets/photo-1615906655593-ad0386982a0f_1777741356305.avif";
import photoMobile         from "@assets/kevin-grieve-3CKZS3-o3XU-unsplash_1777741910513.jpg";
import photoWorkshopHero   from "@/assets/workshop-hero.jpg";
import photoInspection     from "@assets/premium_photo-1661602003497-7e918e0259b2_1777742131069.avif";

type Solution = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  icon: React.ElementType;
  accent: string;
  iconBg: string;
  iconCls: string;
  photo: string;
};

const SOLUTIONS: Solution[] = [
  {
    slug: "car-maintenance",
    label: "Car Maintenance",
    eyebrow: "General Auto Repair",
    title: "For independent garages and service centers.",
    description:
      "Run scheduled servicing, diagnostics and mechanical repairs on one platform — from booking the customer in to handing the keys back.",
    bullets: [
      "Multi-bay scheduling with technician assignment",
      "Digital vehicle inspections with photo evidence",
      "Parts catalogue, labour rates and quote builder",
      "Customer service history per vehicle",
    ],
    icon: Wrench,
    accent: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconCls: "text-blue-600",
    photo: photoEngineBay,
  },
  {
    slug: "bodyshops",
    label: "Body Shops",
    eyebrow: "Collision & Paint",
    title: "Built for collision repair and paint jobs.",
    description:
      "Track every panel, every coat and every approval. Document damage with before/after photos and keep insurers in the loop without the back-and-forth.",
    bullets: [
      "Damage assessment with annotated photos",
      "Insurance-friendly estimates and approvals",
      "Paint mixing notes and refinish stages",
      "Long-running job timelines with weekly updates",
    ],
    icon: Paintbrush,
    accent: "bg-rose-50",
    iconBg: "bg-rose-100",
    iconCls: "text-rose-600",
    photo: photoBodyTeam,
  },
  {
    slug: "auto-detailing",
    label: "Auto Detailing",
    eyebrow: "Detailing & Ceramic",
    title: "For detailing studios and ceramic coating shops.",
    description:
      "Package your services, schedule by bay and capture the perfect before/after gallery for every customer — ready to share on WhatsApp or social.",
    bullets: [
      "Service packages: wash, polish, paint correction, coating",
      "Photo galleries attached to every job",
      "Booking deposits and online slot reservation",
      "Loyalty stamps for repeat detailing customers",
    ],
    icon: SprayCan,
    accent: "bg-violet-50",
    iconBg: "bg-violet-100",
    iconCls: "text-violet-600",
    photo: photoDetailingShop,
  },
  {
    slug: "tyre-shops",
    label: "Tyre & Wheel",
    eyebrow: "Tyres, Alignment, Balancing",
    title: "Fast-paced tyre and wheel service.",
    description:
      "Quick check-in, tyre size lookup and one-tap invoicing — designed for the volume of a busy tyre bay.",
    bullets: [
      "Tyre size and DOT tracking per vehicle",
      "Quick repair flow for puncture and rotation jobs",
      "Wheel alignment readings before / after",
      "Inventory tracking by brand, size and pattern",
    ],
    icon: CircleDot,
    accent: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconCls: "text-amber-600",
    photo: photoOnLiftWheels,
  },
  {
    slug: "quick-lube",
    label: "Quick Lube",
    eyebrow: "Oil Change Centers",
    title: "Sub-15-minute oil and fluid services.",
    description:
      "Everything you need to keep the express lane moving — without paperwork slowing you down between cars.",
    bullets: [
      "One-tap oil + filter packages with set prices",
      "Walk-in friendly check-in (no booking required)",
      "Service stickers and next-due reminders by SMS",
      "Daily takings report at the end of every shift",
    ],
    icon: Droplets,
    accent: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconCls: "text-emerald-600",
    photo: photoMechanic,
  },
  {
    slug: "performance",
    label: "Performance & Tuning",
    eyebrow: "Tuning, Mods, Dyno",
    title: "For performance and modification specialists.",
    description:
      "Document every modification, dyno run and tune revision per vehicle. Build a service log your enthusiast customers can be proud of.",
    bullets: [
      "Build sheets with installed mods per vehicle",
      "Dyno results stored alongside the service record",
      "ECU tune revisions and rollback notes",
      "Custom parts sourcing with markup tracking",
    ],
    icon: Gauge,
    accent: "bg-indigo-50",
    iconBg: "bg-indigo-100",
    iconCls: "text-indigo-600",
    photo: photoPerfDark,
  },
  {
    slug: "ev",
    label: "EV Service",
    eyebrow: "Electric Vehicles",
    title: "Service centers built around the EV.",
    description:
      "Battery health checks, software updates and high-voltage safety procedures — managed with the same job card flow as combustion repairs.",
    bullets: [
      "Battery state-of-health logging per visit",
      "High-voltage isolation and safety checklists",
      "Charging port and cable diagnostics",
      "OEM software update tracking",
    ],
    icon: BatteryCharging,
    accent: "bg-teal-50",
    iconBg: "bg-teal-100",
    iconCls: "text-teal-600",
    photo: photoModernShop,
  },
  {
    slug: "fleet",
    label: "Fleet Maintenance",
    eyebrow: "Commercial & Corporate Fleets",
    title: "Keep entire fleets on the road.",
    description:
      "Manage hundreds of vehicles for one corporate client. Schedule preventive maintenance, batch invoice the fleet account and keep downtime under control.",
    bullets: [
      "Bulk-import vehicles per fleet account",
      "Preventive maintenance schedules by mileage or date",
      "Consolidated monthly invoicing per fleet",
      "Downtime and uptime reporting per vehicle",
    ],
    icon: Truck,
    accent: "bg-slate-50",
    iconBg: "bg-slate-200",
    iconCls: "text-slate-700",
    photo: photoServiceBay,
  },
  {
    slug: "motorcycle",
    label: "Motorcycle Workshops",
    eyebrow: "Bikes & Powersports",
    title: "Tailored for two-wheel service shops.",
    description:
      "From routine servicing to engine rebuilds, manage motorcycle jobs with bike-specific fields and service intervals.",
    bullets: [
      "Bike-specific intake form (chain, sprockets, tyres, brakes)",
      "Track service intervals by engine hours or kilometres",
      "Parts catalogue per make and model",
      "Test-ride checklist before handover",
    ],
    icon: Bike,
    accent: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconCls: "text-orange-600",
    photo: photoMotor,
  },
  {
    slug: "mobile",
    label: "Mobile Mechanics",
    eyebrow: "On-Site Service",
    title: "Run your workshop from the road.",
    description:
      "Take ceeda&gt; on the go. Schedule on-site visits, collect signatures and accept payment from the driveway — no office required.",
    bullets: [
      "Calendar with travel time between jobs",
      "Mobile-first job cards on the technician app",
      "On-site photos, signatures and digital invoices",
      "Tap-to-pay and online payment links",
    ],
    icon: MapPin,
    accent: "bg-cyan-50",
    iconBg: "bg-cyan-100",
    iconCls: "text-cyan-600",
    photo: photoMobile,
  },
  {
    slug: "multi-branch",
    label: "Multi-Branch",
    eyebrow: "Chains & Franchises",
    title: "One platform across every location.",
    description:
      "Standardise pricing, processes and reporting across every branch. Compare performance side by side and keep your brand consistent.",
    bullets: [
      "Per-branch dashboards with consolidated reports",
      "Centrally managed services, parts and pricing",
      "Cross-branch customer and vehicle history",
      "Role-based access for branch managers and HQ",
    ],
    icon: Building2,
    accent: "bg-fuchsia-50",
    iconBg: "bg-fuchsia-100",
    iconCls: "text-fuchsia-600",
    photo: photoWorkshopHero,
  },
  {
    slug: "warranty",
    label: "Warranty & Inspection",
    eyebrow: "PDI, Pre-Purchase, Warranty",
    title: "Inspection-led businesses and warranty centers.",
    description:
      "Run structured inspections with consistent checklists, generate signed reports and keep every claim auditable.",
    bullets: [
      "Custom inspection templates (PDI, pre-purchase, warranty)",
      "Pass / fail / advisory results per item",
      "Signed PDF reports shareable with the customer",
      "Warranty claim tracking with supporting evidence",
    ],
    icon: ShieldCheck,
    accent: "bg-lime-50",
    iconBg: "bg-lime-100",
    iconCls: "text-lime-700",
    photo: photoInspection,
  },
];

export default function SolutionsPage() {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      const el = document.getElementById(hash);
      if (!el) return;
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
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#161aff]/[0.05] to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-14 lg:pt-28 lg:pb-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-foreground/70">
              <Wrench className="h-3.5 w-3.5" /> One platform, many shop styles
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
              Solutions for every kind of auto business.
            </h1>
            <p className="mt-5 text-lg text-foreground/70 leading-relaxed max-w-2xl">
              Whether you run a two-bay garage, a paint and body shop, a
              detailing studio or a multi-branch chain, ceeda&gt; adapts to
              the way you actually work — without forcing you to change your
              process.
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
                  See pricing
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick-jump pills */}
          <div className="mt-10 flex flex-wrap gap-2">
            {SOLUTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.slug}
                  href={`#${s.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solution cards (grid overview) ───────────────────────────────── */}
      <section className="border-b border-border bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOLUTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.slug}
                  href={`#${s.slug}`}
                  className="group rounded-2xl border border-border bg-white overflow-hidden hover:border-[#161aff]/40 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={s.photo}
                      alt={`${s.label} workshop photo`}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <span className={cn("absolute top-3 left-3 inline-flex h-9 w-9 items-center justify-center rounded-lg shadow-sm bg-white", s.iconBg)}>
                      <Icon className={cn("h-4.5 w-4.5", s.iconCls)} />
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-xs uppercase tracking-wider text-foreground/50 font-medium">
                      {s.eyebrow}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">
                      {s.label}
                    </h3>
                    <p className="mt-2 text-sm text-foreground/70 leading-relaxed line-clamp-3 flex-1">
                      {s.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#161aff] group-hover:underline">
                      Learn more
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Detailed sections ────────────────────────────────────────────── */}
      <div className="divide-y divide-border">
        {SOLUTIONS.map((s, i) => (
          <SolutionSection key={s.slug} solution={s} index={i} />
        ))}
      </div>

      {/* Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <Wrench className="mx-auto h-6 w-6 text-foreground/30 mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Don't see your business above?
          </h2>
          <p className="mt-4 text-lg text-foreground/70 max-w-xl mx-auto">
            ceeda&gt; is flexible enough to fit any vehicle service workflow.
            Start a free trial and we'll help you set it up the way your
            shop runs.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="bg-[#161aff] hover:bg-[#1216cc] text-white border-0 font-medium shadow-sm">
                Start free trial
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="border-border bg-white text-foreground hover:bg-muted/60">
                Explore features
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SolutionSection({ solution, index }: { solution: Solution; index: number }) {
  const Icon = solution.icon;
  const reverse = index % 2 === 1;
  return (
    <section
      id={solution.slug}
      className={cn("scroll-mt-20 py-16 sm:py-20", index % 2 === 1 ? "bg-muted/20" : "bg-white")}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center",
          reverse && "lg:[&>*:first-child]:order-2",
        )}>
          {/* Text */}
          <div>
            <div className="flex items-center gap-3">
              <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", solution.iconBg)}>
                <Icon className={cn("h-4.5 w-4.5", solution.iconCls)} />
              </span>
              <span className="text-xs uppercase tracking-wider text-foreground/60 font-medium">
                {solution.eyebrow}
              </span>
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
              {solution.title}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-foreground/70 leading-relaxed">
              {solution.description}
            </p>
            <ul className="mt-6 space-y-2.5">
              {solution.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-[#161aff] mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex items-center gap-3">
              <Link href="/register">
                <Button size="sm" className="bg-[#161aff] hover:bg-[#1216cc] text-white border-0 font-medium">
                  Start free trial
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="sm" variant="outline" className="border-border bg-white text-foreground hover:bg-muted/60">
                  See features
                </Button>
              </Link>
            </div>
          </div>

          {/* Photo card */}
          <div>
            <div className="relative rounded-3xl border border-border overflow-hidden aspect-[5/4] shadow-sm">
              <img
                src={solution.photo}
                alt={`${solution.label} — workshop using ceeda>`}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 backdrop-blur bg-white/95", solution.iconBg)}>
                    <Icon className={cn("h-4.5 w-4.5", solution.iconCls)} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-white/80 font-medium">
                      {solution.eyebrow}
                    </p>
                    <p className="text-sm sm:text-base font-semibold text-white truncate">
                      {solution.label}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
