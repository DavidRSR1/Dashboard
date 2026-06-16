import {
  ALARM_WAKEUP_MINUTES,
  CHECK_ALARM,
  CHECK_INTERVAL_MS,
  DEFAULT_PREFERENCES,
} from "./config.js";
import {
  formatOffsetLabel,
  formatTimeUntil,
  getDeadlineDate,
  getDueReminderOffsets,
  isActivityPending,
  normalizePreferences,
  reminderSlotKey,
} from "./lib/deadlines.js";
import {
  fetchActivities,
  fetchNotificationPreferences,
} from "./lib/supabase.js";

let checkTimer = null;

const NOTIFICATION_ICON_URL = chrome.runtime.getURL("icon.png");

async function createAppNotification(id, { title, message }) {
  const withIcon = {
    type: "basic",
    title,
    message,
    priority: 2,
    iconUrl: NOTIFICATION_ICON_URL,
  };

  try {
    await chrome.notifications.create(id, withIcon);
    return;
  } catch (err) {
    const errorText = err instanceof Error ? err.message : String(err);
    if (!/image/i.test(errorText)) throw err;

    const { iconUrl: _icon, ...withoutIcon } = withIcon;
    await chrome.notifications.create(id, withoutIcon);
  }
}

function startChecking() {
  if (checkTimer) return;
  void checkDeadlines();
  checkTimer = setInterval(() => void checkDeadlines(), CHECK_INTERVAL_MS);
}

function setupAlarms() {
  chrome.alarms.create(CHECK_ALARM, { periodInMinutes: ALARM_WAKEUP_MINUTES });
}

chrome.runtime.onInstalled.addListener(() => {
  setupAlarms();
  startChecking();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
  startChecking();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== CHECK_ALARM) return;
  startChecking();
  void checkDeadlines();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "check-now") {
    startChecking();
    void checkDeadlines();
    return;
  }

  if (message?.type === "test-notification") {
    void sendTestNotification().then(sendResponse);
    return true;
  }
});

async function sendTestNotification() {
  const notificationId = `test-${Date.now()}`;

  try {
    await createAppNotification(notificationId, {
      title: "Teste — Dashboard Cronograma",
      message: "Se você viu isto, as notificações da extensão estão funcionando.",
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao criar notificação";
    console.error("[Dashboard] Teste de notificação falhou:", err);
    return { ok: false, error: message };
  }
}

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
    if (!isActivityPending(activity.status)) continue;

    const deadline = getDeadlineDate(activity);
    if (!deadline || deadline <= now) continue;

    const dueOffsets = getDueReminderOffsets(deadline, prefs.offsets, now);
    const offset = dueOffsets.find((item) => !nextNotified[reminderSlotKey(activity.id, item, deadline)]);
    if (!offset) continue;

    const timeLeft = formatTimeUntil(deadline, now);
    try {
      await createAppNotification(reminderSlotKey(activity.id, offset, deadline), {
        title: "Atividade ainda não finalizada",
        message: `${activity.atividade} — vence em ${timeLeft} (alerta ${formatOffsetLabel(offset)} antes)`,
      });
    } catch (err) {
      console.error("[Dashboard] Falha ao criar notificação:", err);
      continue;
    }

    for (const dueOffset of dueOffsets) {
      nextNotified[reminderSlotKey(activity.id, dueOffset, deadline)] = now.toISOString();
    }
  }

  await chrome.storage.local.set({ notified: nextNotified });
}
