import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ChevronRight, BookOpen, Rocket, Layers, CalendarCheck, Wrench, Zap,
  ClipboardCheck, FileText, Receipt, CreditCard, Users, ShieldCheck,
  Settings as SettingsIcon, Smartphone, Bell, HelpCircle, Search,
  Info, AlertTriangle, ArrowRight, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Navigation tree ──────────────────────────────────────────────────── */

type DocSection = {
  id: string;
  title: string;
  icon: React.ElementType;
  subsections: { id: string; title: string }[];
};

const SECTIONS: DocSection[] = [
  {
    id: "introduction", title: "Introduction", icon: BookOpen,
    subsections: [
      { id: "what-is-ceeda",   title: "What is ceeda>" },
      { id: "who-its-for",     title: "Who it's for" },
      { id: "how-it-fits",     title: "How it fits together" },
    ],
  },
  {
    id: "quickstart", title: "Quickstart", icon: Rocket,
    subsections: [
      { id: "create-your-shop", title: "1. Create your shop" },
      { id: "invite-team",      title: "2. Invite your team" },
      { id: "configure-services", title: "3. Configure services" },
      { id: "first-booking",    title: "4. Take your first booking" },
    ],
  },
  {
    id: "core-concepts", title: "Core concepts", icon: Layers,
    subsections: [
      { id: "tenants",   title: "Shops & tenants" },
      { id: "roles",     title: "Roles & permissions" },
      { id: "lifecycle", title: "The job lifecycle" },
    ],
  },
  {
    id: "bookings", title: "Bookings", icon: CalendarCheck,
    subsections: [
      { id: "bookings-views",         title: "Calendar & list views" },
      { id: "bookings-walkins",       title: "Walk-ins & online bookings" },
      { id: "bookings-confirmations", title: "Confirmations & reminders" },
    ],
  },
  {
    id: "service-jobs", title: "Service jobs", icon: Wrench,
    subsections: [
      { id: "jobs-kanban",   title: "The kanban board" },
      { id: "jobs-tabs",     title: "Inside a job" },
      { id: "jobs-timer",    title: "Technician time tracking" },
    ],
  },
  {
    id: "quick-repair", title: "Quick repair", icon: Zap,
    subsections: [
      { id: "qr-when",     title: "When to use it" },
      { id: "qr-workflow", title: "The express workflow" },
    ],
  },
  {
    id: "inspections", title: "Inspections", icon: ClipboardCheck,
    subsections: [
      { id: "ins-templates", title: "Templates" },
      { id: "ins-evidence",  title: "Photo & video evidence" },
      { id: "ins-to-quote",  title: "Findings → quotation" },
    ],
  },
  {
    id: "quotations", title: "Quotations", icon: FileText,
    subsections: [
      { id: "quote-build",    title: "Building a quote" },
      { id: "quote-approval", title: "Customer approval" },
      { id: "quote-versions", title: "Versions & revisions" },
    ],
  },
  {
    id: "invoices", title: "Invoices", icon: Receipt,
    subsections: [
      { id: "invoice-create", title: "Auto-generation" },
      { id: "invoice-vat",    title: "VAT, discounts & deposits" },
      { id: "invoice-status", title: "Status & sending" },
    ],
  },
  {
    id: "payments", title: "Payments", icon: CreditCard,
    subsections: [
      { id: "pay-methods",   title: "Payment methods" },
      { id: "pay-online",    title: "Online payment links" },
      { id: "pay-cashup",    title: "End-of-day cash-up" },
    ],
  },
  {
    id: "customers", title: "Customers & vehicles", icon: Users,
    subsections: [
      { id: "cust-profiles", title: "Customer profiles" },
      { id: "cust-vehicles", title: "Vehicle history" },
    ],
  },
  {
    id: "team", title: "Team & roles", icon: ShieldCheck,
    subsections: [
      { id: "team-invite",      title: "Inviting users" },
      { id: "team-permissions", title: "Permission matrix" },
    ],
  },
  {
    id: "settings", title: "Settings", icon: SettingsIcon,
    subsections: [
      { id: "settings-business", title: "Business info" },
      { id: "settings-hours",    title: "Operating hours" },
      { id: "settings-services", title: "Service catalogue" },
      { id: "settings-comms",    title: "Branding & comms" },
      { id: "settings-billing",  title: "Billing & plan" },
    ],
  },
  {
    id: "mobile", title: "Technician app", icon: Smartphone,
    subsections: [
      { id: "mobile-login",     title: "Logging in" },
      { id: "mobile-job",       title: "Working a job" },
      { id: "mobile-inspect",   title: "Inspections on tablet" },
    ],
  },
  {
    id: "notifications", title: "Notifications", icon: Bell,
    subsections: [
      { id: "notif-whatsapp", title: "WhatsApp" },
      { id: "notif-email",    title: "Email" },
      { id: "notif-sms",      title: "SMS" },
    ],
  },
  {
    id: "faq", title: "FAQ", icon: HelpCircle,
    subsections: [
      { id: "faq-trial",   title: "How does the trial work?" },
      { id: "faq-data",    title: "Where is my data stored?" },
      { id: "faq-export",  title: "Can I export my data?" },
      { id: "faq-support", title: "How do I get support?" },
    ],
  },
];

/** Flat list of every anchorable id, in document order, for scroll-spy. */
const ALL_IDS: string[] = SECTIONS.flatMap((s) => [s.id, ...s.subsections.map((x) => x.id)]);

/* ─── Page component ──────────────────────────────────────────────────── */

export default function DocsPage() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const [query, setQuery] = useState("");

  /* Scroll-spy: highlight the section/sub-section currently in view. */
  useEffect(() => {
    const elements = ALL_IDS
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost intersecting entry above the centre line.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* On first load, jump to hash if present. */
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  /* Filter the nav tree based on the search query. */
  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => {
        const subMatches = s.subsections.filter((x) => x.title.toLowerCase().includes(q));
        if (s.title.toLowerCase().includes(q)) return s; // keep all subs
        return subMatches.length ? { ...s, subsections: subMatches } : null;
      })
      .filter((s): s is DocSection => s !== null);
  }, [query]);

  /* Right-hand "On this page" TOC for the current top-level section. */
  const currentTopSection =
    SECTIONS.find((s) => s.id === activeId) ??
    SECTIONS.find((s) => s.subsections.some((x) => x.id === activeId)) ??
    SECTIONS[0];

  return (
    <div className="bg-white">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="flex gap-8">
          {/* ─── Left sidebar ────────────────────────────────────────── */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto py-10 pr-4">
            <div className="relative mb-6">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search docs"
                className="w-full pl-8 pr-3 py-2 rounded-md border border-border bg-muted/30 text-sm placeholder:text-foreground/40 focus:outline-none focus:bg-white focus:border-foreground/20 transition-colors"
              />
            </div>
            <nav className="space-y-1">
              {filteredSections.map((section) => {
                const Icon = section.icon;
                const isActiveSection =
                  section.id === currentTopSection.id;
                return (
                  <div key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
                        isActiveSection
                          ? "bg-[#161aff]/10 text-[#161aff]"
                          : "text-foreground/70 hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {section.title}
                    </a>
                    {isActiveSection && section.subsections.length > 0 && (
                      <ul className="mt-1 mb-2 ml-3 border-l border-border space-y-px">
                        {section.subsections.map((sub) => {
                          const isActive = sub.id === activeId;
                          return (
                            <li key={sub.id}>
                              <a
                                href={`#${sub.id}`}
                                className={cn(
                                  "block pl-4 pr-2 py-1 -ml-px border-l text-[13px] transition-colors",
                                  isActive
                                    ? "border-[#161aff] text-[#161aff] font-medium"
                                    : "border-transparent text-foreground/60 hover:text-foreground hover:border-foreground/30",
                                )}
                              >
                                {sub.title}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* ─── Main content ───────────────────────────────────────── */}
          <main className="flex-1 min-w-0 py-10 max-w-3xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-foreground/50 mb-6">
              <Link href="/" className="hover:text-foreground">ceeda&gt;</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">Docs</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{currentTopSection.title}</span>
            </nav>

            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              ceeda&gt; Documentation
            </h1>
            <p className="mt-3 text-lg text-foreground/70 leading-relaxed">
              Everything you need to set up your shop, run your team, and grow with ceeda&gt;.
              Start with the quickstart, then dive into the modules you use most.
            </p>

            {/* Hero action cards */}
            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              <a href="#quickstart" className="group rounded-xl border border-border p-5 hover:border-[#161aff]/40 hover:shadow-sm transition-all">
                <div className="flex items-center gap-2 text-[#161aff] mb-2">
                  <Rocket className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Get started</p>
                </div>
                <p className="font-semibold text-foreground">Quickstart in 5 minutes</p>
                <p className="mt-1 text-sm text-foreground/60">Sign up, create your shop, take your first booking.</p>
              </a>
              <a href="#core-concepts" className="group rounded-xl border border-border p-5 hover:border-[#161aff]/40 hover:shadow-sm transition-all">
                <div className="flex items-center gap-2 text-[#161aff] mb-2">
                  <Layers className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Concepts</p>
                </div>
                <p className="font-semibold text-foreground">How ceeda&gt; thinks</p>
                <p className="mt-1 text-sm text-foreground/60">Tenants, roles, jobs, and how they connect.</p>
              </a>
            </div>

            {/* ─── Sections ─────────────────────────────────────────── */}
            <div className="mt-16 space-y-20">
              {/* INTRODUCTION */}
              <Section id="introduction" title="Introduction" eyebrow="Welcome">
                <SubHeading id="what-is-ceeda" title="What is ceeda>" />
                <p>
                  <strong>ceeda&gt;</strong> is the operating system for modern auto workshops.
                  It replaces the patchwork of spreadsheets, paper job cards, and WhatsApp groups most
                  shops use today with a single platform that covers bookings, inspections, quotations,
                  job tracking, invoicing and payments.
                </p>
                <p>
                  Each shop on ceeda&gt; gets its own private workspace (a <Code>tenant</Code>), with
                  its own users, customers, vehicles, services and pricing. Your data is isolated
                  from every other shop on the platform.
                </p>

                <SubHeading id="who-its-for" title="Who it's for" />
                <p>
                  ceeda&gt; works for any shop that services vehicles — independent garages,
                  service centres, tyre shops, quick-lube stations, and multi-branch chains. The
                  workflow is the same; the modules you use depend on the work you do.
                </p>

                <SubHeading id="how-it-fits" title="How it fits together" />
                <p>
                  ceeda&gt; ships as three apps that share the same data:
                </p>
                <Table
                  rows={[
                    ["Workshop app", "The day-to-day web app for advisors, managers and admins."],
                    ["Technician app", "A tablet- and phone-friendly app for technicians on the floor — jobs and account only."],
                    ["Admin console", "A separate platform-wide console for ceeda&gt; staff to manage shops and plans."],
                  ]}
                />
              </Section>

              {/* QUICKSTART */}
              <Section id="quickstart" title="Quickstart" eyebrow="5 minutes">
                <p>This is the fastest path from signing up to a working shop.</p>

                <SubHeading id="create-your-shop" title="1. Create your shop" />
                <Steps>
                  <li>
                    Click <strong>Create your shop</strong> on the homepage.
                  </li>
                  <li>
                    Enter your shop name, country and contact email. A 14-day free trial starts
                    automatically — no credit card required.
                  </li>
                  <li>
                    Verify your email and you'll land on your shop's dashboard at{" "}
                    <Code>{"<your-shop>"}.ceeda.app</Code>.
                  </li>
                </Steps>
                <Note kind="info">
                  Pick a short, memorable shop slug. It becomes the URL your team uses every day
                  and appears on customer-facing quotes and invoices.
                </Note>

                <SubHeading id="invite-team" title="2. Invite your team" />
                <Steps>
                  <li>Open <Code>Settings → Team</Code>.</li>
                  <li>Click <strong>Invite member</strong>, enter their email, and pick a role.</li>
                  <li>They'll get an email with a one-click join link.</li>
                </Steps>

                <SubHeading id="configure-services" title="3. Configure your services" />
                <p>
                  ceeda&gt; ships with a starter service catalogue, but most shops customise it on day one.
                  Open <Code>Settings → Services</Code> and add the services you sell most often, with
                  default prices and labour times.
                </p>

                <SubHeading id="first-booking" title="4. Take your first booking" />
                <Steps>
                  <li>Open <Code>Bookings</Code> and click <strong>+ New booking</strong>.</li>
                  <li>
                    Search for the customer (or create a new one), pick the vehicle, the service,
                    and a slot on the calendar.
                  </li>
                  <li>
                    Save. The customer gets a WhatsApp confirmation, and the booking shows up on
                    every advisor's dashboard.
                  </li>
                </Steps>
                <Note kind="success">
                  You're done. From here, the booking flows naturally into a service job, an
                  inspection, a quotation, and finally an invoice — without re-typing anything.
                </Note>
              </Section>

              {/* CORE CONCEPTS */}
              <Section id="core-concepts" title="Core concepts" eyebrow="The mental model">
                <SubHeading id="tenants" title="Shops & tenants" />
                <p>
                  Every shop on ceeda&gt; is a <strong>tenant</strong>. A tenant has its own users,
                  customers, vehicles, services, prices, branding, and billing plan. Multi-branch
                  groups can run multiple tenants side-by-side, or one tenant with multiple{" "}
                  <strong>locations</strong> (Professional plan and above).
                </p>

                <SubHeading id="roles" title="Roles & permissions" />
                <p>
                  Every team member has a role. Roles control which modules they can see and what
                  they can do inside each one.
                </p>
                <Table
                  header={["Role", "Sees"]}
                  rows={[
                    ["Owner",      "Everything, including billing and team management."],
                    ["Admin",      "Everything except billing."],
                    ["Manager",    "Bookings, jobs, quotes, invoices, customers and reporting."],
                    ["Advisor",    "Bookings, customers, quotes, invoices and payments."],
                    ["Technician", "Jobs and account only — no pricing, no customers, no settings."],
                    ["Cashier",    "Invoices and payments."],
                  ]}
                />

                <SubHeading id="lifecycle" title="The job lifecycle" />
                <p>A typical full-service job moves through these stages:</p>
                <ol className="ml-5 list-decimal space-y-2 text-sm text-foreground/80">
                  <li><strong>Booking</strong> — slot reserved on the calendar.</li>
                  <li><strong>Check-in</strong> — vehicle arrives, advisor opens a service job.</li>
                  <li><strong>Inspection</strong> — multi-point check, photos and notes captured.</li>
                  <li><strong>Quotation</strong> — built from inspection findings, sent to the customer.</li>
                  <li><strong>Approval</strong> — customer approves line items on their phone.</li>
                  <li><strong>In progress</strong> — technicians do the work, time-tracked.</li>
                  <li><strong>QC</strong> — supervisor signs off the work.</li>
                  <li><strong>Invoice & payment</strong> — invoice auto-generated, payment collected.</li>
                  <li><strong>Delivery</strong> — customer notified, vehicle handed back.</li>
                </ol>
              </Section>

              {/* BOOKINGS */}
              <Section id="bookings" title="Bookings" eyebrow="Front desk">
                <SubHeading id="bookings-views" title="Calendar & list views" />
                <p>
                  The Bookings module gives you three views of the same data: a day calendar
                  (with bays as columns), a week calendar, and a flat list. Drag a booking to
                  reschedule. Drag between bay columns to reassign.
                </p>

                <SubHeading id="bookings-walkins" title="Walk-ins & online bookings" />
                <p>
                  Walk-ins can be checked in directly from the dashboard — no booking required.
                  Customers can also book online via your shop's public booking link, available
                  in <Code>Settings → Business</Code>.
                </p>

                <SubHeading id="bookings-confirmations" title="Confirmations & reminders" />
                <p>
                  When a booking is created, the customer gets a confirmation message via the
                  channel they prefer (WhatsApp, SMS, or email). A reminder goes out 24 hours
                  before the appointment.
                </p>
              </Section>

              {/* SERVICE JOBS */}
              <Section id="service-jobs" title="Service jobs" eyebrow="Bay floor">
                <SubHeading id="jobs-kanban" title="The kanban board" />
                <p>
                  Jobs flow left-to-right across the kanban board:{" "}
                  <Code>New → Waiting → In progress → QC → Completed → Delivered</Code>.
                  Drag a card between columns to advance the status — the customer is notified
                  automatically at each step (if you've enabled notifications for that status).
                </p>

                <SubHeading id="jobs-tabs" title="Inside a job" />
                <p>A service job has tabs for everything related to it:</p>
                <Table
                  header={["Tab", "Purpose"]}
                  rows={[
                    ["Overview",   "Customer, vehicle, status, assigned tech, notes."],
                    ["Inspection", "The multi-point inspection report."],
                    ["Quotation",  "The estimate sent to the customer."],
                    ["Parts",      "Parts ordered and used on this job."],
                    ["Job report", "Internal log of what was done."],
                    ["Invoice",    "The invoice generated from this job."],
                  ]}
                />
                <Note kind="info">
                  Technicians see a focused view: only <strong>Inspection</strong> and{" "}
                  <strong>Job report</strong> tabs are available to them, with no pricing.
                </Note>

                <SubHeading id="jobs-timer" title="Technician time tracking" />
                <p>
                  Every job has a built-in timer. Technicians press <strong>Start</strong> when they
                  pick up the work and <strong>Stop</strong> when they're done. Time is logged
                  against the job and the technician for reporting and payroll.
                </p>
              </Section>

              {/* QUICK REPAIR */}
              <Section id="quick-repair" title="Quick repair" eyebrow="Express lane">
                <SubHeading id="qr-when" title="When to use it" />
                <p>
                  Use Quick Repair for small jobs that don't need a full inspection: oil changes,
                  tyre swaps, wiper-blade replacements, battery installs. It's the same workflow
                  but with the inspection step skipped.
                </p>

                <SubHeading id="qr-workflow" title="The express workflow" />
                <Steps>
                  <li>Open <Code>Quick repair → New</Code>.</li>
                  <li>Pick the vehicle.</li>
                  <li>Add parts and labour from the service catalogue.</li>
                  <li>Send the quote to the customer's phone.</li>
                  <li>On approval, the invoice is generated automatically.</li>
                </Steps>
                <Note kind="info">
                  Technicians on a Quick Repair only see the <strong>Quotation</strong> tab — they can update
                  parts and labour, but cannot edit prices.
                </Note>
              </Section>

              {/* INSPECTIONS */}
              <Section id="inspections" title="Inspections" eyebrow="Diagnostics">
                <SubHeading id="ins-templates" title="Templates" />
                <p>
                  Build inspection templates in <Code>Settings → Services → Inspection templates</Code>.
                  Each template has groups (e.g. Engine bay, Brakes, Suspension) and items inside
                  each group. Items can be checkboxes, numeric values, or free text.
                </p>

                <SubHeading id="ins-evidence" title="Photo & video evidence" />
                <p>
                  Every inspection item supports photo and short-video evidence. Attached media
                  is included in the customer-facing inspection report and stored against the job.
                </p>

                <SubHeading id="ins-to-quote" title="Findings → quotation" />
                <p>
                  Mark any item as <Code>warn</Code> or <Code>fail</Code> and it becomes
                  a candidate line on the next quotation. Click <strong>Generate quote</strong> at
                  the end of the inspection and ceeda&gt; pre-fills line items from the findings.
                </p>
              </Section>

              {/* QUOTATIONS */}
              <Section id="quotations" title="Quotations" eyebrow="Sales">
                <SubHeading id="quote-build" title="Building a quote" />
                <p>
                  Quotes are built from line items. Each line is a part, a labour service, a fee,
                  or a discount. VAT and rounding are applied automatically based on your shop's
                  region.
                </p>

                <SubHeading id="quote-approval" title="Customer approval" />
                <p>
                  Send the quote via WhatsApp, SMS or email. The customer opens a private link
                  and approves or rejects each line individually. You see the result in real time —
                  no phone calls required.
                </p>

                <SubHeading id="quote-versions" title="Versions & revisions" />
                <p>
                  When you change an already-sent quote, ceeda&gt; creates a new version and keeps
                  the previous one for reference. You can always see exactly what was sent and when.
                </p>
              </Section>

              {/* INVOICES */}
              <Section id="invoices" title="Invoices" eyebrow="Billing">
                <SubHeading id="invoice-create" title="Auto-generation" />
                <p>
                  Invoices are auto-generated from approved quotes and completed jobs. You can also
                  create a manual invoice from <Code>Invoices → New</Code> for cash sales.
                </p>

                <SubHeading id="invoice-vat" title="VAT, discounts & deposits" />
                <p>
                  VAT is calculated per line based on your shop's tax region. Whole-invoice
                  discounts and per-line discounts are both supported. Deposits taken in advance
                  are subtracted from the balance due.
                </p>

                <SubHeading id="invoice-status" title="Status & sending" />
                <p>
                  Invoices move through these statuses:{" "}
                  <Code>Draft → Sent → Partially paid → Paid</Code>.
                  Sending an invoice creates a PDF on your branded template and shares it via the
                  customer's preferred channel.
                </p>
              </Section>

              {/* PAYMENTS */}
              <Section id="payments" title="Payments" eyebrow="Cashier">
                <SubHeading id="pay-methods" title="Payment methods" />
                <p>
                  Cash, card (terminal or online), bank transfer and split payments are all supported.
                  Every payment is reconciled against an invoice and tagged to the cashier who
                  recorded it.
                </p>

                <SubHeading id="pay-online" title="Online payment links" />
                <p>
                  When the online payment add-on is enabled, every invoice gets a secure payment link
                  delivered with the invoice. Customers can pay by card without coming to the shop.
                </p>

                <SubHeading id="pay-cashup" title="End-of-day cash-up" />
                <p>
                  Open <Code>Payments → Cash-up</Code> at end of shift. ceeda&gt; shows you the totals
                  per cashier, per method, and flags any variance against expected cash.
                </p>
              </Section>

              {/* CUSTOMERS */}
              <Section id="customers" title="Customers & vehicles" eyebrow="CRM">
                <SubHeading id="cust-profiles" title="Customer profiles" />
                <p>
                  Each customer has a profile with their contact details, preferred channel,
                  vehicles, and full service history. Tag customers as <Code>VIP</Code>,{" "}
                  <Code>Fleet</Code>, <Code>Dealer</Code>, or anything custom.
                </p>

                <SubHeading id="cust-vehicles" title="Vehicle history" />
                <p>
                  Every vehicle keeps a complete service history — bookings, jobs, inspections,
                  quotations and invoices — so any advisor can pick up the conversation, even
                  if they've never seen the customer before.
                </p>
              </Section>

              {/* TEAM */}
              <Section id="team" title="Team & roles" eyebrow="Access control">
                <SubHeading id="team-invite" title="Inviting users" />
                <p>
                  Owners and admins can invite teammates from <Code>Settings → Team</Code>.
                  Invites expire after 7 days. You can revoke an invite or remove a user at any
                  time without losing the records they created.
                </p>

                <SubHeading id="team-permissions" title="Permission matrix" />
                <Table
                  header={["Module", "Owner", "Admin", "Manager", "Advisor", "Technician", "Cashier"]}
                  rows={[
                    ["Bookings",   "Yes", "Yes", "Yes", "Yes", "—",  "—"],
                    ["Jobs",       "Yes", "Yes", "Yes", "Yes", "Yes", "—"],
                    ["Inspections","Yes", "Yes", "Yes", "Yes", "Yes", "—"],
                    ["Quotations", "Yes", "Yes", "Yes", "Yes", "—",  "—"],
                    ["Invoices",   "Yes", "Yes", "Yes", "Yes", "—",  "Yes"],
                    ["Payments",   "Yes", "Yes", "Yes", "Yes", "—",  "Yes"],
                    ["Customers",  "Yes", "Yes", "Yes", "Yes", "—",  "—"],
                    ["Settings",   "Yes", "Yes", "—",   "—",   "—",  "—"],
                    ["Billing",    "Yes", "—",   "—",   "—",   "—",  "—"],
                  ]}
                />
              </Section>

              {/* SETTINGS */}
              <Section id="settings" title="Settings" eyebrow="Configuration">
                <SubHeading id="settings-business" title="Business info" />
                <p>
                  Shop name, address, tax registration number, currency, default language, and
                  invoice numbering format. This information appears on every customer-facing
                  document.
                </p>

                <SubHeading id="settings-hours" title="Operating hours" />
                <p>
                  Set your weekly schedule and exception days (public holidays, planned closures).
                  Online bookings are restricted to your operating hours automatically.
                </p>

                <SubHeading id="settings-services" title="Service catalogue" />
                <p>
                  Your master list of services and parts with default prices, labour times and
                  VAT rates. Categories make it easy to find services when building a quote.
                </p>

                <SubHeading id="settings-comms" title="Branding & comms" />
                <p>
                  Upload your logo, set your brand colour, and customise the templates used for
                  WhatsApp, SMS and email messages.
                </p>

                <SubHeading id="settings-billing" title="Billing & plan" />
                <p>
                  See your current plan, usage, invoices, and update your payment method. Owners
                  can upgrade, downgrade or cancel from this screen.
                </p>
              </Section>

              {/* MOBILE */}
              <Section id="mobile" title="Technician app" eyebrow="On the floor">
                <SubHeading id="mobile-login" title="Logging in" />
                <p>
                  Technicians log in to the dedicated <strong>ceeda&gt; Technician</strong> app on
                  their phone or tablet using the same credentials as the web app. They land
                  directly on their assigned jobs.
                </p>

                <SubHeading id="mobile-job" title="Working a job" />
                <p>
                  Tapping a job opens a streamlined view with two tabs: <strong>Inspection</strong>{" "}
                  and <strong>Job report</strong>. The tech can update status, start the timer,
                  add photos, and save notes — but never sees customer pricing.
                </p>

                <SubHeading id="mobile-inspect" title="Inspections on tablet" />
                <p>
                  Tablets are recommended for inspections — the bigger screen makes it easy to
                  go through a multi-point checklist quickly while photographing each finding.
                </p>
              </Section>

              {/* NOTIFICATIONS */}
              <Section id="notifications" title="Notifications" eyebrow="Customer comms">
                <SubHeading id="notif-whatsapp" title="WhatsApp" />
                <p>
                  WhatsApp is the primary channel for booking confirmations, quote approvals,
                  invoice delivery and payment links. WhatsApp Business API access is included
                  in Professional and Enterprise plans.
                </p>

                <SubHeading id="notif-email" title="Email" />
                <p>
                  Transactional emails (invoices, account events, password resets) go out via
                  Resend. Replies route back to your shop's contact address.
                </p>

                <SubHeading id="notif-sms" title="SMS" />
                <p>
                  SMS is available as a fallback channel for customers who don't use WhatsApp.
                  Per-message charges apply on usage above the included monthly allowance.
                </p>
              </Section>

              {/* FAQ */}
              <Section id="faq" title="FAQ" eyebrow="Common questions">
                <SubHeading id="faq-trial" title="How does the trial work?" />
                <p>
                  Every plan includes a 14-day free trial with full access to all features.
                  No credit card is required to start. At the end of the trial, you choose a
                  plan or your account is paused (your data is kept for 30 days).
                </p>

                <SubHeading id="faq-data" title="Where is my data stored?" />
                <p>
                  Customer and shop data is stored on encrypted infrastructure in our
                  primary region (UAE). Daily backups are retained for 14 days.
                </p>

                <SubHeading id="faq-export" title="Can I export my data?" />
                <p>
                  Yes. You can export customers, vehicles, bookings, jobs, quotations, invoices
                  and payments to CSV at any time from each module. Full account exports are
                  available on request.
                </p>

                <SubHeading id="faq-support" title="How do I get support?" />
                <p>
                  Reach us at <Code>support@ceeda.app</Code>. Professional and Enterprise plans
                  include priority response times and a dedicated account manager.
                </p>
              </Section>
            </div>

            {/* Footer next-page CTA */}
            <div className="mt-20 pt-10 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-foreground/50">Ready to start?</p>
                <p className="mt-1 text-lg font-semibold text-foreground">Create your shop in 5 minutes.</p>
              </div>
              <Link href="/register">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                  Create your shop
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </main>

          {/* ─── Right TOC ──────────────────────────────────────────── */}
          <aside className="hidden xl:block w-56 shrink-0 sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto py-10 pl-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-3">
              On this page
            </p>
            <ul className="space-y-px border-l border-border">
              {currentTopSection.subsections.map((sub) => {
                const isActive = sub.id === activeId;
                return (
                  <li key={sub.id}>
                    <a
                      href={`#${sub.id}`}
                      className={cn(
                        "block pl-3 -ml-px border-l py-1 text-[13px] transition-colors",
                        isActive
                          ? "border-[#161aff] text-[#161aff] font-medium"
                          : "border-transparent text-foreground/60 hover:text-foreground hover:border-foreground/30",
                      )}
                    >
                      {sub.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ─── Building blocks ──────────────────────────────────────────────────── */

function Section({
  id, title, eyebrow, children,
}: { id: string; title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="border-b border-border pb-4 mb-6">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-[#161aff] mb-2">
            {eyebrow}
          </p>
        )}
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 group">
          {title}
          <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground/40 hover:text-foreground" aria-label="Anchor link">
            <Hash className="h-5 w-5" />
          </a>
        </h2>
      </div>
      <div className="prose-docs space-y-4 text-[15px] leading-relaxed text-foreground/80">
        {children}
      </div>
    </section>
  );
}

function SubHeading({ id, title }: { id: string; title: string }) {
  return (
    <h3 id={id} className="scroll-mt-20 mt-10 text-xl font-semibold tracking-tight text-foreground flex items-center gap-2 group">
      {title}
      <a
        href={`#${id}`}
        aria-label="Anchor link"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground/40 hover:text-foreground"
      >
        <Hash className="h-4 w-4" />
      </a>
    </h3>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted/60 border border-border px-1.5 py-0.5 text-[0.85em] font-mono text-foreground">
      {children}
    </code>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="ml-5 list-decimal space-y-2 text-foreground/80">{children}</ol>;
}

function Note({
  kind = "info", children,
}: { kind?: "info" | "warning" | "success"; children: React.ReactNode }) {
  const map = {
    info:    { icon: Info,          cls: "border-[#161aff]/30 bg-[#161aff]/[0.04] text-[#161aff]" },
    warning: { icon: AlertTriangle, cls: "border-amber-300       bg-amber-50            text-amber-700" },
    success: { icon: ClipboardCheck,cls: "border-emerald-300     bg-emerald-50          text-emerald-700" },
  } as const;
  const { icon: Icon, cls } = map[kind];
  return (
    <div className={cn("rounded-lg border p-4 flex gap-3 text-sm", cls)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="text-foreground/80">{children}</div>
    </div>
  );
}

function Table({
  header, rows,
}: { header?: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden text-sm">
      {header && (
        <div className="grid bg-muted/40 border-b border-border" style={{ gridTemplateColumns: `repeat(${header.length}, minmax(0, 1fr))` }}>
          {header.map((h) => (
            <div key={h} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">{h}</div>
          ))}
        </div>
      )}
      {rows.map((r, i) => (
        <div
          key={i}
          className={cn("grid border-b last:border-0 border-border", i % 2 === 1 && "bg-muted/20")}
          style={{ gridTemplateColumns: `repeat(${r.length}, minmax(0, 1fr))` }}
        >
          {r.map((cell, j) => (
            <div key={j} className="px-3 py-2 text-foreground/80">{cell}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
