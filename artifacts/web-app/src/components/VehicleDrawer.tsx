import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();

/* ─── Static data ─────────────────────────────────────────────────────────── */

const EMIRATES = [
  "Abu Dhabi", "Dubai", "Sharjah", "Ajman",
  "Umm Al Quwain", "Ras Al Khaimah", "Fujairah",
];

const YEARS = Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) =>
  String(new Date().getFullYear() + 1 - i),
);

const CAR_MAKES = [
  "Toyota", "Nissan", "Honda", "Mitsubishi", "Kia", "Hyundai",
  "Ford", "Chevrolet", "GMC", "Dodge", "Jeep",
  "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Porsche", "Volvo",
  "Lexus", "Infiniti", "Cadillac", "Lincoln",
  "Land Rover", "Range Rover", "Jaguar",
  "Mazda", "Suzuki", "Subaru", "Isuzu", "Renault", "Peugeot",
  "Ferrari", "Lamborghini", "Bentley", "Rolls-Royce", "Maserati",
  "Tesla", "Other",
];

const CAR_MODELS: Record<string, string[]> = {
  Toyota:        ["Camry", "Corolla", "Land Cruiser", "Prado", "Hilux", "RAV4",
                  "Fortuner", "Yaris", "Avalon", "FJ Cruiser", "Crown", "Sequoia",
                  "Tundra", "4Runner", "C-HR", "Highlander"],
  Nissan:        ["Patrol", "Altima", "Sunny", "Maxima", "X-Trail", "Kicks",
                  "Pathfinder", "Armada", "Tiida", "Juke", "Murano", "GT-R", "Navara"],
  Honda:         ["Accord", "Civic", "CR-V", "Pilot", "HR-V", "Odyssey", "Jazz", "City"],
  Mitsubishi:    ["Lancer", "Pajero", "L200", "Outlander", "Eclipse Cross", "Galant", "ASX"],
  Kia:           ["Sportage", "Sorento", "Cerato", "K5", "Telluride", "Stinger", "Carnival", "Seltos"],
  Hyundai:       ["Tucson", "Santa Fe", "Elantra", "Sonata", "Accent", "Creta", "Palisade", "Ioniq"],
  Ford:          ["F-150", "Explorer", "Expedition", "Mustang", "Edge", "Escape", "Bronco", "Ranger"],
  Chevrolet:     ["Suburban", "Tahoe", "Silverado", "Camaro", "Malibu", "Equinox", "Traverse", "Caprice", "Blazer"],
  GMC:           ["Yukon", "Sierra", "Terrain", "Acadia", "Canyon"],
  Dodge:         ["Charger", "Challenger", "Durango", "RAM 1500", "Viper"],
  Jeep:          ["Wrangler", "Grand Cherokee", "Renegade", "Compass", "Gladiator", "Commander"],
  BMW:           ["3 Series", "5 Series", "7 Series", "X3", "X5", "X6", "X7", "M3", "M5", "M8", "Z4"],
  "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "G-Class",
                    "A-Class", "CLA", "AMG GT", "EQS"],
  Audi:          ["A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "TT", "R8", "e-tron"],
  Volkswagen:    ["Passat", "Golf", "Tiguan", "Touareg", "Polo", "ID.4"],
  Porsche:       ["Cayenne", "Macan", "911", "Panamera", "Taycan", "Boxster", "Cayman"],
  Volvo:         ["XC40", "XC60", "XC90", "S60", "S90", "V60"],
  Lexus:         ["LX 570", "LX 600", "GX 460", "RX 350", "ES 350", "IS 350", "LS 500", "NX 350", "UX 250h"],
  Infiniti:      ["QX80", "QX60", "QX50", "Q50", "Q70"],
  Cadillac:      ["Escalade", "CT5", "CT4", "XT5", "XT6"],
  Lincoln:       ["Navigator", "Aviator", "Corsair", "Nautilus"],
  "Land Rover":  ["Defender", "Discovery", "Discovery Sport", "Freelander"],
  "Range Rover": ["Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque"],
  Jaguar:        ["F-Pace", "E-Pace", "I-Pace", "XE", "XF", "XJ", "F-Type"],
  Mazda:         ["CX-5", "CX-9", "Mazda3", "Mazda6", "MX-5", "CX-30"],
  Suzuki:        ["Grand Vitara", "Jimny", "Swift", "Vitara", "Baleno"],
  Subaru:        ["Forester", "Outback", "Impreza", "XV", "Legacy", "BRZ"],
  Isuzu:         ["D-Max", "MU-X", "Trooper"],
  Renault:       ["Duster", "Koleos", "Megane", "Captur", "Clio"],
  Peugeot:       ["3008", "5008", "2008", "508", "308"],
  Tesla:         ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
};

const COLORS = [
  "White", "Pearl White", "Off White",
  "Black", "Midnight Black",
  "Silver", "Grey", "Dark Grey",
  "Red", "Maroon", "Burgundy",
  "Blue", "Navy Blue", "Sky Blue",
  "Green", "Dark Green",
  "Brown", "Bronze", "Beige", "Champagne",
  "Gold", "Orange", "Yellow", "Cream", "Pink", "Purple",
];

const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"];

/* ─── Plate helpers ───────────────────────────────────────────────────────── */

function parsePlate(plate: string) {
  for (const e of EMIRATES) {
    if (plate.startsWith(e + " ")) {
      const rest = plate.slice(e.length + 1).trim();
      const spaceIdx = rest.indexOf(" ");
      if (spaceIdx !== -1) {
        return { emirate: e, code: rest.slice(0, spaceIdx), number: rest.slice(spaceIdx + 1) };
      }
      return { emirate: e, code: "", number: rest };
    }
  }
  const spaceIdx = plate.indexOf(" ");
  if (spaceIdx !== -1) {
    return { emirate: "", code: plate.slice(0, spaceIdx), number: plate.slice(spaceIdx + 1) };
  }
  return { emirate: "", code: "", number: plate };
}

/* ─── Types ───────────────────────────────────────────────────────────────── */

export interface VehicleRow {
  id: string;
  client_id: string;
  plate: string;
  make: string | null;
  model: string | null;
  year: string | null;
  vin: string | null;
  color: string | null;
  mileage: string | null;
  fuel_type: string | null;
  transmission: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle?: VehicleRow | null;
  clientId?: string;
  onSuccess?: () => void;
}

interface FormState {
  plate_emirate: string;
  plate_code: string;
  plate_number: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  color: string;
  mileage: string;
  fuel_type: string;
  notes: string;
}

const EMPTY: FormState = {
  plate_emirate: "", plate_code: "", plate_number: "",
  make: "", model: "", year: "", vin: "", color: "",
  mileage: "", fuel_type: "", notes: "",
};

function toForm(v: VehicleRow): FormState {
  const parsed = parsePlate(v.plate ?? "");
  return {
    plate_emirate: parsed.emirate,
    plate_code:    parsed.code,
    plate_number:  parsed.number,
    make:          v.make      ?? "",
    model:         v.model     ?? "",
    year:          v.year      ?? "",
    vin:           v.vin       ?? "",
    color:         v.color     ?? "",
    mileage:       v.mileage   ?? "",
    fuel_type:     v.fuel_type ? capitalize(v.fuel_type) : "",
    notes:         v.notes     ?? "",
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function VehicleDrawer({ open, onClose, vehicle, clientId, onSuccess }: Props) {
  const qc     = useQueryClient();
  const isEdit = Boolean(vehicle);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [err,  setErr]  = useState<string | null>(null);

  useEffect(() => {
    if (open) { setErr(null); setForm(vehicle ? toForm(vehicle) : EMPTY); }
  }, [open, vehicle]);

  const field =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const pick = (k: keyof FormState) => (v: string) =>
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "make") next.model = "";
      return next;
    });

  const knownModels = CAR_MODELS[form.make] ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      const plate = [form.plate_emirate, form.plate_code, form.plate_number]
        .filter(Boolean).join(" ").trim().toUpperCase();

      const url = isEdit
        ? `/api/vehicles/${vehicle!.id}?tenant=${TENANT}`
        : `/api/vehicles?tenant=${TENANT}`;
      const body = isEdit
        ? { ...form, plate, fuel_type: form.fuel_type.toLowerCase() }
        : { ...form, plate, fuel_type: form.fuel_type.toLowerCase(), client_id: vehicle?.client_id ?? clientId };
      const res = await fetch(url, {
        method:  isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Request failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["vehicle"] });
      qc.invalidateQueries({ queryKey: ["client"] });
      onSuccess?.();
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plate_number.trim()) { setErr("Plate number is required"); return; }
    setErr(null);
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <DialogTitle>{isEdit ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update vehicle details." : "Register a new vehicle for this customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Plate ─────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Plate number <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-[1fr_72px_1fr] gap-2">
              <SearchableSelect
                value={form.plate_emirate}
                onValueChange={pick("plate_emirate")}
                options={EMIRATES}
                placeholder="Emirate"
                searchPlaceholder="Search emirate…"
              />
              <Input
                value={form.plate_code}
                onChange={field("plate_code")}
                placeholder="A"
                className="uppercase text-center font-medium tracking-widest"
                maxLength={3}
              />
              <Input
                value={form.plate_number}
                onChange={field("plate_number")}
                placeholder="12345"
                className="uppercase font-medium tracking-wider"
                maxLength={10}
              />
            </div>
            <p className="text-xs text-muted-foreground">Emirate · Letter code · Number</p>
          </div>

          {/* ── Make & Model ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Make</Label>
              <SearchableSelect
                value={form.make}
                onValueChange={pick("make")}
                options={CAR_MAKES}
                placeholder="Select make…"
                searchPlaceholder="Search make…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              {knownModels.length > 0 ? (
                <SearchableSelect
                  value={form.model}
                  onValueChange={pick("model")}
                  options={knownModels}
                  placeholder="Select model…"
                  searchPlaceholder="Search model…"
                />
              ) : (
                <Input
                  value={form.model}
                  onChange={field("model")}
                  placeholder={form.make ? "Enter model" : "Select make first"}
                  disabled={!form.make}
                />
              )}
            </div>
          </div>

          {/* ── Year & Color ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Year</Label>
              <SearchableSelect
                value={form.year}
                onValueChange={pick("year")}
                options={YEARS}
                placeholder="Select year…"
                searchPlaceholder="Search year…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <SearchableSelect
                value={form.color}
                onValueChange={pick("color")}
                options={COLORS}
                placeholder="Select color…"
                searchPlaceholder="Search color…"
              />
            </div>
          </div>

          {/* ── VIN ───────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="vvin">VIN</Label>
            <Input
              id="vvin"
              value={form.vin}
              onChange={field("vin")}
              placeholder="1HGBH41JXMN109186"
              className="font-mono text-sm"
            />
          </div>

          {/* ── Fuel & Mileage ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fuel type</Label>
              <SearchableSelect
                value={form.fuel_type}
                onValueChange={pick("fuel_type")}
                options={FUEL_TYPES}
                placeholder="Select…"
                searchPlaceholder="Search…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vmil">Mileage (km)</Label>
              <Input
                id="vmil"
                value={form.mileage}
                onChange={field("mileage")}
                placeholder="85000"
              />
            </div>
          </div>

          {/* ── Notes ─────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="vnotes">Notes</Label>
            <Textarea
              id="vnotes"
              value={form.notes}
              onChange={field("notes")}
              rows={3}
              placeholder="Any notes about this vehicle…"
            />
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
        </form>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
