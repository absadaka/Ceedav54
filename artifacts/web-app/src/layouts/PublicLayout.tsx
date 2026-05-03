import { Link, useLocation } from "wouter";
import {
  Menu, X, ChevronDown, Star,
  CalendarCheck, Wrench, Zap, FileText,
  Users, Receipt, CreditCard, ClipboardCheck,
  Instagram, Youtube, Linkedin, ArrowRight,
  LayoutGrid, LogOut,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Logo({ size = "md", light = false }: { size?: "sm" | "md"; light?: boolean }) {
  const sz = size === "sm" ? 22 : 26;
  return (
    <Link
      href="/"
      onClick={() => window.scrollTo({ top: 0, left: 0, behavior: "auto" })}
      className="flex items-center hover:opacity-80 transition-opacity shrink-0"
    >
      <span
        className="inline-flex items-baseline leading-none font-bold"
        style={{ fontSize: sz, fontFamily: "'Dubai', sans-serif", lineHeight: 1 }}
      >
        <span style={{ lineHeight: 1 }} className={light ? "text-white" : "text-[#0a0a0a]"}>ceeda</span>
        <span style={{ lineHeight: 1, color: "#00FF84", marginLeft: 1 }}>&gt;</span>
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
  const { user } = useAuth();

  const isAuthPage = location === "/auth" || location === "/register" || location.startsWith("/auth/");

  if (isAuthPage) return null;

  const dashboardHref = user ? `/dashboard?tenant=${user.tenantSlug}` : "/auth";
  const logoutHref    = user ? `/${user.tenantSlug}/logout`           : "/logout";

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
            <Link href="/solutions" className={navLinkClass(location === "/solutions")}>
              Solutions
            </Link>
            <Link href="/pricing" className={navLinkClass(location === "/pricing")}>
              Pricing
            </Link>
            <Link href="/docs" className={navLinkClass(location === "/docs")}>
              Docs
            </Link>
            <Link href="/features" className={navLinkClass(false)}>
              Blog
            </Link>
          </nav>
        </div>

        {/* Right: social proof + auth actions */}
        <div className="hidden md:flex items-center gap-2">
          {!user && (
            <a
              href="/#features"
              className="flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs text-foreground/80 hover:bg-muted/60 transition-colors"
              aria-label="Trusted by workshops"
            >
              <Star className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="font-medium tabular-nums">200+ shops</span>
            </a>
          )}
          {user ? (
            <>
              <Link href={dashboardHref}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border bg-white text-foreground hover:bg-muted/60 font-medium gap-1.5"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Dashboard
                </Button>
              </Link>
              <Link href={logoutHref}>
                <Button
                  size="sm"
                  className="bg-[#df94e3] hover:bg-[#c97acd] text-black border-0 gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log out
                </Button>
              </Link>
            </>
          ) : (
            <>
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
                  className="bg-[#df94e3] hover:bg-[#c97acd] text-black border-0"
                >
                  Create your shop
                </Button>
              </Link>
            </>
          )}
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
            href="/solutions"
            className="block px-3 py-2.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted"
            onClick={() => setMenuOpen(false)}
          >
            Solutions
          </Link>
          <Link
            href="/pricing"
            className="block px-3 py-2.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted"
            onClick={() => setMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link href="/docs" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted">Docs</Link>
          <Link href="/features" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted">Blog</Link>
          <div className="pt-3 space-y-2 border-t border-border mt-3">
            {user ? (
              <>
                <Link href={dashboardHref} onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Dashboard
                  </Button>
                </Link>
                <Link href={logoutHref} onClick={() => setMenuOpen(false)}>
                  <Button size="sm" className="w-full bg-[#df94e3] hover:bg-[#c97acd] text-black border-0 gap-1.5">
                    <LogOut className="h-3.5 w-3.5" />
                    Log out
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth" onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">Sign in</Button>
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" className="w-full bg-[#df94e3] hover:bg-[#c97acd] text-black border-0">Create your shop</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function PublicFooter() {
  const [location] = useLocation();
  const [email, setEmail] = useState("");
  const isAuthPage = location === "/auth" || location === "/register" || location.startsWith("/auth/");
  if (isAuthPage) return null;

  const productLinks: [string, string][] = [
    ["Home",      "/"],
    ["Features",  "/features"],
    ["Solutions", "/solutions"],
    ["Pricing",   "/pricing"],
    ["Docs",      "/docs"],
    ["Blog",      "/features"],
  ];

  const solutionsLinks: [string, string][] = [
    ["Car Maintenance", "/solutions#car-maintenance"],
    ["Body Shops",      "/solutions#bodyshops"],
    ["Auto Detailing",  "/solutions#auto-detailing"],
    ["Tyre & Wheel",    "/solutions#tyre-shops"],
    ["Quick Lubes",     "/solutions#quick-lube"],
    ["Multi-branch",    "/solutions#multi-branch"],
  ];

  const socials: { label: string; icon: React.ElementType; href: string }[] = [
    { label: "X",        icon: XIcon,    href: "#" },
    { label: "Instagram", icon: Instagram, href: "#" },
    { label: "YouTube",  icon: Youtube,  href: "#" },
    { label: "LinkedIn", icon: Linkedin, href: "#" },
  ];

  return (
    <footer className="relative bg-[#0a0a0a] mt-16 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand + subscribe */}
          <div className="lg:col-span-4 space-y-5">
            <Logo light />
            <div className="flex items-center gap-3">
              {socials.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Get product updates and news from ceeda&gt;.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); }}
              className="space-y-3 max-w-sm"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full rounded-md bg-[#141414] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20 focus:bg-[#181818] transition-colors"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#df94e3] hover:bg-[#c97acd] text-black px-4 py-2 text-sm font-medium transition-colors"
              >
                Subscribe
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* Product column */}
          <div className="lg:col-span-3 lg:col-start-6">
            <p className="text-sm font-semibold text-white mb-5">Product</p>
            <ul className="space-y-3">
              {productLinks.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    onClick={() => window.scrollTo({ top: 0, left: 0, behavior: "auto" })}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions column */}
          <div className="lg:col-span-3">
            <p className="text-sm font-semibold text-white mb-5">Solutions</p>
            <ul className="space-y-3">
              {solutionsLinks.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right rail: copyright */}
          <div className="lg:col-span-2 flex lg:flex-col lg:items-end items-start">
            <p className="text-xs text-slate-500 lg:text-right">
              © {new Date().getFullYear()} ceeda&gt;
            </p>
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
