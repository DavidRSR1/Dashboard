<template>
  <article
    class="rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md"
    :class="[
      STATUS_COLUMN_STYLES[item.status].border,
      item.status === 'em_progresso' ? 'ring-2 ring-amber-300 ring-offset-1' : '',
    ]"
  >
    <div class="flex gap-2">
      <div
        class="w-1.5 shrink-0 rounded-full"
        :class="[
          STATUS_BAR_COLORS[item.status],
          item.status === 'em_progresso' ? 'animate-pulse' : '',
        ]"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-sm font-semibold leading-snug text-slate-900">{{ item.atividade }}</h3>
          <span
            v-if="showStatus"
            class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium"
            :class="STATUS_COLORS[item.status]"
          >
            {{ STATUS_LABELS[item.status] }}
          </span>
        </div>

        <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>Início: {{ formatDateBR(item.data_back_banco) }}</span>
          <span>Fim: {{ formatDeadlineBR(item) }}</span>
        </div>

        <p
          v-if="deadlineHint"
          class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
        >
          {{ deadlineHint }}
        </p>

        <p
          v-if="item.observacoes"
          class="mt-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs leading-relaxed text-slate-600"
        >
          <span class="font-medium text-slate-500">Obs:</span> {{ item.observacoes }}
        </p>
        <p v-else class="mt-2 text-xs italic text-slate-400">Sem observações</p>

        <a
          v-if="item.pr_url"
          :href="item.pr_url"
          target="_blank"
          rel="noreferrer"
          class="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline"
        >
          Ver PR →
        </a>

        <div v-if="$slots.actions" class="mt-3 flex gap-2 border-t border-slate-100 pt-2">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { formatDateBR } from "@/lib/format";
import { formatDeadlineBR, formatTimeUntil, getDeadlineDate, isActivityPending } from "@/lib/deadlines";
import { computed } from "vue";
import type { ReminderOffset } from "@/types/notifications";
import {
  STATUS_BAR_COLORS,
  STATUS_COLORS,
  STATUS_COLUMN_STYLES,
  STATUS_LABELS,
  type CronogramaAtividade,
} from "@/types/cronograma";

const props = withDefaults(
  defineProps<{
    item: CronogramaAtividade;
    showStatus?: boolean;
    reminderOffsets?: ReminderOffset[];
  }>(),
  { showStatus: false, reminderOffsets: () => [] },
);

const deadlineHint = computed(() => {
  if (!isActivityPending(props.item.status) || props.reminderOffsets.length === 0) return null;
  const deadline = getDeadlineDate(props.item);
  if (!deadline || deadline <= new Date()) return null;
  return `Prazo em ${formatTimeUntil(deadline)}`;
});
</script>
