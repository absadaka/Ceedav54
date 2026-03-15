import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Product", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
];

function Logo({ size = "md", light = false }: { size?: "sm" | "md"; light?: boolean }) {
  const sz = size === "sm" ? 22 : 26;
  const textColor = light ? "#ffffff" : "#0a0a0a";
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

function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  const isAuthPage = location === "/auth" || location === "/register" || location.startsWith("/auth/");

  if (isAuthPage) return null;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                location === link.href
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/auth">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="shadow-sm text-[12px] bg-[#161aff] border-[#161aff]">
              Create your shop
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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 space-y-2 border-t border-border mt-3">
            <Link href="/auth" onClick={() => setMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">Sign in</Button>
            </Link>
            <Link href="/register" onClick={() => setMenuOpen(false)}>
              <Button size="sm" className="w-full bg-[#cd77e5] border-[#cd77e5]">Create your shop</Button>
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
