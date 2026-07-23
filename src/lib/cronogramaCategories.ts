import { supabase } from "@/lib/supabase/client";

export type CronogramaCategoria = {
  id: string;
  name: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type CategoriaRow = {
  id: string;
  name: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CategoriaRow): CronogramaCategoria {
  return {
    id: row.id,
    name: row.name,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listCronogramaCategorias(): Promise<{
  data: CronogramaCategoria[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("cronograma_categorias")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: ((data as CategoriaRow[] | null) ?? []).map(mapRow),
    error: null,
  };
}

/** Garante que nomes usados nas atividades existam no catálogo. */
export async function syncCategoriasFromNames(
  names: string[],
): Promise<{ data: CronogramaCategoria[]; error: string | null }> {
  const unique = [
    ...new Set(names.map((name) => name.trim()).filter(Boolean)),
  ];

  if (unique.length > 0) {
    const rows = unique.map((name) => ({
      name,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("cronograma_categorias")
      .upsert(rows, { onConflict: "name", ignoreDuplicates: true });

    if (error) {
      return { data: [], error: error.message };
    }
  }

  return listCronogramaCategorias();
}

export async function createCronogramaCategoria(
  name: string,
): Promise<{ data: CronogramaCategoria | null; error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { data: null, error: "Informe o nome da categoria." };
  }

  const { data, error } = await supabase
    .from("cronograma_categorias")
    .upsert(
      { name: trimmed, archived_at: null, updated_at: new Date().toISOString() },
      { onConflict: "name" },
    )
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapRow(data as CategoriaRow), error: null };
}

export async function renameCronogramaCategoria(
  id: string,
  oldName: string,
  newName: string,
): Promise<{ error: string | null }> {
  const trimmed = newName.trim();
  if (!trimmed) {
    return { error: "Informe o novo nome." };
  }
  if (trimmed === oldName) {
    return { error: null };
  }

  const { error: catError } = await supabase
    .from("cronograma_categorias")
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (catError) {
    return { error: catError.message };
  }

  const { error: actError } = await supabase
    .from("cronograma_atividades")
    .update({ categoria: trimmed })
    .eq("categoria", oldName);

  if (actError) {
    // tenta reverter o nome no catálogo
    await supabase
      .from("cronograma_categorias")
      .update({ name: oldName, updated_at: new Date().toISOString() })
      .eq("id", id);
    return { error: actError.message };
  }

  return { error: null };
}

export async function setCronogramaCategoriaArchived(
  id: string,
  archived: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("cronograma_categorias")
    .update({
      archived_at: archived ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export function activeCategoriaNames(categorias: CronogramaCategoria[]): string[] {
  return categorias.filter((item) => !item.archived_at).map((item) => item.name);
}

export function archivedCategoriaNames(categorias: CronogramaCategoria[]): string[] {
  return categorias.filter((item) => Boolean(item.archived_at)).map((item) => item.name);
}
