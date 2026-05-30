import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { getSession } from "@/hooks/useAuth";

/* ─────────────────────────────────────────────────────────────────────────
   Global fetch interceptor: automatically injects x-user-id header and
   ensures tenant slug is present on every API call.
   ──────────────────────────────────────────────────────────────────────── */
const _origFetch = window.fetch;

const PUBLIC_PATHS = [
  "/api/healthz",
  "/api/plans",
  "/api/stripe/",
  "/api/auth/",
  "/api/onboarding",
  "/api/tenants/",
  "/api/payment-success",
  "/api/advance-success",
];

const isTenantScoped = (url: string) => {
  // Only intercept same-origin API calls
  if (!url.startsWith(window.location.origin)) return false;
  if (!url.includes("/api/")) return false;
  return PUBLIC_PATHS.every((p) => !url.includes(p));
};

window.fetch = async (input, init) => {
  let urlStr: string;
  if (typeof input === "string") {
    urlStr = input;
  } else if (input instanceof URL) {
    urlStr = input.toString();
  } else if (input instanceof Request) {
    urlStr = input.url;
  } else {
    return _origFetch(input, init);
  }
  if (!isTenantScoped(urlStr)) return _origFetch(input, init);

  const session = getSession();
  const headers = new Headers(init?.headers);

  if (session?.userId) {
    headers.set("x-user-id", session.userId);
  }

  // Ensure tenant slug is present in query params
  const urlObj = new URL(urlStr, window.location.origin);
  if (!urlObj.searchParams.has("tenant")) {
    const slug = session?.tenantSlug || urlObj.searchParams.get("tenant");
    if (slug) urlObj.searchParams.set("tenant", slug);
  }

  return _origFetch(urlObj.toString(), {
    ...init,
    headers,
  });
};

createRoot(document.getElementById("root")!).render(<App />);
