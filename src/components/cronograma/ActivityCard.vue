<template>
  <article
    class="rounded-lg border p-3 shadow-sm transition hover:shadow-md"
    :class="[
      isOverdue
        ? 'border-red-200 bg-red-50/90'
        : ['border bg-white', STATUS_COLUMN_STYLES[item.status].border],
      !isOverdue && item.status === 'em_progresso' ? 'ring-2 ring-amber-300 ring-offset-1' : '',
    ]"
  >
    <div class="flex gap-2">
      <div
        class="w-1.5 shrink-0 rounded-full"
        :class="[
          isOverdue ? 'bg-red-500' : STATUS_BAR_COLORS[item.status],
          !isOverdue && item.status === 'em_progresso' ? 'animate-pulse' : '',
        ]"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3
            class="text-sm font-semibold leading-snug"
            :class="isOverdue ? 'text-red-950' : 'text-slate-900'"
          >
            {{ item.atividade }}
          </h3>
          <span
            v-if="showStatus"
            class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium"
            :class="STATUS_COLORS[item.status]"
          >
            {{ STATUS_LABELS[item.status] }}
          </span>
        </div>

        <div
          class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs"
          :class="isOverdue ? 'text-red-800/80' : 'text-slate-500'"
        >
          <span>Início: {{ formatDateBR(item.data_back_banco) }}</span>
          <span>Fim: {{ formatDeadlineBR(item) }}</span>
          <span v-if="item.status === 'pronto' && item.concluido_em">
            Concluído: {{ formatDateTimeBR(item.concluido_em) }}
          </span>
        </div>

        <p
          v-if="deadlineHint"
          class="mt-2 rounded-md border px-2 py-1 text-xs font-medium"
          :class="
            isApproaching
              ? 'border-amber-300 bg-amber-100 text-amber-900'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          "
        >
          {{ deadlineHint }}
        </p>

        <p
          v-if="item.observacoes"
          class="mt-2 rounded-md border px-2 py-1.5 text-xs leading-relaxed"
          :class="
            isOverdue
              ? 'border-red-100 bg-red-50 text-red-900'
              : 'border-slate-100 bg-slate-50 text-slate-600'
          "
        >
          <span class="font-medium" :class="isOverdue ? 'text-red-700' : 'text-slate-500'">Obs:</span>
          {{ item.observacoes }}
        </p>
        <p v-else class="mt-2 text-xs italic" :class="isOverdue ? 'text-red-400' : 'text-slate-400'">
          Sem observações
        </p>

        <a
          v-if="item.pr_url"
          :href="item.pr_url"
          target="_blank"
          rel="noreferrer"
          class="mt-2 inline-block text-xs font-medium hover:underline"
          :class="isOverdue ? 'text-red-800' : 'text-emerald-700'"
        >
          Ver PR →
        </a>

        <div
          v-if="$slots.actions"
          class="mt-3 flex gap-2 border-t pt-2"
          :class="isOverdue ? 'border-red-100' : 'border-slate-100'"
        >
          <slot name="actions" />
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { formatDateBR, formatDateTimeBR } from "@/lib/format";
import {
  formatDeadlineBR,
  formatTimeUntil,
  getDeadlineDate,
  isActivityOverdue,
  isActivityPending,
  isApproachingDeadline,
} from "@/lib/deadlines";
import { useCronogramaNow } from "@/composables/useCronogramaNow";
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

const now = useCronogramaNow();

const isOverdue = computed(() => isActivityOverdue(props.item, now.value));

const deadlineHint = computed(() => {
  if (!isActivityPending(props.item.status) || props.reminderOffsets.length === 0) return null;
  const deadline = getDeadlineDate(props.item);
  if (!deadline || deadline <= now.value) return null;
  return `Prazo em ${formatTimeUntil(deadline, now.value)}`;
});

const isApproaching = computed(() => {
  if (!isActivityPending(props.item.status) || props.reminderOffsets.length === 0) return false;
  return isApproachingDeadline(props.item, props.reminderOffsets, now.value);
});
</script>
