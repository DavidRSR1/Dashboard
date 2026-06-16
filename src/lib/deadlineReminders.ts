import type { CronogramaAtividade } from "@/types/cronograma";
import { formatOffsetLabel } from "@/types/notifications";
import {
  formatTimeUntil,
  getDeadlineDate,
  reminderSlotKey,
  shouldFireReminder,
} from "@/lib/deadlines";
import { getNotificationPreferences } from "@/lib/notifications";
import { supabase } from "@/lib/supabase/client";

const NOTIFIED_KEY = "dashboard_deadline_notified";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;

export type NotificationPermissionState = NotificationPermission | "unsupported";

export function supportsBrowserNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!supportsBrowserNotifications()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!supportsBrowserNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function loadNotified(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveNotified(notified: Record<string, string>) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));
}

export async function checkDeadlineReminders(): Promise<void> {
  if (!supportsBrowserNotifications() || Notification.permission !== "granted") return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const prefs = await getNotificationPreferences(user.id);
  if (!prefs.enabled) return;

  const { data: activities, error } = await supabase.from("cronograma_atividades").select("*");
  if (error || !activities) return;

  const now = new Date();
  const nextNotified = { ...loadNotified() };

  for (const activity of activities as CronogramaAtividade[]) {
    if (activity.status === "pronto") continue;

    const deadline = getDeadlineDate(activity);
    if (!deadline || deadline <= now) continue;

    for (const offset of prefs.offsets) {
      if (!shouldFireReminder(deadline, offset, now)) continue;

      const slotKey = reminderSlotKey(activity.id, offset, deadline);
      if (nextNotified[slotKey]) continue;

      const timeLeft = formatTimeUntil(deadline, now);
      new Notification("Atividade ainda não finalizada", {
        body: `${activity.atividade} — vence em ${timeLeft} (alerta ${formatOffsetLabel(offset)} antes)`,
        icon: "/favicon.ico",
        tag: slotKey,
      });

      nextNotified[slotKey] = now.toISOString();
    }
  }

  saveNotified(nextNotified);
}

export function startDeadlineReminders(): void {
  if (intervalId) return;
  void checkDeadlineReminders();
  intervalId = setInterval(() => void checkDeadlineReminders(), CHECK_INTERVAL_MS);
}

export function stopDeadlineReminders(): void {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
}

export function syncDeadlineRemindersWithPermission(): void {
  if (getNotificationPermission() === "granted") {
    startDeadlineReminders();
  } else {
    stopDeadlineReminders();
  }
}
