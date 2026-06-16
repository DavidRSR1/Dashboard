import { inject, onMounted, onUnmounted, provide, ref, type Ref } from "vue";
import { SYNC_INTERVAL_MS } from "@/lib/syncInterval";

const CRONOGRAMA_NOW_KEY = Symbol("cronograma-now");

export function provideCronogramaNow(): Ref<Date> {
  const now = ref(new Date());
  let timer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    timer = setInterval(() => {
      now.value = new Date();
    }, SYNC_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  provide(CRONOGRAMA_NOW_KEY, now);
  return now;
}

export function useCronogramaNow(): Ref<Date> {
  return inject(CRONOGRAMA_NOW_KEY, ref(new Date()));
}
