import { useEffect, useState } from "react";

/**
 * Returns `true` while the page is in its initial loading state.
 * Replace `delay` with real async data-fetching state when API calls are wired.
 */
export function usePageLoad(delay = 350): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return loading;
}
