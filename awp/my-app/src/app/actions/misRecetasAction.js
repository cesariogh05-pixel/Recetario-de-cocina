"use server";

import { createClient } from "../base/supServer";
import {
  DIFICULTADES,
  tiempoATexto,
  consejosALista,
} from "../base/formatoReceta";

const BUCKET = "recetas-usuario";
const VISIBILIDADES = ["privada", "publica"];

const CAMPOS = `
  id_receta,
  id_usuario,
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
  visibilidad,
  autor_nombre,
  fecha_creacion
`;

// =========================
// FUNCIONES AUXILIARES
// =========================

// Usuario con sesión activa (o null)

async function obtenerContexto() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

// Nombre que se muestra como autor de una receta pública

async function obtenerNombreAutor(supabase, user) {
  const { data } = await supabase
    .from("usuarios")
    .select("nombre")
    .eq("id_usuario", user.id)
    .maybeSingle();

  return (
    data?.nombre?.trim() ||
    user.user_metadata?.nombre?.trim() ||
    user.email?.split("@")[0] ||
    "Usuario"
  );
}

// Ruta de una imagen dentro del bucket, solo si es del usuario

function obtenerRutaPropia(url, idUsuario) {
  if (!url) return null;

  const prefijo =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}` +
    `/storage/v1/object/public/${BUCKET}/${idUsuario}/`;

  if (!url.startsWith(prefijo)) return null;

  return decodeURIComponent(
    url.slice(prefijo.length - `${idUsuario}/`.length)
  );
}

async function borrarImagen(supabase, url, idUsuario) {
  const ruta = obtenerRutaPropia(url, idUsuario);

  if (!ruta) return;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([ruta]);

  if (error) {
    console.error("No se pudo eliminar la imagen:", error.message);
  }
}

function entero(valor, minimo, maximo) {
  const numero = Number(valor);

  return Number.isInteger(numero) &&
    numero >= minimo &&
    numero <= maximo
    ? numero
    : null;
}

function listaDeTextos(valor, maxElementos, maxLargo) {
  if (!Array.isArray(valor)) return [];

  const lista = valor
    .map((texto) => String(texto ?? "").trim())
    .filter(Boolean);

  if (lista.length > maxElementos) return null;
  if (lista.some((texto) => texto.length > maxLargo)) return null;

  return lista;
}

// Valida y limpia los datos recibidos del formulario

function limpiarDatos(datos, idUsuario) {
  const nombre = String(datos?.nombre ?? "").trim();

  if (!nombre || nombre.length > 100) {
    return { error: "Escribe un nombre de hasta 100 caracteres." };
  }

  const descripcion = String(datos?.descripcion ?? "").trim();

  if (descripcion.length > 300) {
    return { error: "La descripción admite hasta 300 caracteres." };
  }

  const consejos = String(datos?.consejos ?? "").trim();

  if (consejos.length > 1000) {
    return { error: "Los consejos admiten hasta 1000 caracteres." };
  }

  if (!DIFICULTADES.includes(datos?.dificultad)) {
    return { error: "Selecciona una dificultad válida." };
  }

  const porciones = entero(datos?.porciones, 1, 99);

  if (porciones === null) {
    return { error: "Las porciones deben estar entre 1 y 99." };
  }

  const tiempo = entero(datos?.tiempo, 1, 1440);

  if (tiempo === null) {
    return { error: "El tiempo debe estar entre 1 y 1440 minutos." };
  }

  const ingredientes = listaDeTextos(datos?.ingredientes, 60, 200);

  if (!ingredientes || ingredientes.length === 0) {
    return {
      error: "Agrega al menos un ingrediente (máximo 60, de hasta 200 caracteres).",
    };
  }

  const instrucciones = listaDeTextos(datos?.instrucciones, 60, 1000);

  if (!instrucciones || instrucciones.length === 0) {
    return {
      error: "Agrega al menos un paso (máximo 60, de hasta 1000 caracteres).",
    };
  }

  if (!VISIBILIDADES.includes(datos?.visibilidad)) {
    return { error: "Selecciona si la receta es privada o pública." };
  }

  // Solo se aceptan imágenes que estén en la carpeta del propio usuario

  const imagen = datos?.imagen ? String(datos.imagen) : null;

  if (imagen && !obtenerRutaPropia(imagen, idUsuario)) {
    return { error: "La imagen de la receta no es válida." };
  }

  return {
    datos: {
      nombre,
      descripcion: descripcion || null,
      id_categoria: datos?.id_categoria || null,
      imagen,
      dificultad: datos.dificultad,
      porciones,
      tiempo: tiempoATexto(tiempo),
      ingredientes,
      instrucciones,
      consejos: consejosALista(consejos),
      visibilidad: datos.visibilidad,
    },
  };
}

const SIN_SESION = { ok: false, error: "Debes iniciar sesión." };

// =========================
// OBTENER MIS RECETAS
// =========================

export async function obtenerMisRecetas() {
  const { supabase, user } = await obtenerContexto();

  if (!user) return [];

  const { data, error } = await supabase
    .from("recetas")
    .select(CAMPOS)
    .eq("id_usuario", user.id)
    .order("fecha_creacion", { ascending: false });

  if (error) {
    console.error("Error al obtener mis recetas:", error.message);
    throw new Error("No se pudieron obtener tus recetas.");
  }

  return data || [];
}

// =========================
// OBTENER RECETAS PÚBLICAS
// =========================

export async function obtenerRecetasComunidad() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recetas")
    .select(CAMPOS)
    .eq("visibilidad", "publica")
    .order("fecha_creacion", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error al obtener recetas públicas:", error.message);
    throw new Error("No se pudieron obtener las recetas de la comunidad.");
  }

  return data || [];
}

// =========================
// CREAR RECETA
// =========================

export async function crearReceta(entrada) {
  const { supabase, user } = await obtenerContexto();

  if (!user) return SIN_SESION;

  const { datos, error: errorValidacion } = limpiarDatos(
    entrada,
    user.id
  );

  if (errorValidacion) return { ok: false, error: errorValidacion };

  const autor = await obtenerNombreAutor(supabase, user);

  const { data, error } = await supabase
    .from("recetas")
    .insert({
      ...datos,
      id_usuario: user.id,
      autor_nombre: autor,
    })
    .select(CAMPOS)
    .single();

  if (error) {
    console.error("Error al crear la receta:", error.message);
    return { ok: false, error: "No se pudo guardar la receta." };
  }

  return { ok: true, receta: data };
}

// =========================
// ACTUALIZAR RECETA
// =========================

export async function actualizarReceta(idReceta, entrada) {
  const { supabase, user } = await obtenerContexto();

  if (!user) return SIN_SESION;

  const { datos, error: errorValidacion } = limpiarDatos(
    entrada,
    user.id
  );

  if (errorValidacion) return { ok: false, error: errorValidacion };

  const { data: anterior } = await supabase
    .from("recetas")
    .select("imagen")
    .eq("id_receta", idReceta)
    .eq("id_usuario", user.id)
    .maybeSingle();

  if (!anterior) {
    return { ok: false, error: "No se encontró la receta." };
  }

  const autor = await obtenerNombreAutor(supabase, user);

  const { data, error } = await supabase
    .from("recetas")
    .update({ ...datos, autor_nombre: autor })
    .eq("id_receta", idReceta)
    .eq("id_usuario", user.id)
    .select(CAMPOS)
    .maybeSingle();

  if (error || !data) {
    console.error("Error al actualizar la receta:", error?.message);
    return { ok: false, error: "No se pudo actualizar la receta." };
  }

  // Eliminar la foto anterior si fue reemplazada o quitada

  if (anterior.imagen && anterior.imagen !== datos.imagen) {
    await borrarImagen(supabase, anterior.imagen, user.id);
  }

  return { ok: true, receta: data };
}

// =========================
// CAMBIAR VISIBILIDAD
// =========================

export async function cambiarVisibilidad(idReceta, visibilidad) {
  const { supabase, user } = await obtenerContexto();

  if (!user) return SIN_SESION;

  if (!VISIBILIDADES.includes(visibilidad)) {
    return { ok: false, error: "Visibilidad no válida." };
  }

  const { data, error } = await supabase
    .from("recetas")
    .update({ visibilidad })
    .eq("id_receta", idReceta)
    .eq("id_usuario", user.id)
    .select("id_receta")
    .maybeSingle();

  if (error || !data) {
    console.error("Error al cambiar la visibilidad:", error?.message);
    return { ok: false, error: "No se pudo cambiar la visibilidad." };
  }

  return { ok: true };
}

// =========================
// ELIMINAR RECETA
// =========================

export async function eliminarReceta(idReceta) {
  const { supabase, user } = await obtenerContexto();

  if (!user) return SIN_SESION;

  const { data, error } = await supabase
    .from("recetas")
    .delete()
    .eq("id_receta", idReceta)
    .eq("id_usuario", user.id)
    .select("imagen")
    .maybeSingle();

  if (error || !data) {
    console.error("Error al eliminar la receta:", error?.message);
    return { ok: false, error: "No se pudo eliminar la receta." };
  }

  await borrarImagen(supabase, data.imagen, user.id);

  return { ok: true };
}
