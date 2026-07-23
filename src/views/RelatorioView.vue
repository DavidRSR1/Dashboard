<template>
  <div class="min-h-screen bg-slate-100">
    <header class="border-b border-emerald-900 bg-emerald-800 text-white shadow-md">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div>
          <h1 class="text-xl font-bold">{{ headerTitle }}</h1>
          <p class="text-sm text-emerald-100">{{ headerSubtitle }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <RouterLink
            to="/"
            class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Cronograma
          </RouterLink>
          <RouterLink
            v-if="canSeeSupportErrors"
            to="/erros"
            class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Erros N1
          </RouterLink>
          <RouterLink
            to="/perfil"
            class="rounded-lg border border-emerald-500 px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Perfil
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div
        v-if="canSeeSupportErrors"
        class="flex gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
      >
        <button
          v-for="area in areas"
          :key="area.id"
          type="button"
          class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition"
          :class="
            activeArea === area.id
              ? 'bg-emerald-800 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          "
          @click="activeArea = area.id"
        >
          {{ area.label }}
        </button>
      </div>

      <!-- Cronograma: tabs internas -->
      <template v-if="activeArea === 'cronograma'">
        <div class="flex gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            v-for="tab in cronogramaTabs"
            :key="tab.id"
            type="button"
            class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition"
            :class="
              cronogramaTab === tab.id
                ? 'bg-emerald-800 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            "
            @click="cronogramaTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <p v-if="loading" class="py-12 text-center text-slate-500">Carregando dados...</p>
          <p v-else-if="error" class="py-12 text-center text-red-600">{{ error }}</p>

          <WeeklyReportPanel
            v-else-if="cronogramaTab === 'relatorio'"
            :atividades="atividades"
            :eventos="eventos"
            :user-email="userEmail ?? '—'"
          />
          <HistoryTimeline
            v-else
            :atividades="atividades"
            :eventos="eventos"
          />
        </div>

        <p class="text-xs text-slate-500">
          O relatório lista só entregas da semana, o que está no período semanal (prazo nesta ou na
          próxima semana) e prazos imediatos — atividades planejadas para datas distantes ficam de
          fora.
        </p>
      </template>

      <!-- Suporte N1: resumos separados do cronograma -->
      <template v-else>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <SupportReportsPanel />
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { supabase } from "@/lib/supabase/client";
import type { CronogramaAtividade, CronogramaEvento } from "@/types/cronograma";
import WeeklyReportPanel from "@/components/relatorio/WeeklyReportPanel.vue";
import HistoryTimeline from "@/components/relatorio/HistoryTimeline.vue";
import SupportReportsPanel from "@/components/relatorio/SupportReportsPanel.vue";
import { useSupportAccess } from "@/composables/useSupportAccess";
import { emailLocalPart } from "@/lib/supportTeam";

const { allowed: canSeeSupportErrors } = useSupportAccess();

const areas = [
  { id: "cronograma" as const, label: "Cronograma" },
  { id: "suporte" as const, label: "Suporte N1" },
];

const cronogramaTabs = [
  { id: "relatorio" as const, label: "Relatório para o gestor" },
  { id: "historico" as const, label: "Meu histórico" },
];

const activeArea = ref<"cronograma" | "suporte">("cronograma");
const cronogramaTab = ref<"relatorio" | "historico">("relatorio");
const atividades = ref<CronogramaAtividade[]>([]);
const eventos = ref<CronogramaEvento[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const userEmail = ref<string | null>(null);

const headerTitle = computed(() =>
  activeArea.value === "suporte" ? "Relatórios — Suporte N1" : "Relatório semanal",
);

const headerSubtitle = computed(() => {
  const who = userEmail.value ? emailLocalPart(userEmail.value) : "Carregando...";
  if (activeArea.value === "suporte") {
    return `${who} — resumos semanal e mensal de incidentes`;
  }
  return `${userEmail.value ?? "Carregando..."} — entrega às sextas, 10h`;
});

watch(canSeeSupportErrors, (allowed) => {
  if (!allowed && activeArea.value === "suporte") {
    activeArea.value = "cronograma";
  }
});

async function loadData() {
  loading.value = true;
  error.value = null;

  const [atividadesRes, eventosRes] = await Promise.all([
    supabase.from("cronograma_atividades").select("*").order("created_at", { ascending: false }),
    supabase.from("cronograma_eventos").select("*").order("created_at", { ascending: false }),
  ]);

  if (atividadesRes.error) {
    error.value = atividadesRes.error.message;
    loading.value = false;
    return;
  }

  if (eventosRes.error) {
    error.value = eventosRes.error.message;
    loading.value = false;
    return;
  }

  atividades.value = (atividadesRes.data as CronogramaAtividade[]) ?? [];
  eventos.value = (eventosRes.data as CronogramaEvento[]) ?? [];
  loading.value = false;
}

onMounted(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  userEmail.value = user?.email ?? null;
  await loadData();
});
</script>
