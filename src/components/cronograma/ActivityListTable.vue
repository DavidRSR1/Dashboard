<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[800px] text-left text-sm">
      <thead>
        <tr class="bg-slate-50 text-slate-600">
          <th class="px-4 py-3 font-semibold">Atividade</th>
          <th class="px-4 py-3 font-semibold">Início</th>
          <th class="px-4 py-3 font-semibold">Fim / Horário</th>
          <th v-if="showDeadline" class="px-4 py-3 font-semibold">Prazo</th>
          <th class="px-4 py-3 font-semibold">Status</th>
          <th class="px-4 py-3 font-semibold">Observações</th>
          <th class="px-4 py-3 font-semibold">PR</th>
          <th v-if="!readonly" class="px-4 py-3 font-semibold">Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td :colspan="readonly ? (showDeadline ? 7 : 6) : showDeadline ? 8 : 7" class="px-4 py-8 text-center text-slate-400">
            Nenhuma atividade nesta seção.
          </td>
        </tr>
        <tr
          v-for="(item, index) in items"
          v-else
          :key="item.id"
          :class="
            isOverdue(item)
              ? 'bg-red-50'
              : index % 2 === 0
                ? 'bg-white'
                : 'bg-slate-50/50'
          "
        >
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :class="isOverdue(item) ? 'bg-red-500' : STATUS_BAR_COLORS[item.status]"
              />
              <span class="font-medium" :class="isOverdue(item) ? 'text-red-950' : 'text-slate-900'">
                {{ item.atividade }}
              </span>
            </div>
          </td>
          <td class="px-4 py-3" :class="isOverdue(item) ? 'text-red-800/80' : 'text-slate-600'">
            {{ formatDateBR(item.data_back_banco) }}
          </td>
          <td class="px-4 py-3" :class="isOverdue(item) ? 'text-red-800/80' : 'text-slate-600'">
            {{ formatDeadlineBR(item) }}
          </td>
          <td v-if="showDeadline" class="px-4 py-3">
            <span
              v-if="deadlineLabel(item)"
              class="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium"
              :class="
                isApproaching(item)
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              "
            >
              {{ deadlineLabel(item) }}
            </span>
            <span v-else class="text-slate-300">—</span>
          </td>
          <td class="px-4 py-3">
            <span
              class="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium"
              :class="STATUS_COLORS[item.status]"
            >
              {{ STATUS_LABELS[item.status] }}
            </span>
          </td>
          <td class="max-w-xs px-4 py-3 text-slate-600">
            <span v-if="item.observacoes">{{ item.observacoes }}</span>
            <span v-else class="italic text-slate-400">—</span>
          </td>
          <td class="px-4 py-3">
            <a
              v-if="item.pr_url"
              :href="item.pr_url"
              target="_blank"
              rel="noreferrer"
              class="text-emerald-700 hover:underline"
            >
              Ver PR
            </a>
            <span v-else class="text-slate-300">—</span>
          </td>
          <td v-if="!readonly" class="px-4 py-3">
            <div class="flex gap-2">
              <button
                class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                @click="emit('edit', item)"
              >
                Editar
              </button>
              <button
                class="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                @click="emit('delete', item)"
              >
                Excluir
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatDateBR } from "@/lib/format";
import {
  formatDeadlineBR,
  formatTimeUntil,
  getDeadlineDate,
  isActivityOverdue,
  isActivityPending,
  isApproachingDeadline,
} from "@/lib/deadlines";
import { useCronogramaNow } from "@/composables/useCronogramaNow";
import type { ReminderOffset } from "@/types/notifications";
import {
  STATUS_BAR_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  type CronogramaAtividade,
} from "@/types/cronograma";

const props = withDefaults(
  defineProps<{
    items: CronogramaAtividade[];
    readonly?: boolean;
    reminderOffsets?: ReminderOffset[];
  }>(),
  { readonly: false, reminderOffsets: () => [] },
);

const emit = defineEmits<{
  edit: [item: CronogramaAtividade];
  delete: [item: CronogramaAtividade];
}>();

const now = useCronogramaNow();

const showDeadline = computed(() => props.reminderOffsets.length > 0);

function isOverdue(item: CronogramaAtividade): boolean {
  return isActivityOverdue(item, now.value);
}

function deadlineLabel(item: CronogramaAtividade): string | null {
  if (!isActivityPending(item.status) || props.reminderOffsets.length === 0) return null;
  const deadline = getDeadlineDate(item);
  if (!deadline || deadline <= now.value) return null;
  return formatTimeUntil(deadline, now.value);
}

function isApproaching(item: CronogramaAtividade): boolean {
  if (!isActivityPending(item.status) || props.reminderOffsets.length === 0) return false;
  return isApproachingDeadline(item, props.reminderOffsets, now.value);
}
</script>
