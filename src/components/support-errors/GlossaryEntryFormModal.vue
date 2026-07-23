<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
  >
    <div class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
      <h2 class="text-lg font-semibold text-slate-900">
        {{ initial ? "Editar entrada do glossário" : "Nova entrada do glossário" }}
      </h2>

      <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Título</label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="Nome curto do erro conhecido"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Módulo / tela</label>
          <input
            v-model="form.module"
            type="text"
            placeholder="Ex.: Login, Contas a pagar"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Sintomas</label>
          <textarea
            v-model="form.symptoms"
            rows="3"
            required
            placeholder="O que o usuário vê / como identificar o erro"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">
            Causa
            <span class="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            v-model="form.cause"
            rows="2"
            placeholder="Por que isso acontece"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Solução</label>
          <textarea
            v-model="form.solution"
            rows="3"
            required
            placeholder="Passos para resolver"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            :disabled="saving"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="flex-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            :disabled="saving"
          >
            {{ saving ? "Salvando..." : "Salvar" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  emptySupportGlossaryForm,
  type SupportGlossaryEntry,
  type SupportGlossaryFormData,
} from "@/types/supportErrors";
import { formFromGlossaryEntry } from "@/lib/supportGlossary";

const props = defineProps<{
  open: boolean;
  initial: SupportGlossaryEntry | null;
  saving?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [form: SupportGlossaryFormData];
}>();

const form = reactive<SupportGlossaryFormData>(emptySupportGlossaryForm());
const submitted = ref(false);

const saving = computed(() => Boolean(props.saving) || submitted.value);

watch(
  () => [props.open, props.initial] as const,
  ([open, initial]) => {
    if (!open) {
      submitted.value = false;
      return;
    }
    submitted.value = false;
    Object.assign(form, initial ? formFromGlossaryEntry(initial) : emptySupportGlossaryForm());
  },
  { immediate: true },
);

watch(
  () => props.saving,
  (value) => {
    if (!value) submitted.value = false;
  },
);

function handleSubmit() {
  if (saving.value) return;
  if (!form.title.trim() || !form.symptoms.trim() || !form.solution.trim()) return;
  submitted.value = true;
  emit("save", { ...form });
}
</script>
