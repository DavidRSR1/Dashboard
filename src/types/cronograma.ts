export type ActivityStatus =
  | "nao_iniciado"
  | "iniciado"
  | "em_progresso"
  | "pronto";

export type CronogramaAtividade = {
  id: string;
  atividade: string;
  data_back_banco: string | null;
  data_front: string | null;
  hora_fim: string | null;
  status: ActivityStatus;
  categoria: string;
  pr_url: string | null;
  observacoes: string | null;
  concluido_em: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CronogramaEventoTipo = "criada" | "status_alterado" | "editada";

export type CronogramaEventoDados = {
  status_anterior?: ActivityStatus;
  status_novo?: ActivityStatus;
  atividade_nome?: string;
  categoria?: string;
};

export type CronogramaEvento = {
  id: string;
  atividade_id: string;
  tipo: CronogramaEventoTipo;
  dados: CronogramaEventoDados;
  created_by: string | null;
  created_at: string;
};

export type CronogramaFormData = {
  atividade: string;
  data_back_banco: string;
  data_front: string;
  hora_fim: string;
  status: ActivityStatus;
  categoria: string;
  pr_url: string;
  observacoes: string;
};

export const STATUS_OPTIONS: {
  value: ActivityStatus;
  label: string;
  description?: string;
}[] = [
  { value: "nao_iniciado", label: "Não iniciado" },
  { value: "iniciado", label: "Iniciado" },
  { value: "em_progresso", label: "In progresso" },
  {
    value: "pronto",
    label: "Pronto",
    description: "PR aberta e funcionando em dev",
  },
];

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  nao_iniciado: "Não iniciado",
  iniciado: "Iniciado",
  em_progresso: "In progresso",
  pronto: "Pronto",
};

export const STATUS_COLORS: Record<ActivityStatus, string> = {
  nao_iniciado: "bg-slate-100 text-slate-700 border-slate-200",
  iniciado: "bg-blue-50 text-blue-800 border-blue-200",
  em_progresso: "bg-amber-50 text-amber-800 border-amber-200",
  pronto: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export const STATUS_BAR_COLORS: Record<ActivityStatus, string> = {
  nao_iniciado: "bg-slate-400",
  iniciado: "bg-blue-500",
  em_progresso: "bg-amber-500",
  pronto: "bg-emerald-500",
};

export const STATUS_COLUMN_STYLES: Record<
  ActivityStatus,
  { header: string; border: string; dot: string }
> = {
  nao_iniciado: {
    header: "bg-slate-100 text-slate-800",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  iniciado: {
    header: "bg-blue-100 text-blue-900",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  em_progresso: {
    header: "bg-amber-100 text-amber-900",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  pronto: {
    header: "bg-emerald-100 text-emerald-900",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
};

export const KANBAN_ORDER: ActivityStatus[] = [
  "nao_iniciado",
  "iniciado",
  "em_progresso",
  "pronto",
];

export type ViewMode = "kanban" | "calendario" | "lista";
