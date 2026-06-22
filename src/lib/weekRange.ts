export type WeekRange = {
  start: Date;
  end: Date;
  label: string;
};

const REPORT_END_HOUR = 10;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Segunda 00:00 até sexta 10:00 da semana (com offset em semanas). */
export function getReportWeekRange(reference = new Date(), weekOffset = 0): WeekRange {
  const ref = new Date(reference);
  ref.setDate(ref.getDate() + weekOffset * 7);

  const day = ref.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = startOfDay(ref);
  monday.setDate(ref.getDate() + diffToMonday);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(REPORT_END_HOUR, 0, 0, 0);

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return {
    start: monday,
    end: friday,
    label: `${fmt(monday)} a ${fmt(friday)} (sex. 10h)`,
  };
}

export function isDateInRange(date: Date, range: WeekRange): boolean {
  return date >= range.start && date <= range.end;
}

export function getNextWeekRange(reference = new Date(), weekOffset = 0): WeekRange {
  const current = getReportWeekRange(reference, weekOffset);
  const nextMonday = new Date(current.start);
  nextMonday.setDate(current.start.getDate() + 7);

  const nextFriday = new Date(nextMonday);
  nextFriday.setDate(nextMonday.getDate() + 4);
  nextFriday.setHours(REPORT_END_HOUR, 0, 0, 0);

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return {
    start: nextMonday,
    end: nextFriday,
    label: `${fmt(nextMonday)} a ${fmt(nextFriday)}`,
  };
}
