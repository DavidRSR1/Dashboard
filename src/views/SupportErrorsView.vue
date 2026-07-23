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
            v-if="activeTab === 'incidentes'"
            class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            @click="openCreate"
          >
            + Registrar erro
          </button>
          <button
            v-else
            class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            @click="openGlossaryCreate"
          >
            + Nova entrada
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
          :glossary="glossary"
          @clear="selectedDateKey = null"
          @add="openCreateForSelectedDay"
          @edit="openEdit"
          @view="openView"
          @remove="handleRemove"
          @open-glossary="openGlossaryEntry"
        />

        <ErrorListTable
          :errors="errors"
          :agents="agents"
          :current-agent-id="currentAgent?.id ?? null"
          :glossary="glossary"
          @edit="openEdit"
          @view="openView"
          @remove="handleRemove"
          @open-glossary="openGlossaryEntry"
        />
      </template>

      <template v-else>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <ErrorGlossaryPanel
            :entries="glossary"
            :highlight-id="highlightGlossaryId"
            @create="openGlossaryCreate"
            @edit="openGlossaryEdit"
            @remove="handleGlossaryRemove"
            @use="useGlossaryEntry"
          />
        </div>
      </template>
    </main>

    <ErrorFormModal
      :open="modalOpen"
      :initial="editing"
      :agents="agents"
      :glossary="glossary"
      :default-agent-id="currentAgent?.id ?? ''"
      :prefill-glossary-id="prefillGlossaryId"
      :prefill-date-key="prefillDateKey"
      :saving="saving"
      :readonly="modalReadonly"
      @close="closeModal"
      @save="handleSave"
    />

    <GlossaryEntryFormModal
      :open="glossaryModalOpen"
      :initial="editingGlossary"
      :saving="glossarySaving"
      @close="closeGlossaryModal"
      @save="handleGlossarySave"
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
  createSupportGlossaryEntry,
  deleteSupportGlossaryEntry,
  listSupportGlossary,
  updateSupportGlossaryEntry,
} from "@/lib/supportGlossary";
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
  SupportGlossaryEntry,
  SupportGlossaryFormData,
} from "@/types/supportErrors";
import ErrorCalendar from "@/components/support-errors/ErrorCalendar.vue";
import ErrorDayDetail from "@/components/support-errors/ErrorDayDetail.vue";
import ErrorFormModal from "@/components/support-errors/ErrorFormModal.vue";
import ErrorGlossaryPanel from "@/components/support-errors/ErrorGlossaryPanel.vue";
import ErrorListTable from "@/components/support-errors/ErrorListTable.vue";
import GlossaryEntryFormModal from "@/components/support-errors/GlossaryEntryFormModal.vue";

const route = useRoute();
const router = useRouter();
const userEmail = ref<string | null>(null);
const currentAgent = ref<SupportAgent | null>(null);
const errors = ref<SupportError[]>([]);
const agents = ref<SupportAgent[]>([]);
const glossary = ref<SupportGlossaryEntry[]>([]);
const selectedDateKey = ref<string | null>(null);
const modalOpen = ref(false);
const editing = ref<SupportError | null>(null);
const modalReadonly = ref(false);
const prefillGlossaryId = ref<string | null>(null);
const prefillDateKey = ref<string | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const saving = ref(false);
const glossaryModalOpen = ref(false);
const editingGlossary = ref<SupportGlossaryEntry | null>(null);
const glossarySaving = ref(false);
const highlightGlossaryId = ref<string | null>(null);

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

function openGlossaryEntry(id: string) {
  highlightGlossaryId.value = id;
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

  const [errorsRes, agentsRes, glossaryRes] = await Promise.all([
    listSupportErrors(),
    listSupportAgents(),
    listSupportGlossary(),
  ]);

  if (errorsRes.error || agentsRes.error || glossaryRes.error) {
    loadError.value = errorsRes.error ?? agentsRes.error ?? glossaryRes.error;
    loading.value = false;
    return;
  }

  loadError.value = null;
  errors.value = errorsRes.data;
  agents.value = agentsRes.data;
  glossary.value = glossaryRes.data;
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
  prefillGlossaryId.value = null;
  prefillDateKey.value = null;
  modalOpen.value = true;
}

function openCreateForSelectedDay() {
  editing.value = null;
  modalReadonly.value = false;
  prefillGlossaryId.value = null;
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
  prefillGlossaryId.value = null;
  prefillDateKey.value = null;
  modalOpen.value = true;
}

function openView(error: SupportError) {
  editing.value = error;
  modalReadonly.value = true;
  prefillGlossaryId.value = null;
  prefillDateKey.value = null;
  modalOpen.value = true;
}

function closeModal() {
  if (saving.value) return;
  modalOpen.value = false;
  editing.value = null;
  modalReadonly.value = false;
  prefillGlossaryId.value = null;
  prefillDateKey.value = null;
}

function useGlossaryEntry(entry: SupportGlossaryEntry) {
  editing.value = null;
  modalReadonly.value = false;
  prefillGlossaryId.value = entry.id;
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
    prefillGlossaryId.value = null;
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

function openGlossaryCreate() {
  editingGlossary.value = null;
  glossaryModalOpen.value = true;
}

function openGlossaryEdit(entry: SupportGlossaryEntry) {
  editingGlossary.value = entry;
  glossaryModalOpen.value = true;
}

function closeGlossaryModal() {
  if (glossarySaving.value) return;
  glossaryModalOpen.value = false;
  editingGlossary.value = null;
}

async function handleGlossarySave(form: SupportGlossaryFormData) {
  if (glossarySaving.value) return;
  glossarySaving.value = true;
  try {
    const editingId = editingGlossary.value?.id ?? null;
    const result = editingId
      ? await updateSupportGlossaryEntry(editingId, form)
      : await createSupportGlossaryEntry(form);

    if (result.error) {
      alert(result.error);
      return;
    }

    glossaryModalOpen.value = false;
    editingGlossary.value = null;
    if (result.data) {
      highlightGlossaryId.value = result.data.id;
    }
    await refresh();
  } finally {
    glossarySaving.value = false;
  }
}

async function handleGlossaryRemove(id: string) {
  if (glossarySaving.value) return;
  if (!confirm("Excluir esta entrada do glossário?")) return;
  glossarySaving.value = true;
  try {
    const result = await deleteSupportGlossaryEntry(id);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (highlightGlossaryId.value === id) {
      highlightGlossaryId.value = null;
    }
    await refresh();
  } finally {
    glossarySaving.value = false;
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
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "support_error_glossary" },
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

  const glossarioId = route.query.glossario;
  if (typeof glossarioId === "string" && glossarioId) {
    highlightGlossaryId.value = glossarioId;
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
