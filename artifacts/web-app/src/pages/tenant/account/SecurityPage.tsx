import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Key, Link as LinkIcon } from "lucide-react";

export default function AccountSecurityPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Security</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your password and account security settings.</p>
      </div>

      <div className="bg-background border border-border rounded-lg divide-y divide-border">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Password</h2>
          </div>
          <div className="space-y-3 max-w-sm">
            <div className="space-y-1.5">
              <Label htmlFor="current-pw">Current password</Label>
              <Input id="current-pw" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" placeholder="Min. 8 characters" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input id="confirm-pw" type="password" placeholder="Repeat new password" />
            </div>
            <Button size="sm">Update password</Button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Passkeys</h2>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">Coming soon</span>
          </div>
          <p className="text-sm text-muted-foreground">Passkeys provide faster, more secure sign-in without a password.</p>
          <Button size="sm" variant="outline" disabled>Add a passkey</Button>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <LinkIcon className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Connected accounts</h2>
          </div>
          <div className="flex items-center justify-between py-2 border border-border rounded-md px-4">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span className="text-sm text-foreground">Google</span>
            </div>
            <Button size="sm" variant="outline">Link</Button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <Separator className="mb-3" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Danger zone</p>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5">
            Sign out all other sessions
          </Button>
        </div>
      </div>
    </div>
  );
}
