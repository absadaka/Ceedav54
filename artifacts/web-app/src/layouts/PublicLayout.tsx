import { Link, useLocation } from "wouter";
import { Menu, X, Wrench } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Product", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
];

function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] tracking-tight">CEEDA</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                location === link.href
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/auth">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/auth?plan=starter">
            <Button size="sm">Start free trial</Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 space-y-2">
            <Link href="/auth" onClick={() => setMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">Sign in</Button>
            </Link>
            <Link href="/auth?plan=starter" onClick={() => setMenuOpen(false)}>
              <Button size="sm" className="w-full">Start free trial</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Wrench className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold">CEEDA</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              Workshop management software for modern automotive businesses.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
            <div className="space-y-3">
              <p className="font-medium text-foreground">Product</p>
              {[["Features", "/#features"], ["Pricing", "/pricing"], ["Changelog", "#changelog"]].map(([label, href]) => (
                <Link key={`product-${label}`} href={href} className="block text-muted-foreground hover:text-foreground transition-colors">
                  {label}
                </Link>
              ))}
            </div>
            <div className="space-y-3">
              <p className="font-medium text-foreground">Company</p>
              {[["About", "#about"], ["Contact", "#contact"], ["Blog", "#blog"]].map(([label, href]) => (
                <Link key={`company-${label}`} href={href} className="block text-muted-foreground hover:text-foreground transition-colors">
                  {label}
                </Link>
              ))}
            </div>
            <div className="space-y-3">
              <p className="font-medium text-foreground">Legal</p>
              {[["Privacy", "#privacy"], ["Terms", "#terms"], ["Security", "#security"]].map(([label, href]) => (
                <Link key={`legal-${label}`} href={href} className="block text-muted-foreground hover:text-foreground transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CEEDA. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Built for automotive workshops.</p>
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
