<template>
  <div class="min-h-screen bg-slate-100">
    <header class="border-b border-emerald-900 bg-emerald-800 text-white shadow-md">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div>
          <h1 class="text-xl font-bold">Dashboard — Cronograma</h1>
          <p class="text-sm text-emerald-100">
            {{ userEmail ? `Conectado: ${userEmail}` : "Carregando..." }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <a
            v-if="gestorLink"
            :href="gestorLink"
            target="_blank"
            class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Link do gestor
          </a>
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
            + Nova atividade
          </button>
          <button
            class="rounded-lg border border-emerald-600 px-3 py-2 text-sm hover:bg-emerald-700"
            @click="handleLogout"
          >
            Sair
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-slate-600">Categoria:</span>
          <button
            v-for="cat in categorias"
            :key="cat"
            class="rounded-full px-4 py-1.5 text-sm font-medium transition"
            :class="
              categoria === cat
                ? 'bg-emerald-800 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            "
            @click="categoria = cat"
          >
            {{ cat }}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <KanbanHorizonToggle v-if="viewMode === 'kanban'" v-model="kanbanHorizon" />
          <ViewModeToggle v-model="viewMode" />
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p v-if="loading" class="py-12 text-center text-slate-500">Carregando cronograma...</p>
        <p v-else-if="error" class="py-12 text-center text-red-600">{{ error }}</p>
        <p v-else-if="filtered.length === 0" class="py-12 text-center text-slate-500">
          Nenhuma atividade nesta categoria.
        </p>

        <KanbanBoard
          v-else-if="viewMode === 'kanban'"
          :items="filtered"
          :horizon="kanbanHorizon"
          :reminder-offsets="reminderOffsets"
          @edit="openEdit"
          @delete="handleDelete"
          @status-change="handleStatusChange"
          @update:horizon="kanbanHorizon = $event"
        />
        <CalendarTimeline v-else-if="viewMode === 'calendario'" :items="filtered" />
        <ActivityListTable
          v-else
          :items="filtered"
          :reminder-offsets="reminderOffsets"
          @edit="openEdit"
          @delete="handleDelete"
        />
      </div>

      <p class="text-xs text-slate-500">
        Status "Pronto" indica PR aberta e funcionando em dev. No Kanban, use o filtro
        <strong class="font-medium">Semanal</strong> para ver só o que importa agora — concluídos há
        mais de 2 semanas ficam ocultos até você escolher "Tudo".
      </p>
    </main>

    <ActivityFormModal
      :open="formOpen"
      :initial="editing"
      @close="formOpen = false"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase/client";
import { getShareToken, visitorUrl } from "@/lib/profile";
import { getNotificationPreferences } from "@/lib/notifications";
import {
  applyStatusChange,
  insertActivityWithEvents,
  updateActivityWithEvents,
} from "@/lib/cronogramaEvents";
import { provideCronogramaNow } from "@/composables/useCronogramaNow";
import { SYNC_INTERVAL_MS } from "@/lib/syncInterval";
import {
  type ActivityStatus,
  type CronogramaAtividade,
  type CronogramaFormData,
  type ViewMode,
} from "@/types/cronograma";
import type { ReminderOffset } from "@/types/notifications";
import ActivityFormModal from "@/components/ActivityFormModal.vue";
import ViewModeToggle from "@/components/cronograma/ViewModeToggle.vue";
import KanbanBoard from "@/components/cronograma/KanbanBoard.vue";
import KanbanHorizonToggle from "@/components/cronograma/KanbanHorizonToggle.vue";
import CalendarTimeline from "@/components/cronograma/CalendarTimeline.vue";
import { parseStoredKanbanHorizon, type KanbanHorizon } from "@/lib/kanbanFilters";
import ActivityListTable from "@/components/cronograma/ActivityListTable.vue";

const router = useRouter();

provideCronogramaNow();

let syncTimer: ReturnType<typeof setInterval> | null = null;

const atividades = ref<CronogramaAtividade[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const categoria = ref("Gamificação");
const viewMode = ref<ViewMode>(
  (localStorage.getItem("cronograma-view") as ViewMode) || "kanban",
);
const kanbanHorizon = ref<KanbanHorizon>(
  parseStoredKanbanHorizon(localStorage.getItem("cronograma-horizon")),
);
const formOpen = ref(false);
const editing = ref<CronogramaAtividade | null>(null);
const userEmail = ref<string | null>(null);
const gestorLink = ref<string | null>(null);
const reminderOffsets = ref<ReminderOffset[]>([]);

const categorias = computed(() =>
  Array.from(new Set(atividades.value.map((a) => a.categoria))),
);

const filtered = computed(() =>
  atividades.value.filter((a) => a.categoria === categoria.value),
);

watch(viewMode, (mode) => localStorage.setItem("cronograma-view", mode));
watch(kanbanHorizon, (horizon) => localStorage.setItem("cronograma-horizon", horizon));

async function loadAtividades(silent = false) {
  if (!silent) {
    loading.value = true;
    error.value = null;
  }

  const { data, error: fetchError } = await supabase
    .from("cronograma_atividades")
    .select("*")
    .order("data_back_banco", { ascending: true });

  if (fetchError) {
    if (!silent) {
      error.value = fetchError.message;
      atividades.value = [];
    }
  } else {
    atividades.value = (data as CronogramaAtividade[]) ?? [];
  }

  if (!silent) loading.value = false;
}

async function refreshPreferences() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const prefs = await getNotificationPreferences(user.id);
  reminderOffsets.value = prefs.enabled ? prefs.offsets : [];
}

async function syncCronograma() {
  await Promise.all([loadAtividades(true), refreshPreferences()]);
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
    await refreshPreferences();
  }

  await loadAtividades();
  syncTimer = setInterval(() => void syncCronograma(), SYNC_INTERVAL_MS);
});

onUnmounted(() => {
  if (syncTimer) clearInterval(syncTimer);
});

function openCreate() {
  editing.value = null;
  formOpen.value = true;
}

function openEdit(item: CronogramaAtividade) {
  editing.value = item;
  formOpen.value = true;
}

async function handleFormSubmit(data: CronogramaFormData) {
  formOpen.value = false;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  if (editing.value) {
    const { error: updateError } = await updateActivityWithEvents(editing.value, data, userId);
    if (updateError) {
      error.value = updateError;
      return;
    }
  } else {
    const { error: insertError } = await insertActivityWithEvents(data, userId);
    if (insertError) {
      error.value = insertError;
      return;
    }
  }

  await loadAtividades();
}

async function handleStatusChange(item: CronogramaAtividade, status: ActivityStatus) {
  if (item.status === status) return;

  const previousStatus = item.status;

  const { data: userData } = await supabase.auth.getUser();
  const { error: updateError } = await applyStatusChange(
    item,
    previousStatus,
    status,
    userData.user?.id ?? null,
  );

  if (updateError) {
    error.value = updateError;
    return;
  }

  const local = atividades.value.find((a) => a.id === item.id);
  if (local) {
    local.status = status;
    if (status === "pronto") {
      local.concluido_em = new Date().toISOString();
    }
  }
}

async function handleDelete(item: CronogramaAtividade) {
  if (!confirm(`Excluir "${item.atividade}"?`)) return;

  const { error: deleteError } = await supabase
    .from("cronograma_atividades")
    .delete()
    .eq("id", item.id);

  if (deleteError) {
    error.value = deleteError.message;
    return;
  }

  await loadAtividades();
}

async function handleLogout() {
  await supabase.auth.signOut();
  router.push("/login");
}
</script>
