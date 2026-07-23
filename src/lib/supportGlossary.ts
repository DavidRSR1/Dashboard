import { supabase } from "@/lib/supabase/client";
import {
  emptySupportGlossaryForm,
  type SupportGlossaryEntry,
  type SupportGlossaryFormData,
} from "@/types/supportErrors";

type GlossaryRow = {
  id: string;
  title: string;
  symptoms: string;
  cause: string | null;
  solution: string;
  module: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: GlossaryRow): SupportGlossaryEntry {
  return {
    id: row.id,
    title: row.title,
    symptoms: row.symptoms ?? "",
    cause: row.cause ?? null,
    solution: row.solution ?? "",
    module: row.module ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function payloadFromForm(form: SupportGlossaryFormData) {
  return {
    title: form.title.trim(),
    symptoms: form.symptoms.trim(),
    cause: form.cause.trim() || null,
    solution: form.solution.trim(),
    module: form.module.trim(),
    updated_at: new Date().toISOString(),
  };
}

export async function listSupportGlossary(): Promise<{
  data: SupportGlossaryEntry[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("support_error_glossary")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: ((data as GlossaryRow[] | null) ?? []).map(mapRow),
    error: null,
  };
}

export async function createSupportGlossaryEntry(
  form: SupportGlossaryFormData,
): Promise<{ data: SupportGlossaryEntry | null; error: string | null }> {
  const payload = {
    ...payloadFromForm(form),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("support_error_glossary")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapRow(data as GlossaryRow), error: null };
}

export async function updateSupportGlossaryEntry(
  id: string,
  form: SupportGlossaryFormData,
): Promise<{ data: SupportGlossaryEntry | null; error: string | null }> {
  const { data, error } = await supabase
    .from("support_error_glossary")
    .update(payloadFromForm(form))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapRow(data as GlossaryRow), error: null };
}

export async function deleteSupportGlossaryEntry(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from("support_error_glossary").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export function formFromGlossaryEntry(entry: SupportGlossaryEntry): SupportGlossaryFormData {
  return {
    title: entry.title,
    symptoms: entry.symptoms,
    cause: entry.cause ?? "",
    solution: entry.solution,
    module: entry.module,
  };
}

export function filterGlossaryEntries(
  entries: SupportGlossaryEntry[],
  query: string,
): SupportGlossaryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((entry) => {
    const haystack = [entry.title, entry.symptoms, entry.cause ?? "", entry.solution, entry.module]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function suggestIncidentFieldsFromGlossary(
  entry: SupportGlossaryEntry,
): Pick<
  ReturnType<typeof emptySupportGlossaryForm> extends SupportGlossaryFormData
    ? import("@/types/supportErrors").SupportErrorFormData
    : never,
  never
> & {
  title: string;
  description: string;
  module: string;
  resolution: string;
  glossary_id: string;
} {
  return {
    title: entry.title,
    description: entry.symptoms,
    module: entry.module,
    resolution: entry.solution,
    glossary_id: entry.id,
  };
}
