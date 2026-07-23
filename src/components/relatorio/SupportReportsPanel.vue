<template>
  <section class="space-y-4">
    <p v-if="loading" class="py-8 text-center text-sm text-slate-500">
      Carregando resumos de suporte...
    </p>
    <p v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </p>
    <template v-else>
      <div class="grid gap-4 lg:grid-cols-2">
        <WeeklyErrorsSummary :summary="weeklySummary" />
        <MonthlyErrorsSummary :summary="monthlySummary" @select-day="onSelectDay" />
      </div>
      <p class="text-xs text-slate-500">
        Resumos do módulo de erros N1 (compartilhado). Para ver o calendário e o catálogo, abra
        <RouterLink to="/erros" class="font-medium text-emerald-800 underline hover:no-underline">
          Erros N1
        </RouterLink>.
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  buildMonthlySummary,
  buildWeeklySummary,
  listSupportErrors,
} from "@/lib/supportErrors";
import type { SupportError } from "@/types/supportErrors";
import MonthlyErrorsSummary from "@/components/support-errors/MonthlyErrorsSummary.vue";
import WeeklyErrorsSummary from "@/components/support-errors/WeeklyErrorsSummary.vue";

const router = useRouter();
const errors = ref<SupportError[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const weeklySummary = computed(() => buildWeeklySummary(errors.value));
const monthlySummary = computed(() => buildMonthlySummary(errors.value));

async function load() {
  loading.value = true;
  error.value = null;
  const result = await listSupportErrors();
  if (result.error) {
    error.value = result.error;
    loading.value = false;
    return;
  }
  errors.value = result.data;
  loading.value = false;
}

function onSelectDay(dateKey: string) {
  void router.push({ path: "/erros", query: { dia: dateKey } });
}

onMounted(() => {
  void load();
});
</script>
