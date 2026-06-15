<template>
  <div class="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
    <button
      v-for="mode in modes"
      :key="mode.value"
      type="button"
      class="rounded-md px-3 py-1.5 text-sm font-medium transition"
      :class="
        modelValue === mode.value
          ? 'bg-emerald-800 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50'
      "
      @click="emit('update:modelValue', mode.value)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ViewMode } from "@/types/cronograma";

defineProps<{
  modelValue: ViewMode;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ViewMode];
}>();

const modes: { value: ViewMode; label: string }[] = [
  { value: "kanban", label: "Kanban" },
  { value: "calendario", label: "Calendário" },
  { value: "lista", label: "Lista" },
];
</script>
