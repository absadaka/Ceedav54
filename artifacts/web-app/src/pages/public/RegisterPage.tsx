import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Building2,
  User, Mail, Lock, Eye, EyeOff, Wrench, Globe, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import AuthImageCarousel from "@/components/AuthImageCarousel";

/* ─── Plans ───────────────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$49/mo",
    desc: "For small workshops",
    features: ["3 users", "Bookings & job cards", "Email notifications"],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$99/mo",
    desc: "Most popular",
    features: ["10 users", "WhatsApp notifications", "Advanced analytics"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    desc: "Multi-location",
    features: ["Unlimited users", "SSO", "Dedicated support"],
  },
];

const TIMEZONES = [
  "Asia/Dubai (GST +4)",
  "Asia/Riyadh (AST +3)",
  "Asia/Kuwait (AST +3)",
  "Asia/Bahrain (AST +3)",
  "Asia/Qatar (AST +3)",
  "Asia/Muscat (GST +4)",
  "Africa/Cairo (EET +2)",
  "Europe/London (GMT +0)",
];

const CURRENCIES = ["AED", "SAR", "KWD", "BHD", "QAR", "OMR", "USD", "EUR", "GBP", "EGP"];

/* ─── Step types ──────────────────────────────────────────────────────────── */
const STEPS = [
  { num: 1, label: "Account" },
  { num: 2, label: "Your shop" },
  { num: 3, label: "Plan" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.num} className="flex items-center gap-2 flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              current > step.num
                ? "bg-primary text-white"
                : current === step.num
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "bg-muted text-muted-foreground"
            )}>
              {current > step.num ? <CheckCircle2 className="w-4 h-4" /> : step.num}
            </div>
            <span className={cn(
              "text-xs font-medium hidden sm:block",
              current >= step.num ? "text-foreground" : "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={cn(
              "flex-1 h-px transition-all",
              current > step.num ? "bg-primary" : "bg-border"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/* ─── Steps ─────────────────────────────────────────────────────────────── */

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
    setLoading(true);
    setTimeout(() => { setLoading(false); onNext(); }, 800);
  };

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-bold text-foreground">Create your account</h2>
        <p className="text-sm text-muted-foreground mt-1">Start your 14-day free trial. No credit card required.</p>
      </div>

      <Button variant="outline" className="w-full gap-2.5 mb-5 h-10" type="button">
        <GoogleIcon /> Continue with Google
      </Button>

      <div className="relative mb-5">
        <div className="border-t border-border" />
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2.5 text-xs text-muted-foreground">
          or continue with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="reg-name" placeholder="Ahmed Al-Rashidi"
              value={name} onChange={(e) => setName(e.target.value)}
              className="pl-9" autoComplete="name" required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="reg-email" type="email" placeholder="you@workshop.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="pl-9" autoComplete="email" required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="reg-password" type={showPw ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-10" autoComplete="new-password" required minLength={8}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Use at least 8 characters with a mix of letters and numbers.</p>
        </div>
        <Button type="submit" className="w-full gap-2 h-10 shadow-sm mt-1" disabled={loading}>
          {loading ? "Creating account…" : "Continue"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}

function Step2Shop({
  onNext, onBack, shopName, setShopName, phone, setPhone, timezone, setTimezone, currency, setCurrency,
}: {
  onNext: () => void; onBack: () => void;
  shopName: string; setShopName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  timezone: string; setTimezone: (v: string) => void;
  currency: string; setCurrency: (v: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onNext(); }, 800);
  };

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-bold text-foreground">Tell us about your workshop</h2>
        <p className="text-sm text-muted-foreground mt-1">We'll set up your workspace with these details.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="shop-name">Workshop name <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="shop-name" placeholder="Al-Rashidi Auto Services"
              value={shopName} onChange={(e) => setShopName(e.target.value)}
              className="pl-9" required
            />
          </div>
          <p className="text-xs text-muted-foreground">This appears on your quotes, job cards, and invoices.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shop-phone">Business phone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="shop-phone" type="tel" placeholder="+971 4 XXX XXXX"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              className="pl-9" autoComplete="tel"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="timezone">
              <Globe className="w-3.5 h-3.5 inline mr-1 align-text-top" />
              Timezone
            </Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <Button type="button" variant="outline" onClick={onBack} className="gap-2 w-28 shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button type="submit" className="flex-1 gap-2 shadow-sm" disabled={loading}>
            {loading ? "Saving…" : "Continue"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Step3Plan({
  onBack, selectedPlan, setSelectedPlan,
}: {
  onBack: () => void;
  selectedPlan: string; setSelectedPlan: (v: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleLaunch = () => {
    setLoading(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1200);
  };

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-bold text-foreground">Choose your plan</h2>
        <p className="text-sm text-muted-foreground mt-1">All plans include a 14-day free trial. Cancel anytime.</p>
      </div>

      <div className="space-y-3 mb-6">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setSelectedPlan(plan.id)}
            className={cn(
              "w-full text-left p-4 rounded-xl border transition-all",
              selectedPlan === plan.id
                ? "border-primary bg-accent/40 ring-1 ring-primary/30"
                : "border-border bg-white hover:border-border/80 hover:bg-muted/30"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[14px] font-semibold text-foreground">{plan.name}</span>
                  {plan.popular && (
                    <span className="text-[10px] font-bold text-primary bg-accent border border-primary/20 px-1.5 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{plan.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {plan.features.map((f) => (
                    <span key={f} className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground">{plan.price}</p>
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 mt-2 ml-auto transition-all",
                  selectedPlan === plan.id ? "border-primary bg-primary" : "border-border"
                )}>
                  {selectedPlan === plan.id && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 mb-5 text-xs text-muted-foreground flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
        14-day free trial. No credit card required to get started.
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2 w-28 shrink-0">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button className="flex-1 gap-2 shadow-md shadow-primary/20" onClick={handleLaunch} disabled={loading}>
          {loading ? "Launching your workshop…" : "Launch my workshop"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function RegisterPage() {
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Asia/Dubai (GST +4)");
  const [currency, setCurrency] = useState("AED");
  const [selectedPlan, setSelectedPlan] = useState("professional");

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left — Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-white overflow-y-auto">
        <div className="w-full max-w-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <span className="text-[15px] font-bold text-foreground tracking-tight">CEEDA</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Already a member?{" "}
              <Link href="/auth" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </div>

          <StepIndicator current={step} />

          {step === 1 && (
            <Step1Account
              onNext={() => setStep(2)}
              name={name} setName={setName}
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
            />
          )}
          {step === 2 && (
            <Step2Shop
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
              shopName={shopName} setShopName={setShopName}
              phone={phone} setPhone={setPhone}
              timezone={timezone} setTimezone={setTimezone}
              currency={currency} setCurrency={setCurrency}
            />
          )}
          {step === 3 && (
            <Step3Plan
              onBack={() => setStep(2)}
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
            />
          )}

          <p className="text-xs text-muted-foreground text-center mt-8">
            By continuing you agree to our{" "}
            <Link href="#terms" className="hover:underline">Terms</Link>{" "}
            and <Link href="#privacy" className="hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* Right — Image carousel */}
      <div className="hidden lg:block lg:w-[460px] xl:w-[520px] shrink-0">
        <AuthImageCarousel className="h-full" />
      </div>
    </div>
  );
}
