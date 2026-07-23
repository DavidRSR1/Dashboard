<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
  >
    <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Gerenciar categorias</h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Renomeie (atualiza as atividades) ou arquive para ocultar dos filtros.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          @click="emit('close')"
        >
          Fechar
        </button>
      </div>

      <form class="mt-4 flex flex-wrap gap-2" @submit.prevent="handleCreate">
        <input
          v-model="newName"
          type="text"
          required
          placeholder="Nova categoria"
          class="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />
        <button
          type="submit"
          class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Adicionar
        </button>
      </form>

      <p v-if="message" class="mt-2 text-sm" :class="messageError ? 'text-red-600' : 'text-emerald-700'">
        {{ message }}
      </p>

      <label class="mt-4 flex items-center gap-2 text-xs text-slate-600">
        <input v-model="showArchived" type="checkbox" class="rounded border-slate-300" />
        Mostrar arquivadas
      </label>

      <ul class="mt-3 space-y-2">
        <li
          v-for="item in visibleItems"
          :key="item.id"
          class="rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <div v-if="editingId === item.id" class="flex flex-wrap gap-2">
            <input
              v-model="editingName"
              type="text"
              class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
            />
            <button
              type="button"
              class="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
              @click="saveRename(item)"
            >
              Salvar
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-white"
              @click="cancelEdit"
            >
              Cancelar
            </button>
          </div>
          <div v-else class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-sm font-medium text-slate-900">
                {{ item.name }}
                <span
                  v-if="item.archived_at"
                  class="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600"
                >
                  Arquivada
                </span>
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="text-xs font-medium text-emerald-800 hover:underline"
                @click="startEdit(item)"
              >
                Renomear
              </button>
              <button
                v-if="!item.archived_at"
                type="button"
                class="text-xs font-medium text-amber-700 hover:underline"
                @click="archive(item)"
              >
                Arquivar
              </button>
              <button
                v-else
                type="button"
                class="text-xs font-medium text-blue-700 hover:underline"
                @click="unarchive(item)"
              >
                Restaurar
              </button>
            </div>
          </div>
        </li>
      </ul>

      <p v-if="visibleItems.length === 0" class="mt-4 text-sm text-slate-400">
        Nenhuma categoria para exibir.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { CronogramaCategoria } from "@/lib/cronogramaCategories";

const props = defineProps<{
  open: boolean;
  categorias: CronogramaCategoria[];
}>();

const emit = defineEmits<{
  close: [];
  create: [name: string];
  rename: [payload: { id: string; oldName: string; newName: string }];
  archive: [id: string];
  unarchive: [id: string];
}>();

const newName = ref("");
const showArchived = ref(false);
const editingId = ref<string | null>(null);
const editingName = ref("");
const message = ref<string | null>(null);
const messageError = ref(false);

const visibleItems = computed(() =>
  props.categorias.filter((item) => showArchived.value || !item.archived_at),
);

watch(
  () => props.open,
  (open) => {
    if (!open) {
      cancelEdit();
      message.value = null;
      newName.value = "";
    }
  },
);

function startEdit(item: CronogramaCategoria) {
  editingId.value = item.id;
  editingName.value = item.name;
  message.value = null;
}

function cancelEdit() {
  editingId.value = null;
  editingName.value = "";
}

function handleCreate() {
  const trimmed = newName.value.trim();
  if (!trimmed) return;
  emit("create", trimmed);
  newName.value = "";
}

function saveRename(item: CronogramaCategoria) {
  const trimmed = editingName.value.trim();
  if (!trimmed) {
    messageError.value = true;
    message.value = "Informe o novo nome.";
    return;
  }
  emit("rename", { id: item.id, oldName: item.name, newName: trimmed });
  cancelEdit();
}

function archive(item: CronogramaCategoria) {
  if (!confirm(`Arquivar a categoria “${item.name}”? Ela some dos filtros, mas as atividades permanecem.`)) {
    return;
  }
  emit("archive", item.id);
}

function unarchive(item: CronogramaCategoria) {
  emit("unarchive", item.id);
}
</script>
