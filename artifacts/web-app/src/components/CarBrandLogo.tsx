import { Car } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const BRAND_SLUGS: Record<string, string> = {
  "alfa romeo": "alfa-romeo",
  "aston martin": "aston-martin",
  "land rover": "land-rover",
  "mercedes-benz": "mercedes-benz",
  "mercedes": "mercedes-benz",
  "rolls-royce": "rolls-royce",
  "range rover": "land-rover",
  "general motors": "gm",
  "gmc": "gmc",
  "vw": "volkswagen",
};

function toSlug(make: string): string {
  const lower = make.toLowerCase().trim();
  return BRAND_SLUGS[lower] ?? lower.replace(/\s+/g, "-");
}

function logoUrl(make: string): string {
  const slug = toSlug(make);
  return `https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/${slug}.png`;
}

interface Props {
  make: string | null;
  className?: string;
  size?: number;
}

export default function CarBrandLogo({ make, className, size = 16 }: Props) {
  const [failed, setFailed] = useState(false);

  if (!make || failed) {
    return <Car className={cn("shrink-0", className)} style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={logoUrl(make)}
      alt={make}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
