import { supabase } from "@/lib/supabase/client";
import type {
  ActivityStatus,
  CronogramaAtividade,
  CronogramaEventoDados,
  CronogramaEventoTipo,
  CronogramaFormData,
} from "@/types/cronograma";

export function buildStatusUpdate(
  newStatus: ActivityStatus,
): { status: ActivityStatus; concluido_em?: string } {
  const payload: { status: ActivityStatus; concluido_em?: string } = { status: newStatus };
  if (newStatus === "pronto") {
    payload.concluido_em = new Date().toISOString();
  }
  return payload;
}

export async function recordCronogramaEvent(
  atividadeId: string,
  tipo: CronogramaEventoTipo,
  dados: CronogramaEventoDados,
  userId: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("cronograma_eventos").insert({
    atividade_id: atividadeId,
    tipo,
    dados,
    created_by: userId,
  });

  return { error: error?.message ?? null };
}

export async function applyStatusChange(
  item: CronogramaAtividade,
  previousStatus: ActivityStatus,
  newStatus: ActivityStatus,
  userId: string | null,
): Promise<{ error: string | null }> {
  if (previousStatus === newStatus) return { error: null };

  const updatePayload = buildStatusUpdate(newStatus);

  let { error: updateError } = await supabase
    .from("cronograma_atividades")
    .update(updatePayload)
    .eq("id", item.id);

  if (updateError && updatePayload.concluido_em) {
    const retry = await supabase
      .from("cronograma_atividades")
      .update({ status: newStatus })
      .eq("id", item.id);
    updateError = retry.error;
  }

  if (updateError) return { error: updateError.message };

  await recordCronogramaEvent(
    item.id,
    "status_alterado",
    {
      status_anterior: previousStatus,
      status_novo: newStatus,
      atividade_nome: item.atividade,
      categoria: item.categoria,
    },
    userId,
  );

  return { error: null };
}

export async function recordActivityCreated(
  atividade: Pick<CronogramaAtividade, "id" | "atividade" | "categoria" | "status">,
  userId: string | null,
): Promise<{ error: string | null }> {
  const { error: criadaError } = await recordCronogramaEvent(
    atividade.id,
    "criada",
    {
      atividade_nome: atividade.atividade,
      categoria: atividade.categoria,
    },
    userId,
  );

  if (criadaError) return { error: criadaError };

  if (atividade.status === "pronto") {
    const { error: statusError } = await recordCronogramaEvent(
      atividade.id,
      "status_alterado",
      {
        status_anterior: "nao_iniciado",
        status_novo: "pronto",
        atividade_nome: atividade.atividade,
        categoria: atividade.categoria,
      },
      userId,
    );
    return { error: statusError };
  }

  return { error: null };
}

export async function updateActivityWithEvents(
  existing: CronogramaAtividade,
  data: CronogramaFormData,
  userId: string | null,
): Promise<{ error: string | null }> {
  const statusChanged = existing.status !== data.status;
  const updatePayload: Record<string, unknown> = {
    atividade: data.atividade,
    data_back_banco: data.data_back_banco || null,
    data_front: data.data_front || null,
    hora_fim: data.hora_fim || null,
    status: data.status,
    categoria: data.categoria,
    pr_url: data.pr_url || null,
    observacoes: data.observacoes || null,
  };

  if (statusChanged && data.status === "pronto") {
    updatePayload.concluido_em = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("cronograma_atividades")
    .update(updatePayload)
    .eq("id", existing.id);

  if (updateError && updatePayload.concluido_em) {
    const { concluido_em: _, ...withoutConcluido } = updatePayload;
    const retry = await supabase
      .from("cronograma_atividades")
      .update(withoutConcluido)
      .eq("id", existing.id);
    if (retry.error) return { error: retry.error.message };
  } else if (updateError) {
    return { error: updateError.message };
  }

  if (statusChanged) {
    await recordCronogramaEvent(
      existing.id,
      "status_alterado",
      {
        status_anterior: existing.status,
        status_novo: data.status,
        atividade_nome: data.atividade,
        categoria: data.categoria,
      },
      userId,
    );
  }

  return { error: null };
}

export async function insertActivityWithEvents(
  data: CronogramaFormData,
  userId: string | null,
): Promise<{ error: string | null; id?: string }> {
  const insertPayload: Record<string, unknown> = {
    atividade: data.atividade,
    data_back_banco: data.data_back_banco || null,
    data_front: data.data_front || null,
    hora_fim: data.hora_fim || null,
    status: data.status,
    categoria: data.categoria,
    pr_url: data.pr_url || null,
    observacoes: data.observacoes || null,
    created_by: userId,
  };

  if (data.status === "pronto") {
    insertPayload.concluido_em = new Date().toISOString();
  }

  let { data: inserted, error: insertError } = await supabase
    .from("cronograma_atividades")
    .insert(insertPayload)
    .select("id, atividade, categoria, status")
    .single();

  if (insertError && insertPayload.concluido_em) {
    const { concluido_em: _, ...withoutConcluido } = insertPayload;
    const retry = await supabase
      .from("cronograma_atividades")
      .insert(withoutConcluido)
      .select("id, atividade, categoria, status")
      .single();
    inserted = retry.data;
    insertError = retry.error;
  }

  if (insertError) return { error: insertError.message };

  await recordActivityCreated(
    inserted as Pick<CronogramaAtividade, "id" | "atividade" | "categoria" | "status">,
    userId,
  );

  return { error: null, id: inserted?.id };
}
