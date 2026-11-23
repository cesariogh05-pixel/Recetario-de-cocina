"use client";

import {
  useEffect,
  useState,
  useRef,
  Suspense,
} from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "../base/supabase";
import { esAdmin } from "../base/admin";
import TarjetaReceta from "../componentes/tarjetaReceta";
import FormularioReceta from "../componentes/FormularioReceta";

import {
  obtenerRecetaPorId,
  obtenerRecetasRecomendadas,
  obtenerCategorias,
  eliminarRecetaCatalogo,
} from "../actions/recetasAction";

// =========================
// COMPONENTE DE ICONOS
// =========================

function Icono({ nombre, size = 24, className = "" }) {

  const iconos = {

    reloj: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    porciones: (
      <>
        <path d="M3 2v7a4 4 0 0 0 8 0V2" />
        <path d="M7 2v20" />
        <path d="M21 2c-4 3-5 7-5 11h5" />
        <path d="M21 2v20" />
      </>
    ),

    chef: (
      <>
        <path d="M6 13a5 5 0 0 1 1-10 5 5 0 0 1 10 0 5 5 0 0 1 1 10v8H6z" />
        <path d="M6 17h12" />
      </>
    ),

    corazon: (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    ),

    flecha: (
      <>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </>
    ),

    ingredientes: (
      <>
        <path d="m4 10 2 11h12l2-11" />
        <path d="M2 10h20" />
        <path d="m7 10 5-8 5 8" />
        <path d="M10 14v3M14 14v3" />
      </>
    ),

    libro: (
      <>
        <path d="M12 7v14" />
        <path d="M12 7C8 3 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-2-1-6-1-10 3Z" />
      </>
    ),

    foco: (
      <>
        <path d="M9 18h6M10 22h4" />
        <path d="M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z" />
      </>
    ),

    reiniciar: (
      <>
        <path d="M3 12a9 9 0 1 1 9 9" />
        <path d="M3 4v8h8" />
      </>
    ),

  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >

      {iconos[nombre]}

    </svg>
  );

}

// =========================
// FORMATO DEL TIEMPO
// =========================

function mostrarTiempo(tiempo) {

  const texto = String(tiempo ?? "").trim();

  if (!texto) return "No especificado";

  return /^\d+$/.test(texto)
    ? `${texto} min`
    : texto;

}

// =========================
// CONVERTIR DATOS JSON
// =========================

function convertirArreglo(valor) {

  if (Array.isArray(valor)) {
    return valor;
  }

  if (typeof valor === "string") {

    try {

      const resultado = JSON.parse(valor);

      return Array.isArray(resultado)
        ? resultado
        : [resultado];

    } catch {

      return [valor];

    }

  }

  if (valor && typeof valor === "object") {
    return [valor];
  }

  return [];

}

// =========================
// FORMATEAR CONSEJOS
// =========================

function formatearConsejo(consejo) {

  let titulo =
    typeof consejo === "object"
      ? consejo?.titulo || ""
      : "";

  let texto =
    typeof consejo === "string"
      ? consejo
      : consejo?.descripcion ??
        consejo?.consejo ??
        consejo?.texto ??
        "";

  if (!titulo && texto) {

    const coincidencia = texto.match(
      /^([^.!?]{3,80}[.!?])\s+(.+)$/s
    );

    if (coincidencia) {

      titulo = coincidencia[1];
      texto = coincidencia[2];

    }

  }

  return { titulo, texto };

}

// =========================
// COMPONENTE DETALLE RECETA
// =========================

function DetalleReceta() {

  const router = useRouter();
  const parametros = useSearchParams();

  const idReceta = parametros.get("id");

  const [supabase] = useState(
    () => createClient()
  );

  // Estados de la receta

  const [receta, setReceta] = useState(null);

  const [recomendadas, setRecomendadas] =
    useState([]);

  const [categorias, setCategorias] = useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] = useState("");

  // Estado de administrador

  const [soyAdmin, setSoyAdmin] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [recetaEditando, setRecetaEditando] = useState(null);
  const [mensajeAdmin, setMensajeAdmin] = useState("");

  // Estados de ingredientes

  const [
    ingredientesMarcados,
    setIngredientesMarcados,
  ] = useState([]);

  // Estados de favoritos

  const [favoritos, setFavoritos] =
    useState([]);

  const [listo, setListo] =
    useState(false);

  const [guardando, setGuardando] =
    useState(null);

  const [errorFavoritos, setErrorFavoritos] =
    useState("");

  // Referencias de autenticación

  const usuarioRef = useRef(null);

  const ocupadoRef = useRef(false);

  const versionRef = useRef(0);

  // =========================
  // DETECTAR ADMINISTRADOR
  // =========================

  useEffect(() => {

    let activo = true;

    const verificarAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (activo) {
        setSoyAdmin(esAdmin(user));
      }
    };

    verificarAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      if (activo) {
        setSoyAdmin(esAdmin(sesion?.user ?? null));
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };

  }, [supabase]);

  // =========================
  // CARGAR RECETA Y CATEGORÍAS
  // =========================

  const cargarReceta = async (esRecarga = false) => {

    if (!esRecarga) {
      setReceta(null);
      setRecomendadas([]);
      setError("");
      setIngredientesMarcados([]);
      setCargando(true);
    }

    if (!idReceta || !/^\d+$/.test(idReceta)) {

      setError(
        "No se encontró una receta válida."
      );

      setCargando(false);

      return null;

    }

    try {

      const [datos, listaCategorias] = await Promise.all([
        obtenerRecetaPorId(idReceta),
        obtenerCategorias().catch(() => []),
      ]);

      setCategorias(listaCategorias || []);

      if (!datos) {

        setError(
          "La receta que buscas no está disponible."
        );

        return null;

      }

      setReceta(datos);

      try {

        const relacionadas =
          await obtenerRecetasRecomendadas(
            datos.id_categoria,
            datos.id_receta
          );

        setRecomendadas(
          relacionadas || []
        );

      } catch (err) {

        console.error(
          "Error al cargar recomendaciones:",
          err
        );

      }

      return datos;

    } catch (err) {

      console.error(
        "Error al cargar receta:",
        err
      );

      setError(
        "No se pudo cargar la receta. Intenta nuevamente."
      );

      return null;

    } finally {

      setCargando(false);

    }

  };

  useEffect(() => {

    let activo = true;

    async function iniciar() {
      if (!activo) return;
      await cargarReceta(false);
    }

    iniciar();

    return () => {

      activo = false;

    };

  }, [idReceta]);

  // =========================
  // RECUPERAR FAVORITOS
  // =========================

  useEffect(() => {

    let activo = true;

    let timer;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (evento, sesion) => {

        const id =
          sesion?.user?.id ?? null;

        if (
          evento !== "INITIAL_SESSION" &&
          id === usuarioRef.current
        ) {

          return;

        }

        usuarioRef.current = id;

        const version =
          ++versionRef.current;

        setFavoritos([]);
        setErrorFavoritos("");
        setListo(!id);

        clearTimeout(timer);

        if (!id) return;

        timer = setTimeout(async () => {

          try {

            const { data, error } =
              await supabase
                .from("favoritos")
                .select("id_receta")
                .eq("id_usuario", id);

            if (error) throw error;

            if (
              activo &&
              version === versionRef.current
            ) {

              setFavoritos(
                (data || []).map(
                  (f) => String(f.id_receta)
                )
              );

              setListo(true);

            }

          } catch (err) {

            console.error(
              "Error al obtener favoritos:",
              err
            );

            if (
              activo &&
              version === versionRef.current
            ) {

              setErrorFavoritos(
                "No se pudieron cargar tus favoritos. Recarga la página."
              );

            }

          }

        }, 0);

      }
    );

    return () => {

      activo = false;

      versionRef.current++;

      clearTimeout(timer);

      subscription.unsubscribe();

    };

  }, [supabase]);

  // =========================
  // AGREGAR O QUITAR FAVORITOS
  // =========================

  async function toggleFavorito(id) {

    if (!listo || ocupadoRef.current) {

      return;

    }

    const usuario = usuarioRef.current;

    if (!usuario) {

      window.dispatchEvent(
        new Event("misabor:abrir-auth")
      );

      return;

    }

    const version =
      versionRef.current;

    const clave = String(id);

    const existe =
      favoritos.includes(clave);

    ocupadoRef.current = true;

    setGuardando(id);
    setErrorFavoritos("");

    try {

      let consulta;

      if (existe) {

        consulta = supabase
          .from("favoritos")
          .delete()
          .eq("id_usuario", usuario)
          .eq("id_receta", id);

      } else {

        consulta = supabase
          .from("favoritos")
          .insert({
            id_usuario: usuario,
            id_receta: id,
          });

      }

      const { error } = await consulta;

      if (
        error &&
        !(error.code === "23505" && !existe)
      ) {

        throw error;

      }

      if (version !== versionRef.current) {

        return;

      }

      setFavoritos((prev) =>

        existe

          ? prev.filter(
              (f) => f !== clave
            )

          : [...new Set([...prev, clave])]

      );

      window.dispatchEvent(
        new Event("misabor:favoritos-cambio")
      );

    } catch (err) {

      console.error(
        "Error al actualizar favoritos:",
        err
      );

      if (
        version === versionRef.current
      ) {

        setErrorFavoritos(
          "No se pudo actualizar el favorito. Intenta nuevamente."
        );

      }

    } finally {

      ocupadoRef.current = false;

      setGuardando(null);

    }

  }

  // =========================
  // EDITAR Y ELIMINAR RECETA (ADMIN)
  // =========================

  function abrirEditarReceta(objetivo) {

    if (!soyAdmin || !objetivo) return;

    setMensajeAdmin("");
    setRecetaEditando(objetivo);
    setFormularioAbierto(true);

  }

  function cerrarFormularioAdmin() {

    setFormularioAbierto(false);
    setRecetaEditando(null);

  }

  async function alGuardarEdicionCatalogo() {

    setFormularioAbierto(false);
    setRecetaEditando(null);
    setMensajeAdmin("Receta actualizada en el catálogo correctamente.");
    await cargarReceta(true);

  }

  async function borrarRecetaObjetivo(objetivo) {

    if (!objetivo?.id_receta || !soyAdmin || eliminando) {
      return;
    }

    const esLaActual =
      String(objetivo.id_receta) === String(receta?.id_receta);

    if (!esLaActual) {
      const confirmar = window.confirm(
        `¿Seguro que quieres eliminar "${objetivo.nombre}" del catálogo?`
      );
      if (!confirmar) return;
    } else {
      const confirmar = window.confirm(
        `¿Seguro que quieres eliminar "${receta.nombre}" del catálogo?`
      );
      if (!confirmar) return;
    }

    setEliminando(true);
    setError("");
    setMensajeAdmin("");

    try {

      const res = await eliminarRecetaCatalogo(objetivo.id_receta);

      if (res.ok) {
        if (esLaActual) {
          router.push("/explorar");
        } else {
          setMensajeAdmin("Receta eliminada del catálogo correctamente.");
          await cargarReceta(true);
        }
      } else {
        setError(res.error || "No se pudo eliminar la receta.");
      }

    } catch (err) {

      console.error("Error al eliminar receta:", err);
      setError("No se pudo eliminar la receta. Intenta nuevamente.");

    } finally {

      setEliminando(false);

    }

  }

  // =========================
  // MARCAR INGREDIENTES
  // =========================

  function marcarIngrediente(indice) {

    setIngredientesMarcados((prev) =>

      prev.includes(indice)

        ? prev.filter(
            (item) => item !== indice
          )

        : [...prev, indice]

    );

  }

  function reiniciarIngredientes() {

    setIngredientesMarcados([]);

  }

  // =========================
  // ESTADO DE CARGA
  // =========================

  if (cargando) {

    return (

      <main className="flex min-h-[60vh] flex-1 items-center justify-center bg-[#FAF6EA] px-6">

        <div className="text-center">

          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-[#E8DCC8] border-t-[#805039]" />

          <p className="titulo text-2xl text-[#805039]">

            Cargando receta...

          </p>

        </div>

      </main>

    );

  }

  // =========================
  // ESTADO DE ERROR
  // =========================

  if (error || !receta) {

    return (

      <main className="flex min-h-[60vh] flex-1 items-center justify-center bg-[#FAF6EA] px-6">

        <div className="w-full max-w-lg rounded-3xl border border-[#E9DFD0] bg-[#FFFDF9] p-10 text-center">

          <Icono
            nombre="libro"
            size={45}
            className="mx-auto mb-5 text-[#805039]"
          />

          <h1 className="titulo mb-3 text-3xl text-[#5A3322]">

            Receta no disponible

          </h1>

          <p className="text-[#765D4E]">

            {error || "No encontramos la receta."}

          </p>

          <Link
            href="/explorar"
            className="mt-6 inline-block rounded-full bg-[#805039] px-6 py-3 font-semibold text-white"
          >

            Volver a explorar

          </Link>

        </div>

      </main>

    );

  }

  // =========================
  // PREPARAR INFORMACIÓN
  // =========================

  const ingredientes =
    convertirArreglo(receta.ingredientes);

  const instrucciones =
    convertirArreglo(receta.instrucciones);

  const consejos =
    convertirArreglo(receta.consejos)
      .filter(Boolean)
      .map(formatearConsejo)
      .filter(
        (item) => item.titulo || item.texto
      );

  const nombreCategoria =

    receta.categorias?.nombre ||

    receta.categorias?.[0]?.nombre ||

    "Recetas";

  const esFavorito = favoritos.includes(
    String(receta.id_receta)
  );

  const totalIngredientes =
    ingredientes.filter(
      (item) =>

        (typeof item === "string" &&
          item.trim()) ||

        (item &&
          typeof item === "object" &&
          item.nombre)

    ).length;

  const progreso =

    totalIngredientes > 0

      ? Math.round(
          (ingredientesMarcados.length /
            totalIngredientes) *
            100
        )

      : 0;

  // =========================
  // CARACTERÍSTICAS
  // =========================

  const caracteristicas = [

    {
      icono: "reloj",
      etiqueta: "Tiempo",
      valor: mostrarTiempo(receta.tiempo),
    },

    {
      icono: "porciones",
      etiqueta: "Porciones",
      valor: receta.porciones ?? "—",
    },

    {
      icono: "chef",
      etiqueta: "Dificultad",
      valor: receta.dificultad || "—",
    },

  ];

  // =========================
  // INTERFAZ DE LA RECETA
  // =========================

  return (

    <main className="flex-1 bg-[#FAF6EA]">

      {/* =========================
          NUEVA SECCIÓN SUPERIOR
          CON FONDO ILUSTRADO
      ========================= */}

      <section className="relative z-0 isolate overflow-hidden bg-[#F3EBDA]">

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-repeat opacity-[0.08]"
          style={{
            backgroundImage: "url('/recFondo.png')",
            backgroundSize: "500px",
            backgroundPosition: "center",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#FAF6EA]/10 via-transparent to-[#F3EBDA]/60"
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-9 md:pb-24 md:pt-12">

          {/* =========================
              VOLVER A EXPLORAR
          ========================= */}

          <Link
            href="/explorar"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#805039] transition-colors hover:text-[#5A3322]"
          >

            <Icono
              nombre="flecha"
              size={19}
            />

            Volver a explorar

          </Link>

          {mensajeAdmin && (

            <div
              role="status"
              className="mb-6 rounded-xl bg-[#E5EBD8] px-5 py-3 text-sm text-[#52683D]"
            >

              {mensajeAdmin}

            </div>

          )}

          {/* =========================
              ERROR DE FAVORITOS
          ========================= */}

          {errorFavoritos && (

            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600"
            >

              {errorFavoritos}

            </div>

          )}

          {/* =========================
              INFORMACIÓN PRINCIPAL
          ========================= */}

          <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-12">

            <div className="relative aspect-[5/4] overflow-hidden rounded-[26px] border border-white/60 bg-[#E8DCC8] shadow-[0_10px_30px_rgba(90,51,34,0.12)]">

              {receta.imagen ? (

                <img
                  src={receta.imagen}
                  alt={receta.nombre}
                  className="h-full w-full object-cover"
                />

              ) : (

                <div className="flex h-full items-center justify-center text-[#8C6D53]">

                  Imagen no disponible

                </div>

              )}

            </div>

            <div>

              <Link
                href={`/explorar?categoria=${receta.id_categoria}`}
                className="mb-4 inline-block rounded-full bg-[#EAD9C5] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#805039] hover:bg-[#E0C9AF]"
              >

                {nombreCategoria}

              </Link>

              <h1 className="titulo mb-5 text-4xl font-bold leading-tight text-[#5A3322] lg:text-5xl">

                {receta.nombre}

              </h1>

              <p className="mb-7 text-base leading-relaxed text-[#765D4E]">

                {receta.descripcion}

              </p>

              {/* =========================
                  CARACTERÍSTICAS
              ========================= */}

              <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">

                {caracteristicas.map((item) => (

                  <div
                    key={item.etiqueta}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#E9DFD0] bg-[#FFFDF9] px-3 py-4"
                  >

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[#805039]">

                      <Icono
                        nombre={item.icono}
                        size={26}
                      />

                    </div>

                    <div className="min-w-0">

                      <p className="mb-1 text-xs text-[#8C6D53]">

                        {item.etiqueta}

                      </p>

                      <p className="break-words text-sm font-bold capitalize text-[#603B2A]">

                        {item.valor}

                      </p>

                    </div>

                  </div>

                ))}

              </div>

              {/* =========================
                  BOTÓN DE FAVORITOS Y ADMIN
              ========================= */}

              <div className="flex flex-wrap items-center gap-3">

                <button
                  type="button"
                  disabled={
                    !listo || guardando !== null || eliminando
                  }
                  aria-pressed={esFavorito}
                  onClick={() =>
                    toggleFavorito(
                      receta.id_receta
                    )
                  }
                  className={`flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border-2 px-6 py-3.5 font-semibold transition-all disabled:cursor-wait disabled:opacity-60 sm:w-auto ${
                    esFavorito

                      ? "border-[#E85A55] bg-[#FCE8E4] text-[#C54D47]"

                      : "border-[#805039] bg-[#805039] text-white hover:bg-[#603B2A]"
                  }`}
                >

                  <Icono
                    nombre="corazon"
                    size={21}
                    className={
                      esFavorito
                        ? "fill-current"
                        : ""
                    }
                  />

                  {guardando === receta.id_receta

                    ? "Actualizando..."

                    : esFavorito

                      ? "Guardado en favoritos"

                      : "Guardar en favoritos"}

                </button>

                {soyAdmin && (
                  <>
                    <button
                      type="button"
                      disabled={eliminando}
                      onClick={() => abrirEditarReceta(receta)}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#805039] bg-[#FFFDF9] px-6 py-3.5 font-semibold text-[#805039] transition-colors hover:bg-[#F3EBDA] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      Editar receta
                    </button>

                    <button
                      type="button"
                      disabled={eliminando}
                      onClick={() => borrarRecetaObjetivo(receta)}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#A34737] bg-[#FFFDF9] px-6 py-3.5 font-semibold text-[#A34737] transition-colors hover:bg-[#FAECE7] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {eliminando ? "Eliminando..." : "Eliminar receta"}
                    </button>
                  </>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* =========================
            SEPARACIÓN ONDULADA
        ========================= */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px"
        >

          <svg
            viewBox="0 0 1440 65"
            preserveAspectRatio="none"
            className="block h-8 w-full md:h-14"
            xmlns="http://www.w3.org/2000/svg"
          >

            <path
              d="M0,32 C240,70 480,0 720,28 C960,55 1200,0 1440,32 L1440,65 L0,65 Z"
              fill="#FAF6EA"
            />

          </svg>

        </div>

      </section>

      {/* =========================
          INGREDIENTES Y PREPARACIÓN
      ========================= */}

      <div className="mx-auto max-w-6xl px-6 pb-12 pt-8 md:pb-14 md:pt-12">

        <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:gap-8">

          {/* =========================
              INGREDIENTES
          ========================= */}

          <aside className="min-w-0 rounded-[24px] border border-[#E9DFD0] bg-[#F3EBDA] p-5 xl:p-6">

            <div className="mb-3 flex items-center gap-3 text-[#805039]">

              <Icono
                nombre="ingredientes"
                size={29}
              />

              <h2 className="titulo text-3xl font-bold text-[#5A3322]">

                Ingredientes

              </h2>

            </div>

            <p className="mb-5 text-sm leading-relaxed text-[#765D4E]">

              Marca los ingredientes que ya
              tengas listos para cocinar.

            </p>

            {totalIngredientes > 0 && (

              <div className="mb-6 rounded-xl bg-[#FFFDF9] p-4">

                <div className="mb-2 flex items-center justify-between gap-3">

                  <span
                    aria-live="polite"
                    className="text-xs font-semibold text-[#805039]"
                  >

                    {ingredientesMarcados.length}
                    {" de "}
                    {totalIngredientes}
                    {" ingredientes"}

                  </span>

                  <button
                    type="button"
                    onClick={
                      reiniciarIngredientes
                    }
                    title="Reiniciar ingredientes"
                    aria-label="Reiniciar ingredientes"
                    className="cursor-pointer rounded-full p-1.5 text-[#805039] hover:bg-[#EAD9C5]"
                  >

                    <Icono
                      nombre="reiniciar"
                      size={17}
                    />

                  </button>

                </div>

                <div
                  role="progressbar"
                  aria-label="Ingredientes preparados"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progreso}
                  className="h-2 overflow-hidden rounded-full bg-[#E8DCC8]"
                >

                  <div
                    className="h-full rounded-full bg-[#82966B] transition-all duration-300"
                    style={{
                      width: `${progreso}%`,
                    }}
                  />

                </div>

                {progreso === 100 && (

                  <p className="mt-3 text-xs font-semibold text-[#64824D]">

                    ¡Todo listo para cocinar!

                  </p>

                )}

              </div>

            )}

            <div className="space-y-1">

              {ingredientes.length === 0 && (

                <p className="text-sm text-[#765D4E]">

                  No hay ingredientes disponibles.

                </p>

              )}

              {ingredientes.map(
                (item, indice) => {

                  if (!item) return null;

                  if (
                    typeof item === "object" &&
                    item.titulo &&
                    !item.nombre
                  ) {

                    return (

                      <h3
                        key={indice}
                        className="titulo mb-2 mt-6 border-b border-[#DCCCB7] pb-2 text-lg font-bold text-[#805039]"
                      >

                        {item.titulo}

                      </h3>

                    );

                  }

                  if (
                    typeof item === "object" &&
                    !item.nombre
                  ) {

                    return null;

                  }

                  const texto =

                    typeof item === "string"

                      ? item.trim()

                      : [
                          item.cantidad,
                          item.unidad,
                          item.nombre,
                        ]
                          .filter(
                            (valor) =>
                              valor !== null &&
                              valor !== undefined &&
                              valor !== ""
                          )
                          .join(" ");

                  if (!texto) return null;

                  const marcado =
                    ingredientesMarcados.includes(
                      indice
                    );

                  return (

                    <label
                      key={indice}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 transition-colors ${
                        marcado

                          ? "bg-[#E2E8D5]"

                          : "hover:bg-[#EADFCC]"
                      }`}
                    >

                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() =>
                          marcarIngrediente(
                            indice
                          )
                        }
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#82966B]"
                      />

                      <span
                        className={`text-sm leading-relaxed ${
                          marcado

                            ? "text-[#79806D] line-through"

                            : "text-[#603B2A]"
                        }`}
                      >

                        {texto}

                      </span>

                    </label>

                  );

                }
              )}

            </div>

          </aside>

          {/* =========================
              INSTRUCCIONES
          ========================= */}

          <div className="min-w-0">

            <div className="mb-3 flex items-center gap-3 text-[#805039]">

              <Icono
                nombre="libro"
                size={29}
              />

              <h2 className="titulo text-3xl font-bold text-[#5A3322]">

                Preparación

              </h2>

            </div>

            <p className="mb-7 text-sm text-[#765D4E]">

              Sigue estos pasos para preparar
              tu receta.

            </p>

            <div className="space-y-4">

              {instrucciones.length === 0 && (

                <p className="text-sm text-[#765D4E]">

                  No hay instrucciones disponibles.

                </p>

              )}

              {instrucciones.map(
                (item, indice) => {

                  if (!item) return null;

                  if (
                    typeof item === "object" &&
                    item.titulo &&
                    !item.descripcion &&
                    !item.texto
                  ) {

                    return (

                      <h3
                        key={indice}
                        className="titulo mt-7 text-xl font-bold text-[#805039]"
                      >

                        {item.titulo}

                      </h3>

                    );

                  }

                  const numero =

                    typeof item === "object"

                      ? item.paso ?? indice + 1

                      : indice + 1;

                  const descripcion =

                    typeof item === "string"

                      ? item

                      : item.descripcion ??
                        item.texto ??
                        "";

                  if (!descripcion) return null;

                  return (

                    <div
                      key={indice}
                      className="flex items-start gap-4 rounded-2xl border border-[#E9DFD0] bg-[#FFFDF9] p-5"
                    >

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#805039] font-semibold text-white">

                        {numero}

                      </div>

                      <p className="pt-1.5 text-sm leading-relaxed text-[#765D4E] md:text-base">

                        {descripcion}

                      </p>

                    </div>

                  );

                }
              )}

            </div>

          </div>

        </section>

      </div>

      {/* =========================
          CONSEJOS DEL CHEF
      ========================= */}

      {consejos.length > 0 && (

        <section className="relative z-0 isolate mt-4 overflow-hidden bg-[#7B4A32] py-8 md:py-10">

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-multiply"
            style={{
              backgroundImage:
                "url('/fondonuevo.jpg')",
            }}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[#7B4A32]/10"
          />

          <div className="relative mx-auto max-w-6xl px-6">

            <div className="mb-6 flex flex-col items-center text-center">

              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-[#F6DFA0]/40 bg-white/10 text-[#F6DFA0]">

                <Icono
                  nombre="chef"
                  size={28}
                />

              </div>

              <h2 className="titulo text-3xl font-bold text-[#FAF6EA] md:text-4xl">

                Consejos del chef

              </h2>

              <p className="mt-2 text-sm text-[#F0E3CC]">

                Pequeños detalles que hacen la diferencia.

              </p>

            </div>

            <div
              className={`mx-auto grid gap-4 ${
                consejos.length === 1

                  ? "max-w-2xl grid-cols-1"

                  : consejos.length === 3

                    ? "grid-cols-1 md:grid-cols-3"

                    : "grid-cols-1 md:grid-cols-2"
              }`}
            >

              {consejos.map((consejo, indice) => (

                <article
                  key={indice}
                  className="flex items-start gap-3 rounded-2xl border border-[#F6DFA0]/25 bg-white/10 p-4 transition-colors hover:bg-white/15"
                >

                  <Icono
                    nombre="foco"
                    size={22}
                    className="mt-0.5 shrink-0 text-[#F6DFA0]"
                  />

                  <div className="min-w-0 flex-1">

                    {consejo.titulo && (

                      <h3 className="titulo mb-2 text-base font-bold leading-snug text-[#F6DFA0]">

                        {consejo.titulo}

                      </h3>

                    )}

                    {consejo.texto && (

                      <p className="text-sm leading-relaxed text-[#FAF6EA]">

                        {consejo.texto}

                      </p>

                    )}

                  </div>

                </article>

              ))}

            </div>

          </div>

        </section>

      )}

      {/* =========================
          RECETAS RECOMENDADAS
      ========================= */}

      {recomendadas.length > 0 && (

        <section className="relative z-0 isolate border-t border-[#E9DFD0] bg-[#F3EBDA] py-14">

          <div className="mx-auto max-w-6xl px-6">

            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

              <div>

                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#B56A35]">

                  Sigue descubriendo

                </p>

                <h2 className="titulo text-3xl font-bold text-[#5A3322] md:text-4xl">

                  También te podría gustar

                </h2>

                <p className="mt-3 text-sm text-[#765D4E]">

                  Descubre más recetas de
                  la misma categoría.

                </p>

              </div>

              <Link
                href={`/explorar?categoria=${receta.id_categoria}`}
                className="text-sm font-semibold text-[#805039] hover:underline"
              >

                Ver más recetas →

              </Link>

            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">

              {recomendadas.map((r) => (

                <TarjetaReceta
                  key={r.id_receta}
                  receta={r}
                  nombreCategoria={
                    nombreCategoria
                  }
                  esFavorito={
                    favoritos.includes(
                      String(r.id_receta)
                    )
                  }
                  onToggleFavorito={
                    toggleFavorito
                  }
                  deshabilitado={
                    !listo ||
                    guardando !== null ||
                    eliminando
                  }
                  procesando={
                    guardando ===
                    r.id_receta
                  }
                  soyAdmin={soyAdmin}
                  onEditar={abrirEditarReceta}
                  onEliminar={borrarRecetaObjetivo}
                />

              ))}

            </div>

          </div>

        </section>

      )}

      <FormularioReceta
        abierto={formularioAbierto}
        cerrar={cerrarFormularioAdmin}
        categorias={categorias}
        receta={recetaEditando}
        modoAdmin={true}
        onGuardada={alGuardarEdicionCatalogo}
      />

    </main>

  );

}

// =========================
// PÁGINA PRINCIPAL
// =========================

export default function RecetaPage() {

  return (

    <Suspense
      fallback={

        <main className="flex min-h-[60vh] flex-1 items-center justify-center bg-[#FAF6EA]">

          <p className="titulo text-2xl text-[#805039]">

            Cargando receta...

          </p>

        </main>

      }
    >

      <DetalleReceta />

    </Suspense>

  );

}