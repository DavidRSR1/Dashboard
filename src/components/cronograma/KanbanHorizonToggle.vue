<template>
  <div class="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
    <button
      v-for="opt in KANBAN_HORIZON_OPTIONS"
      :key="opt.value"
      type="button"
      :title="opt.hint"
      class="rounded-md px-3 py-1.5 text-sm font-medium transition"
      :class="
        modelValue === opt.value
          ? 'bg-emerald-800 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50'
      "
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { KANBAN_HORIZON_OPTIONS, type KanbanHorizon } from "@/lib/kanbanFilters";

defineProps<{
  modelValue: KanbanHorizon;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: KanbanHorizon];
}>();
</script>
