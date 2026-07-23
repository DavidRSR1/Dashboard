<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          @click="shift(-1)"
        >
          ←
        </button>
        <span class="min-w-40 text-center text-sm font-medium capitalize text-slate-700">
          {{ periodLabel }}
        </span>
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          @click="shift(1)"
        >
          →
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          @click="goToday"
        >
          Hoje
        </button>
      </div>

      <div class="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <button
          v-for="mode in modes"
          :key="mode.id"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition"
          :class="
            calendarMode === mode.id
              ? 'bg-emerald-800 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          "
          @click="calendarMode = mode.id"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <div
      class="grid gap-1"
      :class="calendarMode === 'month' ? 'grid-cols-7' : 'grid-cols-7'"
    >
      <div
        v-for="weekday in weekdays"
        :key="weekday"
        class="px-1 py-2 text-center text-xs font-semibold uppercase text-slate-500"
      >
        {{ weekday }}
      </div>

      <button
        v-for="cell in cells"
        :key="cell.key"
        type="button"
        class="min-h-20 rounded-lg border p-2 text-left transition"
        :class="cellClasses(cell)"
        :disabled="!cell.inPeriod"
        @click="cell.inPeriod && emit('select-day', cell.dateKey)"
      >
        <div class="flex items-start justify-between gap-1">
          <span
            class="text-sm font-semibold"
            :class="cell.isToday ? 'text-emerald-800' : 'text-slate-800'"
          >
            {{ cell.dayNumber }}
          </span>
          <span
            v-if="cell.count > 0"
            class="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
            :class="markerBadgeClass(cell.marker)"
          >
            {{ cell.count }}
          </span>
        </div>
        <div v-if="cell.count > 0" class="mt-2 flex flex-wrap gap-1">
          <span
            class="inline-block h-2 w-2 rounded-full"
            :class="markerDotClass(cell.marker)"
            :title="markerTitle(cell.marker)"
          />
          <span class="truncate text-[10px] text-slate-500">
            {{ markerTitle(cell.marker) }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { SupportError } from "@/types/supportErrors";
import {
  dateKeyFromIso,
  dayMarkerForErrors,
  endOfCalendarWeek,
  startOfCalendarWeek,
  type DaySeverityMarker,
} from "@/lib/supportErrors";

const props = defineProps<{
  errors: SupportError[];
  selectedDateKey: string | null;
}>();

const emit = defineEmits<{
  "select-day": [dateKey: string];
}>();

const modes = [
  { id: "month" as const, label: "Mensal" },
  { id: "week" as const, label: "Semanal" },
];

const calendarMode = ref<"month" | "week">("month");
const cursor = ref(new Date());

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type CalendarCell = {
  key: string;
  dateKey: string;
  dayNumber: number;
  inPeriod: boolean;
  isToday: boolean;
  count: number;
  marker: DaySeverityMarker;
};

const todayKey = dateKeyFromIso(new Date().toISOString());

const errorsByDay = computed(() => {
  const map = new Map<string, SupportError[]>();
  for (const item of props.errors) {
    const key = dateKeyFromIso(item.occurred_at);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
});

const periodLabel = computed(() => {
  if (calendarMode.value === "week") {
    const start = startOfCalendarWeek(cursor.value);
    const end = endOfCalendarWeek(cursor.value);
    const fmt = (d: Date) =>
      d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    return `${fmt(start)} — ${fmt(end)}`;
  }
  return cursor.value.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
});

const cells = computed(() => {
  if (calendarMode.value === "week") {
    return buildWeekCells(cursor.value);
  }
  return buildMonthCells(cursor.value);
});

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCell(date: Date, inPeriod: boolean): CalendarCell {
  const dateKey = toDateKey(date);
  const dayErrors = errorsByDay.value.get(dateKey) ?? [];
  return {
    key: `${dateKey}-${inPeriod ? "in" : "out"}`,
    dateKey,
    dayNumber: date.getDate(),
    inPeriod,
    isToday: dateKey === todayKey,
    count: dayErrors.length,
    marker: dayMarkerForErrors(dayErrors),
  };
}

function buildMonthCells(reference: Date): CalendarCell[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const first = new Date(year, month, 1);
  const start = startOfCalendarWeek(first);
  const result: CalendarCell[] = [];

  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    result.push(buildCell(date, date.getMonth() === month));
  }
  return result;
}

function buildWeekCells(reference: Date): CalendarCell[] {
  const start = startOfCalendarWeek(reference);
  const result: CalendarCell[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    result.push(buildCell(date, true));
  }
  return result;
}

function shift(delta: number) {
  const next = new Date(cursor.value);
  if (calendarMode.value === "week") {
    next.setDate(next.getDate() + delta * 7);
  } else {
    next.setMonth(next.getMonth() + delta);
  }
  cursor.value = next;
}

function goToday() {
  cursor.value = new Date();
}

function cellClasses(cell: CalendarCell): string {
  if (!cell.inPeriod) {
    return "border-transparent bg-slate-50 text-slate-300";
  }
  const selected =
    props.selectedDateKey === cell.dateKey
      ? "border-emerald-600 ring-2 ring-emerald-200"
      : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40";
  const today = cell.isToday ? "bg-emerald-50/60" : "bg-white";
  return `${selected} ${today}`;
}

function markerBadgeClass(marker: DaySeverityMarker): string {
  const map: Record<DaySeverityMarker, string> = {
    none: "bg-slate-400",
    low: "bg-slate-500",
    medium: "bg-blue-600",
    high: "bg-amber-600",
    critical: "bg-red-600",
  };
  return map[marker];
}

function markerDotClass(marker: DaySeverityMarker): string {
  const map: Record<DaySeverityMarker, string> = {
    none: "bg-slate-300",
    low: "bg-slate-500",
    medium: "bg-blue-500",
    high: "bg-amber-500",
    critical: "bg-red-500",
  };
  return map[marker];
}

function markerTitle(marker: DaySeverityMarker): string {
  const map: Record<DaySeverityMarker, string> = {
    none: "",
    low: "Volume baixo",
    medium: "Volume/severidade média",
    high: "Volume/severidade alta",
    critical: "Pico crítico",
  };
  return map[marker];
}
</script>
