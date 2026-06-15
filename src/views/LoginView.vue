<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 p-4"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <h1 class="text-2xl font-bold text-slate-900">Dashboard Cronograma</h1>
      <p class="mt-1 text-sm text-slate-600">
        Crie sua conta ou entre para gerenciar seu cronograma.
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Senha</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>

        <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
        <p v-if="message" class="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {{ message }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {{ loading ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar" }}
        </button>
      </form>

      <button
        type="button"
        class="mt-4 w-full text-sm text-emerald-700 hover:underline"
        @click="isSignUp = !isSignUp"
      >
        {{ isSignUp ? "Já tenho conta — entrar" : "Primeiro acesso — criar conta" }}
      </button>

      <p class="mt-6 text-center text-xs text-slate-500">
        Cada usuário vê apenas o próprio cronograma. O Bitwarden pode ser configurado em Perfil.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/profile";

const router = useRouter();

const email = ref("");
const password = ref("");
const isSignUp = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const message = ref<string | null>(null);

async function ensureSession(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
}

async function finishLogin() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await ensureProfile(user.id);
  await router.replace("/");
}

async function handleSubmit() {
  loading.value = true;
  error.value = null;
  message.value = null;

  try {
    if (isSignUp.value) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      });

      if (signUpError) {
        error.value = signUpError.message;
        return;
      }

      let hasSession = !!data.session;

      if (!hasSession) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.value,
            password: password.value,
          });

        if (signInError) {
          message.value =
            "Conta criada! Confirme seu e-mail (verifique a caixa de entrada) e depois faça login.";
          return;
        }

        hasSession = !!signInData.session;
      }

      if (!hasSession && !(await ensureSession())) {
        message.value =
          "Conta criada! Confirme seu e-mail (verifique a caixa de entrada) e depois faça login.";
        return;
      }

      await finishLogin();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (signInError) {
      error.value = signInError.message;
      return;
    }

    await finishLogin();
  } finally {
    loading.value = false;
  }
}
</script>
