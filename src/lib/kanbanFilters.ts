import { getDeadlineDate } from "@/lib/deadlines";
import { getNextWeekRange, getReportWeekRange, isDateInRange } from "@/lib/weekRange";
import type { ActivityStatus, CronogramaAtividade } from "@/types/cronograma";

export type KanbanHorizon = "semanal" | "mes" | "tudo";

export const KANBAN_HORIZON_OPTIONS: {
  value: KanbanHorizon;
  label: string;
  hint: string;
}[] = [
  { value: "semanal", label: "Semanal", hint: "Esta e próxima semana" },
  { value: "mes", label: "30 dias", hint: "Próximo mês" },
  { value: "tudo", label: "Tudo", hint: "Todas as atividades" },
];

export const PRONTO_ARCHIVE_DAYS = 14;
export const COLUMN_VISIBLE_LIMIT = 8;

function isActiveStatus(status: ActivityStatus): boolean {
  return status === "iniciado" || status === "em_progresso";
}

function sortByDeadline(items: CronogramaAtividade[]): CronogramaAtividade[] {
  return [...items].sort((a, b) => {
    const da = getDeadlineDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const db = getDeadlineDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });
}

export function isProntoArchived(atividade: CronogramaAtividade, now = new Date()): boolean {
  if (atividade.status !== "pronto") return false;
  const ref = atividade.concluido_em ?? atividade.updated_at;
  if (!ref) return false;
  const concluido = new Date(ref);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - PRONTO_ARCHIVE_DAYS);
  return concluido < cutoff;
}

export function isRelevantForFocusWeek(
  atividade: CronogramaAtividade,
  now = new Date(),
): boolean {
  if (atividade.status === "pronto") return !isProntoArchived(atividade, now);

  const week = getReportWeekRange(now);
  const nextWeek = getNextWeekRange(week.start);
  const deadline = getDeadlineDate(atividade);

  if (isActiveStatus(atividade.status)) {
    if (!deadline) return true;
    if (deadline <= nextWeek.end) return true;
    if (deadline < week.start) return true;
    return false;
  }

  if (!deadline) return false;
  return isDateInRange(deadline, week) || isDateInRange(deadline, nextWeek);
}

export function isRelevantForMonthHorizon(
  atividade: CronogramaAtividade,
  now = new Date(),
): boolean {
  if (atividade.status === "pronto") return !isProntoArchived(atividade, now);

  const deadline = getDeadlineDate(atividade);
  const horizonEnd = new Date(now);
  horizonEnd.setDate(horizonEnd.getDate() + 30);

  if (isActiveStatus(atividade.status)) {
    if (!deadline) return true;
    if (deadline <= horizonEnd) return true;
    if (deadline < now) return true;
    return false;
  }

  if (!deadline) return false;
  if (deadline < now) return true;
  return deadline <= horizonEnd;
}

export function isVisibleInKanban(
  atividade: CronogramaAtividade,
  horizon: KanbanHorizon,
  now = new Date(),
): boolean {
  if (horizon === "tudo") return true;
  if (horizon === "semanal") return isRelevantForFocusWeek(atividade, now);
  return isRelevantForMonthHorizon(atividade, now);
}

export function filterKanbanItems(
  items: CronogramaAtividade[],
  horizon: KanbanHorizon,
  now = new Date(),
): {
  visible: CronogramaAtividade[];
  hiddenCount: number;
  archivedProntoCount: number;
} {
  const archivedProntoCount =
    horizon !== "tudo" ? items.filter((a) => isProntoArchived(a, now)).length : 0;

  if (horizon === "tudo") {
    return { visible: sortByDeadline(items), hiddenCount: 0, archivedProntoCount: 0 };
  }

  const visible = sortByDeadline(items.filter((a) => isVisibleInKanban(a, horizon, now)));
  return { visible, hiddenCount: items.length - visible.length, archivedProntoCount };
}

export function parseStoredKanbanHorizon(stored: string | null): KanbanHorizon {
  if (stored === "foco") return "semanal";
  if (stored === "semanal" || stored === "mes" || stored === "tudo") return stored;
  return "semanal";
}

export function groupByStatus(
  items: CronogramaAtividade[],
): Record<ActivityStatus, CronogramaAtividade[]> {
  const map: Record<ActivityStatus, CronogramaAtividade[]> = {
    nao_iniciado: [],
    iniciado: [],
    em_progresso: [],
    pronto: [],
  };
  for (const item of items) {
    map[item.status].push(item);
  }
  return map;
}
