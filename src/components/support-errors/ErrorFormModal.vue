<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
  >
    <div class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
      <h2 class="text-lg font-semibold text-slate-900">
        {{ initial ? "Editar erro" : "Registrar erro" }}
      </h2>

      <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Data e hora do evento</label>
          <input
            v-model="form.occurred_at"
            type="datetime-local"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">
            Descrição / mensagem de erro
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Módulo ou tela afetada</label>
          <input
            v-model="form.module"
            type="text"
            required
            placeholder="Ex.: Login, Cronograma, Relatório"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              v-model="form.status"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option
                v-for="opt in SUPPORT_ERROR_STATUS_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Severidade</label>
            <select
              v-model="form.severity"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option
                v-for="opt in SUPPORT_ERROR_SEVERITY_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">
            Usuário / solicitante (opcional)
          </label>
          <input
            v-model="form.requester"
            type="text"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="flex-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import {
  SUPPORT_ERROR_SEVERITY_OPTIONS,
  SUPPORT_ERROR_STATUS_OPTIONS,
  emptySupportErrorForm,
  type SupportError,
  type SupportErrorFormData,
} from "@/types/supportErrors";
import { formFromSupportError } from "@/lib/supportErrors";

const props = defineProps<{
  open: boolean;
  initial: SupportError | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [form: SupportErrorFormData];
}>();

const form = reactive<SupportErrorFormData>(emptySupportErrorForm());

watch(
  () => [props.open, props.initial] as const,
  ([open, initial]) => {
    if (!open) return;
    const next = initial ? formFromSupportError(initial) : emptySupportErrorForm();
    Object.assign(form, next);
  },
  { immediate: true },
);

function handleSubmit() {
  emit("save", { ...form });
}
</script>
