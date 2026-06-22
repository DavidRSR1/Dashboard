import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "@/lib/supabase/client";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/visitante/:token",
      name: "visitante",
      component: () => import("@/views/VisitanteView.vue"),
      meta: { public: true },
    },
    {
      path: "/visitante",
      redirect: "/login",
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { guest: true },
    },
    {
      path: "/perfil",
      name: "perfil",
      component: () => import("@/views/ProfileView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/relatorio",
      name: "relatorio",
      component: () => import("@/views/RelatorioView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/",
      name: "home",
      component: () => import("@/views/CronogramaView.vue"),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  if (to.meta.public) {
    return true;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (to.meta.guest && user) {
    return { name: "home" };
  }

  if (to.meta.requiresAuth && !user) {
    return { name: "login" };
  }

  return true;
});

export default router;
