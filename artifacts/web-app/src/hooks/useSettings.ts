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
    queryFn: async () => {
      const res = await fetch(`${API}/api/settings?tenant=${TENANT}`);
      const json = await res.json();
      return json.settings ?? json;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDistanceUnit(): string {
  const { data } = useSettings();
  return data?.distance_unit ?? "km";
}
