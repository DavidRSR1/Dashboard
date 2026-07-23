export type SupportErrorStatus =
  | "novo"
  | "em_analise"
  | "encaminhado_n2"
  | "resolvido";

export type SupportErrorSeverity = "baixo" | "medio" | "alto" | "critico";

export type SupportError = {
  id: string;
  occurred_at: string;
  description: string;
  module: string;
  status: SupportErrorStatus;
  severity: SupportErrorSeverity;
  requester: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportErrorFormData = {
  occurred_at: string;
  description: string;
  module: string;
  status: SupportErrorStatus;
  severity: SupportErrorSeverity;
  requester: string;
};

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
    description: "",
    module: "",
    status: "novo",
    severity: "medio",
    requester: "",
  };
}
