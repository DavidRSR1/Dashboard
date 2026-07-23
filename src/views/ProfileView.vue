<template>
  <div class="min-h-screen bg-slate-100">
    <header class="border-b border-emerald-900 bg-emerald-800 text-white shadow-md">
      <div class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div>
          <h1 class="text-xl font-bold">Meu perfil</h1>
          <p class="text-sm text-emerald-100">{{ userEmail ?? "Carregando..." }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <RouterLink
            v-if="canSeeSupportErrors"
            to="/erros"
            class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Erros N1
          </RouterLink>
          <RouterLink
            to="/"
            class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Voltar ao cronograma
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-4xl space-y-6 px-4 py-6">
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

      <template v-if="canSeeSupportErrors">
        <SupportAccessPanel
          v-if="isSupportMasterUser"
          :master-email="userEmail"
        />

        <SupportTeamPanel
          :agents="supportAgents"
          :current-agent="currentSupportAgent"
          :is-master="isSupportMasterUser"
          @add="handleAddSupportAgent"
          @update-color="handleUpdateSupportAgentColor"
          @remove="handleRemoveSupportAgent"
        />

        <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900">Catálogo de erros</h2>
          <p class="mt-1 text-sm text-slate-600">
            Abra a página compartilhada para registrar, analisar e acompanhar incidentes do time.
          </p>
          <RouterLink
            to="/erros"
            class="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Abrir catálogo de erros
          </RouterLink>
        </section>
      </template>

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
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase/client";
import { hasVerifiedTotp } from "@/lib/mfa";
import { getShareToken, visitorUrl } from "@/lib/profile";
import { isSupportMaster } from "@/lib/supportAccess";
import {
  createSupportAgent,
  deleteSupportAgent,
  emailLocalPart,
  ensureSupportAgentFromEmail,
  listSupportAgents,
  updateSupportAgentColor,
} from "@/lib/supportTeam";
import type { SupportAgent, SupportAgentColorId } from "@/types/supportErrors";
import MfaSetupPanel from "@/components/profile/MfaSetupPanel.vue";
import NotificationPreferencesPanel from "@/components/profile/NotificationPreferencesPanel.vue";
import ExtensionInstallPanel from "@/components/profile/ExtensionInstallPanel.vue";
import SupportAccessPanel from "@/components/support-errors/SupportAccessPanel.vue";
import SupportTeamPanel from "@/components/support-errors/SupportTeamPanel.vue";
import { useSupportAccess } from "@/composables/useSupportAccess";

const router = useRouter();
const { allowed: canSeeSupportErrors, refresh: refreshSupportAccess } = useSupportAccess();
const userEmail = ref<string | null>(null);
const mfaConfigured = ref(false);
const gestorLink = ref<string | null>(null);
const copied = ref(false);
const supportAgents = ref<SupportAgent[]>([]);
const currentSupportAgent = ref<SupportAgent | null>(null);

const isSupportMasterUser = computed(() => isSupportMaster(userEmail.value));

async function checkMfaStatus() {
  mfaConfigured.value = await hasVerifiedTotp(supabase);
}

async function refreshSupportTeam() {
  if (!userEmail.value || !canSeeSupportErrors.value) return;

  const ensured = await ensureSupportAgentFromEmail(userEmail.value);
  currentSupportAgent.value = ensured.data;

  const listed = await listSupportAgents();
  supportAgents.value = listed.data;
  if (userEmail.value) {
    const id = `agent_${emailLocalPart(userEmail.value)}`;
    currentSupportAgent.value =
      listed.data.find((agent) => agent.id === id) ?? currentSupportAgent.value;
  }
}

async function handleAddSupportAgent(payload: {
  emailOrUser: string;
  colorId?: SupportAgentColorId;
}) {
  if (!isSupportMasterUser.value) return;
  const result = await createSupportAgent(payload.emailOrUser, payload.colorId);
  if (result.error) {
    alert(result.error);
    return;
  }
  await refreshSupportTeam();
}

async function handleUpdateSupportAgentColor(payload: {
  id: string;
  colorId: SupportAgentColorId;
}) {
  const canEdit =
    isSupportMasterUser.value ||
    (currentSupportAgent.value && currentSupportAgent.value.id === payload.id);
  if (!canEdit) return;

  const result = await updateSupportAgentColor(payload.id, payload.colorId);
  if (result.error) {
    alert(result.error);
    return;
  }
  await refreshSupportTeam();
}

async function handleRemoveSupportAgent(id: string) {
  if (!isSupportMasterUser.value) return;
  if (currentSupportAgent.value && id === currentSupportAgent.value.id) return;
  if (!confirm("Remover este agente do time?")) return;
  const result = await deleteSupportAgent(id);
  if (result.error) {
    alert(result.error);
    return;
  }
  await refreshSupportTeam();
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
  await refreshSupportAccess();
  await refreshSupportTeam();
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
