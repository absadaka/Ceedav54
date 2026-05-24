import { useState } from "react";
import { useLocation } from "wouter";
import { Lock, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface Props {
  userId: string;
  email: string;
}

export default function SetPasswordPage({ userId, email }: Props) {
  const [, navigate] = useLocation();
  const { setPassword } = useAdminAuth();
  const [password, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valid = password.length >= 8 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      await setPassword(userId, email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-4">
            <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
              <span className="text-foreground">ceeda</span>
              <span className="text-foreground" style={{ fontSize: "1.4em", lineHeight: 0.8, position: "relative", top: "0.08em" }}>{"»"}</span>
            </span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Set your password</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a password for your admin account</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600 shrink-0" />
          <p className="text-xs text-blue-700">First-time setup for <strong>{email}</strong></p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPass(e.target.value)}
                  className="pl-9"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-9"
                  autoComplete="new-password"
                />
              </div>
              {confirm && password !== confirm && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
              {password && password.length < 8 && (
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full gap-2" disabled={loading || !valid}>
              {loading ? "Setting password…" : "Set password & continue"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
