<template>
  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 class="text-lg font-semibold text-slate-900">Lembretes de prazo</h2>
    <p class="mt-1 text-sm text-slate-600">
      Configure quando ser alertado sobre atividades não finalizadas. Sincronizado com a extensão
      Chrome/Edge.
    </p>

    <label class="mt-4 flex items-center gap-2 text-sm text-slate-700">
      <input v-model="prefs.enabled" type="checkbox" class="rounded border-slate-300" />
      Ativar lembretes
    </label>

    <div class="mt-4 space-y-3">
      <div
        v-for="(offset, index) in prefs.offsets"
        :key="index"
        class="flex flex-wrap items-center gap-2"
      >
        <input
          v-model.number="offset.value"
          type="number"
          min="1"
          class="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <select
          v-model="offset.unit"
          class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="minutes">minuto(s) antes</option>
          <option value="hours">hora(s) antes</option>
          <option value="days">dia(s) antes</option>
        </select>
        <button
          type="button"
          class="text-sm text-red-600 hover:underline"
          @click="removeOffset(index)"
        >
          Remover
        </button>
      </div>
    </div>

    <button
      type="button"
      class="mt-3 text-sm font-medium text-emerald-700 hover:underline"
      @click="addOffset"
    >
      + Adicionar lembrete
    </button>

    <p v-if="saveMessage" class="mt-3 text-sm text-emerald-700">{{ saveMessage }}</p>
    <p v-if="saveError" class="mt-3 text-sm text-red-600">{{ saveError }}</p>

    <button
      type="button"
      :disabled="saving"
      class="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
      @click="save"
    >
      {{ saving ? "Salvando..." : "Salvar lembretes" }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { supabase } from "@/lib/supabase/client";
import { getNotificationPreferences, saveNotificationPreferences } from "@/lib/notifications";
import type { NotificationPreferences, ReminderOffset } from "@/types/notifications";

const prefs = reactive<NotificationPreferences>({
  enabled: true,
  offsets: [],
});

const saving = ref(false);
const saveMessage = ref("");
const saveError = ref("");
let userId: string | null = null;

onMounted(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  userId = user.id;

  const loaded = await getNotificationPreferences(user.id);
  prefs.enabled = loaded.enabled;
  prefs.offsets = loaded.offsets.map((o) => ({ ...o }));
});

function addOffset() {
  prefs.offsets.push({ value: 1, unit: "hours" });
}

function removeOffset(index: number) {
  prefs.offsets.splice(index, 1);
}

async function save() {
  if (!userId) return;

  saving.value = true;
  saveMessage.value = "";
  saveError.value = "";

  const cleanOffsets: ReminderOffset[] = prefs.offsets
    .filter((o) => o.value > 0)
    .map((o) => ({ value: o.value, unit: o.unit }));

  const result = await saveNotificationPreferences(userId, {
    enabled: prefs.enabled,
    offsets: cleanOffsets,
  });

  saving.value = false;

  if (!result.ok) {
    saveError.value = result.error;
    return;
  }

  saveMessage.value = "Preferências salvas e sincronizadas.";
}
</script>
