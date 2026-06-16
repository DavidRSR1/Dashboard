import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config.js";

const headers = (token) => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

export async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Falha no login");
  return data;
}

export async function fetchActivities(accessToken) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cronograma_atividades?select=*&order=data_back_banco.asc`,
    { headers: headers(accessToken) },
  );
  if (!res.ok) throw new Error("Falha ao buscar atividades");
  return res.json();
}

export async function fetchNotificationPreferences(accessToken, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=notification_preferences&id=eq.${userId}`,
    { headers: headers(accessToken) },
  );
  if (!res.ok) throw new Error("Falha ao buscar preferências");
  const rows = await res.json();
  return rows[0]?.notification_preferences ?? null;
}

export async function saveNotificationPreferences(accessToken, userId, preferences) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...headers(accessToken), Prefer: "return=minimal" },
    body: JSON.stringify({ notification_preferences: preferences }),
  });
  if (!res.ok) throw new Error("Falha ao salvar preferências");
}
