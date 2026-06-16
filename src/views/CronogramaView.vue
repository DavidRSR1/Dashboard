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
        <ViewModeToggle v-model="viewMode" />
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
          :reminder-offsets="reminderOffsets"
          @edit="openEdit"
          @delete="handleDelete"
        />
        <CalendarTimeline v-else-if="viewMode === 'calendario'" :items="filtered" />
        <ActivityListTable
          v-else
          :items="filtered"
          @edit="openEdit"
          @delete="handleDelete"
        />
      </div>

      <p class="text-xs text-slate-500">
        Status "Pronto" indica PR aberta e funcionando em dev.
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
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase/client";
import { getShareToken, visitorUrl } from "@/lib/profile";
import { getNotificationPreferences } from "@/lib/notifications";
import {
  type CronogramaAtividade,
  type CronogramaFormData,
  type ViewMode,
} from "@/types/cronograma";
import type { ReminderOffset } from "@/types/notifications";
import ActivityFormModal from "@/components/ActivityFormModal.vue";
import ViewModeToggle from "@/components/cronograma/ViewModeToggle.vue";
import KanbanBoard from "@/components/cronograma/KanbanBoard.vue";
import CalendarTimeline from "@/components/cronograma/CalendarTimeline.vue";
import ActivityListTable from "@/components/cronograma/ActivityListTable.vue";

const router = useRouter();

const atividades = ref<CronogramaAtividade[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const categoria = ref("Gamificação");
const viewMode = ref<ViewMode>(
  (localStorage.getItem("cronograma-view") as ViewMode) || "kanban",
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

async function loadAtividades() {
  loading.value = true;
  error.value = null;

  const { data, error: fetchError } = await supabase
    .from("cronograma_atividades")
    .select("*")
    .order("data_back_banco", { ascending: true });

  if (fetchError) {
    error.value = fetchError.message;
    atividades.value = [];
  } else {
    atividades.value = (data as CronogramaAtividade[]) ?? [];
  }

  loading.value = false;
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
    const prefs = await getNotificationPreferences(user.id);
    if (prefs.enabled) reminderOffsets.value = prefs.offsets;
  }

  await loadAtividades();
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

  if (editing.value) {
    const { error: updateError } = await supabase
      .from("cronograma_atividades")
      .update({
        atividade: data.atividade,
        data_back_banco: data.data_back_banco || null,
        data_front: data.data_front || null,
        hora_fim: data.hora_fim || null,
        status: data.status,
        categoria: data.categoria,
        pr_url: data.pr_url || null,
        observacoes: data.observacoes || null,
      })
      .eq("id", editing.value.id);

    if (updateError) {
      error.value = updateError.message;
      return;
    }
  } else {
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("cronograma_atividades").insert({
      atividade: data.atividade,
      data_back_banco: data.data_back_banco || null,
      data_front: data.data_front || null,
      hora_fim: data.hora_fim || null,
      status: data.status,
      categoria: data.categoria,
      pr_url: data.pr_url || null,
      observacoes: data.observacoes || null,
      created_by: userData.user?.id ?? null,
    });

    if (insertError) {
      error.value = insertError.message;
      return;
    }
  }

  await loadAtividades();
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
