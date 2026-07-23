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
              <span class="font-medium text-slate-900">{{ item.title }}</span>
              <span class="text-slate-500"> — {{ item.module }}</span>
              <span
                class="ml-2 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                :class="SUPPORT_ERROR_STATUS_COLORS[item.status]"
              >
                {{ SUPPORT_ERROR_STATUS_LABELS[item.status] }}
              </span>
              <span
                class="ml-1 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                :class="SUPPORT_ERROR_SEVERITY_COLORS[item.severity]"
              >
                {{ SUPPORT_ERROR_SEVERITY_LABELS[item.severity] }}
              </span>
              <p v-if="item.resolution && item.status === 'resolvido'" class="mt-0.5 text-xs text-emerald-700">
                Resolução: {{ item.resolution }}
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
      title: "Foco Principal da Semana (Estratégico)",
      items: foco,
    },
    {
      id: "entregas" as SectionId,
      title: "Entregas Realizadas (Operacional)",
      items: entregas,
    },
    {
      id: "impedimentos" as SectionId,
      title: "Impedimentos (Críticos)",
      items: impedimentos,
    },
    {
      id: "proximos" as SectionId,
      title: "Próximos Passos (Planejamento)",
      items: proximos,
    },
  ];
});
</script>
