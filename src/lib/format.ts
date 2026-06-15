export function formatDateBR(isoDate: string | null): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

export function toInputDate(isoDate: string | null): string {
  if (!isoDate) return "";
  return isoDate.split("T")[0];
}

export function parseDate(isoDate: string | null): Date | null {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function daysInMonth(date: Date): number {
  return endOfMonth(date).getDate();
}
