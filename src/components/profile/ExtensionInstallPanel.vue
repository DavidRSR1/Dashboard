<template>
  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 class="text-lg font-semibold text-slate-900">Extensão de lembretes (Chrome / Edge)</h2>
    <p class="mt-1 text-sm text-slate-600">
      Baixe e instale gratuitamente, sem Chrome Web Store. Receba alertas de prazo mesmo com o site
      fechado (navegador aberto).
    </p>

    <a
      :href="downloadUrl"
      download="dashboard-cronograma-extension.zip"
      class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto"
    >
      ⬇ Baixar extensão (.zip)
    </a>

    <div class="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 class="text-sm font-semibold text-slate-800">Testar notificações</h3>
      <p class="mt-1 text-sm text-slate-600">
        Envia um alerta de exemplo pela extensão instalada. Use para confirmar que o Windows e o
        Chrome estão exibindo os lembretes.
      </p>
      <button
        type="button"
        :disabled="testing"
        class="mt-3 w-full rounded-lg border border-emerald-700 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 sm:w-auto"
        @click="runTest"
      >
        {{ testing ? "Enviando..." : "Testar notificação" }}
      </button>
      <p v-if="testMessage" class="mt-3 text-sm" :class="testError ? 'text-red-600' : 'text-emerald-700'">
        {{ testMessage }}
      </p>
    </div>

    <details class="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <summary class="cursor-pointer text-sm font-semibold text-slate-800">
        Como instalar no Chrome ou Edge
      </summary>
      <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
        <li>Baixe o arquivo <strong>.zip</strong> acima.</li>
        <li>Extraia a pasta (clique direito → Extrair tudo).</li>
        <li>
          Abra <code class="rounded bg-white px-1">chrome://extensions</code> ou
          <code class="rounded bg-white px-1">edge://extensions</code>.
        </li>
        <li>Ative o <strong>Modo do desenvolvedor</strong> (canto superior direito).</li>
        <li>Clique em <strong>Carregar sem compactação</strong> (Chrome) ou <strong>Carregar extensão descompactada</strong> (Edge).</li>
        <li>Selecione a pasta extraída do zip (deve conter o arquivo <code class="rounded bg-white px-1">manifest.json</code>).</li>
        <li>Clique no ícone da extensão → <strong>Opções</strong> → faça login com a mesma conta deste site.</li>
        <li>Permita notificações quando o navegador solicitar.</li>
      </ol>
    </details>

    <p class="mt-4 text-xs text-slate-500">
      Os lembretes acima valem para todos os status exceto &quot;Pronto&quot;, com checagem a cada
      30 segundos após o login na extensão. Instalação manual é gratuita; não é necessário publicar
      na loja do Chrome.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { testExtensionNotification } from "@/lib/extensionBridge";

const downloadUrl = computed(
  () => `${window.location.origin}/dashboard-cronograma-extension.zip`,
);

const testing = ref(false);
const testMessage = ref("");
const testError = ref(false);

async function runTest() {
  testing.value = true;
  testMessage.value = "";
  testError.value = false;

  try {
    await testExtensionNotification();
    testMessage.value =
      "Notificação enviada. Verifique o canto da tela ou a central de notificações do Windows.";
  } catch (err) {
    testError.value = true;
    testMessage.value =
      err instanceof Error ? err.message : "Falha ao testar notificação da extensão.";
  } finally {
    testing.value = false;
  }
}
</script>
