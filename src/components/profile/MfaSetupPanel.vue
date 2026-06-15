<template>
  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <p v-if="loading" class="text-sm text-slate-500">Gerando QR code...</p>

    <div v-else-if="qr" class="flex flex-col items-center gap-4">
      <div class="rounded-lg border border-slate-200 bg-white p-3" v-html="qr" />
      <p v-if="secret" class="break-all text-center text-xs text-slate-500">
        Chave manual: <span class="font-mono text-slate-700">{{ secret }}</span>
      </p>
    </div>

    <form class="mt-4 space-y-4" @submit.prevent="handleVerify">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">
          Código do Bitwarden Authenticator
        </label>
        <input
          v-model="code"
          type="text"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          required
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-xl tracking-widest"
          placeholder="000000"
          @input="onCodeInput"
        />
      </div>

      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

      <button
        type="submit"
        :disabled="submitting || code.length !== 6"
        class="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {{ submitting ? "Verificando..." : "Ativar autenticador" }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { supabase } from "@/lib/supabase/client";

const emit = defineEmits<{
  configured: [];
}>();

const qr = ref<string | null>(null);
const secret = ref<string | null>(null);
const factorId = ref<string | null>(null);
const code = ref("");
const loading = ref(true);
const submitting = ref(false);
const error = ref<string | null>(null);

function onCodeInput(event: Event) {
  const target = event.target as HTMLInputElement;
  code.value = target.value.replace(/\D/g, "");
}

onMounted(async () => {
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const unverified = (factors?.totp ?? []).find((f) => f.status !== "verified");
  if (unverified) {
    await supabase.auth.mfa.unenroll({ factorId: unverified.id });
  }

  const { data, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Bitwarden Authenticator",
  });

  if (enrollError || !data) {
    error.value = enrollError?.message ?? "Não foi possível iniciar o MFA.";
    loading.value = false;
    return;
  }

  qr.value = data.totp.qr_code;
  secret.value = data.totp.secret;
  factorId.value = data.id;
  loading.value = false;
});

async function handleVerify() {
  if (!factorId.value) return;

  submitting.value = true;
  error.value = null;

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: factorId.value,
  });

  if (challengeError || !challenge) {
    error.value = challengeError?.message ?? "Falha ao verificar.";
    submitting.value = false;
    return;
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factorId.value,
    challengeId: challenge.id,
    code: code.value.trim(),
  });

  if (verifyError) {
    error.value = "Código inválido. Confira o Bitwarden Authenticator.";
    submitting.value = false;
    return;
  }

  emit("configured");
}
</script>
