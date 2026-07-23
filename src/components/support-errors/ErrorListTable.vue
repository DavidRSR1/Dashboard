<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-slate-900">Catálogo recente</h3>
      <p class="text-xs text-slate-500">{{ errors.length }} registro(s)</p>
    </div>

    <p v-if="errors.length === 0" class="mt-4 text-sm text-slate-500">
      Nenhum erro catalogado ainda. Use “Registrar erro” para começar.
    </p>

    <div v-else class="mt-4 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
            <th class="px-2 py-2 font-semibold">Data</th>
            <th class="px-2 py-2 font-semibold">Título</th>
            <th class="px-2 py-2 font-semibold">Módulo</th>
            <th class="px-2 py-2 font-semibold">Status</th>
            <th class="px-2 py-2 font-semibold">Time</th>
            <th class="px-2 py-2 font-semibold">Severidade</th>
            <th class="px-2 py-2 font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in errors"
            :key="item.id"
            class="border-b border-slate-100 align-top"
          >
            <td class="whitespace-nowrap px-2 py-2 text-slate-600">
              {{ formatDateTimeBR(item.occurred_at) }}
            </td>
            <td class="max-w-xs px-2 py-2 text-slate-800">
              <p class="font-medium">{{ item.title }}</p>
              <p class="mt-0.5 line-clamp-2 text-xs text-slate-600">{{ item.description }}</p>
              <p v-if="item.resolution" class="mt-1 line-clamp-2 text-xs text-emerald-700">
                Resolução: {{ item.resolution }}
              </p>
              <p v-if="item.requester" class="mt-0.5 text-xs text-slate-400">
                {{ item.requester }}
              </p>
            </td>
            <td class="px-2 py-2 text-slate-700">{{ item.module }}</td>
            <td class="px-2 py-2">
              <span
                class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                :class="SUPPORT_ERROR_STATUS_COLORS[item.status]"
              >
                {{ SUPPORT_ERROR_STATUS_LABELS[item.status] }}
              </span>
            </td>
            <td class="px-2 py-2">
              <div class="flex flex-col gap-1">
                <SupportAgentBadge
                  v-if="agentOf(item.agent_id)"
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
                <span
                  v-if="
                    !agentOf(item.agent_id) &&
                    !(item.status === 'resolvido' && agentOf(item.resolved_by_id)) &&
                    !(item.status === 'encaminhado_n2' && agentOf(item.transferred_by_id))
                  "
                  class="text-xs text-slate-400"
                >
                  —
                </span>
              </div>
            </td>
            <td class="px-2 py-2">
              <span
                class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                :class="SUPPORT_ERROR_SEVERITY_COLORS[item.severity]"
              >
                {{ SUPPORT_ERROR_SEVERITY_LABELS[item.severity] }}
              </span>
            </td>
            <td class="whitespace-nowrap px-2 py-2">
              <button
                type="button"
                class="mr-2 text-xs font-medium text-emerald-800 hover:underline"
                @click="emit('edit', item)"
              >
                Editar
              </button>
              <button
                type="button"
                class="text-xs font-medium text-red-700 hover:underline"
                @click="emit('remove', item.id)"
              >
                Excluir
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatDateTimeBR } from "@/lib/format";
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
  errors: SupportError[];
  agents: SupportAgent[];
}>();

const emit = defineEmits<{
  edit: [error: SupportError];
  remove: [id: string];
}>();

const agentsMap = computed(() => new Map(props.agents.map((agent) => [agent.id, agent])));

function agentOf(id: string | null) {
  if (!id) return null;
  return agentsMap.value.get(id) ?? null;
}
</script>
