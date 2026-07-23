<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div>
      <h3 class="text-sm font-semibold capitalize text-slate-900">Resumo mensal</h3>
      <p class="text-xs capitalize text-slate-500">{{ summary.monthLabel }}</p>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-slate-600">Volume acumulado</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ summary.total }}</p>
      </div>
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-amber-700">vs. mês anterior</p>
        <p class="mt-1 text-2xl font-bold text-amber-900">
          {{ deltaLabel }}
        </p>
      </div>
      <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-blue-700">Em aberto</p>
        <p class="mt-1 text-2xl font-bold text-blue-900">{{ summary.openCount }}</p>
      </div>
      <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-emerald-700">Resolvidos</p>
        <p class="mt-1 text-2xl font-bold text-emerald-900">
          {{ summary.byStatus.resolvido }}
        </p>
      </div>
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-2">
      <div>
        <h4 class="text-xs font-semibold uppercase text-slate-500">Status geral</h4>
        <ul class="mt-2 space-y-1.5">
          <li
            v-for="status in statusEntries"
            :key="status.value"
            class="flex items-center justify-between gap-2 text-sm text-slate-700"
          >
            <span
              class="rounded-full border px-2 py-0.5 text-xs font-medium"
              :class="SUPPORT_ERROR_STATUS_COLORS[status.value]"
            >
              {{ status.label }}
            </span>
            <span class="font-medium text-slate-800">{{ status.count }}</span>
          </li>
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-semibold uppercase text-slate-500">Dias mais críticos</h4>
        <ul v-if="summary.criticalDays.length" class="mt-2 space-y-1.5">
          <li
            v-for="day in summary.criticalDays"
            :key="day.dateKey"
            class="flex items-center justify-between gap-2 text-sm text-slate-700"
          >
            <button
              type="button"
              class="text-left font-medium text-emerald-800 hover:underline"
              @click="emit('select-day', day.dateKey)"
            >
              {{ formatDateBR(day.dateKey) }}
            </button>
            <div class="flex items-center gap-2">
              <span
                class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                :class="SUPPORT_ERROR_SEVERITY_COLORS[day.maxSeverity]"
              >
                {{ SUPPORT_ERROR_SEVERITY_LABELS[day.maxSeverity] }}
              </span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {{ day.count }}
              </span>
            </div>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-slate-400">Sem ocorrências neste mês.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatDateBR } from "@/lib/format";
import type { MonthlyErrorsSummary } from "@/lib/supportErrors";
import {
  SUPPORT_ERROR_SEVERITY_COLORS,
  SUPPORT_ERROR_SEVERITY_LABELS,
  SUPPORT_ERROR_STATUS_COLORS,
  SUPPORT_ERROR_STATUS_LABELS,
  SUPPORT_ERROR_STATUS_OPTIONS,
} from "@/types/supportErrors";

const props = defineProps<{
  summary: MonthlyErrorsSummary;
}>();

const emit = defineEmits<{
  "select-day": [dateKey: string];
}>();

const deltaLabel = computed(() => {
  const delta = props.summary.delta;
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : `${delta}`;
});

const statusEntries = computed(() =>
  SUPPORT_ERROR_STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: SUPPORT_ERROR_STATUS_LABELS[opt.value],
    count: props.summary.byStatus[opt.value],
  })),
);
</script>
