import { DEFAULT_PREFERENCES } from "./config.js";
import { formatTimeUntil, getDeadlineDate, isActivityPending, normalizePreferences } from "./lib/deadlines.js";
import { fetchActivities, fetchNotificationPreferences } from "./lib/supabase.js";

const content = document.getElementById("content");

async function init() {
  const { session } = await chrome.storage.local.get("session");
  if (!session) {
    content.innerHTML =
      '<p class="muted">Faça login em <strong>Opções</strong> para ver atividades pendentes.</p>';
    return;
  }

  try {
    const [activities, rawPrefs] = await Promise.all([
      fetchActivities(session.access_token),
      fetchNotificationPreferences(session.access_token, session.user.id),
    ]);

    const prefs = normalizePreferences(rawPrefs) ?? DEFAULT_PREFERENCES;
    const now = new Date();

    const pending = activities
      .filter((a) => isActivityPending(a.status) && a.data_front)
      .map((a) => ({ a, deadline: getDeadlineDate(a) }))
      .filter(({ deadline }) => deadline && deadline > now)
      .sort((x, y) => x.deadline - y.deadline)
      .slice(0, 8);

    if (pending.length === 0) {
      content.innerHTML = "<p class=\"muted\">Nenhuma atividade com prazo pendente.</p>";
      return;
    }

    content.innerHTML = pending
      .map(
        ({ a, deadline }) => `
        <div class="item">
          <strong>${a.atividade}</strong>
          <span class="muted">Prazo em ${formatTimeUntil(deadline)}</span>
        </div>`,
      )
      .join("");

    if (!prefs.enabled) {
      content.innerHTML +=
        '<p class="muted">Lembretes desativados nas preferências.</p>';
    }
  } catch (err) {
    content.textContent = err.message;
  }
}

void init();
