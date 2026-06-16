<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs">
      <span
        v-for="status in KANBAN_ORDER"
        :key="status"
        class="flex items-center gap-1.5 text-slate-600"
      >
        <span class="h-3 w-3 rounded-sm" :class="STATUS_BAR_COLORS[status]" />
        {{ STATUS_LABELS[status] }}
      </span>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="min-w-[720px] p-4">
        <div class="mb-2 grid grid-cols-[200px_1fr] gap-4 text-xs font-medium text-slate-500">
          <span>Atividade</span>
          <div class="relative grid" :style="{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }">
            <span
              v-for="month in months"
              :key="month.key"
              class="border-l border-slate-100 pl-2 text-center first:border-l-0"
            >
              {{ month.label }}
            </span>
          </div>
        </div>

        <p v-if="rows.length === 0" class="py-10 text-center text-sm text-slate-400">
          Nenhuma atividade com datas para exibir.
        </p>

        <div
          v-for="row in rows"
          :key="row.item.id"
          class="grid grid-cols-[200px_1fr] items-center gap-4 border-t border-slate-100 py-3"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-slate-900">{{ row.item.atividade }}</p>
            <p
              v-if="row.item.observacoes"
              class="mt-1 line-clamp-2 text-xs text-slate-500"
              :title="row.item.observacoes"
            >
              {{ row.item.observacoes }}
            </p>
          </div>

          <div class="relative h-8">
            <div
              class="absolute inset-y-1 rounded-md shadow-sm transition"
              :class="[
                STATUS_BAR_COLORS[row.item.status],
                row.item.status === 'em_progresso' ? 'animate-pulse' : '',
              ]"
              :style="{
                left: `${row.left}%`,
                width: `${Math.max(row.width, 2)}%`,
              }"
              :title="formatDeadlineBR(row.item)"
            />
            <div
              class="pointer-events-none absolute inset-0 grid"
              :style="{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }"
            >
              <div
                v-for="month in months"
                :key="month.key"
                class="border-l border-dashed border-slate-100 first:border-l-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="item in itemsWithDates"
        :key="item.id"
        class="rounded-lg border bg-white p-3 shadow-sm"
        :class="STATUS_COLUMN_STYLES[item.status].border"
      >
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full" :class="STATUS_BAR_COLORS[item.status]" />
          <p class="text-sm font-medium text-slate-900">{{ item.atividade }}</p>
        </div>
        <p class="mt-1 text-xs text-slate-500">
          Início → Fim: {{ formatDateBR(item.data_back_banco) }} → {{ formatDeadlineBR(item) }}
        </p>
        <p v-if="item.observacoes" class="mt-2 text-xs text-slate-600">
          {{ item.observacoes }}
        </p>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatDateBR, monthLabel, parseDate, startOfMonth } from "@/lib/format";
import { formatDeadlineBR, getDeadlineDate } from "@/lib/deadlines";
import {
  KANBAN_ORDER,
  STATUS_BAR_COLORS,
  STATUS_COLUMN_STYLES,
  STATUS_LABELS,
  type CronogramaAtividade,
} from "@/types/cronograma";

const props = defineProps<{
  items: CronogramaAtividade[];
}>();

const itemsWithDates = computed(() =>
  props.items.filter((i) => i.data_back_banco || i.data_front),
);

const range = computed(() => {
  const dates = itemsWithDates.value.flatMap((item) => {
    const start = parseDate(item.data_back_banco) ?? parseDate(item.data_front);
    const end = parseDate(item.data_front) ?? parseDate(item.data_back_banco);
    return [start, end].filter((d): d is Date => d !== null);
  });

  if (dates.length === 0) {
    const now = new Date();
    return { start: startOfMonth(now), end: startOfMonth(now) };
  }

  const start = startOfMonth(new Date(Math.min(...dates.map((d) => d.getTime()))));
  const end = startOfMonth(new Date(Math.max(...dates.map((d) => d.getTime()))));
  return { start, end };
});

const months = computed(() => {
  const list: { key: string; label: string; start: Date }[] = [];
  const cursor = new Date(range.value.start);

  while (cursor <= range.value.end) {
    list.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: monthLabel(cursor),
      start: new Date(cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return list;
});

const totalMs = computed(() => {
  const end = new Date(range.value.end);
  end.setMonth(end.getMonth() + 1);
  return end.getTime() - range.value.start.getTime();
});

const rows = computed(() =>
  itemsWithDates.value.map((item) => {
    const start = getDeadlineDate({ data_front: item.data_back_banco, hora_fim: null }) ?? parseDate(item.data_back_banco)!;
    const end = getDeadlineDate(item) ?? parseDate(item.data_front)!;
    const rangeStart = range.value.start.getTime();
    const left = ((start.getTime() - rangeStart) / totalMs.value) * 100;
    const width = ((end.getTime() - start.getTime()) / totalMs.value) * 100;

    return { item, left: Math.max(0, left), width: Math.max(width, 1.5) };
  }),
);
</script>
