import { supabase } from "@/lib/supabase/client";
import type {
  SupportError,
  SupportErrorFormData,
  SupportErrorSeverity,
  SupportErrorStatus,
} from "@/types/supportErrors";
import { SUPPORT_ERROR_SEVERITY_RANK } from "@/types/supportErrors";

type SupportErrorRow = {
  id: string;
  occurred_at: string;
  title: string;
  description: string;
  resolution: string | null;
  module: string;
  status: SupportErrorStatus;
  severity: SupportErrorSeverity;
  requester: string | null;
  agent_id: string | null;
  resolved_by_id: string | null;
  transferred_by_id: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeError(raw: Partial<SupportErrorRow> & { id: string }): SupportError {
  const description = raw.description ?? "";
  const title = (raw.title ?? "").trim() || description.slice(0, 80) || "Sem título";

  return {
    id: raw.id,
    occurred_at: raw.occurred_at ?? new Date().toISOString(),
    title,
    description,
    resolution: raw.resolution ?? null,
    module: raw.module ?? "",
    status: raw.status ?? "novo",
    severity: raw.severity ?? "medio",
    requester: raw.requester ?? null,
    agent_id: raw.agent_id ?? null,
    resolved_by_id: raw.resolved_by_id ?? null,
    transferred_by_id: raw.transferred_by_id ?? null,
    created_at: raw.created_at ?? new Date().toISOString(),
    updated_at: raw.updated_at ?? new Date().toISOString(),
  };
}

function resolveAgentFields(form: SupportErrorFormData): Pick<
  SupportError,
  "agent_id" | "resolved_by_id" | "transferred_by_id"
> {
  const agentId = form.agent_id.trim() || null;
  const resolvedBy =
    form.status === "resolvido" ? form.resolved_by_id.trim() || agentId : null;
  const transferredBy =
    form.status === "encaminhado_n2"
      ? form.transferred_by_id.trim() || agentId
      : null;

  return {
    agent_id: agentId,
    resolved_by_id: resolvedBy,
    transferred_by_id: transferredBy,
  };
}

function toIsoFromLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function payloadFromForm(form: SupportErrorFormData) {
  return {
    occurred_at: toIsoFromLocalInput(form.occurred_at),
    title: form.title.trim(),
    description: form.description.trim(),
    resolution: form.resolution.trim() || null,
    module: form.module.trim(),
    status: form.status,
    severity: form.severity,
    requester: form.requester.trim() || null,
    ...resolveAgentFields(form),
    updated_at: new Date().toISOString(),
  };
}

export async function listSupportErrors(): Promise<{
  data: SupportError[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("support_errors")
    .select("*")
    .order("occurred_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data as SupportErrorRow[] | null) ?? [];
  return {
    data: rows.map((row) => normalizeError(row)),
    error: null,
  };
}

export async function createSupportError(
  form: SupportErrorFormData,
): Promise<{ data: SupportError | null; error: string | null }> {
  const payload = {
    ...payloadFromForm(form),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("support_errors")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: normalizeError(data as SupportErrorRow), error: null };
}

export async function updateSupportError(
  id: string,
  form: SupportErrorFormData,
): Promise<{ data: SupportError | null; error: string | null }> {
  const { data, error } = await supabase
    .from("support_errors")
    .update(payloadFromForm(form))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: normalizeError(data as SupportErrorRow), error: null };
}

export async function deleteSupportError(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from("support_errors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export function dateKeyFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfCalendarWeek(reference = new Date()): Date {
  const date = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  return date;
}

export function endOfCalendarWeek(reference = new Date()): Date {
  const start = startOfCalendarWeek(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isInRange(iso: string, start: Date, end: Date): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date <= end;
}

export type DaySeverityMarker = "none" | "low" | "medium" | "high" | "critical";

export function dayMarkerForErrors(errors: SupportError[]): DaySeverityMarker {
  if (errors.length === 0) return "none";

  const maxRank = Math.max(
    ...errors.map((item) => SUPPORT_ERROR_SEVERITY_RANK[item.severity]),
  );

  if (errors.length >= 4 || maxRank >= 4) return "critical";
  if (errors.length >= 3 || maxRank >= 3) return "high";
  if (errors.length >= 2 || maxRank >= 2) return "medium";
  return "low";
}

export type FrequencyItem = {
  label: string;
  count: number;
};

export type WeeklyErrorsSummary = {
  total: number;
  resolved: number;
  resolutionRate: number;
  byStatus: Record<SupportErrorStatus, number>;
  topModules: FrequencyItem[];
  topMessages: FrequencyItem[];
  weekLabel: string;
};

export type MonthlyErrorsSummary = {
  total: number;
  previousTotal: number;
  delta: number;
  byStatus: Record<SupportErrorStatus, number>;
  criticalDays: { dateKey: string; count: number; maxSeverity: SupportErrorSeverity }[];
  openCount: number;
  monthLabel: string;
};

function emptyStatusCounts(): Record<SupportErrorStatus, number> {
  return {
    novo: 0,
    em_analise: 0,
    encaminhado_n2: 0,
    resolvido: 0,
  };
}

function topByField(
  errors: SupportError[],
  field: "module" | "title",
  limit = 3,
): FrequencyItem[] {
  const map = new Map<string, number>();
  for (const item of errors) {
    const label = (item[field] || "—").trim() || "—";
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildWeeklySummary(
  errors: SupportError[],
  reference = new Date(),
): WeeklyErrorsSummary {
  const start = startOfCalendarWeek(reference);
  const end = endOfCalendarWeek(reference);
  const weekErrors = errors.filter((item) => isInRange(item.occurred_at, start, end));
  const byStatus = emptyStatusCounts();
  for (const item of weekErrors) {
    byStatus[item.status] += 1;
  }
  const resolved = byStatus.resolvido;
  const total = weekErrors.length;
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return {
    total,
    resolved,
    resolutionRate: total === 0 ? 0 : Math.round((resolved / total) * 100),
    byStatus,
    topModules: topByField(weekErrors, "module"),
    topMessages: topByField(weekErrors, "title"),
    weekLabel: `${fmt(start)} a ${fmt(end)}`,
  };
}

export function buildMonthlySummary(
  errors: SupportError[],
  reference = new Date(),
): MonthlyErrorsSummary {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const prevStart = new Date(year, month - 1, 1);
  const prevEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const monthErrors = errors.filter((item) => isInRange(item.occurred_at, start, end));
  const previousErrors = errors.filter((item) =>
    isInRange(item.occurred_at, prevStart, prevEnd),
  );

  const byStatus = emptyStatusCounts();
  for (const item of monthErrors) {
    byStatus[item.status] += 1;
  }

  const byDay = new Map<string, SupportError[]>();
  for (const item of monthErrors) {
    const key = dateKeyFromIso(item.occurred_at);
    if (!key) continue;
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }

  const criticalDays = [...byDay.entries()]
    .map(([dateKey, dayErrors]) => {
      const maxSeverity = dayErrors.reduce<SupportErrorSeverity>((acc, cur) => {
        return SUPPORT_ERROR_SEVERITY_RANK[cur.severity] > SUPPORT_ERROR_SEVERITY_RANK[acc]
          ? cur.severity
          : acc;
      }, "baixo");
      return { dateKey, count: dayErrors.length, maxSeverity };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (
        SUPPORT_ERROR_SEVERITY_RANK[b.maxSeverity] - SUPPORT_ERROR_SEVERITY_RANK[a.maxSeverity]
      );
    })
    .slice(0, 5);

  const openCount =
    byStatus.novo + byStatus.em_analise + byStatus.encaminhado_n2;

  return {
    total: monthErrors.length,
    previousTotal: previousErrors.length,
    delta: monthErrors.length - previousErrors.length,
    byStatus,
    criticalDays,
    openCount,
    monthLabel: reference.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  };
}

export function errorsForDateKey(errors: SupportError[], dateKey: string): SupportError[] {
  return errors
    .filter((item) => dateKeyFromIso(item.occurred_at) === dateKey)
    .sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );
}

export function formFromSupportError(error: SupportError): SupportErrorFormData {
  const date = new Date(error.occurred_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const occurred_at = Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return {
    occurred_at,
    title: error.title,
    description: error.description,
    resolution: error.resolution ?? "",
    module: error.module,
    status: error.status,
    severity: error.severity,
    requester: error.requester ?? "",
    agent_id: error.agent_id ?? "",
    resolved_by_id: error.resolved_by_id ?? "",
    transferred_by_id: error.transferred_by_id ?? "",
  };
}
