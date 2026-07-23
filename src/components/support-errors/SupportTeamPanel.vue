<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Time de suporte</h3>
        <p class="mt-0.5 text-xs text-slate-500">
          <template v-if="isMaster">
            Gerencie os membros e as cores. Identidade = parte do e-mail antes do @.
          </template>
          <template v-else>
            Veja o time e personalize a sua cor. Identidade = parte do e-mail antes do @.
          </template>
        </p>
      </div>
      <SupportAgentBadge v-if="currentAgent" :agent="currentAgent" prefix="Você:" />
    </div>

    <form
      v-if="isMaster"
      class="mt-4 flex flex-wrap gap-2"
      @submit.prevent="handleAdd"
    >
      <input
        v-model="emailOrUser"
        type="text"
        required
        placeholder="E-mail do colega (ex.: nome.sobrenome@...)"
        class="min-w-48 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
      />
      <select
        v-model="colorId"
        class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
      >
        <option value="">Cor automática</option>
        <option v-for="color in SUPPORT_AGENT_COLORS" :key="color.id" :value="color.id">
          {{ color.label }}
        </option>
      </select>
      <button
        type="submit"
        class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
      >
        Adicionar
      </button>
    </form>

    <p v-if="isMaster && error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="isMaster" class="mt-2 text-xs text-slate-400">
      O domínio é ignorado — fica só o usuário (ex.: david.oliveira).
    </p>

    <ul v-if="agents.length" class="mt-4 flex flex-wrap gap-2">
      <li
        v-for="agent in agents"
        :key="agent.id"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5"
      >
        <SupportAgentBadge :agent="agent" />
        <select
          v-if="canEditColor(agent.id)"
          class="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700"
          :value="agent.colorId"
          @change="onColorChange(agent.id, ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="color in SUPPORT_AGENT_COLORS" :key="color.id" :value="color.id">
            {{ color.label }}
          </option>
        </select>
        <span
          v-else
          class="text-[10px] uppercase tracking-wide text-slate-400"
        >
          {{ colorLabel(agent.colorId) }}
        </span>
        <button
          v-if="isMaster && (!currentAgent || agent.id !== currentAgent.id)"
          type="button"
          class="text-xs font-medium text-red-700 hover:underline"
          @click="emit('remove', agent.id)"
        >
          Remover
        </button>
      </li>
    </ul>
    <p v-else class="mt-4 text-sm text-slate-400">
      Nenhum membro no time ainda.
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  SUPPORT_AGENT_COLORS,
  SUPPORT_AGENT_COLOR_MAP,
  type SupportAgent,
  type SupportAgentColorId,
} from "@/types/supportErrors";
import SupportAgentBadge from "@/components/support-errors/SupportAgentBadge.vue";

const props = defineProps<{
  agents: SupportAgent[];
  currentAgent: SupportAgent | null;
  isMaster: boolean;
}>();

const emit = defineEmits<{
  add: [payload: { emailOrUser: string; colorId?: SupportAgentColorId }];
  "update-color": [payload: { id: string; colorId: SupportAgentColorId }];
  remove: [id: string];
}>();

const emailOrUser = ref("");
const colorId = ref<"" | SupportAgentColorId>("");
const error = ref<string | null>(null);

function canEditColor(agentId: string): boolean {
  if (props.isMaster) return true;
  return props.currentAgent?.id === agentId;
}

function colorLabel(id: SupportAgentColorId): string {
  return SUPPORT_AGENT_COLOR_MAP[id]?.label ?? id;
}

function handleAdd() {
  error.value = null;
  const trimmed = emailOrUser.value.trim();
  if (!trimmed) {
    error.value = "Informe o e-mail ou usuário do colega.";
    return;
  }
  emit("add", {
    emailOrUser: trimmed,
    colorId: colorId.value || undefined,
  });
  emailOrUser.value = "";
  colorId.value = "";
}

function onColorChange(id: string, value: string) {
  emit("update-color", { id, colorId: value as SupportAgentColorId });
}
</script>
