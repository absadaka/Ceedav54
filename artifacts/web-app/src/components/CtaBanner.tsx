import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CtaBannerProps {
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Wrap the gradient card in a black band (matches the attached mock). */
  withDarkBand?: boolean;
}

/**
 * Big purple gradient call-to-action card with two buttons. The card sits on a
 * black band so it stands out at the bottom of long marketing pages.
 */
export function CtaBanner({
  title       = "Ready to upgrade your shop?",
  description = "Join hundreds of maintenance shops already running on ceer. Free for 14 days, no credit card needed.",
  primaryLabel   = "Start free trial",
  primaryHref    = "/register",
  secondaryLabel = "Book a demo",
  secondaryHref  = "/pricing",
  withDarkBand   = false,
}: CtaBannerProps) {
  const card = (
    <div className="relative overflow-hidden rounded-[28px] px-8 sm:px-16 py-16 sm:py-24 text-center shadow-2xl"
         style={{
           backgroundImage:
             "linear-gradient(120deg, #6f6cff 0%, #8a64ff 45%, #9d6cff 100%)",
         }}>
      {/* Subtle grid texture, like the mock */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.55) 1px, transparent 1px), " +
            "linear-gradient(to bottom, rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 80%)",
        }}
      />

      <div className="relative max-w-2xl mx-auto">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
          {title}
        </h2>
        <p className="mt-6 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl mx-auto">
          {description}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={primaryHref}>
            <Button
              size="lg"
              className="rounded-full bg-[#0a0a0a] text-white hover:bg-[#0a0a0a]/90 font-medium px-7 h-12 gap-2"
            >
              {primaryLabel}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={secondaryHref}>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white font-medium px-7 h-12"
            >
              {secondaryLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  if (!withDarkBand) {
    return <div className="px-4 sm:px-6 py-12">{card}</div>;
  }

  return (
    <section className={cn("bg-[#0a0a0a] py-12 sm:py-16 px-4 sm:px-6")}>
      <div className="max-w-6xl mx-auto">{card}</div>
    </section>
  );
}
