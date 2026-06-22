<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          @click="weekOffset--"
        >
          ← Semana anterior
        </button>
        <span class="text-sm font-medium text-slate-700">{{ week.label }}</span>
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          :disabled="weekOffset >= 0"
          @click="weekOffset++"
        >
          Próxima semana →
        </button>
      </div>
      <button
        type="button"
        class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        @click="copyReport"
      >
        {{ copied ? "Copiado!" : "Copiar relatório" }}
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-emerald-700">Concluídas</p>
        <p class="mt-1 text-2xl font-bold text-emerald-900">{{ reportData.stats.delivered }}</p>
      </div>
      <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-blue-700">No prazo</p>
        <p class="mt-1 text-2xl font-bold text-blue-900">{{ reportData.stats.onTime }}</p>
      </div>
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-amber-700">Criadas</p>
        <p class="mt-1 text-2xl font-bold text-amber-900">{{ reportData.stats.created }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-slate-600">Esta semana</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ reportData.stats.activeFocus }}</p>
      </div>
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700">
        Observações (opcional — incluídas ao copiar)
      </label>
      <textarea
        v-model="observacoes"
        rows="3"
        placeholder="Pontos extras para o gestor..."
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
      />
    </div>

    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 class="text-sm font-semibold text-slate-800">Pré-visualização</h3>
      <pre class="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{{
        reportText
      }}</pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { buildWeeklyReportData, buildWeeklyReportText } from "@/lib/weeklyReport";
import { getReportWeekRange } from "@/lib/weekRange";
import type { CronogramaAtividade, CronogramaEvento } from "@/types/cronograma";

const props = defineProps<{
  atividades: CronogramaAtividade[];
  eventos: CronogramaEvento[];
  userEmail: string;
}>();

const weekOffset = ref(0);
const observacoes = ref(localStorage.getItem("relatorio-observacoes") ?? "");
const copied = ref(false);

const week = computed(() => getReportWeekRange(new Date(), weekOffset.value));

const reportData = computed(() =>
  buildWeeklyReportData(props.atividades, props.eventos, week.value),
);

const reportText = computed(() =>
  buildWeeklyReportText(reportData.value, props.userEmail, observacoes.value),
);

async function copyReport() {
  localStorage.setItem("relatorio-observacoes", observacoes.value);
  await navigator.clipboard.writeText(reportText.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>
