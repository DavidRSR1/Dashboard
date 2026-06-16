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
import { computed } from "vue";

const downloadUrl = computed(
  () => `${window.location.origin}/dashboard-cronograma-extension.zip`,
);
</script>
