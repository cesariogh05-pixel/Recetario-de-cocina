"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Fraunces, DM_Sans } from "next/font/google";

import { createClient } from "../base/supabase";
import { esAdmin } from "../base/admin";
import TarjetaReceta from "../componentes/tarjetaReceta";
import FormularioReceta from "../componentes/FormularioReceta";

import {
  obtenerRecetasExplorar,
  obtenerCategorias,
  eliminarRecetaCatalogo,
} from "../actions/recetasAction";


const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const IMAGEN_TODAS = "/categorias/Todas.png";

const COLORES_CATEGORIAS = {
  todas: "#F6DFCE",
  desayunos: "#DFEBCB",
  comidas: "#FFE8B0",
  postres: "#EEDFF0",
  bebidas: "#D8EDF0",
};

// =========================
// FUNCIONES AUXILIARES
// =========================

function convertirMinutos(tiempo) {
  const texto = String(tiempo ?? "")
    .toLowerCase()
    .trim();

  if (/^\d+$/.test(texto)) {
    return Number(texto);
  }

  const horas = texto.match(
    /(\d+(?:[.,]\d+)?)\s*(?:horas?|hrs?|h)/
  );

  const minutos = texto.match(
    /(\d+(?:[.,]\d+)?)\s*(?:minutos?|mins?|min|m)/
  );

  if (!horas && !minutos) return Infinity;

  return (
    (horas
      ? Number(horas[1].replace(",", ".")) * 60
      : 0) +
    (minutos
      ? Number(minutos[1].replace(",", "."))
      : 0)
  );
}

function normalizarDificultad(valor) {
  const texto = String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (texto === "facil") return "facil";

  if (
    ["media", "medio", "intermedia", "intermedio"]
      .includes(texto)
  ) {
    return "intermedia";
  }

  if (texto === "dificil") return "dificil";

  return texto;
}

function coincidePorciones(valor, filtro) {
  if (filtro === "Todas") return true;

  const cantidad = Number(valor);

  switch (filtro) {
    case "1":
      return cantidad === 1;

    case "2":
      return cantidad === 2;

    case "3-4":
      return cantidad >= 3 && cantidad <= 4;

    case "5-6":
      return cantidad >= 5 && cantidad <= 6;

    case "7+":
      return cantidad >= 7;

    default:
      return true;
  }
}

// =========================
// COMPONENTE EXPLORAR
// =========================

export default function Explorar() {

  const [supabase] = useState(() => createClient());

  // Estado de administrador
  const [soyAdmin, setSoyAdmin] = useState(false);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [recetaEditando, setRecetaEditando] = useState(null);
  const [mensajeAdmin, setMensajeAdmin] = useState("");
  const [errorAdmin, setErrorAdmin] = useState("");

  // Estados de recetas y categorías
  const [recetas, setRecetas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Estados de filtros
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [orden, setOrden] = useState("nombre");
  const [dificultad, setDificultad] = useState("Todas");
  const [porciones, setPorciones] = useState("Todas");

  // Estados de favoritos
  const [favoritos, setFavoritos] = useState([]);
  const [listo, setListo] = useState(false);
  const [errorFavoritos, setErrorFavoritos] = useState("");
  const [guardando, setGuardando] = useState(false);

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
  // FILTROS DESDE LA URL
  // =========================

  useEffect(() => {

    const parametros = new URLSearchParams(
      window.location.search
    );

    const ordenURL = parametros.get("orden");
    const categoriaURL = parametros.get("categoria");

    if (ordenURL === "tiempo") {
      setOrden("tiempo");
    }

    if (categoriaURL && /^\d+$/.test(categoriaURL)) {
      setCategoria(Number(categoriaURL));
    }

  }, []);

  // =========================
  // CARGAR DATOS DE SUPABASE
  // =========================

  const cargarDatos = useCallback(async () => {

    try {

      setCargando(true);
      setError("");

      const [datosRecetas, datosCategorias] =
        await Promise.all([
          obtenerRecetasExplorar(),
          obtenerCategorias(),
        ]);

      setRecetas(datosRecetas || []);
      setCategorias(datosCategorias || []);

    } catch (err) {

      console.error(
        "Error al cargar los datos:",
        err
      );

      setError(
        "No se pudieron cargar las recetas. Intenta nuevamente."
      );

    } finally {

      setCargando(false);

    }

  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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

        const id = sesion?.user?.id ?? null;

        if (
          evento !== "INITIAL_SESSION" &&
          id === usuarioRef.current
        ) {
          return;
        }

        usuarioRef.current = id;

        const version = ++versionRef.current;

        setFavoritos([]);
        setErrorFavoritos("");
        setListo(!id);

        clearTimeout(timer);

        if (!id) return;

        timer = setTimeout(async () => {

          try {

            const { data, error } = await supabase
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
              "Error al recuperar favoritos:",
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

    if (!listo || ocupadoRef.current) return;

    const usuario = usuarioRef.current;

    if (!usuario) {

      window.dispatchEvent(
        new Event("misabor:abrir-auth")
      );

      return;

    }

    const version = versionRef.current;
    const clave = String(id);
    const existe = favoritos.includes(clave);

    ocupadoRef.current = true;

    setGuardando(true);
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

      if (version !== versionRef.current) return;

      setFavoritos((prev) =>
        existe
          ? prev.filter((f) => f !== clave)
          : [...new Set([...prev, clave])]
      );

      window.dispatchEvent(
        new Event("misabor:favoritos-cambio")
      );

    } catch (err) {

      if (version === versionRef.current) {

        console.error(
          "Error al modificar favoritos:",
          err
        );

        setErrorFavoritos(
          "No se pudo actualizar el favorito. Intenta nuevamente."
        );

      }

    } finally {

      ocupadoRef.current = false;
      setGuardando(false);

    }

  }

  // =========================
  // ACCIONES DE ADMINISTRADOR
  // =========================

  const abrirNuevaRecetaAdmin = () => {
    if (!soyAdmin) return;
    setErrorAdmin("");
    setRecetaEditando(null);
    setFormularioAbierto(true);
  };

  const abrirEditarRecetaAdmin = (recetaSeleccionada) => {
    if (!soyAdmin) return;
    setErrorAdmin("");
    setRecetaEditando(recetaSeleccionada);
    setFormularioAbierto(true);
  };

  const cerrarFormularioAdmin = () => {
    setFormularioAbierto(false);
    setRecetaEditando(null);
  };

  const alGuardarRecetaCatalogo = async (_recetaGuardada, fueEdicion) => {
    setFormularioAbierto(false);
    setRecetaEditando(null);
    setErrorAdmin("");
    setMensajeAdmin(
      fueEdicion
        ? "Receta actualizada en el catálogo correctamente."
        : "Receta añadida al catálogo correctamente."
    );
    await cargarDatos();
  };

  const alEliminarRecetaCatalogo = async (recetaSeleccionada) => {
    if (!soyAdmin || !recetaSeleccionada?.id_receta) return;

    setErrorAdmin("");
    setMensajeAdmin("");

    const res = await eliminarRecetaCatalogo(recetaSeleccionada.id_receta);

    if (res.ok) {
      setMensajeAdmin("Receta eliminada del catálogo correctamente.");
      await cargarDatos();
    } else {
      setErrorAdmin(res.error || "No se pudo eliminar la receta.");
    }
  };

  // =========================
  // LIMPIAR FILTROS
  // =========================

  const limpiarFiltros = () => {

    setBusqueda("");
    setCategoria("Todas");
    setDificultad("Todas");
    setPorciones("Todas");
    setOrden("nombre");

    const url = new URL(window.location.href);

    url.searchParams.delete("orden");
    url.searchParams.delete("categoria");

    window.history.replaceState(
      window.history.state,
      "",
      url.toString()
    );

  };

  // =========================
  // BOTÓN BUSCAR
  // DESPLAZAMIENTO SUAVE
  // =========================

  const buscarRecetas = (e) => {

    e.preventDefault();

    document
      .getElementById("resultados-recetas")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

  };

  // =========================
  // NOMBRES DE CATEGORÍAS
  // =========================

  const nombresCategorias = useMemo(() => {

    return Object.fromEntries(
      categorias.map((c) => [
        c.id_categoria,
        c.nombre,
      ])
    );

  }, [categorias]);

  // =========================
  // CONTADOR POR CATEGORÍA
  // =========================

  const conteos = useMemo(() => {

    const cantidades = {};

    recetas.forEach((r) => {

      cantidades[r.id_categoria] =
        (cantidades[r.id_categoria] || 0) + 1;

    });

    return cantidades;

  }, [recetas]);

  // =========================
  // OPCIONES DE CATEGORÍAS
  // =========================

  const opcionesCategorias = [
    {
      id_categoria: "Todas",
      nombre: "Todas",
      imagenes: IMAGEN_TODAS,
    },
    ...categorias,
  ];

  // =========================
  // FILTRAR Y ORDENAR RECETAS
  // =========================

  const resultados = useMemo(() => {

    const q = busqueda.trim().toLowerCase();

    const lista = recetas.filter((r) => {

      const coincideCategoria =
        categoria === "Todas" ||
        String(r.id_categoria) === String(categoria);

      const coincideBusqueda =
        q === "" ||
        (r.nombre || "").toLowerCase().includes(q) ||
        (r.descripcion || "").toLowerCase().includes(q);

      const coincideDificultad =
        dificultad === "Todas" ||
        normalizarDificultad(r.dificultad) === dificultad;

      const coincideCantidad =
        coincidePorciones(r.porciones, porciones);

      return (
        coincideCategoria &&
        coincideBusqueda &&
        coincideDificultad &&
        coincideCantidad
      );

    });

    return [...lista].sort((a, b) => {

      if (orden === "tiempo") {

        const tiempoA = convertirMinutos(a.tiempo);
        const tiempoB = convertirMinutos(b.tiempo);

        if (tiempoA !== tiempoB) {
          return tiempoA - tiempoB;
        }

      }

      return (a.nombre || "").localeCompare(
        b.nombre || "",
        "es"
      );

    });

  }, [
    recetas,
    busqueda,
    categoria,
    orden,
    dificultad,
    porciones,
  ]);

  // =========================
  // INTERFAZ DE EXPLORAR
  // =========================

  return (

    <div
      className={`flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)] ${dmSans.className}`}
    >

      {/* =========================
          ENCABEZADO DE ANCHO COMPLETO
          CON MARCO DECORATIVO
      ========================= */}

      <section className="relative isolate z-0 w-full overflow-hidden bg-[#8B573D] px-8 py-14 sm:px-12 md:py-20">

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-repeat opacity-15 mix-blend-multiply"
          style={{
            backgroundImage: "url('/fondo%20explorar.png')",
            backgroundSize: "950px",
            backgroundPosition: "center",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(
                ellipse at center,
                rgba(139, 87, 61, 0.00) 0%,
                rgba(139, 87, 61, 0.00) 55%,
                rgba(139, 87, 61, 0.02) 100%
              )
            `,
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 rounded-[8px] border border-[#F6DFA0]/50 md:inset-6 md:rounded-[12px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-5 text-[#F6DFA0]/80 md:inset-10"
        >

          <span
            className="absolute left-0 top-0 h-5 w-5 rounded-tl-sm border-l border-t border-current md:h-9 md:w-9"
          />

          <span
            className="absolute right-0 top-0 h-5 w-5 rounded-tr-sm border-r border-t border-current md:h-9 md:w-9"
          />

          <span
            className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-sm border-b border-l border-current md:h-9 md:w-9"
          />

          <span
            className="absolute bottom-0 right-0 h-5 w-5 rounded-br-sm border-b border-r border-current md:h-9 md:w-9"
          />

        </div>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">

          <div className="mb-5 flex items-center justify-center gap-4 md:gap-6">

            <div
              aria-hidden="true"
              className="flex items-center"
            >

              <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#F6DFA0]/80 sm:w-16 md:w-24" />

              <span className="h-[5px] w-[5px] rotate-45 bg-[#F6DFA0]/80" />

            </div>

            <svg
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F6DFA0"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >

              <path d="M6 13.87A4 4 0 0 1 7.99 6.5a5 5 0 0 1 8.02 0A4 4 0 0 1 18 13.87V21H6Z" />

              <path d="M6 17h12" />

            </svg>

            <div
              aria-hidden="true"
              className="flex items-center"
            >

              <span className="h-[5px] w-[5px] rotate-45 bg-[#F6DFA0]/80" />

              <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#F6DFA0]/80 sm:w-16 md:w-24" />

            </div>

          </div>

          <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#F6DFA0] md:text-sm">

            Explorar recetas

          </p>

          <h1
            className={`max-w-3xl text-3xl font-bold leading-[1.15] text-[#FFF8EB] sm:text-5xl md:text-[54px] ${fraunces.className}`}
          >

            Descubre tu próximo

            <br className="hidden sm:block" />

            {" "}plato favorito

          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#F1DFCA] sm:text-base md:text-lg">

            Encuentra nuevas ideas y sabores para compartir.
            Siempre hay algo delicioso por cocinar.

          </p>

          {/* BOTÓN SOLO PARA ADMIN */}
          {soyAdmin && (
            <button
              type="button"
              onClick={abrirNuevaRecetaAdmin}
              className="mt-6 flex cursor-pointer items-center gap-2 rounded-full bg-[#F6DFA0] px-6 py-3 text-sm font-bold text-[#583321] shadow-md transition-colors hover:bg-[#EBCB79]"
            >
              + Nueva receta
            </button>
          )}

          {/* =========================
              BUSCADOR
          ========================= */}

          <form
            role="search"
            onSubmit={buscarRecetas}
            className="mt-8 flex w-full max-w-[580px] items-center gap-2 rounded-full border border-[#E8DCC8] bg-[#FFFDF9] p-2 pl-4 shadow-lg transition-all focus-within:ring-4 focus-within:ring-[#F6DFA0]/30 sm:gap-3 sm:pl-5"
          >

            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#805039"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >

              <circle cx="11" cy="11" r="7" />

              <path d="m20 20-4-4" />

            </svg>

            <input
              type="search"
              placeholder="¿Qué te gustaría cocinar hoy?"
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              aria-label="Buscar receta"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#52301E] outline-none placeholder:text-[#A89480] sm:text-base"
            />

            <button
              type="submit"
              className="shrink-0 cursor-pointer rounded-full bg-[#F6DFA0] px-4 py-3 text-sm font-bold text-[#583321] transition-colors hover:bg-[#EBCB79] sm:px-7"
            >

              Buscar

            </button>

          </form>

        </div>

      </section>

      {/* =========================
          FILTROS DE CATEGORÍAS
      ========================= */}

      <section className="relative isolate z-0 border-b border-[#E9DFD0] py-9">

        <div className="mx-auto max-w-6xl px-6">

          <h2 className="titulo mb-7 text-3xl font-bold text-[#603B2A]">

            Explora tus categorías

          </h2>

          <div className="flex gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-5 md:overflow-visible">

            {opcionesCategorias.map((cat) => {

              const nombre = cat.nombre
                .toLowerCase()
                .trim();

              const cantidad =
                cat.id_categoria === "Todas"
                  ? recetas.length
                  : conteos[cat.id_categoria] || 0;

              const activa =
                String(categoria) ===
                String(cat.id_categoria);

              const color =
                COLORES_CATEGORIAS[nombre] ||
                "#F6DFCE";

              const imagen =
                cat.id_categoria === "Todas"
                  ? IMAGEN_TODAS
                  : cat.imagenes?.trim();

              return (

                <button
                  key={cat.id_categoria}
                  type="button"
                  onClick={() =>
                    setCategoria(cat.id_categoria)
                  }
                  aria-pressed={activa}
                  className={`relative flex min-h-[145px] w-[175px] shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] border-2 px-3 py-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md md:w-full ${
                    activa
                      ? "border-[#805039] shadow-sm"
                      : "border-transparent"
                  }`}
                  style={{
                    backgroundColor: color,
                  }}
                >

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.10]"
                    style={{
                      backgroundImage: "url('/fondonuevo.jpg')",
                    }}
                  />

                  <div className="relative z-10 mb-1 h-[65px] w-[75px]">

                    {imagen && (

                      <img
                        src={imagen}
                        alt=""
                        className="h-full w-full object-contain"
                        onError={() => {

                          console.error(
                            "No se pudo cargar la imagen de:",
                            cat.nombre,
                            imagen
                          );

                        }}
                      />

                    )}

                  </div>

                  <span className="titulo relative z-10 text-lg font-bold text-[#603B2A]">

                    {cat.nombre}

                  </span>

                  <span className="relative z-10 mt-1 text-xs text-[#795A48]">

                    {cargando
                      ? "Cargando..."
                      : error
                        ? "No disponible"
                        : `${cantidad} ${
                            cantidad === 1
                              ? "receta"
                              : "recetas"
                          }`}

                  </span>

                </button>

              );

            })}

          </div>

        </div>

      </section>

      {/* =========================
          LISTADO DE RECETAS
      ========================= */}

      <main
        id="resultados-recetas"
        className="mx-auto w-full max-w-6xl flex-1 scroll-mt-28 px-6 py-8"
      >

        {mensajeAdmin && (
          <div
            role="status"
            className="mb-6 rounded-xl bg-[#E5EBD8] px-5 py-3 text-sm text-[#52683D]"
          >
            {mensajeAdmin}
          </div>
        )}

        {errorAdmin && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600"
          >
            {errorAdmin}
          </div>
        )}

        {/* =========================
            FILTROS Y RESULTADOS
        ========================= */}

        <div className="relative z-0 mb-8 flex flex-wrap items-center justify-between gap-4">

          <p
            className="text-sm font-medium text-[#8C6D53]"
            aria-live="polite"
          >

            {cargando
              ? "Cargando recetas..."
              : error
                ? "Recetas no disponibles"
                : `${resultados.length} ${
                    resultados.length === 1
                      ? "receta encontrada"
                      : "recetas encontradas"
                  }`}

          </p>

          <div className="flex flex-wrap items-center gap-3">

            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#805039"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >

              <path d="M4 7h16M4 12h16M4 17h16" />

              <circle
                cx="8"
                cy="7"
                r="2"
                fill="#FAF6EA"
              />

              <circle
                cx="16"
                cy="12"
                r="2"
                fill="#FAF6EA"
              />

              <circle
                cx="10"
                cy="17"
                r="2"
                fill="#FAF6EA"
              />

            </svg>

            <select
              value={dificultad}
              onChange={(e) =>
                setDificultad(e.target.value)
              }
              aria-label="Filtrar por dificultad"
              className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm text-[#805039] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#805039] ${
                dificultad !== "Todas"
                  ? "border-[#805039] bg-[#EAD9C5]"
                  : "border-[#CBB69E] bg-transparent hover:bg-[#F0E5D5]"
              }`}
            >

              <option value="Todas">
                Dificultad
              </option>

              <option value="facil">
                Fácil
              </option>

              <option value="intermedia">
                Intermedia
              </option>

              <option value="dificil">
                Difícil
              </option>

            </select>

            <select
              value={porciones}
              onChange={(e) =>
                setPorciones(e.target.value)
              }
              aria-label="Filtrar por porciones"
              className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm text-[#805039] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#805039] ${
                porciones !== "Todas"
                  ? "border-[#805039] bg-[#EAD9C5]"
                  : "border-[#CBB69E] bg-transparent hover:bg-[#F0E5D5]"
              }`}
            >

              <option value="Todas">
                Porciones
              </option>

              <option value="1">
                1 porción
              </option>

              <option value="2">
                2 porciones
              </option>

              <option value="3-4">
                3 - 4 porciones
              </option>

              <option value="5-6">
                5 - 6 porciones
              </option>

              <option value="7+">
                7 o más porciones
              </option>

            </select>

            <select
              value={orden}
              onChange={(e) =>
                setOrden(e.target.value)
              }
              aria-label="Ordenar recetas"
              className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm text-[#805039] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#805039] ${
                orden !== "nombre"
                  ? "border-[#805039] bg-[#EAD9C5]"
                  : "border-[#CBB69E] bg-transparent hover:bg-[#F0E5D5]"
              }`}
            >

              <option value="nombre">
                Nombre (A-Z)
              </option>

              <option value="tiempo">
                Menor tiempo
              </option>

            </select>

            <button
              type="button"
              onClick={limpiarFiltros}
              title="Limpiar filtros"
              aria-label="Limpiar filtros"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#805039] transition-colors hover:bg-[#EAD9C5] focus-visible:ring-2 focus-visible:ring-[#805039]"
            >

              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >

                <path d="M3 12a9 9 0 1 1 9 9" />

                <path d="M3 4v8h8" />

              </svg>

            </button>

          </div>

        </div>

        {errorFavoritos && (

          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600"
          >

            {errorFavoritos}

          </div>

        )}

        {cargando ? (

          <div className="px-8 py-16 text-center">

            <p
              className={`text-2xl text-[#8C6D53] ${fraunces.className}`}
            >

              Cargando recetas...

            </p>

          </div>

        ) : error ? (

          <div className="rounded-2xl border border-[#EFE6D5] bg-[#FFFDF9] px-8 py-16 text-center">

            <p className="text-red-600">

              {error}

            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 cursor-pointer rounded-lg bg-[var(--foreground)] px-5 py-2 text-[var(--background)]"
            >

              Volver a intentar

            </button>

          </div>

        ) : resultados.length === 0 ? (

          <div className="rounded-2xl border border-[#EFE6D5] bg-[#FFFDF9] px-8 py-16 text-center">

            <p
              className={`mb-2 text-2xl text-[var(--foreground)] ${fraunces.className}`}
            >

              No encontramos recetas

            </p>

            <p className="text-[#6B5B4F]">

              Prueba con otra búsqueda o modifica los filtros seleccionados.

            </p>

            <button
              type="button"
              onClick={limpiarFiltros}
              className="mt-5 cursor-pointer rounded-full bg-[#AD8368] px-5 py-3 font-medium text-white transition-all hover:opacity-90"
            >

              Limpiar filtros

            </button>

          </div>

        ) : (

          <div className="relative isolate z-0 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">

            {resultados.map((r) => (

              <TarjetaReceta
                key={r.id_receta}
                receta={r}
                nombreCategoria={
                  nombresCategorias[r.id_categoria] ||
                  "Sin categoría"
                }
                esFavorito={
                  favoritos.includes(String(r.id_receta))
                }
                onToggleFavorito={toggleFavorito}
                deshabilitado={!listo || guardando}
                soyAdmin={soyAdmin && !r.id_usuario}
                onEditar={abrirEditarRecetaAdmin}
                onEliminar={alEliminarRecetaCatalogo}
              />

            ))}

          </div>

        )}

      </main>

      <FormularioReceta
        abierto={formularioAbierto}
        cerrar={cerrarFormularioAdmin}
        categorias={categorias}
        receta={recetaEditando}
        modoAdmin={true}
        onGuardada={alGuardarRecetaCatalogo}
      />

    </div>

  );

}