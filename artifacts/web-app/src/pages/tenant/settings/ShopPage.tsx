import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsShopPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Shop profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your workshop's business details and preferences.</p>
      </div>

      <div className="bg-background border border-border rounded-lg p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Business identity</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="shop-name">Workshop name <span className="text-destructive">*</span></Label>
            <Input id="shop-name" placeholder="Al-Rashidi Auto Services" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="United Arab Emirates" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" placeholder="AED" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="Al Quoz Industrial Area 3" />
          </div>
        </div>

        <Separator />

        <h2 className="text-sm font-semibold text-foreground">Contact</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+971 4 XXX XXXX" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="info@workshop.com" type="email" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm">Save changes</Button>
        </div>
      </div>
    </div>
  );
}
