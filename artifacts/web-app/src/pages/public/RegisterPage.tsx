import { useState, useRef, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { authService } from "@/lib/auth";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Building2, User, Mail, Lock,
  Eye, EyeOff, Wrench, Globe, Phone, MapPin, Users, Zap, Car,
  Sparkles, CircleDot, Plus, Trash2, Clock, DollarSign, Upload,
  X, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Constants ─────────────────────────────────────────────────────────── */

const TOTAL_STEPS = 6;

const STEP_LABELS = ["Account", "Shop type", "Business", "Locale", "Services", "Launch"];

const SHOP_TYPES = [
  { id: "auto_mechanical",   label: "Auto Mechanical",    Icon: Wrench },
  { id: "body_fixing",       label: "Body Fixing",        Icon: Car },
  { id: "tires",             label: "Tires & Wheels",     Icon: CircleDot },
  { id: "electrical_battery",label: "Electrical & Battery", Icon: Zap },
  { id: "auto_care",         label: "Auto Detailing",     Icon: Sparkles },
  { id: "multi_service",     label: "Multi-service",      Icon: Building2 },
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
  { value: "Asia/Dubai",    label: "Asia/Dubai (GST +4)" },
  { value: "Asia/Riyadh",   label: "Asia/Riyadh (AST +3)" },
  { value: "Asia/Kuwait",   label: "Asia/Kuwait (AST +3)" },
  { value: "Asia/Bahrain",  label: "Asia/Bahrain (AST +3)" },
  { value: "Asia/Qatar",    label: "Asia/Qatar (AST +3)" },
  { value: "Asia/Muscat",   label: "Asia/Muscat (GST +4)" },
  { value: "Africa/Cairo",  label: "Africa/Cairo (EET +2)" },
  { value: "Europe/London", label: "Europe/London (GMT +0)" },
  { value: "America/New_York", label: "America/New_York (EST -5)" },
];

const LOCALES = [
  { code: "en",    label: "English" },
  { code: "ar",    label: "Arabic" },
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
    features: ["10 users", "WhatsApp notifications", "Advanced analytics"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    priceNote: "contact sales",
    desc: "Multi-location, unlimited scale",
    features: ["Unlimited users", "SSO / SAML", "Multi-branch"],
  },
];

type ServiceRow = {
  key: string; name: string;
  type: "labour" | "part" | "consumable" | "package";
  unit_price: string; duration_min: number; enabled: boolean; sku?: string;
};

const PRESETS: Record<string, Omit<ServiceRow, "key" | "enabled">[]> = {
  auto_mechanical: [
    { name: "Oil Change – Full Synthetic",    type: "labour", unit_price: "150", duration_min: 45, sku: "SVC-001" },
    { name: "AC Service & Re-gas",            type: "labour", unit_price: "250", duration_min: 90, sku: "SVC-002" },
    { name: "Brake Pad Replacement (axle)",   type: "labour", unit_price: "200", duration_min: 60, sku: "SVC-003" },
    { name: "Full Vehicle Inspection",        type: "labour", unit_price: "350", duration_min: 60, sku: "SVC-004" },
    { name: "Tire Rotation & Balance",        type: "labour", unit_price: "80",  duration_min: 30, sku: "SVC-005" },
    { name: "Engine Tune-up",                 type: "labour", unit_price: "400", duration_min: 120, sku: "SVC-006" },
    { name: "Battery Check & Replacement",   type: "labour", unit_price: "100", duration_min: 30, sku: "SVC-007" },
  ],
  body_fixing: [
    { name: "Bumper Repair & Paint",          type: "labour", unit_price: "800",  duration_min: 240, sku: "BDY-001" },
    { name: "Dent Removal (per panel)",       type: "labour", unit_price: "400",  duration_min: 120, sku: "BDY-002" },
    { name: "Full Body Respray",              type: "labour", unit_price: "2500", duration_min: 480, sku: "BDY-003" },
    { name: "Scratch Touch-up",               type: "labour", unit_price: "150",  duration_min: 60,  sku: "BDY-004" },
    { name: "Windscreen Replacement",         type: "labour", unit_price: "700",  duration_min: 120, sku: "BDY-005" },
    { name: "PDR (Paintless Dent Repair)",    type: "labour", unit_price: "350",  duration_min: 90,  sku: "BDY-006" },
  ],
  tires: [
    { name: "Tire Change (per tire)",         type: "labour",     unit_price: "30",  duration_min: 15, sku: "TIR-001" },
    { name: "4-Wheel Alignment",              type: "labour",     unit_price: "150", duration_min: 30, sku: "TIR-002" },
    { name: "Wheel Balancing (per wheel)",    type: "labour",     unit_price: "25",  duration_min: 20, sku: "TIR-003" },
    { name: "Puncture Repair",                type: "labour",     unit_price: "40",  duration_min: 20, sku: "TIR-004" },
    { name: "Nitrogen Fill (full set)",       type: "consumable", unit_price: "50",  duration_min: 15, sku: "TIR-005" },
    { name: "TPMS Sensor Service",            type: "labour",     unit_price: "80",  duration_min: 20, sku: "TIR-006" },
  ],
  electrical_battery: [
    { name: "Battery Replacement",            type: "labour", unit_price: "80",  duration_min: 30, sku: "ELC-001" },
    { name: "ECU Diagnostic Scan",            type: "labour", unit_price: "150", duration_min: 30, sku: "ELC-002" },
    { name: "Alternator Check & Replacement", type: "labour", unit_price: "350", duration_min: 90, sku: "ELC-003" },
    { name: "Wiring Fault Repair",            type: "labour", unit_price: "200", duration_min: 60, sku: "ELC-004" },
    { name: "Immobiliser / Key Programming",  type: "labour", unit_price: "250", duration_min: 60, sku: "ELC-005" },
  ],
  auto_care: [
    { name: "Full Detailing Package",         type: "package", unit_price: "500",  duration_min: 180, sku: "DET-001" },
    { name: "Interior Deep Clean",            type: "labour",  unit_price: "300",  duration_min: 120, sku: "DET-002" },
    { name: "Paint Protection Film – Hood",   type: "labour",  unit_price: "800",  duration_min: 240, sku: "DET-003" },
    { name: "Window Tinting (full car)",      type: "labour",  unit_price: "600",  duration_min: 180, sku: "DET-004" },
    { name: "Vinyl Wrap – Full Car",          type: "labour",  unit_price: "3500", duration_min: 480, sku: "DET-005" },
    { name: "Ceramic Coating",                type: "labour",  unit_price: "1200", duration_min: 300, sku: "DET-006" },
  ],
  multi_service: [
    { name: "General Service",                type: "labour", unit_price: "200", duration_min: 60,  sku: "GEN-001" },
    { name: "Oil Change",                     type: "labour", unit_price: "150", duration_min: 45,  sku: "GEN-002" },
    { name: "Tire Rotation",                  type: "labour", unit_price: "80",  duration_min: 30,  sku: "GEN-003" },
    { name: "Vehicle Inspection",             type: "labour", unit_price: "350", duration_min: 60,  sku: "GEN-004" },
  ],
};

function makeServices(type: ShopTypeId): ServiceRow[] {
  const preset = PRESETS[type] ?? PRESETS.auto_mechanical;
  return preset.map((s, i) => ({ ...s, key: `${type}-${i}`, enabled: true }));
}

/* ─── Confetti ──────────────────────────────────────────────────────────── */

const CONFETTI_COLORS = ["#161aff","#df94e3","#ffd700","#ff6b6b","#51cf66","#339af0","#f06595","#ff9f43","#a29bfe"];

function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 90 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 2.8 + Math.random() * 2.2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      width: 7 + Math.random() * 8,
      height: 4 + Math.random() * 5,
      rotation: Math.random() * 360,
    })),
  []);

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
            zIndex: 9999,
          }}
        />
      ))}
    </>
  );
}

/* ─── Progress bars ─────────────────────────────────────────────────────── */

function ProgressBars({ current }: { current: number }) {
  return (
    <div className="flex gap-1 w-full px-5 pt-4 pb-0">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-gray-200">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: i < current ? "100%" : i === current - 1 ? "60%" : "0%" }}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Wizard top bar ────────────────────────────────────────────────────── */

function WizardTopBar({
  step, onBack, submitFormId, submitLabel = "Continue", loading = false, disabled = false,
}: {
  step: number; onBack?: () => void;
  submitFormId?: string; submitLabel?: string;
  loading?: boolean; disabled?: boolean;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-20 bg-white">
      <ProgressBars current={step} />
      <div className="flex items-center justify-between px-5 py-3">
        {/* Back */}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : <div className="w-9 h-9" />}

        {/* Continue */}
        <button
          type="submit"
          form={submitFormId}
          disabled={disabled || loading}
          className="flex items-center gap-2 bg-[#0a0a0a] text-white px-5 h-10 rounded-full text-sm font-semibold disabled:opacity-50 hover:bg-[#222] transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Please wait…
            </span>
          ) : (
            <>{submitLabel} <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Shared step header ────────────────────────────────────────────────── */

function StepHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-8">
      <p className="text-sm text-gray-400 mb-2">Account setup</p>
      <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">{title}</h1>
      {desc && <p className="text-gray-400 text-base leading-relaxed">{desc}</p>}
    </div>
  );
}

/* ─── Native select ─────────────────────────────────────────────────────── */

function NativeSelect({
  id, value, onChange, children, label,
}: {
  id: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</Label>}
      <div className="relative">
        <select
          id={id} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 rounded-xl border border-gray-200 bg-white pl-4 pr-9 text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

/* ─── Google icon ───────────────────────────────────────────────────────── */

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

/* ─── Wizard field ──────────────────────────────────────────────────────── */

function WizardField({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}{optional && <span className="text-gray-400 font-normal ml-1">(Optional)</span>}
      </label>
      {children}
    </div>
  );
}

/* ─── Step 1 — Account ──────────────────────────────────────────────────── */

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
  const [emailError, setEmailError] = useState("");

  const handleEmailChange = (v: string) => {
    setEmail(v);
    if (emailError) setEmailError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    setEmailError("");
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.available) {
        setEmailError("An account with this email already exists. Please sign in instead.");
        setLoading(false);
        return;
      }
      onNext();
    } catch {
      toast.error("Could not verify email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <WizardTopBar step={1} submitFormId="step1-form" loading={loading} />
      <form id="step1-form" onSubmit={handleSubmit} className="space-y-4">
        <StepHeader
          title="Create your account"
          desc="Start your 14-day free trial. No credit card required."
        />

        <button
          type="button"
          className="w-full h-12 rounded-xl border border-gray-200 flex items-center justify-center gap-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-gray-200" />
          <span className="mx-3 text-xs text-gray-400">or continue with email</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        <WizardField label="Full name">
          <Input
            placeholder="Ahmed Al-Rashidi" value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl border-gray-200 text-base"
            autoComplete="name" required
          />
        </WizardField>

        <WizardField label="Email address">
          <Input
            type="email" placeholder="you@workshop.com" value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            className={cn("h-12 rounded-xl text-base", emailError ? "border-red-400 focus-visible:ring-red-300" : "border-gray-200")}
            autoComplete="email" required
          />
          {emailError && (
            <p className="text-sm text-red-500 mt-1 flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">!</span>
              {emailError}{" "}
              <Link href="/auth" className="underline font-medium text-red-600 hover:text-red-700">Sign in</Link>
            </p>
          )}
        </WizardField>

        <WizardField label="Password">
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"} placeholder="Min. 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-gray-200 text-base pr-10"
              autoComplete="new-password" required minLength={8}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </WizardField>
      </form>
    </>
  );
}

/* ─── Step 2 — Shop Type ────────────────────────────────────────────────── */

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
    <>
      <WizardTopBar step={2} onBack={onBack} submitFormId="step2-form" disabled={!shopType} />
      <form id="step2-form" onSubmit={handleSubmit}>
        <StepHeader
          title="What type of workshop?"
          desc="We'll pre-load the right services and settings for your shop."
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SHOP_TYPES.map((t) => {
            const active = shopType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setShopType(t.id)}
                className={cn(
                  "relative flex flex-col gap-3 p-5 rounded-2xl border-2 text-left transition-all min-h-[110px]",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 bg-white hover:bg-gray-50",
                )}
              >
                {active && (
                  <span className="absolute top-2.5 right-2.5 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
                <t.Icon className={cn("w-6 h-6", active ? "text-primary" : "text-gray-700")} />
                <p className={cn("text-[13px] font-semibold leading-tight mt-auto", active ? "text-primary" : "text-gray-800")}>
                  {t.label}
                </p>
              </button>
            );
          })}
        </div>
      </form>
    </>
  );
}

/* ─── Step 3 — Business Details ─────────────────────────────────────────── */

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
    <>
      <WizardTopBar step={3} onBack={onBack} submitFormId="step3-form" />
      <form id="step3-form" onSubmit={handleSubmit} className="space-y-4">
        <StepHeader
          title="What's your business name?"
          desc="This is the brand name your clients will see. Your billing and legal name can be added later."
        />

        <WizardField label="Business name">
          <Input
            placeholder="Al-Rashidi Auto Services" value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="h-12 rounded-xl border-gray-200 text-base"
            required
          />
        </WizardField>

        <WizardField label="Website" optional>
          <Input
            placeholder="www.yoursite.com" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 rounded-xl border-gray-200 text-base"
          />
        </WizardField>

        <WizardField label="Address" optional>
          <Input
            placeholder="Workshop address / area" value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-12 rounded-xl border-gray-200 text-base"
          />
        </WizardField>

        <NativeSelect id="biz-country" value={country} onChange={setCountry} label="Country">
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </NativeSelect>

        <div className="grid grid-cols-2 gap-3">
          <WizardField label="Technicians">
            <Input
              type="number" min={1} max={500} value={technicians}
              onChange={(e) => setTechnicians(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-12 rounded-xl border-gray-200 text-base"
            />
          </WizardField>
          <WizardField label="Total staff">
            <Input
              type="number" min={1} max={1000} value={workers}
              onChange={(e) => setWorkers(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-12 rounded-xl border-gray-200 text-base"
            />
          </WizardField>
        </div>
      </form>
    </>
  );
}

/* ─── Step 4 — Locale ───────────────────────────────────────────────────── */

function Step4Locale({
  onNext, onBack,
  currency, setCurrency, timezone, setTimezone, locale, setLocale,
}: {
  onNext: () => void; onBack: () => void;
  currency: string; setCurrency: (v: string) => void;
  timezone: string; setTimezone: (v: string) => void;
  locale: string; setLocale: (v: string) => void;
}) {
  return (
    <>
      <WizardTopBar step={4} onBack={onBack} submitFormId="step4-form" />
      <form id="step4-form" onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-4">
        <StepHeader
          title="Language & region"
          desc="Set currency, timezone, and document language for your shop."
        />

        <NativeSelect id="loc-currency" value={currency} onChange={setCurrency} label="Currency">
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </NativeSelect>

        <NativeSelect id="loc-tz" value={timezone} onChange={setTimezone} label="Timezone">
          {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </NativeSelect>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Document language</label>
          <div className="grid grid-cols-3 gap-2">
            {LOCALES.map((l) => (
              <button
                key={l.code} type="button" onClick={() => setLocale(l.code)}
                className={cn(
                  "py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all text-center",
                  locale === l.code
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <Globe className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-gray-500 leading-relaxed">
            You can change these at any time in your shop settings.
          </p>
        </div>
      </form>
    </>
  );
}

/* ─── Step 5 — Services ─────────────────────────────────────────────────── */

function Step5Services({
  onNext, onBack, services, setServices, currency,
}: {
  onNext: () => void; onBack: () => void;
  services: ServiceRow[]; setServices: (v: ServiceRow[]) => void;
  currency: string;
}) {
  const addCustom = () => {
    const key = `custom-${Date.now()}`;
    setServices([...services, { key, name: "Custom Service", type: "labour", unit_price: "100", duration_min: 60, enabled: true }]);
  };
  const update = (key: string, field: keyof ServiceRow, value: unknown) =>
    setServices(services.map((s) => s.key === key ? { ...s, [field]: value } : s));
  const remove = (key: string) => setServices(services.filter((s) => s.key !== key));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!services.filter((s) => s.enabled).length) { toast.error("Enable at least one service"); return; }
    onNext();
  };

  const enabledCount = services.filter((s) => s.enabled).length;

  return (
    <>
      <WizardTopBar step={5} onBack={onBack} submitFormId="step5-form" />
      <form id="step5-form" onSubmit={handleSubmit}>
        <StepHeader
          title="Your services"
          desc="Pre-loaded for your shop type. Toggle, adjust prices, and add custom services."
        />

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">{enabledCount} of {services.length} enabled</span>
          <button type="button" onClick={addCustom}
            className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
            <Plus className="w-3.5 h-3.5" /> Add custom
          </button>
        </div>

        <div className="space-y-2 max-h-[340px] overflow-y-auto -mr-1 pr-1">
          {services.map((svc) => (
            <div key={svc.key}
              className={cn(
                "rounded-xl border px-4 py-3 transition-all",
                svc.enabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                <Switch checked={svc.enabled} onCheckedChange={(v) => update(svc.key, "enabled", v)} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <input
                    type="text" value={svc.name}
                    onChange={(e) => update(svc.key, "name", e.target.value)}
                    className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none w-full"
                    disabled={!svc.enabled}
                  />
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-gray-400" />
                      <input type="number" min="0" step="0.01" value={svc.unit_price}
                        onChange={(e) => update(svc.key, "unit_price", e.target.value)}
                        className="w-20 h-6 text-xs rounded border border-gray-200 bg-white px-1.5 text-right disabled:opacity-50"
                        disabled={!svc.enabled}
                      />
                      <span className="text-[10px] text-gray-400">{currency}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <input type="number" min="5" step="5" value={svc.duration_min}
                        onChange={(e) => update(svc.key, "duration_min", parseInt(e.target.value) || 30)}
                        className="w-14 h-6 text-xs rounded border border-gray-200 bg-white px-1.5 text-right disabled:opacity-50"
                        disabled={!svc.enabled}
                      />
                      <span className="text-[10px] text-gray-400">min</span>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => remove(svc.key)}
                  className="text-gray-300 hover:text-red-400 transition-colors mt-0.5 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          You can add, edit, and remove services after launch from your catalog settings.
        </p>
      </form>
    </>
  );
}

/* ─── Step 6 — Launch ───────────────────────────────────────────────────── */

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

  const initials = shopName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "WS";

  return (
    <>
      <WizardTopBar
        step={6} onBack={onBack} submitFormId="step6-form"
        submitLabel="Launch workshop" loading={loading}
      />
      <form id="step6-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <StepHeader title="Branding & plan" desc="Add your logo and choose a plan to launch your workshop." />

        {/* Logo */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 block mb-2">Workshop logo</label>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden shrink-0"
              onClick={() => fileRef.current?.click()}
            >
              {logoPreview
                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                : <span className="text-lg font-bold text-primary">{initials}</span>
              }
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-sm text-primary font-medium flex items-center gap-1.5 hover:underline">
                <Upload className="w-4 h-4" />{logoPreview ? "Change logo" : "Upload logo"}
              </button>
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG — max 2 MB</p>
              {logoPreview && (
                <button type="button"
                  onClick={() => { setLogoFile(null); setLogoPreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-red-400 flex items-center gap-1 mt-0.5 hover:underline">
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>

        {/* Plan */}
        <label className="text-sm font-medium text-gray-700 block mb-3">Choose your plan</label>
        <div className="space-y-2.5 mb-5">
          {PLANS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPlan(p.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl border-2 transition-all",
                plan === p.id ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:bg-gray-50",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800">{p.name}</span>
                    {p.popular && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Popular</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-1.5">{p.desc}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {p.features.map((f) => (
                      <span key={f} className="text-[11px] text-gray-500 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-primary shrink-0" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-gray-800">{p.price}</p>
                  <p className="text-[10px] text-gray-400">{p.priceNote}</p>
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 mt-2 ml-auto flex items-center justify-center transition-all",
                    plan === p.id ? "border-primary bg-primary" : "border-gray-300",
                  )}>
                    {plan === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
          14-day free trial on all plans. No credit card required.
        </div>
      </form>
    </>
  );
}

/* ─── Success Screen ────────────────────────────────────────────────────── */

function SuccessScreen({ slug, shopName }: { slug: string; shopName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-screen bg-white px-6">
      <Confetti />

      {/* Gradient circle */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-lg"
        style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
      >
        <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Congratulations! 🎉
      </h1>
      <p className="text-xl font-semibold text-gray-800 mb-2">Your business is set up!</p>
      <p className="text-gray-400 mb-2">
        <span className="font-medium text-gray-600">{shopName}</span> is ready to go.
      </p>
      <p className="text-sm text-gray-400 mb-10">
        Your subdomain:{" "}
        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-xs">{slug}.ceeda.me</code>
      </p>

      <button
        className="bg-[#0a0a0a] text-white px-10 h-12 rounded-full text-base font-semibold hover:bg-[#222] transition-colors"
        onClick={() => window.location.href = "/dashboard"}
      >
        Done
      </button>

      <p className="text-xs text-gray-300 mt-6">Redirecting you automatically…</p>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────────── */

export default function RegisterPage() {
  const [step, setStep]           = useState(1);
  const [success, setSuccess]     = useState(false);
  const [resultSlug, setResultSlug] = useState("");

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const [shopType, setShopType] = useState<ShopTypeId | "">("");

  const [shopName, setShopName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [address, setAddress]         = useState("");
  const [country, setCountry]         = useState("AE");
  const [technicians, setTechnicians] = useState(2);
  const [workers, setWorkers]         = useState(4);

  const [currency, setCurrency]   = useState("AED");
  const [timezone, setTimezone]   = useState("Asia/Dubai");
  const [locale, setLocale]       = useState("en");

  const [services, setServices] = useState<ServiceRow[]>([]);

  const [plan, setPlan]               = useState("professional");
  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [submitting, setSubmitting]   = useState(false);

  const handleShopTypeNext = useCallback(() => {
    setServices(makeServices(shopType as ShopTypeId));
    setStep(3);
  }, [shopType]);

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
        services: services.filter((s) => s.enabled).map((s) => ({
          name: s.name, type: s.type,
          unit_price: parseFloat(s.unit_price).toFixed(2),
          duration_min: s.duration_min, sku: s.sku,
        })),
        plan, logo_base64: logoBase64,
      };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Something went wrong."); return; }

      /* Sign in with the newly created account so session is written */
      try {
        await authService.signIn(email, password, data.slug);
      } catch {
        /* Sign-in failure is non-fatal — show success screen anyway */
      }

      setResultSlug(data.slug);
      setSuccess(true);
      setTimeout(() => { window.location.href = data.redirectTo ?? "/dashboard"; }, 5000);
    } catch {
      toast.error("Connection error. Please check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return <SuccessScreen slug={resultSlug} shopName={shopName} />;
  }

  /* Content width per step */
  const maxW = step === 2 ? "max-w-2xl" : "max-w-sm";

  return (
    <div className="min-h-screen bg-white">
      {/* Step content — padded top to clear fixed bar */}
      <div className={cn("mx-auto px-5 pt-28 pb-16 w-full", maxW)}>
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
            onNext={handleShopTypeNext} onBack={() => setStep(1)}
            shopType={shopType} setShopType={setShopType}
          />
        )}
        {step === 3 && (
          <Step3Business
            onNext={() => setStep(4)} onBack={() => setStep(2)}
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
            onNext={() => setStep(5)} onBack={() => setStep(3)}
            currency={currency} setCurrency={setCurrency}
            timezone={timezone} setTimezone={setTimezone}
            locale={locale} setLocale={setLocale}
          />
        )}
        {step === 5 && (
          <Step5Services
            onNext={() => setStep(6)} onBack={() => setStep(4)}
            services={services} setServices={setServices}
            currency={currency}
          />
        )}
        {step === 6 && (
          <Step6Launch
            onBack={() => setStep(5)} onSubmit={handleSubmit}
            plan={plan} setPlan={setPlan}
            logoPreview={logoPreview}
            setLogoFile={setLogoFile} setLogoPreview={setLogoPreview}
            loading={submitting} shopName={shopName}
          />
        )}

        <p className="text-xs text-gray-300 text-center mt-8">
          By continuing you agree to our{" "}
          <Link href="#terms" className="hover:underline">Terms</Link>{" "}
          and <Link href="#privacy" className="hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
