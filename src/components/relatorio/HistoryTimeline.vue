<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <label class="text-sm font-medium text-slate-700">Filtrar:</label>
      <select
        v-model="filterTipo"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
      >
        <option value="todos">Todos os eventos</option>
        <option value="criada">Criações</option>
        <option value="status_alterado">Mudanças de status</option>
        <option value="pronto">Conclusões (Pronto)</option>
      </select>
      <select
        v-model="filterWeeks"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
      >
        <option :value="1">Última semana</option>
        <option :value="2">Últimas 2 semanas</option>
        <option :value="4">Últimas 4 semanas</option>
        <option :value="8">Últimas 8 semanas</option>
        <option :value="0">Todo o histórico</option>
      </select>
    </div>

    <p v-if="filteredEvents.length === 0" class="py-12 text-center text-slate-500">
      Nenhum evento encontrado para os filtros selecionados.
    </p>

    <ol v-else class="relative space-y-0 border-l-2 border-emerald-200 pl-6">
      <li
        v-for="event in filteredEvents"
        :key="event.id"
        class="relative pb-6 last:pb-0"
      >
        <span
          class="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full border-2 border-white"
          :class="dotClass(event)"
        />
        <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p class="text-sm font-medium text-slate-900">
            {{ getEventLabel(event, atividadeMap.get(event.atividade_id)) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            {{ formatDateTimeBR(event.created_at) }}
            <span v-if="event.dados.categoria" class="ml-2 rounded bg-slate-100 px-1.5 py-0.5">
              {{ event.dados.categoria }}
            </span>
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { formatDateTimeBR } from "@/lib/format";
import { getEventLabel } from "@/lib/weeklyReport";
import type { CronogramaAtividade, CronogramaEvento } from "@/types/cronograma";

const props = defineProps<{
  atividades: CronogramaAtividade[];
  eventos: CronogramaEvento[];
}>();

const filterTipo = ref<"todos" | "criada" | "status_alterado" | "pronto">("todos");
const filterWeeks = ref(4);

const atividadeMap = computed(
  () => new Map(props.atividades.map((a) => [a.id, a])),
);

const filteredEvents = computed(() => {
  let list = [...props.eventos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (filterWeeks.value > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filterWeeks.value * 7);
    list = list.filter((e) => new Date(e.created_at) >= cutoff);
  }

  if (filterTipo.value === "criada") {
    list = list.filter((e) => e.tipo === "criada");
  } else if (filterTipo.value === "status_alterado") {
    list = list.filter((e) => e.tipo === "status_alterado");
  } else if (filterTipo.value === "pronto") {
    list = list.filter(
      (e) => e.tipo === "status_alterado" && e.dados.status_novo === "pronto",
    );
  }

  return list;
});

function dotClass(event: CronogramaEvento): string {
  if (event.tipo === "criada") return "bg-blue-500";
  if (event.dados.status_novo === "pronto") return "bg-emerald-500";
  if (event.tipo === "status_alterado") return "bg-amber-500";
  return "bg-slate-400";
}
</script>
