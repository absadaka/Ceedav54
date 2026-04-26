import AsyncStorage from "@react-native-async-storage/async-storage";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;

export const API_BASE = DOMAIN ? `https://${DOMAIN}/api` : "/api";

async function getUserId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem("ceeda.session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: { id?: string } };
    return parsed?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const userId = await getUserId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (userId) headers["x-user-id"] = userId;

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { ...init, headers });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err =
      typeof data === "object" && data && "error" in (data as object)
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw Object.assign(new Error(err), { status: res.status });
  }
  return data as T;
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  tenantId: string | null;
};

export type SessionTenant = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  timezone: string | null;
  logoUrl: string | null;
};

export type LoginResponse = {
  user: SessionUser;
  tenant: SessionTenant | null;
};

export async function login(
  email: string,
  password: string,
  tenantSlug?: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      tenantSlug: tenantSlug || undefined,
    }),
  });
}

/* ── Jobs ──────────────────────────────────────────────────────── */
export type JobListItem = {
  id: string;
  ref: string;
  type: string;
  status: string;
  priority: string | null;
  customer_concern: string | null;
  technician_id: string | null;
  technician_name: string | null;
  client_name: string | null;
  client_phone: string | null;
  plate_number: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  created_at: string;
  scheduled_date: string | null;
};

type JobsListResp = { data: JobListItem[]; total: number };

export async function listMyJobs(opts: {
  tenantSlug: string;
  technicianId: string;
  status?: string;
}): Promise<JobListItem[]> {
  const params = new URLSearchParams({
    tenant: opts.tenantSlug,
    technician_id: opts.technicianId,
    limit: "100",
  });
  if (opts.status) params.set("status", opts.status);
  const r = await apiFetch<JobsListResp>(`/jobs?${params.toString()}`);
  return r.data ?? [];
}

export type JobDetailJob = {
  id: string;
  ref: string;
  type: string;
  status: string;
  priority: string | null;
  customer_concern: string | null;
  technician_note: string | null;
  qc_note: string | null;
  internal_note: string | null;
  mileage_in: number | null;
  mileage_out: number | null;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  vehicle_id: string | null;
  plate_number: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  vin: string | null;
  vehicle_mileage: number | null;
  fuel_type: string | null;
  technician_id: string | null;
  technician_name: string | null;
};

export type JobPart = {
  id: string;
  part_number: string | null;
  description: string;
  qty: string;
  unit_price: string;
  line_total: string;
};

export type JobTimeLog = {
  id: string;
  started_at: string;
  ended_at: string | null;
  minutes: number | null;
  notes: string | null;
};

export type JobNote = {
  id: string;
  note: string;
  type: string;
  created_at: string;
  created_by_name?: string | null;
};

export type JobDetail = {
  job: JobDetailJob;
  parts: JobPart[];
  timeLogs: JobTimeLog[];
  totalMinutes: number;
  techNotes: JobNote[];
  reportNotes: JobNote[];
  statusHistory: Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: string;
  }>;
};

export async function getJob(
  id: string,
  tenantSlug: string,
): Promise<JobDetail> {
  return apiFetch<JobDetail>(
    `/jobs/${id}?tenant=${encodeURIComponent(tenantSlug)}`,
  );
}

export async function patchJob(
  id: string,
  tenantSlug: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return apiFetch(`/jobs/${id}?tenant=${encodeURIComponent(tenantSlug)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function changeJobStatus(
  id: string,
  tenantSlug: string,
  to_status: string,
  changed_by: string | null,
  note?: string,
): Promise<unknown> {
  return apiFetch(
    `/jobs/${id}/status?tenant=${encodeURIComponent(tenantSlug)}`,
    {
      method: "POST",
      body: JSON.stringify({ status: to_status, note, changed_by }),
    },
  );
}

export async function addJobNote(
  id: string,
  tenantSlug: string,
  note: string,
  type: "technician" | "report",
  created_by: string | null,
): Promise<unknown> {
  return apiFetch(
    `/jobs/${id}/notes?tenant=${encodeURIComponent(tenantSlug)}`,
    {
      method: "POST",
      body: JSON.stringify({ note, type, created_by }),
    },
  );
}

export async function addJobPart(
  id: string,
  tenantSlug: string,
  body: {
    description: string;
    qty: number;
    unit_price: number;
    part_number?: string;
    added_by?: string | null;
  },
): Promise<unknown> {
  return apiFetch(
    `/jobs/${id}/parts?tenant=${encodeURIComponent(tenantSlug)}`,
    {
      method: "POST",
      body: JSON.stringify({
        ...body,
        qty: String(body.qty),
        unit_price: String(body.unit_price),
      }),
    },
  );
}

export async function deleteJobPart(
  jobId: string,
  partId: string,
  tenantSlug: string,
): Promise<unknown> {
  return apiFetch(
    `/jobs/${jobId}/parts/${partId}?tenant=${encodeURIComponent(tenantSlug)}`,
    { method: "DELETE" },
  );
}

/* ─── Catalog (services & parts, synced from workshop portal) ───────────── */

export type CatalogItemType =
  | "labour"
  | "part"
  | "consumable"
  | "sublet"
  | "package";

export type CatalogItem = {
  id: string;
  type: CatalogItemType;
  sku: string | null;
  name: string;
  description: string | null;
  unit: string;
  unit_price: string;
  is_active: boolean;
};

export async function getCatalog(tenantSlug: string): Promise<CatalogItem[]> {
  const res = await apiFetch<{ items: CatalogItem[] }>(
    `/settings/catalog?tenant=${encodeURIComponent(tenantSlug)}`,
  );
  return (res.items ?? []).filter((i) => i.is_active);
}

export async function jobTimer(
  id: string,
  tenantSlug: string,
  action: "start" | "stop",
  technicianId: string | null,
): Promise<unknown> {
  return apiFetch(
    `/jobs/${id}/time?tenant=${encodeURIComponent(tenantSlug)}`,
    {
      method: "POST",
      body: JSON.stringify({ action, technician_id: technicianId }),
    },
  );
}
