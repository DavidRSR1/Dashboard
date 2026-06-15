import { supabase } from "@/lib/supabase/client";

export async function ensureProfile(userId: string): Promise<void> {
  await supabase.from("profiles").upsert({ id: userId }, { onConflict: "id" });
}

export async function getShareToken(userId: string): Promise<string | null> {
  await ensureProfile(userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("share_token")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data.share_token;
}

export function visitorUrl(shareToken: string): string {
  return `/visitante/${shareToken}`;
}
