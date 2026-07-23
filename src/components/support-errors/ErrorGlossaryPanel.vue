<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <label class="sr-only" for="glossary-search">Buscar no glossário</label>
        <input
          id="glossary-search"
          v-model="search"
          type="search"
          placeholder="Buscar por título, sintomas, módulo ou solução..."
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />
      </div>
      <button
        type="button"
        class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        @click="emit('create')"
      >
        + Nova entrada
      </button>
    </div>

    <p v-if="filtered.length === 0" class="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
      {{
        entries.length === 0
          ? "Nenhuma entrada no glossário ainda. Documente erros recorrentes para agilizar o atendimento."
          : "Nenhuma entrada corresponde à busca."
      }}
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="entry in filtered"
        :key="entry.id"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <button
          type="button"
          class="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
          @click="toggle(entry.id)"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-900">{{ entry.title }}</p>
            <p class="mt-0.5 text-xs text-slate-500">
              <span v-if="entry.module">{{ entry.module }} · </span>
              {{ preview(entry.solution) }}
            </p>
          </div>
          <span class="shrink-0 text-xs text-slate-400">
            {{ expandedId === entry.id ? "Recolher" : "Expandir" }}
          </span>
        </button>

        <div v-if="expandedId === entry.id" class="space-y-3 border-t border-slate-100 px-4 py-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Sintomas</p>
            <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">{{ entry.symptoms }}</p>
          </div>
          <div v-if="entry.cause">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Causa</p>
            <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">{{ entry.cause }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Solução</p>
            <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">{{ entry.solution }}</p>
          </div>

          <div class="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              class="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
              @click="emit('use', entry)"
            >
              Usar ao registrar
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              @click="emit('edit', entry)"
            >
              Editar
            </button>
            <button
              type="button"
              class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              @click="emit('remove', entry.id)"
            >
              Excluir
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { filterGlossaryEntries } from "@/lib/supportGlossary";
import type { SupportGlossaryEntry } from "@/types/supportErrors";

const props = defineProps<{
  entries: SupportGlossaryEntry[];
  highlightId?: string | null;
}>();

const emit = defineEmits<{
  create: [];
  edit: [entry: SupportGlossaryEntry];
  remove: [id: string];
  use: [entry: SupportGlossaryEntry];
}>();

const search = ref("");
const expandedId = ref<string | null>(null);

const filtered = computed(() => filterGlossaryEntries(props.entries, search.value));

watch(
  () => props.highlightId,
  (id) => {
    if (id) expandedId.value = id;
  },
  { immediate: true },
);

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

function preview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Sem solução documentada";
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
}
</script>
