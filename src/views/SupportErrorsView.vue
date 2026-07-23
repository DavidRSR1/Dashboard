<template>
  <div class="min-h-screen bg-slate-100">
    <header class="border-b border-emerald-900 bg-emerald-800 text-white shadow-md">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div>
          <h1 class="text-xl font-bold">Suporte N1 — Erros</h1>
          <p class="text-sm text-emerald-100">
            {{ displayUser ? displayUser : "Carregando..." }} — catalogação e análise de incidentes
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <RouterLink
            to="/"
            class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Cronograma
          </RouterLink>
          <RouterLink
            to="/relatorio"
            class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Relatório
          </RouterLink>
          <RouterLink
            to="/perfil"
            class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Perfil
          </RouterLink>
          <button
            class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            @click="openCreate"
          >
            + Registrar erro
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <p v-if="loading" class="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500 shadow-sm">
        Carregando dados compartilhados...
      </p>
      <p v-else-if="loadError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 shadow-sm">
        {{ loadError }}
        <span class="mt-1 block text-xs text-red-600">
          Aplique o SQL em supabase/support_errors_shared.sql no Supabase.
        </span>
      </p>

      <template v-else>
        <SupportAccessPanel
          v-if="isMaster"
          :master-email="userEmail"
        />

        <SupportTeamPanel
          :agents="agents"
          :current-agent="currentAgent"
          :is-master="isMaster"
          @add="handleAddAgent"
          @update-color="handleUpdateAgentColor"
          @remove="handleRemoveAgent"
        />

        <div class="grid gap-4 lg:grid-cols-2">
          <WeeklyErrorsSummary :summary="weeklySummary" />
          <MonthlyErrorsSummary :summary="monthlySummary" @select-day="selectDay" />
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 class="mb-4 text-sm font-semibold text-slate-900">Calendário de incidentes</h2>
          <ErrorCalendar
            :errors="errors"
            :selected-date-key="selectedDateKey"
            @select-day="selectDay"
          />
        </div>

        <ErrorDayDetail
          v-if="selectedDateKey"
          :date-key="selectedDateKey"
          :errors="selectedDayErrors"
          :agents="agents"
          @clear="selectedDateKey = null"
          @edit="openEdit"
          @remove="handleRemove"
        />

        <ErrorListTable
          :errors="errors"
          :agents="agents"
          @edit="openEdit"
          @remove="handleRemove"
        />

        <p class="text-xs text-slate-500">
          Os registros são compartilhados com todo o time (Supabase). Atualização automática a cada
          30s.
        </p>
      </template>
    </main>

    <ErrorFormModal
      :open="modalOpen"
      :initial="editing"
      :agents="agents"
      :default-agent-id="currentAgent?.id ?? ''"
      @close="closeModal"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { supabase } from "@/lib/supabase/client";
import {
  buildMonthlySummary,
  buildWeeklySummary,
  createSupportError,
  deleteSupportError,
  errorsForDateKey,
  listSupportErrors,
  updateSupportError,
} from "@/lib/supportErrors";
import {
  createSupportAgent,
  deleteSupportAgent,
  emailLocalPart,
  ensureSupportAgentFromEmail,
  listSupportAgents,
  updateSupportAgentColor,
} from "@/lib/supportTeam";
import { isSupportMaster } from "@/lib/supportAccess";
import { SYNC_INTERVAL_MS } from "@/lib/syncInterval";
import type {
  SupportAgent,
  SupportAgentColorId,
  SupportError,
  SupportErrorFormData,
} from "@/types/supportErrors";
import ErrorCalendar from "@/components/support-errors/ErrorCalendar.vue";
import ErrorDayDetail from "@/components/support-errors/ErrorDayDetail.vue";
import ErrorFormModal from "@/components/support-errors/ErrorFormModal.vue";
import ErrorListTable from "@/components/support-errors/ErrorListTable.vue";
import MonthlyErrorsSummary from "@/components/support-errors/MonthlyErrorsSummary.vue";
import SupportAccessPanel from "@/components/support-errors/SupportAccessPanel.vue";
import SupportTeamPanel from "@/components/support-errors/SupportTeamPanel.vue";
import WeeklyErrorsSummary from "@/components/support-errors/WeeklyErrorsSummary.vue";

const userEmail = ref<string | null>(null);
const currentAgent = ref<SupportAgent | null>(null);
const errors = ref<SupportError[]>([]);
const agents = ref<SupportAgent[]>([]);
const selectedDateKey = ref<string | null>(null);
const modalOpen = ref(false);
const editing = ref<SupportError | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);

let syncTimer: ReturnType<typeof setInterval> | null = null;

const displayUser = computed(() =>
  userEmail.value ? emailLocalPart(userEmail.value) : null,
);
const isMaster = computed(() => isSupportMaster(userEmail.value));

const weeklySummary = computed(() => buildWeeklySummary(errors.value));
const monthlySummary = computed(() => buildMonthlySummary(errors.value));
const selectedDayErrors = computed(() =>
  selectedDateKey.value ? errorsForDateKey(errors.value, selectedDateKey.value) : [],
);

async function refresh(showLoading = false) {
  if (showLoading) loading.value = true;

  if (userEmail.value) {
    const ensured = await ensureSupportAgentFromEmail(userEmail.value);
    if (ensured.error && !ensured.data) {
      loadError.value = ensured.error;
      loading.value = false;
      return;
    }
    currentAgent.value = ensured.data;
  }

  const [errorsRes, agentsRes] = await Promise.all([
    listSupportErrors(),
    listSupportAgents(),
  ]);

  if (errorsRes.error || agentsRes.error) {
    loadError.value = errorsRes.error ?? agentsRes.error;
    loading.value = false;
    return;
  }

  loadError.value = null;
  errors.value = errorsRes.data;
  agents.value = agentsRes.data;
  if (userEmail.value) {
    const id = `agent_${emailLocalPart(userEmail.value)}`;
    currentAgent.value = agentsRes.data.find((agent) => agent.id === id) ?? currentAgent.value;
  }
  loading.value = false;
}

function selectDay(dateKey: string) {
  selectedDateKey.value = dateKey;
}

function openCreate() {
  editing.value = null;
  modalOpen.value = true;
}

function openEdit(error: SupportError) {
  editing.value = error;
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
  editing.value = null;
}

async function handleSave(form: SupportErrorFormData) {
  const result = editing.value
    ? await updateSupportError(editing.value.id, form)
    : await createSupportError(form);

  if (result.error) {
    alert(result.error);
    return;
  }

  await refresh();
  closeModal();
}

async function handleRemove(id: string) {
  if (!confirm("Excluir este registro de erro?")) return;
  const result = await deleteSupportError(id);
  if (result.error) {
    alert(result.error);
    return;
  }
  await refresh();
}

async function handleAddAgent(payload: { emailOrUser: string; colorId?: SupportAgentColorId }) {
  if (!isMaster.value) return;
  const result = await createSupportAgent(payload.emailOrUser, payload.colorId);
  if (result.error) {
    alert(result.error);
    return;
  }
  await refresh();
}

async function handleUpdateAgentColor(payload: { id: string; colorId: SupportAgentColorId }) {
  const canEdit =
    isMaster.value || (currentAgent.value && currentAgent.value.id === payload.id);
  if (!canEdit) return;

  const result = await updateSupportAgentColor(payload.id, payload.colorId);
  if (result.error) {
    alert(result.error);
    return;
  }
  await refresh();
}

async function handleRemoveAgent(id: string) {
  if (!isMaster.value) return;
  if (currentAgent.value && id === currentAgent.value.id) return;
  if (!confirm("Remover este agente do time?")) return;
  const result = await deleteSupportAgent(id);
  if (result.error) {
    alert(result.error);
    return;
  }
  await refresh();
}

onMounted(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  userEmail.value = user?.email ?? null;
  await refresh(true);
  syncTimer = setInterval(() => {
    void refresh(false);
  }, SYNC_INTERVAL_MS);
});

onUnmounted(() => {
  if (syncTimer) clearInterval(syncTimer);
});
</script>
