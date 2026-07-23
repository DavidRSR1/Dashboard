<template>
  <section class="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-slate-800">Lista da semana</h3>
      <p class="text-xs text-slate-500">{{ weekLabel }}</p>
    </div>

    <div class="mt-4 space-y-5">
      <div v-for="section in sections" :key="section.id">
        <h4 class="text-sm font-semibold text-slate-900">{{ section.title }}</h4>
        <ul v-if="section.items.length" class="mt-2 space-y-1.5">
          <li
            v-for="item in section.items"
            :key="item.id"
            class="flex gap-2 text-sm leading-relaxed text-slate-700"
          >
            <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span class="min-w-0">
              <span class="font-medium text-slate-900">{{ item.atividade }}</span>
              <span class="text-slate-500"> — {{ item.categoria }}</span>
              <span
                class="ml-2 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                :class="STATUS_COLORS[item.status]"
              >
                {{ STATUS_LABELS[item.status] }}
              </span>
              <span v-if="item.data_front" class="ml-1 text-xs text-slate-500">
                prazo {{ formatDateBR(item.data_front) }}
              </span>
              <p v-if="item.observacoes?.trim()" class="mt-0.5 text-xs text-slate-500">
                {{ item.observacoes.trim() }}
              </p>
            </span>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-slate-400">*</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatDateBR } from "@/lib/format";
import {
  buildCronogramaWeekSections,
  type WeeklyReportData,
} from "@/lib/weeklyReport";
import { STATUS_COLORS, STATUS_LABELS } from "@/types/cronograma";

const props = defineProps<{
  reportData: WeeklyReportData;
}>();

const weekLabel = computed(() => props.reportData.week.label.replace(" (sex. 10h)", ""));

const sections = computed(() => {
  const grouped = buildCronogramaWeekSections(props.reportData);
  return [
    {
      id: "foco",
      title: "Foco Principal da Semana (Estratégico)",
      items: grouped.foco,
    },
    {
      id: "entregas",
      title: "Entregas Realizadas (Operacional)",
      items: grouped.entregas,
    },
    {
      id: "impedimentos",
      title: "Impedimentos (Críticos)",
      items: grouped.impedimentos,
    },
    {
      id: "proximos",
      title: "Próximos Passos (Planejamento)",
      items: grouped.proximos,
    },
  ];
});
</script>
