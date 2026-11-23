"use client";
import {
  crearRecetaCatalogo,
  actualizarRecetaCatalogo,
} from "../actions/recetasAction";
import { useEffect, useRef, useState } from "react";
import { createClient } from "../base/supabase";
import { esAdmin } from "../base/admin";
import {
  crearReceta,
  actualizarReceta,
} from "../actions/misRecetasAction";

import {
  DIFICULTADES,
  tiempoAMinutos,
  consejosATexto,
  elementoATexto,
} from "../base/formatoReceta";

const BUCKET = "recetas-usuario";

const FORMATOS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const LIMITE = 2 * 1024 * 1024;


const CLASE_INPUT =
  "w-full rounded-xl border border-[#DBC7AE] bg-transparent px-4 py-3 outline-none transition-colors focus:border-[#805039] focus:ring-2 focus:ring-[#805039]/10 disabled:opacity-60";

const CLASE_ETIQUETA = "mb-2 block text-sm font-medium";

// =========================
// FUNCIONES AUXILIARES
// =========================

const nuevoItem = (texto = "") => ({
  id: crypto.randomUUID(),
  texto,
});

const iniciarLista = (lista, minimo) => {
  const items = (lista || []).map((item) => nuevoItem(elementoATexto(item)));

  while (items.length < minimo) items.push(nuevoItem());

  return items;
};

// =========================
// COMPONENTE FORMULARIO
// =========================

export default function FormularioReceta({
  abierto,
  cerrar,
  categorias = [],
  receta = null,
  modoAdmin = false,
  onGuardada,
}) {
  const editando = Boolean(receta);

  const [supabase] = useState(() => createClient());
  const [soyAdmin, setSoyAdmin] = useState(false);

  const dialogRef = useRef(null);
  const inputFoto = useRef(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [idCategoria, setIdCategoria] = useState("");
  const [dificultad, setDificultad] = useState("Fácil");
  const [porciones, setPorciones] = useState(4);
  const [tiempo, setTiempo] = useState(30);
  const [ingredientes, setIngredientes] = useState([]);
  const [pasos, setPasos] = useState([]);
  const [consejos, setConsejos] = useState("");
  const [visibilidad, setVisibilidad] = useState("privada");

  const [imagenActual, setImagenActual] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [quitarImagen, setQuitarImagen] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Detectar si el usuario actual es administrador
  useEffect(() => {
    let activo = true;

    const revisarAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (activo) {
        setSoyAdmin(esAdmin(user));
      }
    };

    revisarAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (activo) {
        setSoyAdmin(esAdmin(session?.user ?? null));
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // =========================
  // ABRIR Y CERRAR LA VENTANA
  // =========================

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (abierto && !dialog.open) {
      dialog.showModal();
    } else if (!abierto && dialog.open) {
      dialog.close();
    }
  }, [abierto]);

  // Evitar desplazamiento de la página
  useEffect(() => {
    if (!abierto) return;

    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [abierto]);

  // =========================
  // CARGAR LOS DATOS AL ABRIR
  // =========================

  useEffect(() => {
    if (!abierto) return;

    setNombre(receta?.nombre ?? "");
    setDescripcion(receta?.descripcion ?? "");
    setIdCategoria(
      receta?.id_categoria != null ? String(receta.id_categoria) : ""
    );
    setDificultad(String(receta?.dificultad ?? "Fácil").trim());
    setPorciones(receta?.porciones ?? 4);
    setTiempo(tiempoAMinutos(receta?.tiempo) ?? 30);
    setIngredientes(iniciarLista(receta?.ingredientes, 3));
    setPasos(iniciarLista(receta?.instrucciones, 2));
    setConsejos(consejosATexto(receta?.consejos));
    setVisibilidad(receta?.visibilidad ?? "privada");

    setImagenActual(receta?.imagen ?? null);
    setArchivo(null);
    setQuitarImagen(false);

    setError("");
    setGuardando(false);
  }, [abierto, receta]);

  // =========================
  // VISTA PREVIA DE LA FOTO
  // =========================

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return;
    }

    const url = URL.createObjectURL(archivo);

    setVistaPrevia(url);

    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  // =========================
  // CERRAR
  // =========================

  const solicitarCierre = () => {
    if (guardando) return;

    cerrar();
  };

  // =========================
  // SELECCIONAR FOTOGRAFÍA
  // =========================

  const seleccionarFoto = (e) => {
    const seleccion = e.target.files?.[0];

    e.target.value = "";

    if (!seleccion) return;

    setError("");

    if (!FORMATOS[seleccion.type]) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }

    if (seleccion.size > LIMITE) {
      setError("La imagen no puede superar los 2 MB.");
      return;
    }

    setArchivo(seleccion);
    setQuitarImagen(false);
  };

  const quitarFoto = () => {
    setArchivo(null);
    setQuitarImagen(true);
    setError("");
  };

  // =========================
  // EDITAR LISTAS DINÁMICAS
  // =========================

  const cambiarItem = (setLista, id, texto) => {
    setLista((lista) =>
      lista.map((item) =>
        item.id === id ? { ...item, texto } : item
      )
    );
  };

  const quitarItem = (setLista, id) => {
    setLista((lista) =>
      lista.length > 1
        ? lista.filter((item) => item.id !== id)
        : lista
    );
  };

  const agregarItem = (setLista) => {
    setLista((lista) => [...lista, nuevoItem()]);
  };

  // =========================
  // GUARDAR RECETA
  // =========================

  const guardar = async (e) => {
    e.preventDefault();

    if (guardando) return;

    setError("");

    if (modoAdmin && !soyAdmin) {
      setError("Solo el administrador puede añadir recetas al catálogo.");
      return;
    }

    const listaIngredientes = ingredientes
      .map((item) => item.texto.trim())
      .filter(Boolean);

    const listaPasos = pasos
      .map((item) => item.texto.trim())
      .filter(Boolean);

    if (!nombre.trim()) {
      setError("Escribe el nombre de la receta.");
      return;
    }

    if (listaIngredientes.length === 0) {
      setError("Agrega al menos un ingrediente.");
      return;
    }

    if (listaPasos.length === 0) {
      setError("Agrega al menos un paso de preparación.");
      return;
    }

    setGuardando(true);

    let rutaNueva = null;

    try {
      let imagenFinal = quitarImagen ? null : imagenActual;

      if (archivo) {
        const {
          data: { user },
          error: errorUsuario,
        } = await supabase.auth.getUser();

        if (errorUsuario || !user) {
          throw new Error("Sesión expirada");
        }

        rutaNueva = `${user.id}/${crypto.randomUUID()}.${FORMATOS[archivo.type]}`;

        const { error: errorSubida } = await supabase.storage
          .from(BUCKET)
          .upload(rutaNueva, archivo, {
            contentType: archivo.type,
            upsert: false,
          });

        if (errorSubida) {
          rutaNueva = null;
          throw errorSubida;
        }

        const { data } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(rutaNueva);

        imagenFinal = data.publicUrl;
      }

      const datos = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        id_categoria: idCategoria || null,
        imagen: imagenFinal,
        dificultad,
        porciones: Number(porciones) || 4,
        tiempo: Number(tiempo) || 30,
        ingredientes: listaIngredientes,
        instrucciones: listaPasos,
        consejos: consejos.trim() || null,
        ...(modoAdmin ? {} : { visibilidad }),
      };

      const respuesta = modoAdmin
  ? editando
    ? await actualizarRecetaCatalogo(receta.id_receta, datos)
    : await crearRecetaCatalogo(datos)
  : editando
    ? await actualizarReceta(receta.id_receta, datos)
    : await crearReceta(datos);

      if (!respuesta.ok) {
        if (rutaNueva) {
          await supabase.storage.from(BUCKET).remove([rutaNueva]);
        }

        setError(respuesta.error);
        return;
      }

      onGuardada?.(respuesta.receta, editando);
    } catch (err) {
      console.error(err);

      if (rutaNueva) {
        await supabase.storage.from(BUCKET).remove([rutaNueva]);
      }

      setError("No se pudo guardar la receta. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  // =========================
  // DATOS VISUALES
  // =========================

  const imagenMostrada = quitarImagen
    ? null
    : vistaPrevia || imagenActual;

  // =========================
  // INTERFAZ
  // =========================

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="formulario-receta-titulo"
      aria-busy={guardando}
      onCancel={(e) => {
        e.preventDefault();
        solicitarCierre();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          solicitarCierre();
        }
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-[720px] max-h-[92dvh] overflow-y-auto rounded-[28px] bg-[#FFFDF8] p-0 text-[#603B2A] shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={guardar} className="relative px-6 py-8 sm:px-9">
        {/* BOTÓN CERRAR */}
        <button
          type="button"
          onClick={solicitarCierre}
          disabled={guardando}
          aria-label="Cerrar ventana"
          className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#805039] transition-colors hover:bg-[#F0E5D5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {/* ENCABEZADO */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#C17B48]">
  {modoAdmin
    ? editando
      ? "Administración · Editar receta"
      : "Administración · Nueva receta"
    : editando
      ? "Editar receta"
      : "Nueva receta"}
</p>

<h2
  id="formulario-receta-titulo"
  className="titulo text-3xl font-bold"
>
  {modoAdmin
    ? editando
      ? "Edita la receta del catálogo"
      : "Añadir receta al recetario"
    : editando
      ? "Actualiza tu receta"
      : "Cuéntanos tu receta"}
</h2>

        <p className="mb-8 mt-2 text-sm text-[#8C6D53]">
          Guarda los ingredientes y pasos para volver a prepararla cuando quieras.
        </p>

        {/* NOMBRE */}
        <div className="mb-6">
          <label htmlFor="receta-nombre" className={CLASE_ETIQUETA}>
            Nombre de la receta
          </label>

          <input
            id="receta-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={100}
            disabled={guardando}
            required
            placeholder="Ej. Pozole de la abuela"
            className={CLASE_INPUT}
          />
        </div>

        {/* DESCRIPCIÓN */}
        <div className="mb-6">
          <label htmlFor="receta-descripcion" className={CLASE_ETIQUETA}>
            Descripción corta{" "}
            <span className="font-normal text-[#8C6D53]">(opcional)</span>
          </label>

          <textarea
            id="receta-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={300}
            rows={2}
            disabled={guardando}
            placeholder="¿Qué la hace especial?"
            className={`${CLASE_INPUT} resize-none`}
          />

          <p className="mt-1 text-right text-xs text-[#8C6D53]">
            {descripcion.length}/300
          </p>
        </div>

        {/* CATEGORÍA, DIFICULTAD, PORCIONES Y TIEMPO */}
        <div className="mb-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="receta-categoria" className={CLASE_ETIQUETA}>
              Categoría
            </label>

            <select
              id="receta-categoria"
              value={idCategoria}
              onChange={(e) => setIdCategoria(e.target.value)}
              disabled={guardando}
              className={`${CLASE_INPUT} cursor-pointer`}
            >
              <option value="">Sin categoría</option>

              {categorias.map((cat) => (
                <option
                  key={cat.id_categoria}
                  value={String(cat.id_categoria)}
                >
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="receta-dificultad" className={CLASE_ETIQUETA}>
              Dificultad
            </label>

            <select
              id="receta-dificultad"
              value={dificultad}
              onChange={(e) => setDificultad(e.target.value)}
              disabled={guardando}
              className={`${CLASE_INPUT} cursor-pointer`}
            >
              {DIFICULTADES.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="receta-porciones" className={CLASE_ETIQUETA}>
              Porciones
            </label>

            <input
              id="receta-porciones"
              type="number"
              min={1}
              max={99}
              value={porciones}
              onChange={(e) => setPorciones(e.target.value)}
              disabled={guardando}
              required
              className={CLASE_INPUT}
            />
          </div>

          <div>
            <label htmlFor="receta-tiempo" className={CLASE_ETIQUETA}>
              Tiempo total (minutos)
            </label>

            <input
              id="receta-tiempo"
              type="number"
              min={1}
              max={1440}
              value={tiempo}
              onChange={(e) => setTiempo(e.target.value)}
              disabled={guardando}
              required
              className={CLASE_INPUT}
            />
          </div>
        </div>

        {/* INGREDIENTES */}
        <fieldset className="mb-6">
          <legend className={CLASE_ETIQUETA}>Ingredientes</legend>

          <div className="flex flex-col gap-2.5">
            {ingredientes.map((item, indice) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.texto}
                  onChange={(e) =>
                    cambiarItem(setIngredientes, item.id, e.target.value)
                  }
                  maxLength={200}
                  disabled={guardando}
                  aria-label={`Ingrediente ${indice + 1}`}
                  placeholder="Ej. Tazas de maíz cacahuazintle"
                  className={CLASE_INPUT}
                />

                <button
                  type="button"
                  onClick={() => quitarItem(setIngredientes, item.id)}
                  disabled={guardando || ingredientes.length === 1}
                  aria-label={`Quitar ingrediente ${indice + 1}`}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#A34737] transition-colors hover:bg-[#FAECE7] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => agregarItem(setIngredientes)}
            disabled={guardando || ingredientes.length >= 60}
            className="mt-3 cursor-pointer rounded-full border border-[#CBB69E] px-4 py-2 text-sm font-medium text-[#805039] transition-colors hover:bg-[#F0E5D5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Agregar ingrediente
          </button>
        </fieldset>

        {/* PREPARACIÓN */}
        <fieldset className="mb-6">
          <legend className={CLASE_ETIQUETA}>Preparación</legend>

          <div className="flex flex-col gap-2.5">
            {pasos.map((item, indice) => (
              <div key={item.id} className="flex items-start gap-2">
                <span className="titulo mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBDDC5] text-sm font-bold text-[#603B2A]">
                  {indice + 1}
                </span>

                <textarea
                  value={item.texto}
                  onChange={(e) =>
                    cambiarItem(setPasos, item.id, e.target.value)
                  }
                  maxLength={1000}
                  rows={2}
                  disabled={guardando}
                  aria-label={`Paso ${indice + 1}`}
                  placeholder="Describe este paso"
                  className={`${CLASE_INPUT} resize-y`}
                />

                <button
                  type="button"
                  onClick={() => quitarItem(setPasos, item.id)}
                  disabled={guardando || pasos.length === 1}
                  aria-label={`Quitar paso ${indice + 1}`}
                  className="mt-0.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#A34737] transition-colors hover:bg-[#FAECE7] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => agregarItem(setPasos)}
            disabled={guardando || pasos.length >= 60}
            className="mt-3 cursor-pointer rounded-full border border-[#CBB69E] px-4 py-2 text-sm font-medium text-[#805039] transition-colors hover:bg-[#F0E5D5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Agregar paso
          </button>
        </fieldset>

        {/* CONSEJOS */}
        <div className="mb-6">
          <label htmlFor="receta-consejos" className={CLASE_ETIQUETA}>
            Consejos{" "}
            <span className="font-normal text-[#8C6D53]">(opcional)</span>
          </label>

          <textarea
            id="receta-consejos"
            value={consejos}
            onChange={(e) => setConsejos(e.target.value)}
            maxLength={1000}
            rows={2}
            disabled={guardando}
            placeholder="Trucos, sustituciones, cómo servirla…"
            className={`${CLASE_INPUT} resize-none`}
          />
        </div>

        {/* FOTOGRAFÍA */}
        <div className="mb-6">
          <p className={CLASE_ETIQUETA}>
            Fotografía{" "}
            <span className="font-normal text-[#8C6D53]">(opcional)</span>
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-2xl border border-[#E5DAC3] bg-[#F4EADB] text-xs text-[#8C6D53]">
              {imagenMostrada ? (
                <img
                  src={imagenMostrada}
                  alt="Vista previa de la receta"
                  className="h-full w-full object-cover"
                />
              ) : (
                "Sin imagen"
              )}
            </div>

            <div className="flex flex-col items-start gap-2">
              <input
                ref={inputFoto}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={seleccionarFoto}
                disabled={guardando}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => inputFoto.current?.click()}
                disabled={guardando}
                className="cursor-pointer rounded-full border border-[#CBB69E] px-4 py-2 text-sm font-medium text-[#805039] transition-colors hover:bg-[#F0E5D5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {imagenMostrada ? "Cambiar foto" : "Subir foto"}
              </button>

              {imagenMostrada && (
                <button
                  type="button"
                  onClick={quitarFoto}
                  disabled={guardando}
                  className="cursor-pointer text-sm text-[#A34737] hover:underline"
                >
                  Quitar foto
                </button>
              )}

              <p className="text-xs text-[#8C6D53]">
                JPG, PNG o WEBP · máximo 2 MB
              </p>
            </div>
          </div>
        </div>

        {/* VISIBILIDAD (solo para recetas de usuario) */}
        {!modoAdmin && (
          <fieldset className="mb-7">
            <legend className={CLASE_ETIQUETA}>
              ¿Quién puede ver esta receta?
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  valor: "privada",
                  titulo: "Privada",
                  texto: "Solo tú la verás en tu cuenta.",
                  icono: (
                    <>
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </>
                  ),
                },
                {
                  valor: "publica",
                  titulo: "Pública",
                  texto: "Aparece en la pestaña Comunidad.",
                  icono: (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
                    </>
                  ),
                },
              ].map((opcion) => (
                <label
                  key={opcion.valor}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-[#E5DAC3] p-4 transition-colors hover:bg-[#F8F1E4] has-[:checked]:border-[#805039] has-[:checked]:bg-[#F3E8DA] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                >
                  <input
                    type="radio"
                    name="visibilidad"
                    value={opcion.valor}
                    checked={visibilidad === opcion.valor}
                    onChange={() => setVisibilidad(opcion.valor)}
                    disabled={guardando}
                    className="sr-only"
                  />

                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#805039"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  >
                    {opcion.icono}
                  </svg>

                  <span>
                    <span className="titulo block text-lg font-bold">
                      {opcion.titulo}
                    </span>

                    <span className="block text-sm text-[#8C6D53]">
                      {opcion.texto}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* MENSAJE DE ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* BOTONES */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={solicitarCierre}
            disabled={guardando}
            className="cursor-pointer rounded-full border border-[#CBB69E] px-6 py-3.5 font-semibold text-[#805039] transition-colors hover:bg-[#F0E5D5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="cursor-pointer rounded-full bg-[#805039] px-8 py-3.5 font-semibold text-white transition-colors hover:bg-[#603B2A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando
              ? "Guardando..."
              : editando
                ? "Guardar cambios"
                : "Guardar receta"}
          </button>
        </div>
      </form>
    </dialog>
  );
} 