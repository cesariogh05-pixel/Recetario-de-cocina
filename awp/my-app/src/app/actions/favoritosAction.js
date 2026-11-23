"use server";

import { createClient } from "../base/supServer";

// =========================
// VERIFICAR USUARIO
// =========================

async function obtenerUsuario() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Debes iniciar sesión.");
  }

  return { supabase, user };
}

// =========================
// OBTENER IDS DE FAVORITOS
// =========================

export async function obtenerIdsFavoritos() {
  const { supabase, user } = await obtenerUsuario();

  const { data, error } = await supabase
    .from("favoritos")
    .select("id_receta")
    .eq("id_usuario", user.id);

  if (error) {
    console.error("Error al obtener favoritos:", error.message);
    throw new Error("No se pudieron obtener los favoritos.");
  }

  return (data || []).map((item) => item.id_receta);
}

// =========================
// OBTENER RECETAS FAVORITAS
// =========================

export async function obtenerFavoritos() {
  const { supabase, user } = await obtenerUsuario();

  const { data, error } = await supabase
    .from("favoritos")
    .select(`
      id_favorito,
      id_receta,
      fecha,
      recetas (
        id_receta,
        id_categoria,
        nombre,
        descripcion,
        imagen,
        dificultad,
        porciones,
        tiempo,
        ingredientes,
        instrucciones,
        consejos
      )
    `)
    .eq("id_usuario", user.id)
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error al consultar favoritos:", error.message);
    throw new Error("No se pudieron cargar las recetas favoritas.");
  }

  return (data || [])
    .filter((item) => item.recetas)
    .map((item) => ({
      ...item.recetas,
      id_favorito: item.id_favorito,
      fecha_favorito: item.fecha,
    }));
}

// =========================
// AGREGAR FAVORITO
// =========================

export async function agregarFavorito(idReceta) {
  const { supabase, user } = await obtenerUsuario();

  const { error } = await supabase
    .from("favoritos")
    .insert({
      id_usuario: user.id,
      id_receta: idReceta,
    });

  if (error) {
    // La receta ya se encuentra guardada
    if (error.code === "23505") {
      return { success: true };
    }

    console.error("Error al agregar favorito:", error.message);
    throw new Error("No se pudo guardar la receta.");
  }

  return { success: true };
}

// =========================
// ELIMINAR FAVORITO
// =========================

export async function eliminarFavorito(idReceta) {
  const { supabase, user } = await obtenerUsuario();

  const { error } = await supabase
    .from("favoritos")
    .delete()
    .eq("id_usuario", user.id)
    .eq("id_receta", idReceta);

  if (error) {
    console.error("Error al eliminar favorito:", error.message);
    throw new Error("No se pudo eliminar la receta.");
  }

  return { success: true };
}