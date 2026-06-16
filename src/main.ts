import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { syncDeadlineRemindersWithPermission } from "@/lib/deadlineReminders";
import { supabase } from "@/lib/supabase/client";
import "./assets/main.css";

const app = createApp(App).use(router);

supabase.auth.getSession().then(() => {
  syncDeadlineRemindersWithPermission();
});

supabase.auth.onAuthStateChange(() => {
  syncDeadlineRemindersWithPermission();
});

app.mount("#app");
