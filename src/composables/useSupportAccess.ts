import { computed, onMounted, ref } from "vue";
import { supabase } from "@/lib/supabase/client";
import {
  canAccessSupportErrors,
  isSupportMaster,
  normalizeEmail,
} from "@/lib/supportAccess";

const userEmail = ref<string | null>(null);
const allowed = ref(false);
const loading = ref(true);
const checked = ref(false);

export function useSupportAccess() {
  const isMaster = computed(() => isSupportMaster(userEmail.value));

  async function refresh() {
    loading.value = true;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail.value = user?.email ?? null;
    allowed.value = await canAccessSupportErrors(userEmail.value);
    loading.value = false;
    checked.value = true;
  }

  onMounted(() => {
    if (!checked.value) {
      void refresh();
    }
  });

  return {
    userEmail,
    allowed,
    loading,
    isMaster,
    refresh,
    normalizeEmail,
  };
}
