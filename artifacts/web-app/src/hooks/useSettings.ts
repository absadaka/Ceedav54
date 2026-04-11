import { useQuery } from "@tanstack/react-query";
import { getTenantSlug } from "@/lib/tenant";

const TENANT = getTenantSlug();
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface TenantSettings {
  distance_unit: "km" | "mi";
  currency: string;
  timezone: string;
  language: string;
  [key: string]: any;
}

export function useSettings() {
  return useQuery<TenantSettings>({
    queryKey: ["tenant-settings", TENANT],
    queryFn: () => fetch(`${API}/api/settings?tenant=${TENANT}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDistanceUnit(): string {
  const { data } = useSettings();
  return data?.distance_unit ?? "km";
}
