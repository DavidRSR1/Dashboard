<template>
  <span
    v-if="agent"
    class="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium"
    :class="color.badge"
    :title="title ?? agent.name"
  >
    <span class="h-2 w-2 shrink-0 rounded-full" :class="color.dot" />
    <span class="truncate">{{ prefix ? `${prefix} ${agent.name}` : agent.name }}</span>
  </span>
  <span
    v-else-if="fallback"
    class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500"
  >
    {{ fallback }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  SUPPORT_AGENT_COLOR_MAP,
  type SupportAgent,
  type SupportAgentColorId,
} from "@/types/supportErrors";

const props = defineProps<{
  agent: SupportAgent | null | undefined;
  prefix?: string;
  title?: string;
  fallback?: string;
}>();

const color = computed(() => {
  const id: SupportAgentColorId = props.agent?.colorId ?? "teal";
  return SUPPORT_AGENT_COLOR_MAP[id];
});
</script>
