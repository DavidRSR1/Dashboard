import { DEFAULT_PREFERENCES } from "./config.js";
import { normalizePreferences } from "./lib/deadlines.js";
import {
  fetchNotificationPreferences,
  saveNotificationPreferences,
  signIn,
} from "./lib/supabase.js";

const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginStatus = document.getElementById("login-status");
const loginSection = document.getElementById("login-section");
const prefsSection = document.getElementById("prefs-section");
const enabledEl = document.getElementById("enabled");
const offsetsEl = document.getElementById("offsets");
const addOffsetBtn = document.getElementById("add-offset");
const savePrefsBtn = document.getElementById("save-prefs");
const prefsStatus = document.getElementById("prefs-status");
const testNotifyBtn = document.getElementById("test-notify-btn");
const testStatus = document.getElementById("test-status");

let session = null;
let offsets = [...DEFAULT_PREFERENCES.offsets];

function triggerBackgroundCheck() {
  chrome.runtime.sendMessage({ type: "check-now" }).catch(() => {
    // Service worker pode estar iniciando; ignorar erro transitório.
  });
}

function renderOffsets() {
  offsetsEl.innerHTML = "";
  offsets.forEach((offset, index) => {
    const row = document.createElement("div");
    row.className = "offset-row";
    row.innerHTML = `
      <input type="number" min="1" value="${offset.value}" data-index="${index}" data-field="value" />
      <select data-index="${index}" data-field="unit">
        <option value="minutes" ${offset.unit === "minutes" ? "selected" : ""}>minuto(s) antes</option>
        <option value="hours" ${offset.unit === "hours" ? "selected" : ""}>hora(s) antes</option>
        <option value="days" ${offset.unit === "days" ? "selected" : ""}>dia(s) antes</option>
      </select>
      <button type="button" data-remove="${index}">×</button>
    `;
    offsetsEl.appendChild(row);
  });

  offsetsEl.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("change", () => {
      const index = Number(el.dataset.index);
      if (el.dataset.field === "value") offsets[index].value = Number(el.value);
      else offsets[index].unit = el.value;
    });
  });

  offsetsEl.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      offsets.splice(Number(btn.dataset.remove), 1);
      renderOffsets();
    });
  });
}

async function loadSession() {
  const stored = await chrome.storage.local.get("session");
  session = stored.session ?? null;

  if (session) {
    loginSection.querySelector("label").hidden = true;
    passwordEl.parentElement.hidden = true;
    loginBtn.hidden = true;
    logoutBtn.hidden = false;
    loginStatus.textContent = `Conectado: ${session.user.email}`;
    prefsSection.hidden = false;

    const raw = await fetchNotificationPreferences(session.access_token, session.user.id);
    const prefs = normalizePreferences(raw);
    if (prefs) {
      enabledEl.checked = prefs.enabled;
      offsets = prefs.offsets ?? [...DEFAULT_PREFERENCES.offsets];
    }
    renderOffsets();
    triggerBackgroundCheck();
  }
}

loginBtn.addEventListener("click", async () => {
  loginStatus.textContent = "Entrando...";
  try {
    const data = await signIn(emailEl.value, passwordEl.value);
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    };
    await chrome.storage.local.set({ session, notified: {} });
    loginStatus.textContent = "Login realizado. Histórico de alertas zerado.";
    await loadSession();
    triggerBackgroundCheck();
  } catch (err) {
    loginStatus.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", async () => {
  session = null;
  await chrome.storage.local.remove(["session", "notified"]);
  location.reload();
});

addOffsetBtn.addEventListener("click", () => {
  offsets.push({ value: 1, unit: "hours" });
  renderOffsets();
});

savePrefsBtn.addEventListener("click", async () => {
  if (!session) return;
  prefsStatus.textContent = "Salvando...";
  try {
    await saveNotificationPreferences(session.access_token, session.user.id, {
      enabled: enabledEl.checked,
      offsets: offsets.filter((o) => o.value > 0),
    });
    prefsStatus.textContent = "Salvo e sincronizado com o site.";
    triggerBackgroundCheck();
  } catch (err) {
    prefsStatus.textContent = err.message;
  }
});

testNotifyBtn.addEventListener("click", async () => {
  testStatus.textContent = "Enviando notificação de teste...";
  testStatus.className = "status";

  try {
    const response = await chrome.runtime.sendMessage({ type: "test-notification" });

    if (response?.ok) {
      testStatus.textContent =
        "Notificação enviada. Verifique o canto da tela (ou a central de notificações do Windows).";
      return;
    }

    testStatus.textContent = response?.error ?? "Não foi possível enviar a notificação de teste.";
    testStatus.className = "status error";
  } catch {
    testStatus.textContent =
      "Extensão indisponível. Recarregue em chrome://extensions e tente novamente.";
    testStatus.className = "status error";
  }
});

void loadSession();
