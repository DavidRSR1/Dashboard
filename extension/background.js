import {
  CHECK_ALARM,
  CHECK_INTERVAL_MINUTES,
  DEFAULT_PREFERENCES,
} from "./config.js";
import {
  formatOffsetLabel,
  formatTimeUntil,
  getDeadlineDate,
  normalizePreferences,
  reminderSlotKey,
  shouldFireReminder,
} from "./lib/deadlines.js";
import {
  fetchActivities,
  fetchNotificationPreferences,
} from "./lib/supabase.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(CHECK_ALARM, { periodInMinutes: CHECK_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM) void checkDeadlines();
});

chrome.runtime.onStartup.addListener(() => {
  void checkDeadlines();
});

async function checkDeadlines() {
  const { session, notified = {} } = await chrome.storage.local.get(["session", "notified"]);
  if (!session?.access_token || !session?.user?.id) return;

  let prefs = DEFAULT_PREFERENCES;
  try {
    const raw = await fetchNotificationPreferences(session.access_token, session.user.id);
    const normalized = normalizePreferences(raw);
    if (normalized?.offsets) {
      prefs = { enabled: normalized.enabled, offsets: normalized.offsets };
    }
  } catch {
    return;
  }

  if (!prefs.enabled) return;

  let activities = [];
  try {
    activities = await fetchActivities(session.access_token);
  } catch {
    return;
  }

  const now = new Date();
  const nextNotified = { ...notified };

  for (const activity of activities) {
    if (activity.status === "pronto") continue;

    const deadline = getDeadlineDate(activity);
    if (!deadline || deadline <= now) continue;

    for (const offset of prefs.offsets) {
      if (!shouldFireReminder(deadline, offset, now)) continue;

      const slotKey = reminderSlotKey(activity.id, offset, deadline);
      if (nextNotified[slotKey]) continue;

      const timeLeft = formatTimeUntil(deadline, now);
      await chrome.notifications.create(slotKey, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon.svg"),
        title: "Atividade ainda não finalizada",
        message: `${activity.atividade} — vence em ${timeLeft} (alerta ${formatOffsetLabel(offset)} antes)`,
        priority: 2,
      });

      nextNotified[slotKey] = now.toISOString();
    }
  }

  await chrome.storage.local.set({ notified: nextNotified });
}
