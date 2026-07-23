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
          <label class="mb-1 block text-sm font-medium text-slate-700">
            Erro conhecido (glossário)
            <span class="font-normal text-slate-400">(opcional)</span>
          </label>
          <select
            v-model="form.glossary_id"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Sem vínculo</option>
            <option v-for="entry in glossary" :key="entry.id" :value="entry.id">
              {{ entry.title }}{{ entry.module ? ` — ${entry.module}` : "" }}
            </option>
          </select>
          <p class="mt-1 text-xs text-slate-500">
            Ao escolher, preenche campos vazios com sintomas e solução do manual.
          </p>
        </div>

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
          <label class="mb-1 block text-sm font-medium text-slate-700">Título</label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="Resumo curto do incidente"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Descrição</label>
          <textarea
            v-model="form.description"
            rows="3"
            required
            placeholder="Detalhe o erro, mensagem exibida, passos para reproduzir..."
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">
            Resolução / o que foi feito
            <span v-if="form.status !== 'resolvido'" class="font-normal text-slate-400">
              (opcional)
            </span>
          </label>
          <textarea
            v-model="form.resolution"
            rows="3"
            :required="form.status === 'resolvido'"
            placeholder="Ex.: limpei cache, reiniciei serviço, orientei o usuário a..."
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
            Responsável no suporte
          </label>
          <select
            v-model="form.agent_id"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Sem responsável</option>
            <option v-for="agent in agents" :key="agent.id" :value="agent.id">
              {{ agent.name }}
            </option>
          </select>
          <p v-if="selectedAgent" class="mt-2">
            <SupportAgentBadge :agent="selectedAgent" />
          </p>
        </div>

        <div v-if="form.status === 'resolvido'">
          <label class="mb-1 block text-sm font-medium text-slate-700">Quem resolveu</label>
          <select
            v-model="form.resolved_by_id"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="" disabled>Selecione quem resolveu</option>
            <option v-for="agent in agents" :key="agent.id" :value="agent.id">
              {{ agent.name }}
            </option>
          </select>
        </div>

        <div v-if="form.status === 'encaminhado_n2'">
          <label class="mb-1 block text-sm font-medium text-slate-700">Quem transferiu</label>
          <select
            v-model="form.transferred_by_id"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="" disabled>Selecione quem transferiu</option>
            <option v-for="agent in agents" :key="agent.id" :value="agent.id">
              {{ agent.name }}
            </option>
          </select>
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

        <p v-if="agents.length === 0" class="text-xs text-amber-700">
          Faça login com a conta do perfil — o usuário (antes do @) entra automaticamente no time.
        </p>

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
  SUPPORT_ERROR_SEVERITY_OPTIONS,
  SUPPORT_ERROR_STATUS_OPTIONS,
  emptySupportErrorForm,
  type SupportAgent,
  type SupportError,
  type SupportErrorFormData,
  type SupportGlossaryEntry,
} from "@/types/supportErrors";
import { formFromSupportError } from "@/lib/supportErrors";
import { incidentDefaultsFromGlossary } from "@/lib/supportGlossary";
import SupportAgentBadge from "@/components/support-errors/SupportAgentBadge.vue";

const props = defineProps<{
  open: boolean;
  initial: SupportError | null;
  agents: SupportAgent[];
  glossary?: SupportGlossaryEntry[];
  defaultAgentId?: string;
  prefillGlossaryId?: string | null;
  saving?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [form: SupportErrorFormData];
}>();

const form = reactive<SupportErrorFormData>(emptySupportErrorForm());
const submitted = ref(false);

const saving = computed(() => Boolean(props.saving) || submitted.value);
const glossary = computed(() => props.glossary ?? []);

const selectedAgent = computed(
  () => props.agents.find((agent) => agent.id === form.agent_id) ?? null,
);

function applyGlossaryDefaults(entryId: string, onlyEmpty: boolean) {
  const entry = glossary.value.find((item) => item.id === entryId);
  if (!entry) return;
  const defaults = incidentDefaultsFromGlossary(entry);
  form.glossary_id = defaults.glossary_id;
  if (!onlyEmpty || !form.title.trim()) form.title = defaults.title;
  if (!onlyEmpty || !form.description.trim()) form.description = defaults.description;
  if (!onlyEmpty || !form.module.trim()) form.module = defaults.module;
  if (!onlyEmpty || !form.resolution.trim()) form.resolution = defaults.resolution;
}

watch(
  () =>
    [props.open, props.initial, props.defaultAgentId, props.prefillGlossaryId] as const,
  ([open, initial, defaultAgentId, prefillGlossaryId]) => {
    if (!open) {
      submitted.value = false;
      return;
    }
    submitted.value = false;
    const next = initial ? formFromSupportError(initial) : emptySupportErrorForm();
    if (!initial && defaultAgentId) {
      next.agent_id = defaultAgentId;
      next.resolved_by_id = defaultAgentId;
      next.transferred_by_id = defaultAgentId;
    }
    Object.assign(form, next);
    if (!initial && prefillGlossaryId) {
      applyGlossaryDefaults(prefillGlossaryId, false);
    }
  },
  { immediate: true },
);

watch(
  () => form.glossary_id,
  (glossaryId, previous) => {
    if (!props.open || !glossaryId || glossaryId === previous) return;
    // Só preenche vazios ao trocar o vínculo (não sobrescreve edição manual)
    applyGlossaryDefaults(glossaryId, true);
  },
);

watch(
  () => form.status,
  (status) => {
    if (status === "resolvido" && !form.resolved_by_id && form.agent_id) {
      form.resolved_by_id = form.agent_id;
    }
    if (status === "encaminhado_n2" && !form.transferred_by_id && form.agent_id) {
      form.transferred_by_id = form.agent_id;
    }
  },
);

watch(
  () => form.agent_id,
  (agentId) => {
    if (!agentId) return;
    if (form.status === "resolvido" && !form.resolved_by_id) {
      form.resolved_by_id = agentId;
    }
    if (form.status === "encaminhado_n2" && !form.transferred_by_id) {
      form.transferred_by_id = agentId;
    }
  },
);

watch(
  () => props.saving,
  (value) => {
    if (!value) submitted.value = false;
  },
);

function handleSubmit() {
  if (saving.value) return;
  if (form.status === "resolvido" && !form.resolved_by_id) return;
  if (form.status === "resolvido" && !form.resolution.trim()) return;
  if (form.status === "encaminhado_n2" && !form.transferred_by_id) return;
  submitted.value = true;
  emit("save", { ...form });
}
</script>
