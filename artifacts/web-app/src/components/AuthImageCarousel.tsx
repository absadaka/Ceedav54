import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=1400&q=85&auto=format&fit=crop",
    headline: "From walk-in to invoice",
    sub: "Handle every customer in minutes, not hours.",
  },
  {
    url: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1400&q=85&auto=format&fit=crop",
    headline: "Your team, in sync",
    sub: "Advisors, technicians, and cashiers on one platform.",
  },
  {
    url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=85&auto=format&fit=crop",
    headline: "Premium service starts here",
    sub: "Give your customers the experience they expect.",
  },
  {
    url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1400&q=85&auto=format&fit=crop",
    headline: "Real-time job tracking",
    sub: "Know exactly what's happening on your workshop floor.",
  },
  {
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85&auto=format&fit=crop",
    headline: "Get paid faster",
    sub: "Send invoices via WhatsApp. Collect payment online.",
  },
];

interface AuthImageCarouselProps {
  className?: string;
}

export default function AuthImageCarousel({ className }: AuthImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>(SLIDES.map(() => false));
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % SLIDES.length);
        setTransitioning(false);
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLoaded = (idx: number) => {
    setLoaded((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  };

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-gray-900", className)}>
      {SLIDES.map((slide, idx) => (
        <div
          key={idx}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            idx === current ? "opacity-100" : "opacity-0"
          )}
        >
          <img
            src={slide.url}
            alt={slide.headline}
            className="w-full h-full object-cover"
            onLoad={() => handleLoaded(idx)}
            loading={idx === 0 ? "eager" : "lazy"}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
        </div>
      ))}

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-8 transition-all duration-400",
          transitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        )}
      >
        <div className="flex gap-1.5 mb-5">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={cn(
                "h-0.5 rounded-full transition-all duration-500 cursor-pointer",
                idx === current ? "w-8 bg-white" : "w-4 bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
        <p className="text-xl font-semibold text-white leading-snug mb-1.5">
          {SLIDES[current].headline}
        </p>
        <p className="text-sm text-white/70 leading-relaxed">
          {SLIDES[current].sub}
        </p>
      </div>

      <div className="absolute top-6 left-6">
        <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1, color: "#ffffff" }}>ceeda<span style={{ fontSize: "1.4em", lineHeight: 0.8, position: "relative", top: "0.08em" }}>»</span></span>
      </div>
    </div>
  );
}
