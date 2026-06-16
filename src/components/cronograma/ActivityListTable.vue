<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[800px] text-left text-sm">
      <thead>
        <tr class="bg-slate-50 text-slate-600">
          <th class="px-4 py-3 font-semibold">Atividade</th>
          <th class="px-4 py-3 font-semibold">Início</th>
          <th class="px-4 py-3 font-semibold">Fim / Horário</th>
          <th class="px-4 py-3 font-semibold">Status</th>
          <th class="px-4 py-3 font-semibold">Observações</th>
          <th class="px-4 py-3 font-semibold">PR</th>
          <th v-if="!readonly" class="px-4 py-3 font-semibold">Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td :colspan="readonly ? 6 : 7" class="px-4 py-8 text-center text-slate-400">
            Nenhuma atividade nesta seção.
          </td>
        </tr>
        <tr
          v-for="(item, index) in items"
          v-else
          :key="item.id"
          :class="index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'"
        >
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="STATUS_BAR_COLORS[item.status]" />
              <span class="font-medium text-slate-900">{{ item.atividade }}</span>
            </div>
          </td>
          <td class="px-4 py-3 text-slate-600">{{ formatDateBR(item.data_back_banco) }}</td>
          <td class="px-4 py-3 text-slate-600">{{ formatDeadlineBR(item) }}</td>
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
import { formatDateBR } from "@/lib/format";
import { formatDeadlineBR } from "@/lib/deadlines";
import {
  STATUS_BAR_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  type CronogramaAtividade,
} from "@/types/cronograma";

defineProps<{
  items: CronogramaAtividade[];
  readonly?: boolean;
}>();

const emit = defineEmits<{
  edit: [item: CronogramaAtividade];
  delete: [item: CronogramaAtividade];
}>();
</script>
