import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsTeamPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your team members and their roles.</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="w-4 h-4" /> Invite member
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-center border border-border rounded-lg bg-background">
        <UserPlus className="w-10 h-10 text-muted-foreground/25 mb-3" />
        <p className="text-[15px] font-medium text-muted-foreground mb-1">You're the only team member</p>
        <p className="text-sm text-muted-foreground/70 mb-4">Invite your team to get started.</p>
        <Button size="sm" className="gap-1.5"><UserPlus className="w-4 h-4" /> Invite member</Button>
      </div>
    </div>
  );
}
