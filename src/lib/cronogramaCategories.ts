import { supabase } from "@/lib/supabase/client";

export type CronogramaCategoria = {
  id: string;
  name: string;
  user_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type CategoriaRow = {
  id: string;
  name: string;
  user_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CategoriaRow): CronogramaCategoria {
  return {
    id: row.id,
    name: row.name,
    user_id: row.user_id,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function requireUserId(): Promise<{ userId: string | null; error: string | null }> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    return { userId: null, error: error.message };
  }
  if (!user) {
    return { userId: null, error: "Faça login para gerenciar categorias." };
  }
  return { userId: user.id, error: null };
}

export async function listCronogramaCategorias(): Promise<{
  data: CronogramaCategoria[];
  error: string | null;
}> {
  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { data: [], error: authError };
  }

  const { data, error } = await supabase
    .from("cronograma_categorias")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: ((data as CategoriaRow[] | null) ?? []).map(mapRow),
    error: null,
  };
}

/** Garante que nomes usados nas atividades do usuário existam no catálogo dele. */
export async function syncCategoriasFromNames(
  names: string[],
): Promise<{ data: CronogramaCategoria[]; error: string | null }> {
  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { data: [], error: authError };
  }

  const unique = [
    ...new Set(names.map((name) => name.trim()).filter(Boolean)),
  ];

  if (unique.length > 0) {
    const now = new Date().toISOString();
    const rows = unique.map((name) => ({
      name,
      user_id: userId,
      updated_at: now,
    }));
    const { error } = await supabase
      .from("cronograma_categorias")
      .upsert(rows, { onConflict: "user_id,name", ignoreDuplicates: true });

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

  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("cronograma_categorias")
    .upsert(
      {
        name: trimmed,
        user_id: userId,
        archived_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,name" },
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

  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { error: authError };
  }

  const { error: catError } = await supabase
    .from("cronograma_categorias")
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (catError) {
    return { error: catError.message };
  }

  const { error: actError } = await supabase
    .from("cronograma_atividades")
    .update({ categoria: trimmed })
    .eq("categoria", oldName)
    .eq("created_by", userId);

  if (actError) {
    await supabase
      .from("cronograma_categorias")
      .update({ name: oldName, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    return { error: actError.message };
  }

  return { error: null };
}

export async function setCronogramaCategoriaArchived(
  id: string,
  archived: boolean,
): Promise<{ error: string | null }> {
  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { error: authError };
  }

  const { error } = await supabase
    .from("cronograma_categorias")
    .update({
      archived_at: archived ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

export function activeCategoriaNames(categorias: CronogramaCategoria[]): string[] {
  return categorias.filter((item) => !item.archived_at).map((item) => item.name);
}

export function archivedCategoriaNames(categorias: CronogramaCategoria[]): string[] {
  return categorias.filter((item) => Boolean(item.archived_at)).map((item) => item.name);
}
