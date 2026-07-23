<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-slate-800">Lista da semana</h3>
      <p class="text-xs text-slate-500">{{ weekLabel }}</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <article
        v-for="section in sections"
        :key="section.id"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div
          class="flex items-start justify-between gap-2 border-l-4 px-4 py-3"
          :class="section.accent"
        >
          <div>
            <h4 class="text-sm font-semibold text-slate-900">{{ section.title }}</h4>
            <p class="text-xs text-slate-500">{{ section.subtitle }}</p>
          </div>
          <span
            class="inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="section.badge"
          >
            {{ section.items.length }}
          </span>
        </div>

        <ul v-if="section.items.length" class="divide-y divide-slate-100 px-4 py-1">
          <li v-for="item in section.items" :key="item.id" class="py-3">
            <p class="text-sm font-medium text-slate-900">{{ item.atividade }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{{ item.categoria }}</span>
              <span class="text-slate-300">·</span>
              <span
                class="inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                :class="STATUS_COLORS[item.status]"
              >
                {{ STATUS_LABELS[item.status] }}
              </span>
              <template v-if="item.data_front">
                <span class="text-slate-300">·</span>
                <span>prazo {{ formatDateBR(item.data_front) }}</span>
              </template>
            </div>
            <p v-if="item.observacoes?.trim()" class="mt-1.5 text-xs leading-relaxed text-slate-500">
              {{ item.observacoes.trim() }}
            </p>
          </li>
        </ul>
        <p v-else class="px-4 py-4 text-sm text-slate-400">Nenhum neste período</p>
      </article>
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
      title: "Foco",
      subtitle: "Estratégico",
      accent: "border-l-blue-500 bg-blue-50/60",
      badge: "bg-blue-100 text-blue-800",
      items: grouped.foco,
    },
    {
      id: "entregas",
      title: "Entregas",
      subtitle: "Operacional",
      accent: "border-l-emerald-500 bg-emerald-50/60",
      badge: "bg-emerald-100 text-emerald-800",
      items: grouped.entregas,
    },
    {
      id: "impedimentos",
      title: "Impedimentos",
      subtitle: "Críticos",
      accent: "border-l-red-500 bg-red-50/60",
      badge: "bg-red-100 text-red-800",
      items: grouped.impedimentos,
    },
    {
      id: "proximos",
      title: "Próximos",
      subtitle: "Planejamento",
      accent: "border-l-slate-400 bg-slate-50",
      badge: "bg-slate-200 text-slate-700",
      items: grouped.proximos,
    },
  ];
});
</script>
