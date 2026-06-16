export type ReminderUnit = "minutes" | "hours" | "days";

export type ReminderOffset = {
  value: number;
  unit: ReminderUnit;
};

export type NotificationPreferences = {
  enabled: boolean;
  offsets: ReminderOffset[];
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  offsets: [
    { value: 1, unit: "days" },
    { value: 2, unit: "hours" },
    { value: 30, unit: "minutes" },
  ],
};

export const REMINDER_UNIT_LABELS: Record<ReminderUnit, string> = {
  minutes: "minuto(s)",
  hours: "hora(s)",
  days: "dia(s)",
};

export function formatOffsetLabel(offset: ReminderOffset): string {
  return `${offset.value} ${REMINDER_UNIT_LABELS[offset.unit]}`;
}

export function normalizePreferences(raw: unknown): NotificationPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFICATION_PREFERENCES };

  const obj = raw as Partial<NotificationPreferences>;
  const offsets = Array.isArray(obj.offsets)
    ? obj.offsets.filter(
        (o) =>
          o &&
          typeof o.value === "number" &&
          o.value > 0 &&
          ["minutes", "hours", "days"].includes(o.unit),
      )
    : DEFAULT_NOTIFICATION_PREFERENCES.offsets;

  return {
    enabled: obj.enabled !== false,
    offsets: offsets.length > 0 ? offsets : DEFAULT_NOTIFICATION_PREFERENCES.offsets,
  };
}
