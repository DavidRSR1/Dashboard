import {
  SUPPORT_AGENT_COLORS,
  type SupportAgent,
  type SupportAgentColorId,
} from "@/types/supportErrors";

const STORAGE_KEY = "support-agents";

/** Extrai o usuário do e-mail (antes do @). Ex.: david.oliveira@redesaoroque.com.br → david.oliveira */
export function emailLocalPart(emailOrName: string): string {
  const trimmed = emailOrName.trim().toLowerCase();
  if (!trimmed) return "";
  const at = trimmed.indexOf("@");
  return at >= 0 ? trimmed.slice(0, at) : trimmed;
}

function agentIdFromUsername(username: string): string {
  return `agent_${username}`;
}

function readAll(): SupportAgent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SupportAgent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(agents: SupportAgent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

export function listSupportAgents(): SupportAgent[] {
  return readAll().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function getSupportAgent(id: string | null | undefined): SupportAgent | null {
  if (!id) return null;
  return readAll().find((agent) => agent.id === id) ?? null;
}

function nextColorId(existing: SupportAgent[]): SupportAgentColorId {
  const used = new Set(existing.map((agent) => agent.colorId));
  const available = SUPPORT_AGENT_COLORS.find((color) => !used.has(color.id));
  if (available) return available.id;
  const index = existing.length % SUPPORT_AGENT_COLORS.length;
  return SUPPORT_AGENT_COLORS[index].id;
}

/**
 * Cria ou reutiliza agente a partir do e-mail do perfil.
 * Usa só a parte antes do @ como identificador e nome exibido.
 */
export function ensureSupportAgentFromEmail(
  email: string,
  colorId?: SupportAgentColorId,
): SupportAgent | null {
  const username = emailLocalPart(email);
  if (!username) return null;

  const all = readAll();
  const id = agentIdFromUsername(username);
  const existing = all.find(
    (agent) =>
      agent.id === id ||
      agent.name.localeCompare(username, "pt-BR", { sensitivity: "accent" }) === 0,
  );

  if (existing) {
    if (existing.name !== username || existing.id !== id) {
      const index = all.findIndex((agent) => agent.id === existing.id);
      all[index] = { ...existing, id, name: username };
      writeAll(all);
      return all[index];
    }
    return existing;
  }

  const agent: SupportAgent = {
    id,
    name: username,
    colorId: colorId ?? nextColorId(all),
    created_at: new Date().toISOString(),
  };

  all.push(agent);
  writeAll(all);
  return agent;
}

export function createSupportAgent(
  emailOrName: string,
  colorId?: SupportAgentColorId,
): SupportAgent {
  const agent = ensureSupportAgentFromEmail(emailOrName, colorId);
  if (!agent) {
    throw new Error("Informe o e-mail ou usuário do agente.");
  }
  if (colorId && agent.colorId !== colorId) {
    return updateSupportAgentColor(agent.id, colorId) ?? agent;
  }
  return agent;
}

export function updateSupportAgentColor(
  id: string,
  colorId: SupportAgentColorId,
): SupportAgent | null {
  const all = readAll();
  const index = all.findIndex((agent) => agent.id === id);
  if (index < 0) return null;
  all[index] = { ...all[index], colorId };
  writeAll(all);
  return all[index];
}

export function deleteSupportAgent(id: string): boolean {
  const all = readAll();
  const next = all.filter((agent) => agent.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}

export function agentsById(agents: SupportAgent[]): Map<string, SupportAgent> {
  return new Map(agents.map((agent) => [agent.id, agent]));
}
