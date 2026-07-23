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
            <p class="text-sm font-medium text-slate-900">{{ item.title }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{{ item.module }}</span>
              <span class="text-slate-300">·</span>
              <span
                class="inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                :class="SUPPORT_ERROR_STATUS_COLORS[item.status]"
              >
                {{ SUPPORT_ERROR_STATUS_LABELS[item.status] }}
              </span>
              <span class="text-slate-300">·</span>
              <span
                class="inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                :class="SUPPORT_ERROR_SEVERITY_COLORS[item.severity]"
              >
                {{ SUPPORT_ERROR_SEVERITY_LABELS[item.severity] }}
              </span>
            </div>
            <p
              v-if="item.resolution && item.status === 'resolvido'"
              class="mt-1.5 text-xs leading-relaxed text-emerald-700"
            >
              Resolução: {{ item.resolution }}
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
import {
  endOfCalendarWeek,
  isInRange,
  startOfCalendarWeek,
} from "@/lib/supportErrors";
import {
  SUPPORT_ERROR_SEVERITY_COLORS,
  SUPPORT_ERROR_SEVERITY_LABELS,
  SUPPORT_ERROR_STATUS_COLORS,
  SUPPORT_ERROR_STATUS_LABELS,
  type SupportError,
} from "@/types/supportErrors";

const props = defineProps<{
  errors: SupportError[];
}>();

type SectionId = "foco" | "entregas" | "impedimentos" | "proximos";

const weekLabel = computed(() => {
  const start = startOfCalendarWeek();
  const end = endOfCalendarWeek();
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${fmt(start)} a ${fmt(end)}`;
});

const weekErrors = computed(() => {
  const start = startOfCalendarWeek();
  const end = endOfCalendarWeek();
  return props.errors.filter((item) => {
    if (item.status !== "resolvido") return true;
    return isInRange(item.occurred_at, start, end);
  });
});

const sections = computed(() => {
  const list = weekErrors.value;
  const entregas = list.filter((item) => item.status === "resolvido");
  const open = list.filter((item) => item.status !== "resolvido");

  const impedimentos = open.filter(
    (item) => item.severity === "critico" || item.status === "encaminhado_n2",
  );
  const impedimentoIds = new Set(impedimentos.map((item) => item.id));

  const foco = open.filter(
    (item) =>
      !impedimentoIds.has(item.id) &&
      (item.status === "em_analise" || item.severity === "alto"),
  );
  const focoIds = new Set(foco.map((item) => item.id));

  const proximos = open.filter(
    (item) => !impedimentoIds.has(item.id) && !focoIds.has(item.id),
  );

  return [
    {
      id: "foco" as SectionId,
      title: "Foco",
      subtitle: "Estratégico",
      accent: "border-l-blue-500 bg-blue-50/60",
      badge: "bg-blue-100 text-blue-800",
      items: foco,
    },
    {
      id: "entregas" as SectionId,
      title: "Entregas",
      subtitle: "Operacional",
      accent: "border-l-emerald-500 bg-emerald-50/60",
      badge: "bg-emerald-100 text-emerald-800",
      items: entregas,
    },
    {
      id: "impedimentos" as SectionId,
      title: "Impedimentos",
      subtitle: "Críticos",
      accent: "border-l-red-500 bg-red-50/60",
      badge: "bg-red-100 text-red-800",
      items: impedimentos,
    },
    {
      id: "proximos" as SectionId,
      title: "Próximos",
      subtitle: "Planejamento",
      accent: "border-l-slate-400 bg-slate-50",
      badge: "bg-slate-200 text-slate-700",
      items: proximos,
    },
  ];
});
</script>
