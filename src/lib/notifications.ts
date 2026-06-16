import { supabase } from "@/lib/supabase/client";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizePreferences,
  type NotificationPreferences,
} from "@/types/notifications";

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", userId)
    .single();

  if (error || !data) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return normalizePreferences(data.notification_preferences);
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: preferences })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
