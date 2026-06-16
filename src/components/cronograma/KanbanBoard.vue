<template>
  <div class="overflow-x-auto pb-2">
    <div class="grid min-w-[900px] grid-cols-4 gap-4">
      <div
        v-for="status in KANBAN_ORDER"
        :key="status"
        class="flex flex-col rounded-xl border bg-slate-50/80 transition"
        :class="[
          STATUS_COLUMN_STYLES[status].border,
          dragOverStatus === status ? 'ring-2 ring-emerald-400 ring-offset-1' : '',
        ]"
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

        <div
          class="flex min-h-[8rem] flex-1 flex-col gap-3 p-3 transition"
          :class="dragOverStatus === status ? 'bg-emerald-50/40' : ''"
          @dragover.prevent="onDragOver(status)"
          @dragleave="onDragLeave"
          @drop.prevent="onDrop(status)"
        >
          <p
            v-if="byStatus[status].length === 0"
            class="py-8 text-center text-xs text-slate-400"
          >
            {{ readonly ? "Nenhuma atividade" : "Arraste atividades para cá" }}
          </p>
          <div
            v-for="item in byStatus[status]"
            :key="item.id"
            :draggable="!readonly"
            class="transition"
            :class="[
              !readonly ? 'cursor-grab active:cursor-grabbing' : '',
              draggingItem?.id === item.id ? 'opacity-40' : '',
            ]"
            @dragstart="onDragStart($event, item)"
            @dragend="onDragEnd"
          >
            <ActivityCard :item="item" :reminder-offsets="reminderOffsets">
              <template v-if="!readonly" #actions>
                <button
                  type="button"
                  class="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                  @click="emit('edit', item)"
                >
                  Editar
                </button>
                <button
                  type="button"
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import ActivityCard from "./ActivityCard.vue";
import {
  KANBAN_ORDER,
  STATUS_COLUMN_STYLES,
  STATUS_LABELS,
  type ActivityStatus,
  type CronogramaAtividade,
} from "@/types/cronograma";
import type { ReminderOffset } from "@/types/notifications";

const props = defineProps<{
  items: CronogramaAtividade[];
  readonly?: boolean;
  reminderOffsets?: ReminderOffset[];
}>();

const emit = defineEmits<{
  edit: [item: CronogramaAtividade];
  delete: [item: CronogramaAtividade];
  statusChange: [item: CronogramaAtividade, status: ActivityStatus];
}>();

const draggingItem = ref<CronogramaAtividade | null>(null);
const dragOverStatus = ref<ActivityStatus | null>(null);

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

function onDragStart(event: DragEvent, item: CronogramaAtividade) {
  if (props.readonly) return;

  draggingItem.value = item;
  event.dataTransfer?.setData("text/plain", item.id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function onDragEnd() {
  draggingItem.value = null;
  dragOverStatus.value = null;
}

function onDragOver(status: ActivityStatus) {
  if (props.readonly || !draggingItem.value) return;
  dragOverStatus.value = status;
}

function onDragLeave() {
  dragOverStatus.value = null;
}

function onDrop(status: ActivityStatus) {
  if (props.readonly) return;

  const item = draggingItem.value;
  dragOverStatus.value = null;
  draggingItem.value = null;

  if (!item || item.status === status) return;
  emit("statusChange", item, status);
}
</script>
