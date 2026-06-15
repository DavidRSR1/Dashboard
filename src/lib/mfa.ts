import type { SupabaseClient } from "@supabase/supabase-js";

export async function verifyTotpCode(
  supabase: SupabaseClient,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: factorsData, error: factorsError } =
    await supabase.auth.mfa.listFactors();

  if (factorsError) {
    return { ok: false, error: factorsError.message };
  }

  const totpFactor = factorsData.totp.find((f) => f.status === "verified");

  if (!totpFactor) {
    return {
      ok: false,
      error: "Nenhum autenticador TOTP configurado. Configure o Bitwarden primeiro.",
    };
  }

  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

  if (challengeError || !challengeData) {
    return {
      ok: false,
      error: challengeError?.message ?? "Falha ao iniciar verificação MFA.",
    };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challengeData.id,
    code: code.trim(),
  });

  if (verifyError) {
    return { ok: false, error: "Código inválido. Verifique o Bitwarden Authenticator." };
  }

  return { ok: true };
}

export async function hasVerifiedTotp(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.totp ?? []).some((f) => f.status === "verified");
}
