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
        <span class="mt-2 block text-xs text-red-600">
          No Supabase → SQL Editor, execute o arquivo
          <code class="rounded bg-red-100 px-1">supabase/support_errors_shared.sql</code>
          (inteiro). Depois recarregue a página.
        </span>
      </p>

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span>
            Dados compartilhados · {{ errors.length }} erro(s) · sync
            {{ realtimeOk ? "ao vivo" : "a cada 30s" }}
          </span>
          <button
            type="button"
            class="font-medium underline hover:no-underline"
            @click="refresh(false)"
          >
            Atualizar agora
          </button>
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
      </template>
    </main>

    <ErrorFormModal
      :open="modalOpen"
      :initial="editing"
      :agents="agents"
      :default-agent-id="currentAgent?.id ?? ''"
      :saving="saving"
      @close="closeModal"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import type { RealtimeChannel } from "@supabase/supabase-js";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabase/client";
import {
  createSupportError,
  deleteSupportError,
  errorsForDateKey,
  listSupportErrors,
  updateSupportError,
} from "@/lib/supportErrors";
import {
  emailLocalPart,
  ensureSupportAgentFromEmail,
  listSupportAgents,
} from "@/lib/supportTeam";
import { SYNC_INTERVAL_MS } from "@/lib/syncInterval";
import type {
  SupportAgent,
  SupportError,
  SupportErrorFormData,
} from "@/types/supportErrors";
import ErrorCalendar from "@/components/support-errors/ErrorCalendar.vue";
import ErrorDayDetail from "@/components/support-errors/ErrorDayDetail.vue";
import ErrorFormModal from "@/components/support-errors/ErrorFormModal.vue";
import ErrorListTable from "@/components/support-errors/ErrorListTable.vue";

const route = useRoute();
const userEmail = ref<string | null>(null);
const currentAgent = ref<SupportAgent | null>(null);
const errors = ref<SupportError[]>([]);
const agents = ref<SupportAgent[]>([]);
const selectedDateKey = ref<string | null>(null);
const modalOpen = ref(false);
const editing = ref<SupportError | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const realtimeOk = ref(false);
const saving = ref(false);

let syncTimer: ReturnType<typeof setInterval> | null = null;
let channel: RealtimeChannel | null = null;

const displayUser = computed(() =>
  userEmail.value ? emailLocalPart(userEmail.value) : null,
);

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
  if (saving.value) return;
  modalOpen.value = false;
  editing.value = null;
}

async function handleSave(form: SupportErrorFormData) {
  if (saving.value) return;
  saving.value = true;

  try {
    const editingId = editing.value?.id ?? null;
    const result = editingId
      ? await updateSupportError(editingId, form)
      : await createSupportError(form);

    if (result.error) {
      alert(result.error);
      return;
    }

    modalOpen.value = false;
    editing.value = null;
    await refresh();
  } finally {
    saving.value = false;
  }
}

async function handleRemove(id: string) {
  if (saving.value) return;
  if (!confirm("Excluir este registro de erro?")) return;
  saving.value = true;
  try {
    const result = await deleteSupportError(id);
    if (result.error) {
      alert(result.error);
      return;
    }
    await refresh();
  } finally {
    saving.value = false;
  }
}

function subscribeRealtime() {
  channel = supabase
    .channel("support-errors-shared")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "support_errors" },
      () => {
        void refresh(false);
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "support_agents" },
      () => {
        void refresh(false);
      },
    )
    .subscribe((status) => {
      realtimeOk.value = status === "SUBSCRIBED";
    });
}

onMounted(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  userEmail.value = user?.email ?? null;
  await refresh(true);

  const dia = route.query.dia;
  if (typeof dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    selectedDateKey.value = dia;
  }

  subscribeRealtime();
  syncTimer = setInterval(() => {
    void refresh(false);
  }, SYNC_INTERVAL_MS);
});

onUnmounted(() => {
  if (syncTimer) clearInterval(syncTimer);
  if (channel) {
    void supabase.removeChannel(channel);
  }
});
</script>
