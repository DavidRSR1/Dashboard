<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0 flex-1 space-y-2">
        <p class="text-sm text-slate-600">
          Base de conhecimento = incidentes já registrados. Busque um caso parecido e reutilize ao
          atender.
        </p>
        <label class="sr-only" for="incident-glossary-search">Buscar incidentes</label>
        <input
          id="incident-glossary-search"
          v-model="search"
          type="search"
          placeholder="Buscar por título, descrição, resolução, módulo ou solicitante..."
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />
      </div>
      <label class="flex items-center gap-2 text-xs text-slate-600">
        <input v-model="onlyResolved" type="checkbox" class="rounded border-slate-300" />
        Só resolvidos
      </label>
    </div>

    <p v-if="filtered.length === 0" class="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
      {{
        errors.length === 0
          ? "Nenhum incidente ainda. Os registros da aba Incidentes passam a alimentar este glossário."
          : "Nenhum incidente corresponde à busca."
      }}
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="item in filtered"
        :key="item.id"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        :class="highlightId === item.id ? 'ring-2 ring-emerald-300' : ''"
      >
        <button
          type="button"
          class="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
          @click="toggle(item.id)"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-900">{{ item.title }}</p>
            <p class="mt-0.5 text-xs text-slate-500">
              <span v-if="item.module">{{ item.module }} · </span>
              {{ formatDateTimeBR(item.occurred_at) }}
              <span v-if="item.resolution"> · {{ preview(item.resolution) }}</span>
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1">
            <span
              class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              :class="SUPPORT_ERROR_STATUS_COLORS[item.status]"
            >
              {{ SUPPORT_ERROR_STATUS_LABELS[item.status] }}
            </span>
            <span class="text-xs text-slate-400">
              {{ expandedId === item.id ? "Recolher" : "Expandir" }}
            </span>
          </div>
        </button>

        <div v-if="expandedId === item.id" class="space-y-3 border-t border-slate-100 px-4 py-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</p>
            <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">{{ item.description }}</p>
          </div>
          <div v-if="item.resolution">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolução</p>
            <p class="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{{ item.resolution }}</p>
          </div>
          <p class="text-xs text-slate-500">
            <span v-if="item.requester">Solicitante: {{ item.requester }} · </span>
            Severidade: {{ SUPPORT_ERROR_SEVERITY_LABELS[item.severity] }}
            <span v-if="agentOf(item.created_by_id ?? item.agent_id)">
              · Registrou: {{ agentOf(item.created_by_id ?? item.agent_id)?.name }}
            </span>
          </p>

          <div class="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              class="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
              @click="emit('use', item)"
            >
              Usar ao registrar
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              @click="emit('view', item)"
            >
              Ver completo
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { formatDateTimeBR } from "@/lib/format";
import {
  SUPPORT_ERROR_SEVERITY_LABELS,
  SUPPORT_ERROR_STATUS_COLORS,
  SUPPORT_ERROR_STATUS_LABELS,
  type SupportAgent,
  type SupportError,
} from "@/types/supportErrors";

const props = defineProps<{
  errors: SupportError[];
  agents: SupportAgent[];
  highlightId?: string | null;
}>();

const emit = defineEmits<{
  use: [error: SupportError];
  view: [error: SupportError];
}>();

const search = ref("");
const onlyResolved = ref(true);
const expandedId = ref<string | null>(null);

const agentsMap = computed(() => new Map(props.agents.map((agent) => [agent.id, agent])));

const filtered = computed(() => {
  let list = [...props.errors];
  if (onlyResolved.value) {
    list = list.filter((item) => item.status === "resolvido" && Boolean(item.resolution?.trim()));
  }

  const q = search.value.trim().toLowerCase();
  if (q) {
    list = list.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.resolution ?? "",
        item.module,
        item.requester ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return list.sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
});

watch(
  () => props.highlightId,
  (id) => {
    if (id) {
      expandedId.value = id;
      onlyResolved.value = false;
    }
  },
  { immediate: true },
);

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

function agentOf(id: string | null) {
  if (!id) return null;
  return agentsMap.value.get(id) ?? null;
}

function preview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
}
</script>
