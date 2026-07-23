<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Resumo semanal</h3>
        <p class="text-xs text-slate-500">{{ summary.weekLabel }}</p>
      </div>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-slate-600">Ocorrências</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ summary.total }}</p>
      </div>
      <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-emerald-700">Resolvidos</p>
        <p class="mt-1 text-2xl font-bold text-emerald-900">{{ summary.resolved }}</p>
      </div>
      <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p class="text-xs font-medium uppercase text-blue-700">Taxa de resolução</p>
        <p class="mt-1 text-2xl font-bold text-blue-900">{{ summary.resolutionRate }}%</p>
      </div>
    </div>

    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <h4 class="text-xs font-semibold uppercase text-slate-500">Módulos mais frequentes</h4>
        <ul v-if="summary.topModules.length" class="mt-2 space-y-1.5">
          <li
            v-for="item in summary.topModules"
            :key="item.label"
            class="flex items-center justify-between gap-2 text-sm text-slate-700"
          >
            <span class="truncate">{{ item.label }}</span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {{ item.count }}
            </span>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-slate-400">Sem dados nesta semana.</p>
      </div>
      <div>
        <h4 class="text-xs font-semibold uppercase text-slate-500">Títulos mais frequentes</h4>
        <ul v-if="summary.topMessages.length" class="mt-2 space-y-1.5">
          <li
            v-for="item in summary.topMessages"
            :key="item.label"
            class="flex items-center justify-between gap-2 text-sm text-slate-700"
          >
            <span class="truncate" :title="item.label">{{ item.label }}</span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {{ item.count }}
            </span>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-slate-400">Sem dados nesta semana.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WeeklyErrorsSummary } from "@/lib/supportErrors";

defineProps<{
  summary: WeeklyErrorsSummary;
}>();
</script>
