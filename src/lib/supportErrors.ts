import type {
  SupportError,
  SupportErrorFormData,
  SupportErrorSeverity,
  SupportErrorStatus,
} from "@/types/supportErrors";
import { SUPPORT_ERROR_SEVERITY_RANK } from "@/types/supportErrors";

const STORAGE_KEY = "support-errors";

function normalizeError(raw: Partial<SupportError> & { id: string }): SupportError {
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

function readAll(): SupportError[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<SupportError>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Partial<SupportError> & { id: string } => Boolean(item?.id))
      .map(normalizeError);
  } catch {
    return [];
  }
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

function writeAll(errors: SupportError[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function toIsoFromLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

export function listSupportErrors(): SupportError[] {
  return readAll().sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
}

export function createSupportError(form: SupportErrorFormData): SupportError {
  const now = new Date().toISOString();
  const item: SupportError = {
    id: createId(),
    occurred_at: toIsoFromLocalInput(form.occurred_at),
    title: form.title.trim(),
    description: form.description.trim(),
    resolution: form.resolution.trim() || null,
    module: form.module.trim(),
    status: form.status,
    severity: form.severity,
    requester: form.requester.trim() || null,
    ...resolveAgentFields(form),
    created_at: now,
    updated_at: now,
  };

  const all = readAll();
  all.push(item);
  writeAll(all);
  return item;
}

export function updateSupportError(
  id: string,
  form: SupportErrorFormData,
): SupportError | null {
  const all = readAll();
  const index = all.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const updated: SupportError = {
    ...all[index],
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

  all[index] = updated;
  writeAll(all);
  return updated;
}

export function deleteSupportError(id: string): boolean {
  const all = readAll();
  const next = all.filter((item) => item.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
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
