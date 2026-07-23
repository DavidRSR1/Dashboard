import {
  SUPPORT_AGENT_COLORS,
  type SupportAgent,
  type SupportAgentColorId,
} from "@/types/supportErrors";

const STORAGE_KEY = "support-agents";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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

export function createSupportAgent(name: string, colorId?: SupportAgentColorId): SupportAgent {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Nome do agente é obrigatório.");
  }

  const all = readAll();
  const duplicate = all.find(
    (agent) => agent.name.localeCompare(trimmed, "pt-BR", { sensitivity: "accent" }) === 0,
  );
  if (duplicate) return duplicate;

  const agent: SupportAgent = {
    id: createId(),
    name: trimmed,
    colorId: colorId ?? nextColorId(all),
    created_at: new Date().toISOString(),
  };

  all.push(agent);
  writeAll(all);
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
