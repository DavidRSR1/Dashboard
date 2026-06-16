export const SUPABASE_URL = "https://czvoxwrttitvczonsdkg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_8aUNXUHyhdTFNIJBSUdmxA_upjDAno6";

export const DEFAULT_PREFERENCES = {
  enabled: true,
  offsets: [
    { value: 1, unit: "days" },
    { value: 2, unit: "hours" },
    { value: 30, unit: "minutes" },
  ],
};

export const CHECK_ALARM = "check-deadlines";
export const CHECK_INTERVAL_MS = 30_000;
export const REMINDER_WINDOW_MS = 30_000;
/** Alarme de 1 min para reativar o service worker quando o navegador o suspender */
export const ALARM_WAKEUP_MINUTES = 1;
