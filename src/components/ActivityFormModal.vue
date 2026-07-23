<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
  >
    <div class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
      <h2 class="text-lg font-semibold text-slate-900">
        {{ initial ? "Editar atividade" : "Nova atividade" }}
      </h2>

      <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Atividade</label>
          <input
            v-model="form.atividade"
            type="text"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Início</label>
            <input
              v-model="form.data_back_banco"
              type="date"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Fim</label>
            <input
              v-model="form.data_front"
              type="date"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">
            Horário de fim (opcional)
          </label>
          <input
            v-model="form.hora_fim"
            type="time"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 sm:max-w-xs"
          />
          <p class="mt-1 text-xs text-slate-500">Se vazio, o prazo será às 23:59 do dia de fim.</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              v-model="form.status"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}{{ opt.description ? ` — ${opt.description}` : "" }}
              </option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
            <input
              v-model="form.categoria"
              type="text"
              list="cronograma-categorias-options"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
            <datalist id="cronograma-categorias-options">
              <option v-for="cat in categoryOptions" :key="cat" :value="cat" />
            </datalist>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">URL da PR (opcional)</label>
          <input
            v-model="form.pr_url"
            type="url"
            placeholder="https://github.com/..."
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Observações</label>
          <textarea
            v-model="form.observacoes"
            rows="3"
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
            Continuar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import {
  STATUS_OPTIONS,
  type CronogramaAtividade,
  type CronogramaFormData,
} from "@/types/cronograma";
import { toInputDate } from "@/lib/format";
import { toInputTime } from "@/lib/deadlines";

const props = defineProps<{
  open: boolean;
  initial?: CronogramaAtividade | null;
  categoryOptions?: string[];
}>();

const emit = defineEmits<{
  close: [];
  submit: [data: CronogramaFormData];
}>();

const categoryOptions = computed(() => props.categoryOptions ?? []);

const emptyForm = (): CronogramaFormData => ({
  atividade: "",
  data_back_banco: "",
  data_front: "",
  hora_fim: "",
  status: "nao_iniciado",
  categoria: categoryOptions.value[0] ?? "Gamificação",
  pr_url: "",
  observacoes: "",
});

const form = reactive<CronogramaFormData>(emptyForm());

watch(
  () => [props.open, props.initial] as const,
  () => {
    if (!props.open) return;

    if (props.initial) {
      Object.assign(form, {
        atividade: props.initial.atividade,
        data_back_banco: toInputDate(props.initial.data_back_banco),
        data_front: toInputDate(props.initial.data_front),
        hora_fim: toInputTime(props.initial.hora_fim),
        status: props.initial.status,
        categoria: props.initial.categoria,
        pr_url: props.initial.pr_url ?? "",
        observacoes: props.initial.observacoes ?? "",
      });
    } else {
      Object.assign(form, emptyForm());
    }
  },
  { immediate: true },
);

function handleSubmit() {
  emit("submit", { ...form });
}
</script>
