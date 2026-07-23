import { supabase } from "@/lib/supabase/client";

export const SUPPORT_MASTER_EMAIL = "david.oliveira@redesaoroque.com.br";

const SQL_HINT =
  "Aplique o arquivo supabase/support_access.sql no SQL Editor do Supabase para liberar o acesso do time.";

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isSupportMaster(email: string | null | undefined): boolean {
  return normalizeEmail(email) === SUPPORT_MASTER_EMAIL;
}

export async function listSupportAccessEmails(): Promise<{
  emails: string[];
  error: string | null;
}> {
  const { data, error } = await supabase.from("support_access").select("email").order("email");

  if (error) {
    return { emails: [], error: `${error.message}. ${SQL_HINT}` };
  }

  const emails = (data ?? [])
    .map((row) => normalizeEmail((row as { email: string }).email))
    .filter(Boolean);

  return { emails, error: null };
}

export async function canAccessSupportErrors(
  email: string | null | undefined,
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (isSupportMaster(normalized)) return true;

  const { emails, error } = await listSupportAccessEmails();
  if (error) return false;
  return emails.includes(normalized);
}

export async function grantSupportAccess(
  email: string,
  grantedBy: string | null | undefined,
): Promise<{ ok: boolean; error: string | null }> {
  if (!isSupportMaster(grantedBy)) {
    return { ok: false, error: "Apenas o usuário master pode gerenciar o acesso." };
  }

  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, error: "Informe um e-mail válido." };
  }

  if (isSupportMaster(normalized)) {
    return { ok: true, error: null };
  }

  const { error } = await supabase.from("support_access").upsert(
    {
      email: normalized,
      created_by: normalizeEmail(grantedBy),
    },
    { onConflict: "email" },
  );

  if (error) {
    return { ok: false, error: `${error.message}. ${SQL_HINT}` };
  }

  return { ok: true, error: null };
}

export async function revokeSupportAccess(
  email: string,
  revokedBy: string | null | undefined,
): Promise<{ ok: boolean; error: string | null }> {
  if (!isSupportMaster(revokedBy)) {
    return { ok: false, error: "Apenas o usuário master pode gerenciar o acesso." };
  }

  const normalized = normalizeEmail(email);
  if (isSupportMaster(normalized)) {
    return { ok: false, error: "Não é possível remover o usuário master." };
  }

  const { error } = await supabase.from("support_access").delete().eq("email", normalized);

  if (error) {
    return { ok: false, error: `${error.message}. ${SQL_HINT}` };
  }

  return { ok: true, error: null };
}
