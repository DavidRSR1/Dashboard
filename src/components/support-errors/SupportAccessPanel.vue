<template>
  <section class="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm sm:p-5">
    <div>
      <h3 class="text-sm font-semibold text-slate-900">Acesso ao módulo de erros</h3>
      <p class="mt-0.5 text-xs text-slate-600">
        Master: {{ masterEmail }}. Só quem estiver liberado aqui vê o menu e entra em /erros.
      </p>
    </div>

    <form class="mt-4 flex flex-wrap gap-2" @submit.prevent="handleAdd">
      <input
        v-model="email"
        type="email"
        required
        placeholder="email@redesaoroque.com.br"
        class="min-w-56 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      />
      <button
        type="submit"
        class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        :disabled="busy"
      >
        Liberar acesso
      </button>
    </form>

    <p
      v-if="message"
      class="mt-2 text-sm"
      :class="messageIsError ? 'text-red-700' : 'text-emerald-800'"
    >
      {{ message }}
    </p>

    <p v-if="listError" class="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-amber-900">
      {{ listError }}
    </p>

    <ul v-if="entries.length" class="mt-4 space-y-2">
      <li
        v-for="item in entries"
        :key="item"
        class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <div>
          <p class="font-medium text-slate-800">{{ localPart(item) }}</p>
          <p class="text-xs text-slate-500">{{ item }}</p>
        </div>
        <button
          type="button"
          class="text-xs font-medium text-red-700 hover:underline disabled:opacity-60"
          :disabled="busy"
          @click="handleRemove(item)"
        >
          Remover
        </button>
      </li>
    </ul>
    <p v-else-if="!listError" class="mt-4 text-sm text-slate-500">
      Ninguém além do master tem acesso ainda.
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  SUPPORT_MASTER_EMAIL,
  grantSupportAccess,
  listSupportAccessEmails,
  revokeSupportAccess,
} from "@/lib/supportAccess";
import { emailLocalPart } from "@/lib/supportTeam";

const props = defineProps<{
  masterEmail: string | null;
}>();

const email = ref("");
const entries = ref<string[]>([]);
const busy = ref(false);
const message = ref<string | null>(null);
const messageIsError = ref(false);
const listError = ref<string | null>(null);

const masterEmail = SUPPORT_MASTER_EMAIL;

function localPart(value: string) {
  return emailLocalPart(value);
}

async function refreshList() {
  const result = await listSupportAccessEmails();
  entries.value = result.emails.filter((item) => item !== SUPPORT_MASTER_EMAIL);
  listError.value = result.error;
}

async function handleAdd() {
  busy.value = true;
  message.value = null;
  const result = await grantSupportAccess(email.value, props.masterEmail);
  messageIsError.value = !result.ok;
  message.value = result.ok ? "Acesso liberado." : result.error;
  if (result.ok) {
    email.value = "";
    await refreshList();
  }
  busy.value = false;
}

async function handleRemove(target: string) {
  if (!confirm(`Remover acesso de ${target}?`)) return;
  busy.value = true;
  message.value = null;
  const result = await revokeSupportAccess(target, props.masterEmail);
  messageIsError.value = !result.ok;
  message.value = result.ok ? "Acesso removido." : result.error;
  await refreshList();
  busy.value = false;
}

onMounted(() => {
  void refreshList();
});
</script>
