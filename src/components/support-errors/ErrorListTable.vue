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
            <th class="px-2 py-2 font-semibold">Descrição</th>
            <th class="px-2 py-2 font-semibold">Módulo</th>
            <th class="px-2 py-2 font-semibold">Status</th>
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
              <p class="line-clamp-2">{{ item.description }}</p>
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
import { formatDateTimeBR } from "@/lib/format";
import {
  SUPPORT_ERROR_SEVERITY_COLORS,
  SUPPORT_ERROR_SEVERITY_LABELS,
  SUPPORT_ERROR_STATUS_COLORS,
  SUPPORT_ERROR_STATUS_LABELS,
  type SupportError,
} from "@/types/supportErrors";

defineProps<{
  errors: SupportError[];
}>();

const emit = defineEmits<{
  edit: [error: SupportError];
  remove: [id: string];
}>();
</script>
