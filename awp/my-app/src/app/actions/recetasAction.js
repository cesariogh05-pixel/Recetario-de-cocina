"use server";

import { createClient } from "../base/supServer";
import { esAdmin } from "../base/admin";
import {
  DIFICULTADES,
  tiempoATexto,
  consejosALista,
} from "../base/formatoReceta";

// Obtener todas las recetas
export async function obtenerRecetas() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recetas")
    .select(`
      id_receta,
      id_categoria,
      nombre,
      descripcion,
      imagen,
      dificultad,
      porciones,
      tiempo
    `)
    .is("id_usuario", null)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al obtener recetas:", error.message);
    throw new Error("No se pudieron obtener las recetas.");
  }

  return data || [];
}

// Recetas para Explorar: catálogo + recetas públicas de la comunidad
export async function obtenerRecetasExplorar() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recetas")
    .select(`
      id_receta,
      id_usuario,
      id_categoria,
      nombre,
      descripcion,
      imagen,
      dificultad,
      porciones,
      tiempo,
      visibilidad,
      autor_nombre
    `)
    .or("id_usuario.is.null,visibilidad.eq.publica")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al obtener recetas de explorar:", error.message);
    throw new Error("No se pudieron obtener las recetas.");
  }

  return data || [];
}

// Obtener todas las categorías
export async function obtenerCategorias() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categorias")
    .select(`
      id_categoria,
      nombre,
      imagenes
    `)
    .order("id_categoria", { ascending: true });

  if (error) {
    console.error("Error al obtener categorías:", error.message);
    throw new Error("No se pudieron obtener las categorías.");
  }
  console.log("Categorías de Supabase:", data);

  return data || [];
}

// =========================
// OBTENER DETALLE DE RECETA
// =========================

export async function obtenerRecetaPorId(idReceta) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recetas")
    .select(`
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
      consejos,
      categorias (
        nombre
      )
    `)
    .eq("id_receta", idReceta)
    .maybeSingle();

  if (error) {
    console.error("Error al obtener la receta:", error.message);
    throw new Error("No se pudo obtener la receta.");
  }

  return data;
}

// =========================
// OBTENER RECETAS RECOMENDADAS
// =========================

export async function obtenerRecetasRecomendadas(idCategoria, idReceta) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recetas")
    .select(`
      id_receta,
      id_categoria,
      nombre,
      descripcion,
      imagen,
      dificultad,
      porciones,
      tiempo
    `)
    .eq("id_categoria", idCategoria)
    .is("id_usuario", null)
    .neq("id_receta", idReceta)
    .order("nombre", { ascending: true })
    .limit(3);

  if (error) {
    console.error(
      "Error al obtener recetas recomendadas:",
      error.message
    );
    throw new Error("No se pudieron obtener las recetas recomendadas.");
  }

  return data || [];
}

// =========================
// ADMIN: AÑADIR RECETA AL CATÁLOGO
// =========================

export async function crearRecetaCatalogo(datosReceta) {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user || !esAdmin(user)) {
    return {
      ok: false,
      error: "No tienes permisos de administrador para añadir recetas.",
    };
  }

  const dificultad = String(datosReceta?.dificultad ?? "").trim();

  if (!DIFICULTADES.includes(dificultad)) {
    return { ok: false, error: "Selecciona una dificultad válida." };
  }

  const { data, error } = await supabase
    .from("recetas")
    .insert([
      {
        nombre: datosReceta.nombre,
        descripcion: datosReceta.descripcion,
        id_categoria: datosReceta.id_categoria,
        imagen: datosReceta.imagen,
        dificultad,
        porciones: datosReceta.porciones,
        tiempo: tiempoATexto(datosReceta.tiempo),
        ingredientes: datosReceta.ingredientes,
        instrucciones: datosReceta.instrucciones,
        consejos: consejosALista(datosReceta.consejos),
        id_usuario: null,
        visibilidad: "publica",
        autor_nombre: "Mi Sabor",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error al crear receta de catálogo:", error.message);
    return {
      ok: false,
      error: "No se pudo guardar la receta en el catálogo.",
    };
  }

  return { ok: true, receta: data };
}

// =========================
// ADMIN: ELIMINAR RECETA DEL CATÁLOGO
// =========================

export async function eliminarRecetaCatalogo(idReceta) {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user || !esAdmin(user)) {
    return {
      ok: false,
      error: "No tienes permisos de administrador para eliminar recetas.",
    };
  }

  const { error } = await supabase
    .from("recetas")
    .delete()
    .eq("id_receta", idReceta);

  if (error) {
    console.error("Error al eliminar receta de catálogo:", error.message);
    return {
      ok: false,
      error: "No se pudo eliminar la receta.",
    };
  }

  return { ok: true };
}

// =========================
// ADMIN: ACTUALIZAR RECETA DEL CATÁLOGO
// =========================

export async function actualizarRecetaCatalogo(idReceta, datosReceta) {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();
  console.log("ADMIN ACTION USER:", user?.id, "ID RECETA:", idReceta);
  

  function asegurarArregloJSON(valor) {
  if (Array.isArray(valor)) {
    return valor;
  }

  if (typeof valor === "string") {
    const limpio = valor.trim();
    if (!limpio) return [];

    try {
      const parseado = JSON.parse(limpio);
      if (Array.isArray(parseado)) return parseado;
      if (parseado && typeof parseado === "object") return [parseado];
      if (typeof parseado === "string" && parseado.trim()) {
        return parseado
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
      }
      return [];
    } catch {
      return limpio
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    }
  }

  if (valor && typeof valor === "object") {
    return [valor];
  }

  return [];
}
  if (errorUsuario || !user || !esAdmin(user)) {
    return {
      ok: false,
      error: "No tienes permisos de administrador para editar recetas.",
    };
  }

  const consejosSeguros = asegurarArregloJSON(datosReceta?.consejos);

  const payload = {
    nombre: datosReceta.nombre,
    descripcion: datosReceta.descripcion,
    id_categoria: datosReceta.id_categoria,
    tiempo: tiempoATexto(datosReceta.tiempo),
    porciones: datosReceta.porciones,
    dificultad: datosReceta.dificultad,
    imagen: datosReceta.imagen,
    ingredientes: asegurarArregloJSON(datosReceta.ingredientes),
    instrucciones: asegurarArregloJSON(datosReceta.instrucciones),
    consejos: Array.isArray(consejosSeguros) ? consejosSeguros : [],
  };

  console.log(
  "CONSEJOS RECIBIDOS:",
  typeof datosReceta?.consejos,
  datosReceta?.consejos
);
console.log(
  "CONSEJOS EN PAYLOAD:",
  Array.isArray(payload.consejos),
  payload.consejos
);

const { data, error } = await supabase
  .from("recetas")
  .update(payload)
  .eq("id_receta", idReceta)
  .select()
  .single();

  if (error) {
    console.error("Error al actualizar receta de catálogo:", error.message);
    return {
      ok: false,
      error: "No se pudo actualizar la receta del catálogo.",
    };
  }

  return { ok: true, receta: data };
}