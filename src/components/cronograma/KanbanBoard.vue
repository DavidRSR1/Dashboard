<template>
  <div class="overflow-x-auto pb-2">
    <div class="grid min-w-[900px] grid-cols-4 gap-4">
      <div
        v-for="status in KANBAN_ORDER"
        :key="status"
        class="flex flex-col rounded-xl border bg-slate-50/80"
        :class="STATUS_COLUMN_STYLES[status].border"
      >
        <div
          class="flex items-center gap-2 rounded-t-xl border-b px-3 py-3"
          :class="STATUS_COLUMN_STYLES[status].header"
        >
          <span
            class="h-2.5 w-2.5 rounded-full"
            :class="[
              STATUS_COLUMN_STYLES[status].dot,
              status === 'em_progresso' ? 'animate-pulse' : '',
            ]"
          />
          <h3 class="text-sm font-semibold">{{ STATUS_LABELS[status] }}</h3>
          <span class="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">
            {{ byStatus[status].length }}
          </span>
        </div>

        <div class="flex flex-1 flex-col gap-3 p-3">
          <p
            v-if="byStatus[status].length === 0"
            class="py-8 text-center text-xs text-slate-400"
          >
            Nenhuma atividade
          </p>
          <ActivityCard
            v-for="item in byStatus[status]"
            :key="item.id"
            :item="item"
          >
            <template v-if="!readonly" #actions>
              <button
                class="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                @click="emit('edit', item)"
              >
                Editar
              </button>
              <button
                class="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                @click="emit('delete', item)"
              >
                Excluir
              </button>
            </template>
          </ActivityCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ActivityCard from "./ActivityCard.vue";
import {
  KANBAN_ORDER,
  STATUS_COLUMN_STYLES,
  STATUS_LABELS,
  type ActivityStatus,
  type CronogramaAtividade,
} from "@/types/cronograma";

const props = defineProps<{
  items: CronogramaAtividade[];
  readonly?: boolean;
}>();

const emit = defineEmits<{
  edit: [item: CronogramaAtividade];
  delete: [item: CronogramaAtividade];
}>();

const byStatus = computed(() => {
  const map: Record<ActivityStatus, CronogramaAtividade[]> = {
    nao_iniciado: [],
    iniciado: [],
    em_progresso: [],
    pronto: [],
  };

  for (const item of props.items) {
    map[item.status].push(item);
  }

  return map;
});
</script>
