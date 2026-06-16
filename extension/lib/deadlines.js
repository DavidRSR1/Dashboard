import { REMINDER_WINDOW_MS } from "../config.js";

const DEFAULT_END_HOUR = 23;
const DEFAULT_END_MINUTE = 59;

export function isActivityPending(status) {
  return status !== "pronto";
}

export function getDeadlineDate(atividade) {
  if (!atividade.data_front) return null;

  const [year, month, day] = atividade.data_front.split("T")[0].split("-").map(Number);
  let hours = DEFAULT_END_HOUR;
  let minutes = DEFAULT_END_MINUTE;

  if (atividade.hora_fim) {
    const parts = atividade.hora_fim.split(":").map(Number);
    hours = parts[0];
    minutes = parts[1];
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function offsetToMs(offset) {
  const multipliers = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
  return offset.value * multipliers[offset.unit];
}

export function getReminderFireTime(deadline, offset) {
  return new Date(deadline.getTime() - offsetToMs(offset));
}

export function shouldFireReminder(deadline, offset, now = new Date(), windowMs = REMINDER_WINDOW_MS) {
  const fireAt = getReminderFireTime(deadline, offset);
  return now >= fireAt && now.getTime() - fireAt.getTime() <= windowMs && deadline > now;
}

export function formatOffsetLabel(offset) {
  const labels = { minutes: "minuto(s)", hours: "hora(s)", days: "dia(s)" };
  return `${offset.value} ${labels[offset.unit]}`;
}

export function formatTimeUntil(deadline, now = new Date()) {
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "prazo vencido";
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} dia(s)`;
  if (hours > 0) return `${hours} hora(s)`;
  return `${minutes} minuto(s)`;
}

export function reminderSlotKey(activityId, offset, deadline) {
  return `${activityId}_${offset.value}_${offset.unit}_${deadline.toISOString()}`;
}

export function normalizePreferences(raw) {
  if (!raw || typeof raw !== "object") return null;
  const offsets = Array.isArray(raw.offsets)
    ? raw.offsets.filter((o) => o && o.value > 0 && ["minutes", "hours", "days"].includes(o.unit))
    : [];
  return {
    enabled: raw.enabled !== false,
    offsets: offsets.length > 0 ? offsets : null,
  };
}
