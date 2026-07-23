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
      <SupportTeamPanel
        :agents="agents"
        :current-agent="currentAgent"
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
        Os registros ficam salvos neste navegador (localStorage). Cada membro do time tem uma cor
        fixa para identificar quem resolveu ou transferiu o chamado.
      </p>
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
import { computed, onMounted, ref } from "vue";
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
import SupportTeamPanel from "@/components/support-errors/SupportTeamPanel.vue";
import WeeklyErrorsSummary from "@/components/support-errors/WeeklyErrorsSummary.vue";

const userEmail = ref<string | null>(null);
const currentAgent = ref<SupportAgent | null>(null);
const errors = ref<SupportError[]>([]);
const agents = ref<SupportAgent[]>([]);
const selectedDateKey = ref<string | null>(null);
const modalOpen = ref(false);
const editing = ref<SupportError | null>(null);

const displayUser = computed(() =>
  userEmail.value ? emailLocalPart(userEmail.value) : null,
);

const weeklySummary = computed(() => buildWeeklySummary(errors.value));
const monthlySummary = computed(() => buildMonthlySummary(errors.value));
const selectedDayErrors = computed(() =>
  selectedDateKey.value ? errorsForDateKey(errors.value, selectedDateKey.value) : [],
);

function refresh() {
  errors.value = listSupportErrors();
  agents.value = listSupportAgents();
  if (userEmail.value) {
    currentAgent.value = ensureSupportAgentFromEmail(userEmail.value);
    agents.value = listSupportAgents();
  }
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

function handleSave(form: SupportErrorFormData) {
  if (editing.value) {
    updateSupportError(editing.value.id, form);
  } else {
    createSupportError(form);
  }
  refresh();
  closeModal();
}

function handleRemove(id: string) {
  if (!confirm("Excluir este registro de erro?")) return;
  deleteSupportError(id);
  refresh();
}

function handleAddAgent(payload: { emailOrUser: string; colorId?: SupportAgentColorId }) {
  createSupportAgent(payload.emailOrUser, payload.colorId);
  refresh();
}

function handleUpdateAgentColor(payload: { id: string; colorId: SupportAgentColorId }) {
  updateSupportAgentColor(payload.id, payload.colorId);
  refresh();
}

function handleRemoveAgent(id: string) {
  if (currentAgent.value && id === currentAgent.value.id) return;
  if (!confirm("Remover este agente do time? Os registros antigos perdem a cor vinculada.")) {
    return;
  }
  deleteSupportAgent(id);
  refresh();
}

onMounted(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  userEmail.value = user?.email ?? null;
  refresh();
});
</script>
