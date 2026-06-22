<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b border-emerald-800 bg-emerald-900 text-white shadow-md">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-emerald-200">
            Painel do gestor
          </p>
          <h1 class="text-2xl font-bold">Acompanhamento de Atividades</h1>
          <p class="mt-1 text-sm text-emerald-100">
            Visão semanal do que está sendo trabalhado — atualiza a cada minuto
          </p>
        </div>
        <div class="text-right text-sm text-emerald-100">
          <p>Semana: {{ weekLabel }}</p>
          <p class="text-emerald-200/80">Atualizado: {{ lastUpdate }}</p>
          <button
            class="mt-1 font-medium text-white underline-offset-2 hover:underline"
            :disabled="loading"
            @click="loadAtividades"
          >
            {{ loading ? "Atualizando..." : "Atualizar agora" }}
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <p v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-red-700">
        {{ error }}
      </p>
      <p v-else-if="loading" class="py-12 text-center text-slate-500">Carregando cronograma...</p>

      <template v-else>
        <VisitorOverview
          :items="visibleItems"
          :horizon="kanbanHorizon"
          :hidden-count="hiddenCount"
          :now="now"
        />

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
          <div class="flex flex-wrap items-center gap-3">
            <KanbanHorizonToggle
              v-if="viewMode === 'kanban' || viewMode === 'lista'"
              v-model="kanbanHorizon"
            />
            <ViewModeToggle v-model="viewMode" />
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p v-if="displayItems.length === 0" class="py-12 text-center text-slate-500">
            Nenhuma atividade visível com os filtros atuais.
            <button
              type="button"
              class="ml-1 font-medium text-emerald-700 hover:underline"
              @click="kanbanHorizon = 'tudo'"
            >
              Ver tudo
            </button>
          </p>

          <KanbanBoard
            v-else-if="viewMode === 'kanban'"
            :items="filtered"
            :horizon="kanbanHorizon"
            readonly
            @update:horizon="kanbanHorizon = $event"
          />
          <CalendarTimeline v-else-if="viewMode === 'calendario'" :items="filtered" />
          <ActivityListTable v-else :items="displayItems" readonly />
        </div>
      </template>
    </main>

    <footer class="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
      Somente leitura — planejamento de longo prazo aparece em &quot;Tudo&quot; ou no Calendário
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
import { provideCronogramaNow, useCronogramaNow } from "@/composables/useCronogramaNow";
import { filterKanbanItems, type KanbanHorizon } from "@/lib/kanbanFilters";
import { getReportWeekRange } from "@/lib/weekRange";
import { type ActivityStatus, type CronogramaAtividade, type ViewMode } from "@/types/cronograma";
import StatCard from "@/components/visitante/StatCard.vue";
import VisitorOverview from "@/components/visitante/VisitorOverview.vue";
import ViewModeToggle from "@/components/cronograma/ViewModeToggle.vue";
import KanbanHorizonToggle from "@/components/cronograma/KanbanHorizonToggle.vue";
import KanbanBoard from "@/components/cronograma/KanbanBoard.vue";
import CalendarTimeline from "@/components/cronograma/CalendarTimeline.vue";
import ActivityListTable from "@/components/cronograma/ActivityListTable.vue";

provideCronogramaNow();

const route = useRoute();
const now = useCronogramaNow();

const atividades = ref<CronogramaAtividade[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const categoria = ref("Gamificação");
const viewMode = ref<ViewMode>("kanban");
const kanbanHorizon = ref<KanbanHorizon>("semanal");
const lastUpdate = ref("—");

let refreshTimer: ReturnType<typeof setInterval> | null = null;

const weekLabel = computed(() => getReportWeekRange(now.value).label.replace(" (sex. 10h)", ""));

const categorias = computed(() =>
  Array.from(new Set(atividades.value.map((a) => a.categoria))),
);

const filtered = computed(() =>
  atividades.value.filter((a) => a.categoria === categoria.value),
);

const horizonResult = computed(() =>
  filterKanbanItems(filtered.value, kanbanHorizon.value, now.value),
);

const visibleItems = computed(() => horizonResult.value.visible);
const hiddenCount = computed(() => horizonResult.value.hiddenCount);

const displayItems = computed(() => {
  if (viewMode.value === "calendario") return filtered.value;
  return visibleItems.value;
});

const counts = computed(() => {
  const base: Record<ActivityStatus, number> = {
    nao_iniciado: 0,
    iniciado: 0,
    em_progresso: 0,
    pronto: 0,
  };
  for (const item of visibleItems.value) {
    base[item.status]++;
  }
  return base;
});

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
