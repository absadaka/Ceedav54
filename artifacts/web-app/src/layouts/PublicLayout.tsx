import { Link, useLocation } from "wouter";
import {
  Menu, X, ChevronDown, Star,
  CalendarCheck, Wrench, Zap, FileText,
  Users, Receipt, CreditCard, ClipboardCheck,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SolutionItem = { label: string; href: string; icon: React.ElementType };

// Each item deep-links to its section on the dedicated /features page.
const featuresCol1: SolutionItem[] = [
  { label: "Bookings",      href: "/features#bookings",     icon: CalendarCheck },
  { label: "Service Jobs",  href: "/features#service-jobs", icon: Wrench },
  { label: "Quick Repair",  href: "/features#quick-repair", icon: Zap },
  { label: "Quotations",    href: "/features#quotations",   icon: FileText },
];

const featuresCol2: SolutionItem[] = [
  { label: "Customers",   href: "/features#customers",   icon: Users },
  { label: "Invoices",    href: "/features#invoices",    icon: Receipt },
  { label: "Payments",    href: "/features#payments",    icon: CreditCard },
  { label: "Inspections", href: "/features#inspections", icon: ClipboardCheck },
];

function Logo({ size = "md", light = false }: { size?: "sm" | "md"; light?: boolean }) {
  const sz = size === "sm" ? 22 : 26;
  return (
    <Link href="/" className="flex items-center hover:opacity-80 transition-opacity shrink-0">
      <span
        className="inline-flex items-center leading-none font-bold"
        style={{ fontSize: sz, fontFamily: "'Dubai', sans-serif", lineHeight: 1 }}
      >
        <span style={{ lineHeight: 1 }} className={light ? "text-white" : "text-[#0a0a0a]"}>ceeda&gt;</span>
      </span>
    </Link>
  );
}

export { Logo };

function FeaturesMegaMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function ColumnList({ items }: { items: SolutionItem[] }) {
    return (
      <div className="rounded-xl border border-border bg-white p-2 min-w-[180px]">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <a
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white">
                <Icon className="h-3.5 w-3.5 text-foreground" />
              </span>
              {it.label}
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors",
          open
            ? "text-foreground bg-muted border border-border"
            : "text-foreground hover:bg-muted/60"
        )}
      >
        Features
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="rounded-2xl border border-border bg-white shadow-xl p-3 flex gap-3">
            <ColumnList items={featuresCol1} />
            <ColumnList items={featuresCol2} />
            <div className="rounded-xl border border-border bg-white p-3 flex flex-col gap-2 min-w-[180px] justify-start">
              <Link href="/register" onClick={() => setOpen(false)}>
                <Button
                  size="sm"
                  className="w-full bg-[#df94e3] hover:bg-[#d27dd6] text-black border-0 font-medium"
                >
                  Start free trial
                </Button>
              </Link>
              <Link href="/features" onClick={() => setOpen(false)}>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-border bg-white text-foreground hover:bg-muted/60"
                >
                  Browse all features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [location] = useLocation();

  const isAuthPage = location === "/auth" || location === "/register" || location.startsWith("/auth/");

  if (isAuthPage) return null;

  const navLinkClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 text-sm rounded-md transition-colors",
      active
        ? "text-foreground bg-muted"
        : "text-foreground/80 hover:text-foreground hover:bg-muted/60"
    );

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-[64px] flex items-center justify-between gap-4">
        {/* Left: logo + primary nav */}
        <div className="flex items-center gap-3">
          <Logo />
          <nav className="hidden md:flex items-center gap-1 ml-2">
            <FeaturesMegaMenu />
            <Link href="/pricing" className={navLinkClass(location === "/pricing")}>
              Pricing
            </Link>
            <Link href="/features" className={navLinkClass(location === "/features")}>
              Docs
            </Link>
            <Link href="/features" className={navLinkClass(false)}>
              Blog
            </Link>
          </nav>
        </div>

        {/* Right: social proof + auth actions */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="/#features"
            className="flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs text-foreground/80 hover:bg-muted/60 transition-colors"
            aria-label="Trusted by workshops"
          >
            <Star className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="font-medium tabular-nums">200+ shops</span>
          </a>
          <Link href="/auth">
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-white text-foreground hover:bg-muted/60 font-medium"
            >
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-medium shadow-sm"
            >
              Start your project
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-white px-6 py-4 space-y-1 shadow-lg">
          <div>
            <button
              className="flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted"
              onClick={() => setFeaturesOpen((v) => !v)}
            >
              Features
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", featuresOpen && "rotate-180")} />
            </button>
            {featuresOpen && (
              <div className="pl-4 space-y-0.5 py-1">
                {[...featuresCol1, ...featuresCol2].map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted"
                      onClick={() => { setMenuOpen(false); setFeaturesOpen(false); }}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          <Link
            href="/pricing"
            className="block px-3 py-2.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted"
            onClick={() => setMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link href="/features" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted">Docs</Link>
          <Link href="/features" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted">Blog</Link>
          <div className="pt-3 space-y-2 border-t border-border mt-3">
            <Link href="/auth" onClick={() => setMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">Sign in</Button>
            </Link>
            <Link href="/register" onClick={() => setMenuOpen(false)}>
              <Button size="sm" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-0">Start your project</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function PublicFooter() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth" || location === "/register" || location.startsWith("/auth/");
  if (isAuthPage) return null;

  return (
    <footer
      className="relative bg-[#000000] mt-16"
    >
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex flex-col lg:flex-row justify-between gap-12">
          <div className="space-y-4 max-w-xs">
            <Logo light />
            <p className="text-sm text-slate-400 leading-relaxed">
              The workshop management platform built for modern automotive businesses. From check-in to invoice.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {["twitter", "linkedin"].map((s) => (
                <a key={s} href="#" className="w-8 h-8 rounded-md border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                  <span className="text-[10px] font-medium uppercase">{s[0]}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-10 text-sm">
            <div className="space-y-3">
              <p className="font-semibold text-slate-300 text-xs uppercase tracking-wider">Product</p>
              {[["Features", "/#features"], ["Pricing", "/pricing"], ["Changelog", "#changelog"], ["Roadmap", "#roadmap"]].map(([label, href]) => (
                <Link key={`product-${label}`} href={href} className="block text-slate-400 hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-slate-300 text-xs uppercase tracking-wider">Company</p>
              {[["About", "#about"], ["Blog", "#blog"], ["Careers", "#careers"], ["Contact", "#contact"]].map(([label, href]) => (
                <Link key={`company-${label}`} href={href} className="block text-slate-400 hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-slate-300 text-xs uppercase tracking-wider">Legal</p>
              {[["Privacy", "#privacy"], ["Terms", "#terms"], ["Security", "#security"], ["Cookies", "#cookies"]].map(([label, href]) => (
                <Link key={`legal-${label}`} href={href} className="block text-slate-400 hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} ceeda&gt; Technologies. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <p className="text-xs text-slate-500">All systems operational</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
