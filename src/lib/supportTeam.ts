import { supabase } from "@/lib/supabase/client";
import {
  SUPPORT_AGENT_COLORS,
  type SupportAgent,
  type SupportAgentColorId,
} from "@/types/supportErrors";

type SupportAgentRow = {
  id: string;
  name: string;
  color_id: string;
  created_at: string;
};

/** Extrai o usuário do e-mail (antes do @). Ex.: david.oliveira@redesaoroque.com.br → david.oliveira */
export function emailLocalPart(emailOrName: string): string {
  const trimmed = emailOrName.trim().toLowerCase();
  if (!trimmed) return "";
  const at = trimmed.indexOf("@");
  return at >= 0 ? trimmed.slice(0, at) : trimmed;
}

export function agentIdFromEmail(emailOrName: string): string {
  const username = emailLocalPart(emailOrName);
  return username ? `agent_${username}` : "";
}

function isColorId(value: string): value is SupportAgentColorId {
  return SUPPORT_AGENT_COLORS.some((color) => color.id === value);
}

function mapRow(row: SupportAgentRow): SupportAgent {
  return {
    id: row.id,
    name: row.name,
    colorId: isColorId(row.color_id) ? row.color_id : "teal",
    created_at: row.created_at,
  };
}

function nextColorId(existing: SupportAgent[]): SupportAgentColorId {
  const used = new Set(existing.map((agent) => agent.colorId));
  const available = SUPPORT_AGENT_COLORS.find((color) => !used.has(color.id));
  if (available) return available.id;
  const index = existing.length % SUPPORT_AGENT_COLORS.length;
  return SUPPORT_AGENT_COLORS[index].id;
}

export async function listSupportAgents(): Promise<{
  data: SupportAgent[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("support_agents")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data as SupportAgentRow[] | null) ?? [];
  return {
    data: rows.map(mapRow).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    error: null,
  };
}

/**
 * Garante o agente do usuário logado no banco compartilhado.
 */
export async function ensureSupportAgentFromEmail(
  email: string,
  colorId?: SupportAgentColorId,
): Promise<{ data: SupportAgent | null; error: string | null }> {
  const username = emailLocalPart(email);
  const id = agentIdFromEmail(email);
  if (!username || !id) {
    return { data: null, error: "E-mail inválido." };
  }

  const listed = await listSupportAgents();
  if (listed.error) {
    return { data: null, error: listed.error };
  }

  const existing = listed.data.find((agent) => agent.id === id);
  if (existing) {
    return { data: existing, error: null };
  }

  const payload = {
    id,
    name: username,
    color_id: colorId ?? nextColorId(listed.data),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("support_agents")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapRow(data as SupportAgentRow), error: null };
}

export async function createSupportAgent(
  emailOrName: string,
  colorId?: SupportAgentColorId,
): Promise<{ data: SupportAgent | null; error: string | null }> {
  const username = emailLocalPart(emailOrName);
  const id = agentIdFromEmail(emailOrName);
  if (!username || !id) {
    return { data: null, error: "Informe o e-mail ou usuário do agente." };
  }

  const listed = await listSupportAgents();
  if (listed.error) {
    return { data: null, error: listed.error };
  }

  const existing = listed.data.find((agent) => agent.id === id);
  if (existing) {
    if (colorId && existing.colorId !== colorId) {
      return updateSupportAgentColor(existing.id, colorId);
    }
    return { data: existing, error: null };
  }

  const payload = {
    id,
    name: username,
    color_id: colorId ?? nextColorId(listed.data),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("support_agents")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapRow(data as SupportAgentRow), error: null };
}

export async function updateSupportAgentColor(
  id: string,
  colorId: SupportAgentColorId,
): Promise<{ data: SupportAgent | null; error: string | null }> {
  const { data, error } = await supabase
    .from("support_agents")
    .update({ color_id: colorId })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapRow(data as SupportAgentRow), error: null };
}

export async function deleteSupportAgent(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from("support_agents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export function agentsById(agents: SupportAgent[]): Map<string, SupportAgent> {
  return new Map(agents.map((agent) => [agent.id, agent]));
}
