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
  user_id?: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type CategoriesMode = "per-user" | "legacy";

let cachedMode: CategoriesMode | null = null;

function mapRow(row: CategoriaRow): CronogramaCategoria {
  return {
    id: row.id,
    name: row.name,
    user_id: row.user_id ?? "",
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isMissingUserIdError(message: string): boolean {
  return (
    /user_id/i.test(message) &&
    (/does not exist/i.test(message) || /schema cache/i.test(message) || /Could not find/i.test(message))
  );
}

function migrationHint(message: string): string {
  if (isMissingUserIdError(message)) {
    return (
      "A tabela de categorias ainda não foi migrada. No Supabase → SQL Editor, execute " +
      "supabase/cronograma_categorias.sql (inteiro). Depois rode: NOTIFY pgrst, 'reload schema';"
    );
  }
  return message;
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

/** Detecta se a coluna user_id já existe no banco (com cache). */
async function getCategoriesMode(): Promise<CategoriesMode> {
  if (cachedMode) return cachedMode;

  const { error } = await supabase.from("cronograma_categorias").select("id, user_id").limit(1);

  if (error && isMissingUserIdError(error.message)) {
    cachedMode = "legacy";
    return cachedMode;
  }

  // Se select sem user_id funcionar mas com user_id falhar, já tratamos acima.
  // Qualquer outro erro: tenta per-user; as operações vão reportar.
  cachedMode = "per-user";
  return cachedMode;
}

export function resetCronogramaCategoriasModeCache() {
  cachedMode = null;
}

export async function listCronogramaCategorias(): Promise<{
  data: CronogramaCategoria[];
  error: string | null;
}> {
  const mode = await getCategoriesMode();
  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { data: [], error: authError };
  }

  let query = supabase.from("cronograma_categorias").select("*").order("name", { ascending: true });

  if (mode === "per-user") {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingUserIdError(error.message)) {
      cachedMode = "legacy";
      return listCronogramaCategorias();
    }
    return { data: [], error: migrationHint(error.message) };
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
  const mode = await getCategoriesMode();
  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { data: [], error: authError };
  }

  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];

  if (unique.length > 0) {
    const now = new Date().toISOString();

    if (mode === "per-user") {
      const rows = unique.map((name) => ({
        name,
        user_id: userId,
        updated_at: now,
      }));
      const { error } = await supabase
        .from("cronograma_categorias")
        .upsert(rows, { onConflict: "user_id,name", ignoreDuplicates: true });

      if (error) {
        if (isMissingUserIdError(error.message)) {
          cachedMode = "legacy";
          return syncCategoriasFromNames(names);
        }
        return { data: [], error: migrationHint(error.message) };
      }
    } else {
      const rows = unique.map((name) => ({
        name,
        updated_at: now,
      }));
      const { error } = await supabase
        .from("cronograma_categorias")
        .upsert(rows, { onConflict: "name", ignoreDuplicates: true });

      if (error) {
        // Sem unique(name) — tenta insert uma a uma ignorando conflito
        for (const name of unique) {
          const existing = await supabase
            .from("cronograma_categorias")
            .select("id")
            .eq("name", name)
            .maybeSingle();
          if (!existing.data) {
            await supabase.from("cronograma_categorias").insert({ name, updated_at: now });
          }
        }
      }
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

  const mode = await getCategoriesMode();
  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { data: null, error: authError };
  }

  const now = new Date().toISOString();

  if (mode === "per-user") {
    const { data, error } = await supabase
      .from("cronograma_categorias")
      .upsert(
        {
          name: trimmed,
          user_id: userId,
          archived_at: null,
          updated_at: now,
        },
        { onConflict: "user_id,name" },
      )
      .select("*")
      .single();

    if (error) {
      if (isMissingUserIdError(error.message)) {
        cachedMode = "legacy";
        return createCronogramaCategoria(name);
      }
      return { data: null, error: migrationHint(error.message) };
    }

    return { data: mapRow(data as CategoriaRow), error: null };
  }

  // Modo legado (sem coluna user_id): adiciona sem quebrar o board.
  const existing = await supabase
    .from("cronograma_categorias")
    .select("*")
    .eq("name", trimmed)
    .maybeSingle();

  if (existing.error && !isMissingUserIdError(existing.error.message)) {
    // pode falhar se select * ainda ok — segue para insert
  }

  if (existing.data) {
    const { data, error } = await supabase
      .from("cronograma_categorias")
      .update({ archived_at: null, updated_at: now })
      .eq("id", (existing.data as CategoriaRow).id)
      .select("*")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: mapRow(data as CategoriaRow), error: null };
  }

  const { data, error } = await supabase
    .from("cronograma_categorias")
    .insert({ name: trimmed, archived_at: null, updated_at: now })
    .select("*")
    .single();

  if (error) {
    // Conflito de unique(name): busca e restaura
    if (/duplicate|unique/i.test(error.message)) {
      const again = await supabase
        .from("cronograma_categorias")
        .select("*")
        .eq("name", trimmed)
        .maybeSingle();
      if (again.data) {
        return { data: mapRow(again.data as CategoriaRow), error: null };
      }
    }
    return { data: null, error: error.message };
  }

  return { data: mapRow(data as CategoriaRow), error: null };
}

/**
 * Renomeia a categoria e propaga o novo nome para atividades + tags do histórico.
 * Não apaga atividades nem eventos.
 */
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

  const mode = await getCategoriesMode();
  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { error: authError };
  }

  if (mode === "per-user") {
    const { error: rpcError } = await supabase.rpc("rename_cronograma_categoria", {
      p_id: id,
      p_old_name: oldName,
      p_new_name: trimmed,
    });

    if (!rpcError) {
      return { error: null };
    }

    if (!/could not find the function|schema cache|PGRST202/i.test(rpcError.message)) {
      if (isMissingUserIdError(rpcError.message)) {
        cachedMode = "legacy";
        return renameCronogramaCategoria(id, oldName, newName);
      }
      return { error: migrationHint(rpcError.message) };
    }
  }

  // Fallback (RPC ausente ou modo legado) — sem apagar nada.
  let conflictQuery = supabase
    .from("cronograma_categorias")
    .select("id")
    .eq("name", trimmed)
    .neq("id", id);

  if (mode === "per-user") {
    conflictQuery = conflictQuery.eq("user_id", userId);
  }

  const { data: conflict, error: conflictError } = await conflictQuery.maybeSingle();

  if (conflictError) {
    if (isMissingUserIdError(conflictError.message)) {
      cachedMode = "legacy";
      return renameCronogramaCategoria(id, oldName, newName);
    }
    return { error: migrationHint(conflictError.message) };
  }
  if (conflict) {
    return { error: "Já existe uma categoria com esse nome." };
  }

  let updateCat = supabase
    .from("cronograma_categorias")
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (mode === "per-user") {
    updateCat = updateCat.eq("user_id", userId);
  }

  const { error: catError } = await updateCat;
  if (catError) {
    return { error: migrationHint(catError.message) };
  }

  let actUpdate = supabase
    .from("cronograma_atividades")
    .update({ categoria: trimmed })
    .eq("categoria", oldName);

  if (mode === "per-user") {
    actUpdate = actUpdate.or(`created_by.eq.${userId},created_by.is.null`);
  }

  const { error: actError } = await actUpdate;
  if (actError) {
    let revert = supabase
      .from("cronograma_categorias")
      .update({ name: oldName, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (mode === "per-user") {
      revert = revert.eq("user_id", userId);
    }
    await revert;
    return { error: actError.message };
  }

  const { data: events, error: eventsError } = await supabase
    .from("cronograma_eventos")
    .select("id, dados, created_by, atividade_id");

  if (!eventsError && events) {
    const toUpdate = (
      events as Array<{
        id: string;
        dados: Record<string, unknown> | null;
        created_by: string | null;
        atividade_id: string;
      }>
    ).filter((event) => {
      const cat = typeof event.dados?.categoria === "string" ? event.dados.categoria : "";
      if (cat !== oldName) return false;
      if (mode === "legacy") return true;
      return event.created_by === userId || event.created_by == null;
    });

    for (const event of toUpdate) {
      await supabase
        .from("cronograma_eventos")
        .update({
          dados: {
            ...(event.dados ?? {}),
            categoria: trimmed,
          },
        })
        .eq("id", event.id);
    }
  }

  return { error: null };
}

export async function setCronogramaCategoriaArchived(
  id: string,
  archived: boolean,
): Promise<{ error: string | null }> {
  const mode = await getCategoriesMode();
  const { userId, error: authError } = await requireUserId();
  if (!userId) {
    return { error: authError };
  }

  let query = supabase
    .from("cronograma_categorias")
    .update({
      archived_at: archived ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (mode === "per-user") {
    query = query.eq("user_id", userId);
  }

  const { error } = await query;

  if (error && isMissingUserIdError(error.message)) {
    cachedMode = "legacy";
    return setCronogramaCategoriaArchived(id, archived);
  }

  return { error: error ? migrationHint(error.message) : null };
}

export function activeCategoriaNames(categorias: CronogramaCategoria[]): string[] {
  return categorias.filter((item) => !item.archived_at).map((item) => item.name);
}

export function archivedCategoriaNames(categorias: CronogramaCategoria[]): string[] {
  return categorias.filter((item) => Boolean(item.archived_at)).map((item) => item.name);
}
