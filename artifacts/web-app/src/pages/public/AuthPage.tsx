import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import AuthImageCarousel from "@/components/AuthImageCarousel";

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

function PasswordInput({
  id, value, onChange, placeholder, autoComplete,
}: {
  id: string; value: string; onChange: (v: string) => void;
  placeholder: string; autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id} type={show ? "text" : "password"}
        placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

type Mode = "signin" | "magic";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authService.signIn(email, password);
      const slug = result.user.tenantSlug;
      window.location.href = slug ? `/dashboard?tenant=${slug}` : "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagic = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setMagicSent(true); }, 1500);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left — Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-white overflow-y-auto">
        <div className="w-full max-w-[360px]">
          {/* Back link */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          {/* Wordmark */}
          <div className="mb-8">
            <div className="mb-6">
              <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1, color: "#0a0a0a" }}>ceeda&gt;</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Create your shop
              </Link>
            </p>
          </div>

          {mode === "signin" && (
            <>
              {/* Google */}
              <Button variant="outline" className="w-full gap-2.5 mb-5 h-10" type="button">
                <GoogleIcon />
                Continue with Google
              </Button>

              <div className="relative mb-5">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2.5 text-xs text-muted-foreground">
                  or sign in with email
                </span>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 mb-4 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email" type="email" placeholder="you@workshop.com"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="pl-9" autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/auth/reset-password" className="text-xs text-primary hover:underline">
                      Forgot?
                    </Link>
                  </div>
                  <PasswordInput
                    id="password" value={password} onChange={setPassword}
                    placeholder="Your password" autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full gap-2 h-10 shadow-sm" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 inline mr-1.5 align-text-top" />
                  Email me a sign-in link instead
                </button>
              </div>
            </>
          )}

          {mode === "magic" && (
            <>
              {!magicSent ? (
                <>
                  <div className="mb-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Enter your email and we'll send you a one-click sign-in link. No password needed.
                    </p>
                  </div>
                  <form onSubmit={handleMagic} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="magic-email">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="magic-email" type="email" placeholder="you@workshop.com"
                          value={email} onChange={(e) => setEmail(e.target.value)}
                          className="pl-9" autoComplete="email" autoFocus
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full gap-2 h-10 shadow-sm" disabled={loading}>
                      {loading ? "Sending…" : "Send sign-in link"}
                      {!loading && <ArrowRight className="w-4 h-4" />}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <button onClick={() => setMode("signin")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Lock className="w-3.5 h-3.5 inline mr-1.5 align-text-top" />
                      Sign in with password instead
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-base font-semibold text-foreground mb-2">Check your inbox</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    We sent a sign-in link to{" "}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                  <button
                    onClick={() => { setMagicSent(false); setMode("signin"); }}
                    className="text-sm text-primary hover:underline"
                  >
                    Back to sign in
                  </button>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed">
            By continuing you agree to our{" "}
            <Link href="#terms" className="hover:underline">Terms</Link> and{" "}
            <Link href="#privacy" className="hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* Right — Image carousel */}
      <div className="hidden lg:block lg:w-[480px] xl:w-[540px] shrink-0">
        <AuthImageCarousel className="h-full" />
      </div>
    </div>
  );
}
