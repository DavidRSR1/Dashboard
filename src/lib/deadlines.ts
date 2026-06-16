import type { ReminderOffset } from "@/types/notifications";
import type { ActivityStatus, CronogramaAtividade } from "@/types/cronograma";

const DEFAULT_END_HOUR = 23;
const DEFAULT_END_MINUTE = 59;

export function toInputTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

export function parseTimeParts(time: string | null): { hours: number; minutes: number } | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hours: h, minutes: m };
}

/** Prazo final: data_front + hora_fim ou 23:59 se hora não informada */
export function getDeadlineDate(atividade: Pick<CronogramaAtividade, "data_front" | "hora_fim">): Date | null {
  if (!atividade.data_front) return null;

  const [year, month, day] = atividade.data_front.split("T")[0].split("-").map(Number);
  const time = parseTimeParts(atividade.hora_fim);

  return new Date(
    year,
    month - 1,
    day,
    time?.hours ?? DEFAULT_END_HOUR,
    time?.minutes ?? DEFAULT_END_MINUTE,
    0,
    0,
  );
}

export function formatDeadlineBR(
  atividade: Pick<CronogramaAtividade, "data_front" | "hora_fim">,
): string {
  if (!atividade.data_front) return "—";

  const [year, month, day] = atividade.data_front.split("T")[0].split("-");
  const dateStr = `${day}/${month}/${year}`;

  if (atividade.hora_fim) {
    const time = toInputTime(atividade.hora_fim);
    return `${dateStr} às ${time}`;
  }

  return dateStr;
}

export function offsetToMilliseconds(offset: ReminderOffset): number {
  const multipliers = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };
  return offset.value * multipliers[offset.unit];
}

export function getReminderFireTime(deadline: Date, offset: ReminderOffset): Date {
  return new Date(deadline.getTime() - offsetToMilliseconds(offset));
}

export function isActivityPending(status: ActivityStatus): boolean {
  return status !== "pronto";
}

export function formatTimeUntil(deadline: Date, now = new Date()): string {
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "prazo vencido";

  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} dia(s)`;
  if (hours > 0) return `${hours} hora(s)`;
  return `${minutes} minuto(s)`;
}

export function shouldFireReminder(
  deadline: Date,
  offset: ReminderOffset,
  now = new Date(),
  windowMs = 30 * 1000,
): boolean {
  const fireAt = getReminderFireTime(deadline, offset);
  return now >= fireAt && now.getTime() - fireAt.getTime() <= windowMs && deadline > now;
}

export function getActiveReminders(
  atividade: CronogramaAtividade,
  offsets: ReminderOffset[],
  now = new Date(),
): ReminderOffset[] {
  if (!isActivityPending(atividade.status)) return [];

  const deadline = getDeadlineDate(atividade);
  if (!deadline || deadline <= now) return [];

  return offsets.filter((offset) => shouldFireReminder(deadline, offset, now));
}

export function isApproachingDeadline(
  atividade: CronogramaAtividade,
  offsets: ReminderOffset[],
  now = new Date(),
): boolean {
  if (!isActivityPending(atividade.status)) return false;

  const deadline = getDeadlineDate(atividade);
  if (!deadline || deadline <= now) return false;

  const maxOffset = Math.max(...offsets.map(offsetToMilliseconds), 0);
  return deadline.getTime() - now.getTime() <= maxOffset;
}

export function reminderSlotKey(
  activityId: string,
  offset: ReminderOffset,
  deadline: Date,
): string {
  return `${activityId}_${offset.value}_${offset.unit}_${deadline.toISOString()}`;
}
