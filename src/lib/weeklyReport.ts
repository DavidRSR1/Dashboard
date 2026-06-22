import { getDeadlineDate } from "@/lib/deadlines";
import { formatDateBR, formatDateTimeBR } from "@/lib/format";
import { isRelevantForFocusWeek } from "@/lib/kanbanFilters";
import { isDateInRange, type WeekRange, getNextWeekRange } from "@/lib/weekRange";
import {
  STATUS_LABELS,
  type CronogramaAtividade,
  type CronogramaEvento,
} from "@/types/cronograma";

export type WeeklyDelivery = {
  atividade: CronogramaAtividade;
  concluidoEm: Date;
  onTime: boolean | null;
};

export type WeeklyReportData = {
  week: WeekRange;
  deliveries: WeeklyDelivery[];
  created: CronogramaAtividade[];
  activeFocus: CronogramaAtividade[];
  nextWeekDeadlines: CronogramaAtividade[];
  stats: {
    delivered: number;
    onTime: number;
    late: number;
    created: number;
    activeFocus: number;
  };
};

function parseEventDate(iso: string): Date {
  return new Date(iso);
}

function formatDeliveryTiming(concluidoEm: Date, atividade: CronogramaAtividade): string {
  const quando = formatDateTimeBR(concluidoEm.toISOString());
  if (!atividade.data_front) return `concluída em ${quando}`;

  const prazo = formatDateBR(atividade.data_front);
  return `concluída em ${quando} (prazo ${prazo})`;
}

function formatOnTimeNote(onTime: boolean | null): string {
  if (onTime === true) return ", dentro do prazo";
  if (onTime === false) return ", com atraso em relação ao prazo";
  return "";
}

function appendObsAndPr(lines: string[], atividade: CronogramaAtividade, indent = "  "): void {
  if (atividade.observacoes?.trim()) {
    lines.push(`${indent}${atividade.observacoes.trim()}`);
  }
  if (atividade.pr_url) {
    lines.push(`${indent}PR: ${atividade.pr_url}`);
  }
}

export function buildWeeklyReportData(
  atividades: CronogramaAtividade[],
  eventos: CronogramaEvento[],
  week: WeekRange,
): WeeklyReportData {
  const atividadeMap = new Map(atividades.map((a) => [a.id, a]));
  const nextWeek = getNextWeekRange(week.start);

  const deliveryEvents = eventos.filter(
    (e) =>
      e.tipo === "status_alterado" &&
      e.dados.status_novo === "pronto" &&
      isDateInRange(parseEventDate(e.created_at), week),
  );

  const deliveries: WeeklyDelivery[] = deliveryEvents
    .map((event) => {
      const atividade = atividadeMap.get(event.atividade_id);
      if (!atividade) return null;

      const concluidoEm = parseEventDate(event.created_at);
      const deadline = getDeadlineDate(atividade);
      let onTime: boolean | null = null;
      if (deadline) {
        onTime = concluidoEm <= deadline;
      }

      return { atividade, concluidoEm, onTime };
    })
    .filter((d): d is WeeklyDelivery => d !== null)
    .sort((a, b) => b.concluidoEm.getTime() - a.concluidoEm.getTime());

  const created = atividades
    .filter((a) => isDateInRange(parseEventDate(a.created_at), week))
    .sort((a, b) => parseEventDate(b.created_at).getTime() - parseEventDate(a.created_at).getTime());

  const activeFocus = atividades
    .filter((a) => isRelevantForFocusWeek(a, week.start))
    .sort((a, b) => {
      const da = getDeadlineDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const db = getDeadlineDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });

  const nextWeekDeadlines = atividades
    .filter((a) => {
      if (a.status === "pronto" || !a.data_front) return false;
      const deadline = getDeadlineDate(a);
      return deadline && isDateInRange(deadline, nextWeek);
    })
    .sort((a, b) => (a.data_front ?? "").localeCompare(b.data_front ?? ""));

  const onTime = deliveries.filter((d) => d.onTime === true).length;
  const late = deliveries.filter((d) => d.onTime === false).length;

  return {
    week,
    deliveries,
    created,
    activeFocus,
    nextWeekDeadlines,
    stats: {
      delivered: deliveries.length,
      onTime,
      late,
      created: created.length,
      activeFocus: activeFocus.length,
    },
  };
}

export function buildWeeklyReportText(
  data: WeeklyReportData,
  userEmail: string,
  observacoes = "",
): string {
  const { week, deliveries, created, activeFocus, nextWeekDeadlines, stats } = data;
  const lines: string[] = [];

  const periodo = week.label.replace(" (sex. 10h)", "");
  const nome = userEmail.split("@")[0] ?? userEmail;

  lines.push("Olá,");
  lines.push("");
  lines.push(`Segue o resumo da semana (${periodo}).`);
  lines.push("");

  if (stats.delivered === 0) {
    lines.push("Nesta semana não registrei entregas concluídas.");
  } else {
    const qtd = stats.delivered === 1 ? "1 atividade" : `${stats.delivered} atividades`;
    let resumo = `Concluí ${qtd}`;
    if (stats.delivered > 0 && stats.late === 0 && stats.onTime > 0) {
      resumo += ", todas dentro do prazo";
    } else if (stats.late > 0 && stats.onTime > 0) {
      resumo += ` (${stats.onTime} no prazo e ${stats.late} com atraso)`;
    } else if (stats.late > 0) {
      resumo += ` (${stats.late} com atraso)`;
    }
    lines.push(`${resumo}.`);
  }

  if (created.length > 0) {
    const qtd = created.length === 1 ? "1 nova atividade" : `${created.length} novas atividades`;
    lines.push(`Cadastrei ${qtd} no cronograma.`);
  }

  if (deliveries.length > 0) {
    lines.push("");
    lines.push("Entregas:");
    for (const { atividade, concluidoEm, onTime } of deliveries) {
      const timing = formatDeliveryTiming(concluidoEm, atividade);
      const nota = formatOnTimeNote(onTime);
      lines.push(`• ${atividade.atividade} (${atividade.categoria}) — ${timing}${nota}.`);
      appendObsAndPr(lines, atividade);
    }
  }

  if (activeFocus.length > 0) {
    lines.push("");
    lines.push("Em andamento nesta semana:");
    for (const item of activeFocus) {
      const prazo = item.data_front ? `prazo ${formatDateBR(item.data_front)}` : "sem prazo definido";
      lines.push(
        `• ${item.atividade} (${item.categoria}) — ${STATUS_LABELS[item.status]}, ${prazo}.`,
      );
      if (item.observacoes?.trim()) {
        lines.push(`  ${item.observacoes.trim()}`);
      }
    }
  }

  const proximaSemanaExtras = nextWeekDeadlines.filter(
    (item) => !activeFocus.some((a) => a.id === item.id),
  );

  if (proximaSemanaExtras.length > 0) {
    lines.push("");
    lines.push("Prazos na próxima semana:");
    for (const item of proximaSemanaExtras) {
      lines.push(
        `• ${item.atividade} (${item.categoria}) — ${formatDateBR(item.data_front)}, ${STATUS_LABELS[item.status]}.`,
      );
    }
  }

  if (observacoes.trim()) {
    lines.push("");
    lines.push("Complemento:");
    lines.push(observacoes.trim());
  }

  lines.push("");
  lines.push(`Att,`);
  lines.push(nome);

  return lines.join("\n");
}

export function getEventLabel(event: CronogramaEvento, atividade?: CronogramaAtividade): string {
  const nome = event.dados.atividade_nome ?? atividade?.atividade ?? "Atividade";

  switch (event.tipo) {
    case "criada":
      return `Criou "${nome}"`;
    case "status_alterado": {
      const de = event.dados.status_anterior
        ? STATUS_LABELS[event.dados.status_anterior]
        : "?";
      const para = event.dados.status_novo ? STATUS_LABELS[event.dados.status_novo] : "?";
      return `Moveu "${nome}" de ${de} para ${para}`;
    }
    case "editada":
      return `Editou "${nome}"`;
    default:
      return nome;
  }
}
