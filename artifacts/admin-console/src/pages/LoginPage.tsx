import { useState } from "react";
import { Wrench, ArrowRight, Mail, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-4">
            <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#0a0a0a" }}>ceeda&gt;</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Platform Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Internal access only</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">This portal is restricted to CEEDA platform administrators.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@ceeda.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Your admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? "Verifying…" : "Access platform"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
