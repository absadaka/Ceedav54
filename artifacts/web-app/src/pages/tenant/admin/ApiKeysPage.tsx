import { useState } from "react";
import { Plus, Key, Copy, CheckCircle2, Trash2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/* ─── Data ─────────────────────────────────────────────────────────────── */

const SCOPES = [
  { id: "bookings:read",  label: "Bookings — read", desc: "Read bookings and calendar" },
  { id: "bookings:write", label: "Bookings — write", desc: "Create and update bookings" },
  { id: "jobs:read",      label: "Jobs — read", desc: "Read job cards and status" },
  { id: "jobs:write",     label: "Jobs — write", desc: "Create and update job cards" },
  { id: "invoices:read",  label: "Invoices — read", desc: "Read invoices and payments" },
  { id: "invoices:write", label: "Invoices — write", desc: "Create invoices and record payments" },
  { id: "clients:read",   label: "Clients — read", desc: "Read client and vehicle records" },
  { id: "clients:write",  label: "Clients — write", desc: "Create and update clients" },
  { id: "webhooks",       label: "Webhooks", desc: "Manage webhook endpoints" },
];

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  status: "active" | "revoked";
}

function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }
function daysFromNow(n: number) { return new Date(Date.now() + n * 86400000); }

const INITIAL_KEYS: ApiKey[] = [
  {
    id: "k1",
    name: "Zapier Integration",
    prefix: "ck_live_8f2a",
    scopes: ["bookings:read", "clients:read", "invoices:read"],
    createdAt: daysAgo(30),
    lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    expiresAt: daysFromNow(335),
    status: "active",
  },
  {
    id: "k2",
    name: "WhatsApp Bot",
    prefix: "ck_live_3d1c",
    scopes: ["jobs:read", "invoices:read", "invoices:write"],
    createdAt: daysAgo(7),
    lastUsedAt: new Date(Date.now() - 30 * 60 * 1000),
    status: "active",
  },
  {
    id: "k3",
    name: "Old ERP",
    prefix: "ck_live_9e4b",
    scopes: ["bookings:read", "bookings:write", "clients:read", "clients:write"],
    createdAt: daysAgo(120),
    lastUsedAt: daysAgo(60),
    status: "revoked",
  },
];

function formatDate(d: Date) {
  return d.toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}
function relativeTime(d?: Date) {
  if (!d) return "Never";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

/* ─── Create key dialog ─────────────────────────────────────────────────── */
function CreateKeyDialog({
  open, onClose, onCreate,
}: { open: boolean; onClose: () => void; onCreate: (key: ApiKey, secret: string) => void }) {
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiry, setExpiry] = useState("365");
  const [creating, setCreating] = useState(false);

  const toggleScope = (id: string) => {
    setSelectedScopes((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    await new Promise((r) => setTimeout(r, 800));
    const newKey: ApiKey = {
      id: `k${Date.now()}`,
      name,
      prefix: `ck_live_${Math.random().toString(36).slice(2, 6)}`,
      scopes: selectedScopes,
      createdAt: new Date(),
      expiresAt: expiry !== "never" ? daysFromNow(parseInt(expiry)) : undefined,
      status: "active",
    };
    const secret = `ck_live_${Math.random().toString(36).slice(2, 42)}`;
    setCreating(false);
    onCreate(newKey, secret);
    setName("");
    setSelectedScopes([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Key name</Label>
            <Input id="key-name" placeholder="e.g. Zapier, Mobile App, ERP"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <p className="text-xs text-muted-foreground">Select what this key can access.</p>
            <div className="space-y-2 rounded-md border border-border p-3 max-h-52 overflow-y-auto">
              {SCOPES.map((scope) => (
                <label key={scope.id} className="flex items-start gap-3 cursor-pointer group">
                  <Checkbox className="mt-0.5" checked={selectedScopes.includes(scope.id)}
                    onCheckedChange={() => toggleScope(scope.id)} />
                  <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {scope.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{scope.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expiry">Expiry</Label>
            <select id="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="never">Never</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={creating || !name || selectedScopes.length === 0}>
              {creating ? "Generating…" : "Create key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── New key reveal dialog ─────────────────────────────────────────────── */
function NewKeyReveal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Save your API key</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              This is the only time you'll see this key. Copy it now and store it securely.
              You won't be able to view it again.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Secret key</Label>
            <div className="flex items-center gap-2">
              <Input value={show ? secret : secret.slice(0, 8) + "•".repeat(28)}
                readOnly className="font-mono text-xs bg-muted" />
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShow((v) => !v)}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8 shrink-0" onClick={copy}>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>I've saved it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [showCreate, setShowCreate] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const handleCreate = (key: ApiKey, secret: string) => {
    setKeys((prev) => [key, ...prev]);
    setShowCreate(false);
    setNewSecret(secret);
  };

  const handleRevoke = (id: string) => {
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, status: "revoked" } : k));
  };

  const active = keys.filter((k) => k.status === "active");
  const revoked = keys.filter((k) => k.status === "revoked");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">API keys</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Authenticate external integrations with your CEEDA workspace.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New key
        </Button>
      </div>

      {/* Active keys */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Active keys ({active.length})
        </p>
        {active.length === 0 && (
          <div className="border border-border border-dashed rounded-lg px-5 py-8 text-center">
            <Key className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active API keys. Create one to integrate with external tools.</p>
          </div>
        )}
        {active.map((key) => (
          <div key={key.id} className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold text-foreground">{key.name}</span>
                  <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {key.prefix}•••••••••••••
                  </code>
                </div>
                <div className="flex flex-wrap gap-1">
                  {key.scopes.map((s) => (
                    <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent border border-primary/20 text-primary">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Created {formatDate(key.createdAt)}</span>
                  <span>Last used: {relativeTime(key.lastUsedAt)}</span>
                  {key.expiresAt && <span>Expires {formatDate(key.expiresAt)}</span>}
                </div>
              </div>
              <Button size="sm" variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => handleRevoke(key.id)}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Revoke
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Revoked keys */}
      {revoked.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Revoked keys ({revoked.length})
          </p>
          {revoked.map((key) => (
            <div key={key.id} className="bg-muted/30 border border-border rounded-lg p-4 opacity-60">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground line-through">{key.name}</span>
                <code className="text-xs font-mono text-muted-foreground">{key.prefix}•••</code>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                  Revoked
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-muted/40 border border-border rounded-lg px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          API keys grant programmatic access to your workspace. Treat them like passwords — never share them
          or commit them to source code. Use environment variables instead.{" "}
          <a href="#docs" className="text-primary hover:underline">Read the API docs →</a>
        </p>
      </div>

      <CreateKeyDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      {newSecret && <NewKeyReveal secret={newSecret} onClose={() => setNewSecret(null)} />}
    </div>
  );
}
