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
      <div
        class="inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
        role="tablist"
        aria-label="Seção de erros"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'incidentes'"
          class="rounded-md px-4 py-2 text-sm font-semibold transition"
          :class="
            activeTab === 'incidentes'
              ? 'bg-emerald-800 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          "
          @click="setTab('incidentes')"
        >
          Incidentes
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'glossario'"
          class="rounded-md px-4 py-2 text-sm font-semibold transition"
          :class="
            activeTab === 'glossario'
              ? 'bg-emerald-800 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          "
          @click="setTab('glossario')"
        >
          Glossário
        </button>
      </div>

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

      <template v-else-if="activeTab === 'incidentes'">
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
          :current-agent-id="currentAgent?.id ?? null"
          :all-errors="errors"
          @clear="selectedDateKey = null"
          @add="openCreateForSelectedDay"
          @edit="openEdit"
          @view="openView"
          @remove="handleRemove"
          @open-related="openRelatedIncident"
        />

        <ErrorListTable
          :errors="errors"
          :agents="agents"
          :current-agent-id="currentAgent?.id ?? null"
          @edit="openEdit"
          @view="openView"
          @remove="handleRemove"
          @open-related="openRelatedIncident"
        />
      </template>

      <template v-else>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <ErrorGlossaryPanel
            :errors="errors"
            :agents="agents"
            :highlight-id="highlightRelatedId"
            @use="useRelatedIncident"
            @view="openView"
          />
        </div>
      </template>
    </main>

    <ErrorFormModal
      :open="modalOpen"
      :initial="editing"
      :agents="agents"
      :known-errors="errors"
      :default-agent-id="currentAgent?.id ?? ''"
      :prefill-related-error-id="prefillRelatedErrorId"
      :prefill-date-key="prefillDateKey"
      :saving="saving"
      :readonly="modalReadonly"
      @close="closeModal"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import type { RealtimeChannel } from "@supabase/supabase-js";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabase/client";
import {
  canManageSupportError,
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
import ErrorGlossaryPanel from "@/components/support-errors/ErrorGlossaryPanel.vue";
import ErrorListTable from "@/components/support-errors/ErrorListTable.vue";

const route = useRoute();
const router = useRouter();
const userEmail = ref<string | null>(null);
const currentAgent = ref<SupportAgent | null>(null);
const errors = ref<SupportError[]>([]);
const agents = ref<SupportAgent[]>([]);
const selectedDateKey = ref<string | null>(null);
const modalOpen = ref(false);
const editing = ref<SupportError | null>(null);
const modalReadonly = ref(false);
const prefillRelatedErrorId = ref<string | null>(null);
const prefillDateKey = ref<string | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const saving = ref(false);
const highlightRelatedId = ref<string | null>(null);

type TabId = "incidentes" | "glossario";
const activeTab = ref<TabId>("incidentes");

let syncTimer: ReturnType<typeof setInterval> | null = null;
let channel: RealtimeChannel | null = null;

const displayUser = computed(() =>
  userEmail.value ? emailLocalPart(userEmail.value) : null,
);

const selectedDayErrors = computed(() =>
  selectedDateKey.value ? errorsForDateKey(errors.value, selectedDateKey.value) : [],
);

function tabFromQuery(value: unknown): TabId {
  return value === "glossario" ? "glossario" : "incidentes";
}

function setTab(tab: TabId) {
  activeTab.value = tab;
  const query = { ...route.query } as Record<string, string | string[] | undefined>;
  if (tab === "glossario") {
    query.tab = "glossario";
  } else {
    delete query.tab;
  }
  void router.replace({ query });
}

function openRelatedIncident(id: string) {
  highlightRelatedId.value = id;
  setTab("glossario");
}

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
  modalReadonly.value = false;
  prefillRelatedErrorId.value = null;
  prefillDateKey.value = null;
  modalOpen.value = true;
}

function openCreateForSelectedDay() {
  editing.value = null;
  modalReadonly.value = false;
  prefillRelatedErrorId.value = null;
  prefillDateKey.value = selectedDateKey.value;
  modalOpen.value = true;
}

function openEdit(error: SupportError) {
  if (!canManageSupportError(error, currentAgent.value?.id)) {
    openView(error);
    return;
  }
  editing.value = error;
  modalReadonly.value = false;
  prefillRelatedErrorId.value = null;
  prefillDateKey.value = null;
  modalOpen.value = true;
}

function openView(error: SupportError) {
  editing.value = error;
  modalReadonly.value = true;
  prefillRelatedErrorId.value = null;
  prefillDateKey.value = null;
  modalOpen.value = true;
}

function closeModal() {
  if (saving.value) return;
  modalOpen.value = false;
  editing.value = null;
  modalReadonly.value = false;
  prefillRelatedErrorId.value = null;
  prefillDateKey.value = null;
}

function useRelatedIncident(source: SupportError) {
  editing.value = null;
  modalReadonly.value = false;
  prefillRelatedErrorId.value = source.id;
  prefillDateKey.value = selectedDateKey.value;
  setTab("incidentes");
  modalOpen.value = true;
}

async function handleSave(form: SupportErrorFormData) {
  if (saving.value || modalReadonly.value) return;
  saving.value = true;

  try {
    const editingId = editing.value?.id ?? null;
    if (editingId && editing.value && !canManageSupportError(editing.value, currentAgent.value?.id)) {
      alert("Somente quem registrou este erro pode editá-lo.");
      return;
    }

    const result = editingId
      ? await updateSupportError(editingId, form)
      : await createSupportError(form, { createdById: currentAgent.value?.id ?? null });

    if (result.error) {
      alert(result.error);
      return;
    }

    modalOpen.value = false;
    editing.value = null;
    modalReadonly.value = false;
    prefillRelatedErrorId.value = null;
    prefillDateKey.value = null;
    await refresh();
  } finally {
    saving.value = false;
  }
}

async function handleRemove(id: string) {
  if (saving.value) return;
  const target = errors.value.find((item) => item.id === id);
  if (target && !canManageSupportError(target, currentAgent.value?.id)) {
    alert("Somente quem registrou este erro pode excluí-lo.");
    return;
  }
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
    .subscribe();
}

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = tabFromQuery(tab);
  },
);

onMounted(async () => {
  activeTab.value = tabFromQuery(route.query.tab);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  userEmail.value = user?.email ?? null;
  await refresh(true);

  const dia = route.query.dia;
  if (typeof dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    selectedDateKey.value = dia;
  }

  const relatedId = route.query.glossario ?? route.query.relacionado;
  if (typeof relatedId === "string" && relatedId) {
    highlightRelatedId.value = relatedId;
    activeTab.value = "glossario";
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
