<template>
  <div class="rounded-xl border bg-white p-4 shadow-sm" :class="borderClass">
    <p class="text-sm font-medium text-slate-500">{{ label }}</p>
    <p class="mt-1 text-3xl font-bold" :class="valueClass">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  label: string;
  value: number;
  accent: "amber" | "blue" | "emerald" | "slate";
}>();

const borderClass = computed(() => {
  const map = {
    amber: "border-amber-200",
    blue: "border-blue-200",
    emerald: "border-emerald-200",
    slate: "border-slate-200",
  };
  return map[props.accent];
});

const valueClass = computed(() => {
  const map = {
    amber: "text-amber-700",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    slate: "text-slate-700",
  };
  return map[props.accent];
});
</script>
