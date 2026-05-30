import { useState } from "react";
import { Save, Globe, Mail, Bell, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

function SettingCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Separator />
      <div className="px-5 py-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, desc, children }: {
  label: string; desc?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function PlatformSettingsPage() {
  const [platformName, setPlatformName] = useState("ceer&gt;");
  const [supportEmail, setSupportEmail] = useState("support@ceeda.me");
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Dubai");
  const [defaultCurrency, setDefaultCurrency] = useState("AED");
  const [trialDays, setTrialDays] = useState("14");

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [enforcePasswordPolicy, setEnforcePasswordPolicy] = useState(true);
  const [require2FA, setRequire2FA] = useState(false);

  const handleSave = () => {
    toast.success("Settings saved");
  };

  return (
    <div className="p-6 lg:p-10 max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Platform Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure global platform defaults and behavior
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>

      <SettingCard
        icon={Globe}
        title="General"
        description="Basic platform identity and defaults"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Platform Name</Label>
            <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Support Email</Label>
            <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Default Timezone</Label>
            <Select value={defaultTimezone} onValueChange={setDefaultTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GMT+4)</SelectItem>
                <SelectItem value="Asia/Riyadh">Asia/Riyadh (GMT+3)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default Currency</Label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="GBP">GBP — British Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingCard>

      <SettingCard
        icon={Clock}
        title="Onboarding"
        description="Control how new tenants join the platform"
      >
        <SettingRow label="Allow new signups" desc="Let new workshops register on their own">
          <Switch checked={signupsEnabled} onCheckedChange={setSignupsEnabled} />
        </SettingRow>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Trial Period</p>
            <p className="text-xs text-muted-foreground mt-0.5">Days before requiring a paid plan</p>
          </div>
          <Input
            type="number"
            className="w-20 text-center"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            min={0}
            max={90}
          />
        </div>
      </SettingCard>

      <SettingCard
        icon={Mail}
        title="Notifications"
        description="Email and alert preferences"
      >
        <SettingRow label="Email notifications" desc="Send emails for important platform events">
          <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
        </SettingRow>
      </SettingCard>

      <SettingCard
        icon={Shield}
        title="Security"
        description="Password and access policies"
      >
        <SettingRow label="Enforce password policy" desc="Require strong passwords (8+ chars, mixed case, numbers)">
          <Switch checked={enforcePasswordPolicy} onCheckedChange={setEnforcePasswordPolicy} />
        </SettingRow>
        <Separator />
        <SettingRow label="Require 2FA for admins" desc="Force two-factor authentication for all admin accounts">
          <Switch checked={require2FA} onCheckedChange={setRequire2FA} />
        </SettingRow>
      </SettingCard>

      <SettingCard
        icon={Bell}
        title="Maintenance"
        description="Platform-wide maintenance controls"
      >
        <SettingRow label="Maintenance mode" desc="Show a maintenance page to all tenants">
          <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
        </SettingRow>
      </SettingCard>
    </div>
  );
}
