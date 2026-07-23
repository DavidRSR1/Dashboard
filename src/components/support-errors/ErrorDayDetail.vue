<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">
          Erros em {{ label }}
        </h3>
        <p class="mt-0.5 text-xs text-slate-500">
          {{ errors.length }} ocorrência(s) nesta data
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
          @click="emit('add')"
        >
          + Registrar neste dia
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          @click="emit('clear')"
        >
          Fechar
        </button>
      </div>
    </div>

    <p v-if="errors.length === 0" class="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      Nenhum erro neste dia.
      <button
        type="button"
        class="mt-3 block w-full text-sm font-medium text-emerald-800 hover:underline"
        @click="emit('add')"
      >
        Registrar o primeiro erro desta data
      </button>
    </p>

    <ul v-else class="mt-4 space-y-3">
      <li
        v-for="item in errors"
        :key="item.id"
        class="rounded-lg border border-slate-200 bg-slate-50 p-3"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-slate-900">{{ item.title }}</p>
            <p class="mt-1 whitespace-pre-wrap text-sm text-slate-700">{{ item.description }}</p>
            <p
              v-if="item.resolution"
              class="mt-2 rounded-md border border-emerald-100 bg-emerald-50/70 px-2.5 py-2 text-xs text-emerald-900"
            >
              <span class="font-semibold">Resolução:</span>
              {{ item.resolution }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {{ formatDateTimeBR(item.occurred_at) }} · {{ item.module }}
              <span v-if="item.requester"> · {{ item.requester }}</span>
            </p>
            <button
              v-if="item.related_error_id"
              type="button"
              class="mt-1 text-xs font-medium text-emerald-800 underline hover:no-underline"
              @click="emit('open-related', item.related_error_id)"
            >
              Ver incidente de referência{{ relatedTitle(item.related_error_id) }}
            </button>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <SupportAgentBadge
                v-if="agentOf(item.created_by_id ?? item.agent_id)"
                :agent="agentOf(item.created_by_id ?? item.agent_id)"
                prefix="Registrou:"
              />
              <SupportAgentBadge
                v-if="agentOf(item.agent_id) && item.agent_id !== (item.created_by_id ?? item.agent_id)"
                :agent="agentOf(item.agent_id)"
                prefix="Resp.:"
              />
              <SupportAgentBadge
                v-if="item.status === 'resolvido' && agentOf(item.resolved_by_id)"
                :agent="agentOf(item.resolved_by_id)"
                prefix="Resolveu:"
              />
              <SupportAgentBadge
                v-if="item.status === 'encaminhado_n2' && agentOf(item.transferred_by_id)"
                :agent="agentOf(item.transferred_by_id)"
                prefix="Transferiu:"
              />
            </div>
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              :class="SUPPORT_ERROR_STATUS_COLORS[item.status]"
            >
              {{ SUPPORT_ERROR_STATUS_LABELS[item.status] }}
            </span>
            <span
              class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              :class="SUPPORT_ERROR_SEVERITY_COLORS[item.severity]"
            >
              {{ SUPPORT_ERROR_SEVERITY_LABELS[item.severity] }}
            </span>
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <template v-if="canManage(item)">
            <button
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              @click="emit('edit', item)"
            >
              Editar
            </button>
            <button
              type="button"
              class="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
              @click="emit('remove', item.id)"
            >
              Excluir
            </button>
          </template>
          <button
            v-else
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            @click="emit('view', item)"
          >
            Ver detalhes
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatDateBR, formatDateTimeBR } from "@/lib/format";
import { canManageSupportError } from "@/lib/supportErrors";
import {
  SUPPORT_ERROR_SEVERITY_COLORS,
  SUPPORT_ERROR_SEVERITY_LABELS,
  SUPPORT_ERROR_STATUS_COLORS,
  SUPPORT_ERROR_STATUS_LABELS,
  type SupportAgent,
  type SupportError,
} from "@/types/supportErrors";
import SupportAgentBadge from "@/components/support-errors/SupportAgentBadge.vue";

const props = defineProps<{
  dateKey: string;
  errors: SupportError[];
  agents: SupportAgent[];
  currentAgentId?: string | null;
  allErrors?: SupportError[];
}>();

const emit = defineEmits<{
  clear: [];
  add: [];
  edit: [error: SupportError];
  view: [error: SupportError];
  remove: [id: string];
  "open-related": [id: string];
}>();

const label = computed(() => formatDateBR(props.dateKey));

const agentsMap = computed(() => new Map(props.agents.map((agent) => [agent.id, agent])));
const relatedMap = computed(
  () => new Map((props.allErrors ?? props.errors).map((item) => [item.id, item])),
);

function agentOf(id: string | null) {
  if (!id) return null;
  return agentsMap.value.get(id) ?? null;
}

function canManage(item: SupportError) {
  return canManageSupportError(item, props.currentAgentId);
}

function relatedTitle(id: string | null) {
  if (!id) return "";
  const entry = relatedMap.value.get(id);
  return entry ? ` — ${entry.title}` : "";
}
</script>
