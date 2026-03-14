import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Building2, User, Mail, Lock,
  Eye, EyeOff, Wrench, Globe, Phone, MapPin, Users, Zap, Car,
  Sparkles, CircleDot, Plus, Trash2, Clock, DollarSign, Upload,
  X, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import AuthImageCarousel from "@/components/AuthImageCarousel";
import { toast } from "sonner";

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────── */

const STEPS = [
  { num: 1, label: "Account" },
  { num: 2, label: "Shop type" },
  { num: 3, label: "Business" },
  { num: 4, label: "Locale" },
  { num: 5, label: "Services" },
  { num: 6, label: "Launch" },
];

const SHOP_TYPES = [
  {
    id: "auto_mechanical",
    label: "Auto Mechanical Repair",
    desc: "Engine, transmission, AC, brakes, suspension",
    Icon: Wrench,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    activeBorder: "border-blue-500",
    activeBg: "bg-blue-50/80",
  },
  {
    id: "body_fixing",
    label: "Body Fixing Shop",
    desc: "Dents, paint, panel beating, windscreen",
    Icon: Car,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    activeBorder: "border-orange-500",
    activeBg: "bg-orange-50/80",
  },
  {
    id: "tires",
    label: "Tires & Wheels",
    desc: "Tire change, alignment, balancing, TPMS",
    Icon: CircleDot,
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    activeBorder: "border-slate-500",
    activeBg: "bg-slate-50/80",
  },
  {
    id: "electrical_battery",
    label: "Electrical & Battery",
    desc: "ECU, wiring, battery, diagnostics",
    Icon: Zap,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    activeBorder: "border-yellow-500",
    activeBg: "bg-yellow-50/80",
  },
  {
    id: "auto_care",
    label: "Auto Care, Detailing & Wrapping",
    desc: "Detailing, tinting, PPF, vinyl wrapping",
    Icon: Sparkles,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    activeBorder: "border-purple-500",
    activeBg: "bg-purple-50/80",
  },
] as const;

type ShopTypeId = (typeof SHOP_TYPES)[number]["id"];

const COUNTRIES = [
  { code: "AE", label: "United Arab Emirates" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "KW", label: "Kuwait" },
  { code: "BH", label: "Bahrain" },
  { code: "QA", label: "Qatar" },
  { code: "OM", label: "Oman" },
  { code: "JO", label: "Jordan" },
  { code: "EG", label: "Egypt" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "OTHER", label: "Other" },
];

const CURRENCIES = [
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "KWD", label: "KWD — Kuwaiti Dinar" },
  { code: "BHD", label: "BHD — Bahraini Dinar" },
  { code: "QAR", label: "QAR — Qatari Riyal" },
  { code: "OMR", label: "OMR — Omani Rial" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "EGP", label: "EGP — Egyptian Pound" },
];

const TIMEZONES = [
  { value: "Asia/Dubai", label: "Asia/Dubai (GST +4)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (AST +3)" },
  { value: "Asia/Kuwait", label: "Asia/Kuwait (AST +3)" },
  { value: "Asia/Bahrain", label: "Asia/Bahrain (AST +3)" },
  { value: "Asia/Qatar", label: "Asia/Qatar (AST +3)" },
  { value: "Asia/Muscat", label: "Asia/Muscat (GST +4)" },
  { value: "Africa/Cairo", label: "Africa/Cairo (EET +2)" },
  { value: "Europe/London", label: "Europe/London (GMT +0)" },
  { value: "America/New_York", label: "America/New_York (EST -5)" },
];

const LOCALES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "en-ar", label: "English + Arabic" },
];

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free trial",
    priceNote: "then $49/mo",
    desc: "Small workshops up to 3 staff",
    features: ["3 users", "Bookings & job cards", "Invoices & payments"],
  },
  {
    id: "professional",
    name: "Professional",
    price: "Free trial",
    priceNote: "then $99/mo",
    desc: "Growing workshops, most popular",
    features: ["10 users", "WhatsApp notifications", "Advanced analytics", "API access"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    priceNote: "contact sales",
    desc: "Multi-location, unlimited scale",
    features: ["Unlimited users", "SSO / SAML", "Dedicated support", "Multi-branch"],
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   SERVICE PRESETS  (per shop type)
───────────────────────────────────────────────────────────────────────── */

type ServiceRow = {
  key: string;
  name: string;
  type: "labour" | "part" | "consumable" | "package";
  unit_price: string;
  duration_min: number;
  enabled: boolean;
  sku?: string;
};

const PRESETS: Record<ShopTypeId, Omit<ServiceRow, "key" | "enabled">[]> = {
  auto_mechanical: [
    { name: "Oil Change – Full Synthetic", type: "labour", unit_price: "150", duration_min: 45, sku: "SVC-001" },
    { name: "AC Service & Re-gas", type: "labour", unit_price: "250", duration_min: 90, sku: "SVC-002" },
    { name: "Brake Pad Replacement (axle)", type: "labour", unit_price: "200", duration_min: 60, sku: "SVC-003" },
    { name: "Full Vehicle Inspection", type: "labour", unit_price: "350", duration_min: 60, sku: "SVC-004" },
    { name: "Tire Rotation & Balance", type: "labour", unit_price: "80", duration_min: 30, sku: "SVC-005" },
    { name: "Engine Tune-up", type: "labour", unit_price: "400", duration_min: 120, sku: "SVC-006" },
    { name: "Battery Check & Replacement", type: "labour", unit_price: "100", duration_min: 30, sku: "SVC-007" },
    { name: "Suspension Check", type: "labour", unit_price: "120", duration_min: 45, sku: "SVC-008" },
  ],
  body_fixing: [
    { name: "Bumper Repair & Paint", type: "labour", unit_price: "800", duration_min: 240, sku: "BDY-001" },
    { name: "Dent Removal (per panel)", type: "labour", unit_price: "400", duration_min: 120, sku: "BDY-002" },
    { name: "Full Body Respray", type: "labour", unit_price: "2500", duration_min: 480, sku: "BDY-003" },
    { name: "Panel Replacement", type: "labour", unit_price: "600", duration_min: 180, sku: "BDY-004" },
    { name: "Scratch Touch-up", type: "labour", unit_price: "150", duration_min: 60, sku: "BDY-005" },
    { name: "Windscreen Replacement", type: "labour", unit_price: "700", duration_min: 120, sku: "BDY-006" },
    { name: "PDR (Paintless Dent Repair)", type: "labour", unit_price: "350", duration_min: 90, sku: "BDY-007" },
  ],
  tires: [
    { name: "Tire Change (per tire)", type: "labour", unit_price: "30", duration_min: 15, sku: "TIR-001" },
    { name: "4-Wheel Alignment", type: "labour", unit_price: "150", duration_min: 30, sku: "TIR-002" },
    { name: "Wheel Balancing (per wheel)", type: "labour", unit_price: "25", duration_min: 20, sku: "TIR-003" },
    { name: "Puncture Repair", type: "labour", unit_price: "40", duration_min: 20, sku: "TIR-004" },
    { name: "Nitrogen Fill (full set)", type: "consumable", unit_price: "50", duration_min: 15, sku: "TIR-005" },
    { name: "TPMS Sensor Service", type: "labour", unit_price: "80", duration_min: 20, sku: "TIR-006" },
    { name: "Run-flat Tire Fitting", type: "labour", unit_price: "60", duration_min: 30, sku: "TIR-007" },
  ],
  electrical_battery: [
    { name: "Battery Replacement", type: "labour", unit_price: "80", duration_min: 30, sku: "ELC-001" },
    { name: "ECU Diagnostic Scan", type: "labour", unit_price: "150", duration_min: 30, sku: "ELC-002" },
    { name: "Alternator Check & Replacement", type: "labour", unit_price: "350", duration_min: 90, sku: "ELC-003" },
    { name: "Wiring Fault Repair", type: "labour", unit_price: "200", duration_min: 60, sku: "ELC-004" },
    { name: "Starter Motor Service", type: "labour", unit_price: "300", duration_min: 90, sku: "ELC-005" },
    { name: "AC Electrical Diagnosis", type: "labour", unit_price: "180", duration_min: 60, sku: "ELC-006" },
    { name: "Immobiliser / Key Programming", type: "labour", unit_price: "250", duration_min: 60, sku: "ELC-007" },
  ],
  auto_care: [
    { name: "Full Detailing Package", type: "package", unit_price: "500", duration_min: 180, sku: "DET-001" },
    { name: "Interior Deep Clean", type: "labour", unit_price: "300", duration_min: 120, sku: "DET-002" },
    { name: "Paint Protection Film – Hood", type: "labour", unit_price: "800", duration_min: 240, sku: "DET-003" },
    { name: "Window Tinting (full car)", type: "labour", unit_price: "600", duration_min: 180, sku: "DET-004" },
    { name: "Vinyl Wrap – Full Car", type: "labour", unit_price: "3500", duration_min: 480, sku: "DET-005" },
    { name: "Ceramic Coating", type: "labour", unit_price: "1200", duration_min: 300, sku: "DET-006" },
    { name: "Engine Bay Clean", type: "labour", unit_price: "150", duration_min: 60, sku: "DET-007" },
  ],
};

function makeServices(type: ShopTypeId): ServiceRow[] {
  return PRESETS[type].map((s, i) => ({
    ...s,
    key: `${type}-${i}`,
    enabled: true,
  }));
}

/* ─────────────────────────────────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────────────────────────────────── */

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.num} className="flex items-center gap-1 flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
              current > step.num
                ? "bg-primary text-white"
                : current === step.num
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "bg-muted text-muted-foreground",
            )}>
              {current > step.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.num}
            </div>
            <span className={cn(
              "text-[9px] font-medium hidden sm:block whitespace-nowrap",
              current >= step.num ? "text-foreground" : "text-muted-foreground",
            )}>
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={cn(
              "flex-1 h-px mb-3 transition-all",
              current > step.num ? "bg-primary" : "bg-border",
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

function NavButtons({
  onBack, onNext, onBackLabel = "Back", onNextLabel = "Continue",
  loading = false, disabled = false, hideBack = false,
}: {
  onBack?: () => void; onNext?: () => void;
  onBackLabel?: string; onNextLabel?: string;
  loading?: boolean; disabled?: boolean; hideBack?: boolean;
}) {
  return (
    <div className="flex gap-3 mt-6">
      {!hideBack && onBack && (
        <Button type="button" variant="outline" onClick={onBack} className="gap-1.5 w-24 shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" /> {onBackLabel}
        </Button>
      )}
      {onNext && (
        <Button
          type="submit"
          className="flex-1 gap-2 shadow-sm"
          disabled={loading || disabled}
        >
          {loading ? "Please wait…" : onNextLabel}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function NativeSelect({
  id, value, onChange, children, label,
}: {
  id: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background pl-3 pr-8 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STEP 1 — Account
───────────────────────────────────────────────────────────────────────── */

function Step1Account({
  onNext, name, setName, email, setEmail, password, setPassword,
}: {
  onNext: () => void;
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onNext(); }, 400);
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepHeader title="Create your account" desc="Start your 14-day free trial. No credit card required." />

      <Button variant="outline" className="w-full gap-2.5 mb-5 h-10" type="button">
        <GoogleIcon /> Continue with Google
      </Button>

      <div className="relative mb-5">
        <div className="border-t border-border" />
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2.5 text-xs text-muted-foreground">
          or continue with email
        </span>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input id="reg-name" placeholder="Ahmed Al-Rashidi" value={name} onChange={(e) => setName(e.target.value)}
              className="pl-9" autoComplete="name" required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input id="reg-email" type="email" placeholder="you@workshop.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className="pl-9" autoComplete="email" required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="reg-password" type={showPw ? "text" : "password"} placeholder="Min. 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-10" autoComplete="new-password" required minLength={8}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <NavButtons hideBack onNext={() => {}} onNextLabel="Continue" loading={loading} />
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STEP 2 — Shop Type
───────────────────────────────────────────────────────────────────────── */

function Step2ShopType({
  onNext, onBack, shopType, setShopType,
}: {
  onNext: () => void; onBack: () => void;
  shopType: ShopTypeId | ""; setShopType: (v: ShopTypeId) => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopType) { toast.error("Please select your shop type"); return; }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepHeader title="What type of workshop?" desc="We'll pre-load the right services and settings for your shop." />

      <div className="space-y-2.5 mb-1">
        {SHOP_TYPES.map((t) => {
          const active = shopType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setShopType(t.id)}
              className={cn(
                "w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center gap-3.5",
                active
                  ? `${t.activeBorder} ${t.activeBg} ring-1 ring-offset-0`
                  : `border-border bg-white hover:border-border/60 hover:bg-muted/20`,
              )}
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", t.bg)}>
                <t.Icon className={cn("w-5 h-5", t.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground leading-tight">{t.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
              </div>
              <div className={cn(
                "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                active ? `${t.activeBorder} bg-primary border-primary` : "border-border",
              )}>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <NavButtons onBack={onBack} onNext={() => {}} disabled={!shopType} />
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STEP 3 — Business Details
───────────────────────────────────────────────────────────────────────── */

function Step3Business({
  onNext, onBack,
  shopName, setShopName, phone, setPhone, address, setAddress,
  country, setCountry, technicians, setTechnicians, workers, setWorkers,
}: {
  onNext: () => void; onBack: () => void;
  shopName: string; setShopName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  technicians: number; setTechnicians: (v: number) => void;
  workers: number; setWorkers: (v: number) => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) { toast.error("Workshop name is required"); return; }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepHeader title="Your workshop details" desc="These appear on job cards, quotes, and invoices." />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="biz-name">Workshop name <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input id="biz-name" placeholder="Al-Rashidi Auto Services" value={shopName}
              onChange={(e) => setShopName(e.target.value)} className="pl-9" required />
          </div>
        </div>

        <NativeSelect id="biz-country" value={country} onChange={setCountry} label="Country">
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </NativeSelect>

        <div className="space-y-1.5">
          <Label htmlFor="biz-phone">Business phone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input id="biz-phone" type="tel" placeholder="+971 4 XXX XXXX" value={phone}
              onChange={(e) => setPhone(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="biz-address">Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input id="biz-address" placeholder="Workshop address / area" value={address}
              onChange={(e) => setAddress(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="biz-techs" className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Technicians
            </Label>
            <Input
              id="biz-techs" type="number" min={1} max={500} value={technicians}
              onChange={(e) => setTechnicians(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-workers" className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Total staff
            </Label>
            <Input
              id="biz-workers" type="number" min={1} max={1000} value={workers}
              onChange={(e) => setWorkers(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={() => {}} />
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STEP 4 — Locale
───────────────────────────────────────────────────────────────────────── */

function Step4Locale({
  onNext, onBack,
  currency, setCurrency, timezone, setTimezone, locale, setLocale,
}: {
  onNext: () => void; onBack: () => void;
  currency: string; setCurrency: (v: string) => void;
  timezone: string; setTimezone: (v: string) => void;
  locale: string; setLocale: (v: string) => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepHeader title="Language & region" desc="Set currency, timezone, and document language for your shop." />

      <div className="space-y-4">
        <NativeSelect id="loc-currency" value={currency} onChange={setCurrency} label="Currency">
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </NativeSelect>

        <NativeSelect id="loc-tz" value={timezone} onChange={setTimezone} label="Timezone">
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </NativeSelect>

        <div className="space-y-2">
          <Label>Document language</Label>
          <div className="grid grid-cols-3 gap-2">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLocale(l.code)}
                className={cn(
                  "py-2.5 px-2 rounded-lg border text-xs font-medium transition-all text-center",
                  locale === l.code
                    ? "border-primary bg-accent/40 text-primary ring-1 ring-primary/20"
                    : "border-border bg-white text-muted-foreground hover:border-border/60 hover:text-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Controls the language used in PDFs sent to customers.</p>
        </div>

        <div className="flex items-start gap-2.5 bg-muted/40 rounded-lg px-3 py-2.5 border border-border">
          <Globe className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            You can change these at any time in your shop settings. VAT rate can be configured separately.
          </p>
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={() => {}} />
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STEP 5 — Services Catalog
───────────────────────────────────────────────────────────────────────── */

function Step5Services({
  onNext, onBack, services, setServices, currency,
}: {
  onNext: () => void; onBack: () => void;
  services: ServiceRow[]; setServices: (v: ServiceRow[]) => void;
  currency: string;
}) {
  const addCustom = () => {
    const key = `custom-${Date.now()}`;
    setServices([...services, {
      key, name: "Custom Service", type: "labour",
      unit_price: "100", duration_min: 60, enabled: true,
    }]);
  };

  const update = (key: string, field: keyof ServiceRow, value: unknown) => {
    setServices(services.map((s) => s.key === key ? { ...s, [field]: value } : s));
  };

  const remove = (key: string) => {
    setServices(services.filter((s) => s.key !== key));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enabled = services.filter((s) => s.enabled);
    if (enabled.length === 0) { toast.error("Enable at least one service"); return; }
    onNext();
  };

  const enabledCount = services.filter((s) => s.enabled).length;

  return (
    <form onSubmit={handleSubmit}>
      <StepHeader
        title="Your services"
        desc="Pre-loaded for your shop type. Toggle, adjust prices, and add custom services."
      />

      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{enabledCount} of {services.length} enabled</span>
        <button type="button" onClick={addCustom}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add custom
        </button>
      </div>

      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-0.5 -mr-1 pb-1">
        {services.map((svc) => (
          <div
            key={svc.key}
            className={cn(
              "rounded-lg border px-3 py-2.5 transition-all",
              svc.enabled ? "bg-white border-border" : "bg-muted/30 border-border/50 opacity-60",
            )}
          >
            <div className="flex items-start gap-2">
              <Switch
                checked={svc.enabled}
                onCheckedChange={(v) => update(svc.key, "enabled", v)}
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={svc.name}
                  onChange={(e) => update(svc.key, "name", e.target.value)}
                  className="text-[13px] font-medium text-foreground bg-transparent border-none outline-none w-full truncate focus:bg-muted/30 rounded px-0.5"
                  disabled={!svc.enabled}
                />
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <input
                      type="number" min="0" step="0.01"
                      value={svc.unit_price}
                      onChange={(e) => update(svc.key, "unit_price", e.target.value)}
                      className="w-20 h-6 text-xs rounded border border-input bg-background px-1.5 text-right disabled:opacity-50"
                      disabled={!svc.enabled}
                    />
                    <span className="text-[10px] text-muted-foreground">{currency}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <input
                      type="number" min="5" step="5"
                      value={svc.duration_min}
                      onChange={(e) => update(svc.key, "duration_min", parseInt(e.target.value) || 30)}
                      className="w-14 h-6 text-xs rounded border border-input bg-background px-1.5 text-right disabled:opacity-50"
                      disabled={!svc.enabled}
                    />
                    <span className="text-[10px] text-muted-foreground">min</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(svc.key)}
                className="text-muted-foreground hover:text-destructive transition-colors mt-0.5 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        You can add, edit, and remove services after launch from your catalog settings.
      </p>

      <NavButtons onBack={onBack} onNext={() => {}} />
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STEP 6 — Branding + Plan + Launch
───────────────────────────────────────────────────────────────────────── */

function Step6Launch({
  onBack, onSubmit, plan, setPlan, logoPreview, setLogoFile, setLogoPreview, loading, shopName,
}: {
  onBack: () => void; onSubmit: () => void;
  plan: string; setPlan: (v: string) => void;
  logoPreview: string; setLogoFile: (f: File | null) => void;
  setLogoPreview: (v: string) => void;
  loading: boolean; shopName: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
  };

  const initials = shopName
    .split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "WS";

  return (
    <div>
      <StepHeader title="Branding & plan" desc="Add your logo and choose a plan to launch your workshop." />

      {/* Logo */}
      <div className="mb-6">
        <Label className="mb-2 block">Workshop logo</Label>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all overflow-hidden shrink-0"
            onClick={() => fileRef.current?.click()}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm text-primary font-medium flex items-center gap-1.5 hover:underline"
            >
              <Upload className="w-4 h-4" />
              {logoPreview ? "Change logo" : "Upload logo"}
            </button>
            <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, SVG — max 2 MB</p>
            {logoPreview && (
              <button
                type="button"
                onClick={() => { setLogoFile(null); setLogoPreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                className="text-xs text-destructive flex items-center gap-1 mt-0.5 hover:underline"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

      {/* Plan */}
      <Label className="mb-2 block">Choose your plan</Label>
      <div className="space-y-2.5 mb-5">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlan(p.id)}
            className={cn(
              "w-full text-left p-3.5 rounded-xl border-2 transition-all",
              plan === p.id
                ? "border-primary bg-accent/40 ring-1 ring-primary/20"
                : "border-border bg-white hover:border-border/60 hover:bg-muted/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-semibold text-foreground">{p.name}</span>
                  {p.popular && (
                    <span className="text-[10px] font-bold text-primary bg-accent border border-primary/20 px-1.5 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mb-1.5">{p.desc}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {p.features.map((f) => (
                    <span key={f} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 text-primary shrink-0" /> {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-foreground">{p.price}</p>
                <p className="text-[10px] text-muted-foreground">{p.priceNote}</p>
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 mt-2 ml-auto transition-all flex items-center justify-center",
                  plan === p.id ? "border-primary bg-primary" : "border-border",
                )}>
                  {plan === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-muted/40 border border-border rounded-lg px-3.5 py-2.5 mb-5 text-xs text-muted-foreground flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
        14-day free trial on all plans. No credit card required to get started.
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="gap-1.5 w-24 shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
        <Button
          className="flex-1 gap-2 shadow-md shadow-primary/20"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Setting up your workshop…
            </span>
          ) : (
            <>Launch my workshop <ArrowRight className="w-4 h-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUCCESS SCREEN
───────────────────────────────────────────────────────────────────────── */

function SuccessScreen({ slug, shopName }: { slug: string; shopName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-9 h-9 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Workshop created!</h2>
      <p className="text-sm text-muted-foreground mb-1">
        <span className="font-semibold text-foreground">{shopName}</span> is ready.
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        Your subdomain: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{slug}.ceeda.io</code>
      </p>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
        <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "100%" }} />
      </div>
      <p className="text-xs text-muted-foreground">Taking you to your dashboard…</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────────────────── */

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [resultSlug, setResultSlug] = useState("");

  // Step 1 — account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 — shop type
  const [shopType, setShopType] = useState<ShopTypeId | "">("");

  // Step 3 — business details
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("AE");
  const [technicians, setTechnicians] = useState(2);
  const [workers, setWorkers] = useState(4);

  // Step 4 — locale
  const [currency, setCurrency] = useState("AED");
  const [timezone, setTimezone] = useState("Asia/Dubai");
  const [locale, setLocale] = useState("en");

  // Step 5 — services
  const [services, setServices] = useState<ServiceRow[]>([]);

  // Step 6 — branding + plan
  const [plan, setPlan] = useState("professional");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleShopTypeNext = useCallback(() => {
    if (shopType && services.length === 0) {
      setServices(makeServices(shopType as ShopTypeId));
    } else if (shopType) {
      setServices(makeServices(shopType as ShopTypeId));
    }
    setStep(3);
  }, [shopType, services.length]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let logoBase64: string | undefined;
      if (logoFile) {
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string ?? "");
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
      }

      const payload = {
        owner: { name, email, password },
        shop: { name: shopName, type: shopType, phone, address, country, technicians, workers },
        locale: { currency, timezone, locale },
        services: services
          .filter((s) => s.enabled)
          .map((s) => ({
            name: s.name,
            type: s.type,
            unit_price: parseFloat(s.unit_price).toFixed(2),
            duration_min: s.duration_min,
            sku: s.sku,
          })),
        plan,
        logo_base64: logoBase64,
      };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResultSlug(data.slug);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = data.redirectTo ?? "/dashboard";
      }, 2000);
    } catch {
      toast.error("Connection error. Please check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left — Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 24, fontWeight: 700, lineHeight: 1, color: "#0a0a0a" }}>ceeda&gt;</span>
            <p className="text-sm text-muted-foreground">
              Already a member?{" "}
              <Link href="/auth" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </div>

          {!success && <StepIndicator current={step} />}

          {success ? (
            <SuccessScreen slug={resultSlug} shopName={shopName} />
          ) : (
            <>
              {step === 1 && (
                <Step1Account
                  onNext={() => setStep(2)}
                  name={name} setName={setName}
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                />
              )}
              {step === 2 && (
                <Step2ShopType
                  onNext={handleShopTypeNext}
                  onBack={() => setStep(1)}
                  shopType={shopType}
                  setShopType={setShopType}
                />
              )}
              {step === 3 && (
                <Step3Business
                  onNext={() => setStep(4)}
                  onBack={() => setStep(2)}
                  shopName={shopName} setShopName={setShopName}
                  phone={phone} setPhone={setPhone}
                  address={address} setAddress={setAddress}
                  country={country} setCountry={setCountry}
                  technicians={technicians} setTechnicians={setTechnicians}
                  workers={workers} setWorkers={setWorkers}
                />
              )}
              {step === 4 && (
                <Step4Locale
                  onNext={() => setStep(5)}
                  onBack={() => setStep(3)}
                  currency={currency} setCurrency={setCurrency}
                  timezone={timezone} setTimezone={setTimezone}
                  locale={locale} setLocale={setLocale}
                />
              )}
              {step === 5 && (
                <Step5Services
                  onNext={() => setStep(6)}
                  onBack={() => setStep(4)}
                  services={services} setServices={setServices}
                  currency={currency}
                />
              )}
              {step === 6 && (
                <Step6Launch
                  onBack={() => setStep(5)}
                  onSubmit={handleSubmit}
                  plan={plan} setPlan={setPlan}
                  logoPreview={logoPreview}
                  setLogoFile={setLogoFile}
                  setLogoPreview={setLogoPreview}
                  loading={submitting}
                  shopName={shopName}
                />
              )}
            </>
          )}

          {!success && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              By continuing you agree to our{" "}
              <Link href="#terms" className="hover:underline">Terms</Link>{" "}
              and <Link href="#privacy" className="hover:underline">Privacy Policy</Link>.
            </p>
          )}
        </div>
      </div>

      {/* Right — Image carousel */}
      <div className="hidden lg:block lg:w-[460px] xl:w-[520px] shrink-0">
        <AuthImageCarousel className="h-full" />
      </div>
    </div>
  );
}
