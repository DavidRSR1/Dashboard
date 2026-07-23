<template>
  <section class="space-y-4">
    <p v-if="loading" class="py-8 text-center text-sm text-slate-500">
      Carregando resumos de suporte...
    </p>
    <p v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </p>
    <template v-else>
      <div
        v-if="isMaster"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
      >
        <label class="text-xs font-medium text-slate-600" for="report-agent-filter">
          Filtrar por responsável
        </label>
        <select
          id="report-agent-filter"
          v-model="agentFilter"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
        >
          <option value="all">Todos</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }}
          </option>
        </select>
        <span class="text-xs text-slate-500">
          {{ filteredErrors.length }} registro(s) no filtro
        </span>
      </div>
      <p v-else class="text-xs text-slate-500">
        Exibindo apenas os seus erros (responsável:
        <span class="font-medium text-slate-700">{{ currentAgentName }}</span>).
      </p>

      <div class="grid gap-4 lg:grid-cols-2">
        <WeeklyErrorsSummary :summary="weeklySummary" />
        <MonthlyErrorsSummary :summary="monthlySummary" @select-day="onSelectDay" />
      </div>

      <SupportWeeklyListPanel :errors="filteredErrors" />

      <p class="text-xs text-slate-500">
        Resumos do módulo de erros N1.
        <template v-if="isMaster"> Como master, você vê todos e pode filtrar. </template>
        <template v-else> Cada pessoa vê só os próprios na área de relatórios. </template>
        Para calendário e catálogo, abra
        <RouterLink to="/erros" class="font-medium text-emerald-800 underline hover:no-underline">
          Erros N1
        </RouterLink>.
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase/client";
import { isSupportMaster } from "@/lib/supportAccess";
import {
  buildMonthlySummary,
  buildWeeklySummary,
  listSupportErrors,
} from "@/lib/supportErrors";
import {
  agentIdFromEmail,
  emailLocalPart,
  listSupportAgents,
} from "@/lib/supportTeam";
import type { SupportAgent, SupportError } from "@/types/supportErrors";
import MonthlyErrorsSummary from "@/components/support-errors/MonthlyErrorsSummary.vue";
import WeeklyErrorsSummary from "@/components/support-errors/WeeklyErrorsSummary.vue";
import SupportWeeklyListPanel from "@/components/relatorio/SupportWeeklyListPanel.vue";

const router = useRouter();
const errors = ref<SupportError[]>([]);
const agents = ref<SupportAgent[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const userEmail = ref<string | null>(null);
const agentFilter = ref<string>("all");

const isMaster = computed(() => isSupportMaster(userEmail.value));
const myAgentId = computed(() =>
  userEmail.value ? agentIdFromEmail(userEmail.value) : "",
);
const currentAgentName = computed(() =>
  userEmail.value ? emailLocalPart(userEmail.value) : "—",
);

const filteredErrors = computed(() => {
  if (isMaster.value) {
    if (agentFilter.value === "all") return errors.value;
    return errors.value.filter((item) => item.agent_id === agentFilter.value);
  }
  if (!myAgentId.value) return [];
  return errors.value.filter((item) => item.agent_id === myAgentId.value);
});

const weeklySummary = computed(() => buildWeeklySummary(filteredErrors.value));
const monthlySummary = computed(() => buildMonthlySummary(filteredErrors.value));

async function load() {
  loading.value = true;
  error.value = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  userEmail.value = user?.email ?? null;

  const [errorsRes, agentsRes] = await Promise.all([
    listSupportErrors(),
    listSupportAgents(),
  ]);

  if (errorsRes.error) {
    error.value = errorsRes.error;
    loading.value = false;
    return;
  }

  errors.value = errorsRes.data;
  agents.value = agentsRes.data;
  if (isMaster.value && myAgentId.value) {
    agentFilter.value = "all";
  }
  loading.value = false;
}

function onSelectDay(dateKey: string) {
  void router.push({ path: "/erros", query: { dia: dateKey } });
}

onMounted(() => {
  void load();
});
</script>
