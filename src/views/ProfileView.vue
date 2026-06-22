<template>
  <div class="min-h-screen bg-slate-100">
    <header class="border-b border-emerald-900 bg-emerald-800 text-white shadow-md">
      <div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <div>
          <h1 class="text-xl font-bold">Meu perfil</h1>
          <p class="text-sm text-emerald-100">{{ userEmail ?? "Carregando..." }}</p>
        </div>
        <RouterLink
          to="/"
          class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
        >
          Voltar ao cronograma
        </RouterLink>
      </div>
    </header>

    <main class="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Conta</h2>
        <dl class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-slate-500">E-mail</dt>
            <dd class="font-medium text-slate-900">{{ userEmail }}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Link do gestor</h2>
        <p class="mt-1 text-sm text-slate-600">
          Compartilhe este link para o gestor ver apenas o seu cronograma (somente leitura).
        </p>
        <div v-if="gestorLink" class="mt-4 flex flex-wrap gap-2">
          <input
            :value="gestorLink"
            readonly
            class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
          <button
            class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            @click="copyLink"
          >
            {{ copied ? "Copiado!" : "Copiar" }}
          </button>
        </div>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Relatório semanal</h2>
        <p class="mt-1 text-sm text-slate-600">
          Gere o resumo para o gestor toda sexta-feira às 10h e acompanhe seu histórico de
          entregas.
        </p>
        <RouterLink
          to="/relatorio"
          class="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Abrir relatório
        </RouterLink>
      </section>

      <NotificationPreferencesPanel />

      <ExtensionInstallPanel />

      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Bitwarden Authenticator</h2>
        <p class="mt-1 text-sm text-slate-600">
          Configure ou gerencie a autenticação em duas etapas da sua conta. Não é exigida para
          editar o cronograma.
        </p>

        <div
          v-if="mfaConfigured"
          class="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span class="h-2 w-2 rounded-full bg-emerald-500" />
          Autenticador ativo
        </div>

        <MfaSetupPanel v-else class="mt-4" @configured="checkMfaStatus" />
      </section>

      <button
        class="w-full rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
        @click="handleLogout"
      >
        Sair da conta
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase/client";
import { hasVerifiedTotp } from "@/lib/mfa";
import { getShareToken, visitorUrl } from "@/lib/profile";
import MfaSetupPanel from "@/components/profile/MfaSetupPanel.vue";
import NotificationPreferencesPanel from "@/components/profile/NotificationPreferencesPanel.vue";
import ExtensionInstallPanel from "@/components/profile/ExtensionInstallPanel.vue";

const router = useRouter();
const userEmail = ref<string | null>(null);
const mfaConfigured = ref(false);
const gestorLink = ref<string | null>(null);
const copied = ref(false);

async function checkMfaStatus() {
  mfaConfigured.value = await hasVerifiedTotp(supabase);
}

onMounted(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  userEmail.value = user?.email ?? null;

  if (user) {
    const token = await getShareToken(user.id);
    if (token) {
      gestorLink.value = `${window.location.origin}${visitorUrl(token)}`;
    }
  }

  await checkMfaStatus();
});

async function copyLink() {
  if (!gestorLink.value) return;
  await navigator.clipboard.writeText(gestorLink.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

async function handleLogout() {
  await supabase.auth.signOut();
  router.push("/login");
}
</script>
