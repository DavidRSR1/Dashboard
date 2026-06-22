<template>
  <section class="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-emerald-900">Resumo do período</h2>
        <p class="mt-0.5 text-xs text-emerald-800/70">{{ horizonLabel }}</p>
      </div>
      <p v-if="hiddenCount > 0" class="text-xs text-slate-500">
        +{{ hiddenCount }} fora do filtro atual
      </p>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="chip in chips"
        :key="chip.label"
        class="rounded-lg border bg-white px-3 py-2.5"
        :class="chip.border"
      >
        <p class="text-xs font-medium text-slate-500">{{ chip.label }}</p>
        <p class="mt-0.5 text-xl font-bold" :class="chip.valueClass">{{ chip.value }}</p>
        <p v-if="chip.hint" class="mt-1 text-[11px] leading-snug text-slate-500">{{ chip.hint }}</p>
      </div>
    </div>

    <p v-if="narrative" class="mt-4 text-sm leading-relaxed text-slate-700">{{ narrative }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { getDeadlineDate, isActivityOverdue } from "@/lib/deadlines";
import {
  KANBAN_HORIZON_OPTIONS,
  isProntoArchived,
  type KanbanHorizon,
} from "@/lib/kanbanFilters";
import { getReportWeekRange, isDateInRange } from "@/lib/weekRange";
import type { CronogramaAtividade } from "@/types/cronograma";

const props = defineProps<{
  items: CronogramaAtividade[];
  horizon: KanbanHorizon;
  hiddenCount: number;
  now: Date;
}>();

const horizonLabel = computed(
  () => KANBAN_HORIZON_OPTIONS.find((o) => o.value === props.horizon)?.hint ?? "",
);

const activeCount = computed(
  () => props.items.filter((a) => a.status === "iniciado" || a.status === "em_progresso").length,
);

const recentDoneCount = computed(
  () =>
    props.items.filter((a) => a.status === "pronto" && !isProntoArchived(a, props.now)).length,
);

const overdueCount = computed(
  () => props.items.filter((a) => isActivityOverdue(a, props.now)).length,
);

const dueThisWeekCount = computed(() => {
  const week = getReportWeekRange(props.now);
  return props.items.filter((a) => {
    if (a.status === "pronto") return false;
    const deadline = getDeadlineDate(a);
    return deadline && isDateInRange(deadline, week);
  }).length;
});

const chips = computed(() => [
  {
    label: "Em trabalho ativo",
    value: activeCount.value,
    hint: "Iniciado ou em progresso",
    border: "border-amber-200",
    valueClass: "text-amber-800",
  },
  {
    label: "Entregas recentes",
    value: recentDoneCount.value,
    hint: "Pronto nas últimas 2 semanas",
    border: "border-emerald-200",
    valueClass: "text-emerald-800",
  },
  {
    label: "Prazos esta semana",
    value: dueThisWeekCount.value,
    hint: "Vencem até sexta 10h",
    border: "border-blue-200",
    valueClass: "text-blue-800",
  },
  {
    label: "Atrasadas",
    value: overdueCount.value,
    hint: overdueCount.value > 0 ? "Prazo já passou" : "Nenhuma no momento",
    border: overdueCount.value > 0 ? "border-red-200" : "border-slate-200",
    valueClass: overdueCount.value > 0 ? "text-red-700" : "text-slate-700",
  },
]);

const narrative = computed(() => {
  const parts: string[] = [];

  if (activeCount.value > 0) {
    parts.push(
      `${activeCount.value === 1 ? "Há 1 atividade" : `Há ${activeCount.value} atividades`} em andamento agora`,
    );
  }

  if (recentDoneCount.value > 0) {
    parts.push(
      `${recentDoneCount.value === 1 ? "1 entrega recente" : `${recentDoneCount.value} entregas recentes`}`,
    );
  }

  if (overdueCount.value > 0) {
    parts.push(
      `${overdueCount.value === 1 ? "1 item atrasado" : `${overdueCount.value} itens atrasados`} pedem atenção`,
    );
  }

  if (parts.length === 0) {
    return "Nenhuma atividade em destaque no filtro atual. Amplie para 30 dias ou Tudo para ver o planejamento completo.";
  }

  return parts.join(". ") + ".";
});
</script>
