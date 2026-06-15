<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b border-slate-200 bg-white shadow-sm">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Modo visitante
          </p>
          <h1 class="text-2xl font-bold text-slate-900">Acompanhamento de Atividades</h1>
          <p class="mt-1 text-sm text-slate-600">
            Kanban e calendário do que está sendo trabalhado
          </p>
        </div>
        <div class="text-right text-sm text-slate-500">
          <p>Atualizado: {{ lastUpdate }}</p>
          <button
            class="mt-1 text-emerald-700 hover:underline"
            :disabled="loading"
            @click="loadAtividades"
          >
            {{ loading ? "Atualizando..." : "Atualizar agora" }}
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Em progresso" :value="counts.em_progresso" accent="amber" />
        <StatCard label="Iniciado" :value="counts.iniciado" accent="blue" />
        <StatCard label="Pronto" :value="counts.pronto" accent="emerald" />
        <StatCard label="Não iniciado" :value="counts.nao_iniciado" accent="slate" />
      </section>

      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in categorias"
            :key="cat"
            class="rounded-full px-3 py-1.5 text-sm font-medium transition"
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
        <p v-if="error" class="py-12 text-center text-red-600">{{ error }}</p>
        <p v-else-if="loading" class="py-12 text-center text-slate-500">Carregando...</p>

        <KanbanBoard v-else-if="viewMode === 'kanban'" :items="filtered" readonly />
        <CalendarTimeline v-else-if="viewMode === 'calendario'" :items="filtered" />
        <ActivityListTable v-else :items="filtered" readonly />
      </div>
    </main>

    <footer class="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
      Painel de visitante — somente leitura
      <RouterLink to="/login" class="ml-2 text-emerald-700 hover:underline">
        Área administrativa
      </RouterLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabase/client";
import { type ActivityStatus, type CronogramaAtividade, type ViewMode } from "@/types/cronograma";
import StatCard from "@/components/visitante/StatCard.vue";
import ViewModeToggle from "@/components/cronograma/ViewModeToggle.vue";
import KanbanBoard from "@/components/cronograma/KanbanBoard.vue";
import CalendarTimeline from "@/components/cronograma/CalendarTimeline.vue";
import ActivityListTable from "@/components/cronograma/ActivityListTable.vue";

const route = useRoute();
const atividades = ref<CronogramaAtividade[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const categoria = ref("Gamificação");
const viewMode = ref<ViewMode>("kanban");
const lastUpdate = ref("—");

let refreshTimer: ReturnType<typeof setInterval> | null = null;

const counts = computed(() => {
  const base: Record<ActivityStatus, number> = {
    nao_iniciado: 0,
    iniciado: 0,
    em_progresso: 0,
    pronto: 0,
  };
  for (const item of atividades.value) {
    base[item.status]++;
  }
  return base;
});

const categorias = computed(() =>
  Array.from(new Set(atividades.value.map((a) => a.categoria))),
);

const filtered = computed(() =>
  atividades.value.filter((a) => a.categoria === categoria.value),
);

function updateTimestamp() {
  lastUpdate.value = new Date().toLocaleString("pt-BR");
}

async function loadAtividades() {
  loading.value = true;
  error.value = null;

  const token = route.params.token as string;
  if (!token) {
    error.value = "Link de visitante inválido.";
    loading.value = false;
    return;
  }

  const { data, error: fetchError } = await supabase.rpc("get_cronograma_publico", {
    p_share_token: token,
  });

  if (fetchError) {
    error.value = fetchError.message;
    atividades.value = [];
  } else {
    atividades.value = (data as CronogramaAtividade[]) ?? [];
    if (categorias.value.length > 0 && !categorias.value.includes(categoria.value)) {
      categoria.value = categorias.value[0];
    }
    updateTimestamp();
  }

  loading.value = false;
}

onMounted(() => {
  void loadAtividades();
  refreshTimer = setInterval(() => void loadAtividades(), 60_000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>
