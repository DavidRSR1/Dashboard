export type SupportErrorStatus =
  | "novo"
  | "em_analise"
  | "encaminhado_n2"
  | "resolvido";

export type SupportErrorSeverity = "baixo" | "medio" | "alto" | "critico";

export type SupportAgentColorId =
  | "teal"
  | "rose"
  | "sky"
  | "violet"
  | "orange"
  | "lime"
  | "cyan"
  | "fuchsia"
  | "indigo"
  | "amber";

export type SupportAgent = {
  id: string;
  name: string;
  colorId: SupportAgentColorId;
  created_at: string;
};

export type SupportAgentColorToken = {
  id: SupportAgentColorId;
  label: string;
  badge: string;
  dot: string;
  swatch: string;
};

export type SupportError = {
  id: string;
  occurred_at: string;
  /** Título curto do incidente */
  title: string;
  /** Descrição detalhada / mensagem de erro */
  description: string;
  /** O que foi feito para resolver (ou ação tomada) */
  resolution: string | null;
  module: string;
  status: SupportErrorStatus;
  severity: SupportErrorSeverity;
  requester: string | null;
  /** Responsável atual no N1 */
  agent_id: string | null;
  /** Quem marcou como resolvido */
  resolved_by_id: string | null;
  /** Quem encaminhou / transferiu */
  transferred_by_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportErrorFormData = {
  occurred_at: string;
  title: string;
  description: string;
  resolution: string;
  module: string;
  status: SupportErrorStatus;
  severity: SupportErrorSeverity;
  requester: string;
  agent_id: string;
  resolved_by_id: string;
  transferred_by_id: string;
};

export const SUPPORT_AGENT_COLORS: SupportAgentColorToken[] = [
  {
    id: "teal",
    label: "Teal",
    badge: "bg-teal-100 text-teal-800 border-teal-300",
    dot: "bg-teal-500",
    swatch: "bg-teal-500",
  },
  {
    id: "rose",
    label: "Rosa",
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    dot: "bg-rose-500",
    swatch: "bg-rose-500",
  },
  {
    id: "sky",
    label: "Azul céu",
    badge: "bg-sky-100 text-sky-800 border-sky-300",
    dot: "bg-sky-500",
    swatch: "bg-sky-500",
  },
  {
    id: "violet",
    label: "Violeta",
    badge: "bg-violet-100 text-violet-800 border-violet-300",
    dot: "bg-violet-500",
    swatch: "bg-violet-500",
  },
  {
    id: "orange",
    label: "Laranja",
    badge: "bg-orange-100 text-orange-800 border-orange-300",
    dot: "bg-orange-500",
    swatch: "bg-orange-500",
  },
  {
    id: "lime",
    label: "Lima",
    badge: "bg-lime-100 text-lime-800 border-lime-300",
    dot: "bg-lime-500",
    swatch: "bg-lime-500",
  },
  {
    id: "cyan",
    label: "Ciano",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-300",
    dot: "bg-cyan-500",
    swatch: "bg-cyan-500",
  },
  {
    id: "fuchsia",
    label: "Fúcsia",
    badge: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
    dot: "bg-fuchsia-500",
    swatch: "bg-fuchsia-500",
  },
  {
    id: "indigo",
    label: "Índigo",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-300",
    dot: "bg-indigo-500",
    swatch: "bg-indigo-500",
  },
  {
    id: "amber",
    label: "Âmbar",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    dot: "bg-amber-500",
    swatch: "bg-amber-500",
  },
];

export const SUPPORT_AGENT_COLOR_MAP: Record<
  SupportAgentColorId,
  SupportAgentColorToken
> = Object.fromEntries(
  SUPPORT_AGENT_COLORS.map((color) => [color.id, color]),
) as Record<SupportAgentColorId, SupportAgentColorToken>;

export const SUPPORT_ERROR_STATUS_OPTIONS: {
  value: SupportErrorStatus;
  label: string;
}[] = [
  { value: "novo", label: "Novo" },
  { value: "em_analise", label: "Em Análise" },
  { value: "encaminhado_n2", label: "Encaminhado ao N2" },
  { value: "resolvido", label: "Resolvido" },
];

export const SUPPORT_ERROR_SEVERITY_OPTIONS: {
  value: SupportErrorSeverity;
  label: string;
}[] = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
  { value: "critico", label: "Crítico" },
];

export const SUPPORT_ERROR_STATUS_LABELS: Record<SupportErrorStatus, string> = {
  novo: "Novo",
  em_analise: "Em Análise",
  encaminhado_n2: "Encaminhado ao N2",
  resolvido: "Resolvido",
};

export const SUPPORT_ERROR_SEVERITY_LABELS: Record<SupportErrorSeverity, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

export const SUPPORT_ERROR_STATUS_COLORS: Record<SupportErrorStatus, string> = {
  novo: "bg-slate-100 text-slate-700 border-slate-200",
  em_analise: "bg-blue-50 text-blue-800 border-blue-200",
  encaminhado_n2: "bg-amber-50 text-amber-800 border-amber-200",
  resolvido: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export const SUPPORT_ERROR_SEVERITY_COLORS: Record<SupportErrorSeverity, string> = {
  baixo: "bg-slate-100 text-slate-700 border-slate-200",
  medio: "bg-blue-50 text-blue-800 border-blue-200",
  alto: "bg-amber-50 text-amber-800 border-amber-200",
  critico: "bg-red-50 text-red-800 border-red-200",
};

export const SUPPORT_ERROR_SEVERITY_RANK: Record<SupportErrorSeverity, number> = {
  baixo: 1,
  medio: 2,
  alto: 3,
  critico: 4,
};

export function emptySupportErrorForm(now = new Date()): SupportErrorFormData {
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return {
    occurred_at: local,
    title: "",
    description: "",
    resolution: "",
    module: "",
    status: "novo",
    severity: "medio",
    requester: "",
    agent_id: "",
    resolved_by_id: "",
    transferred_by_id: "",
  };
}
