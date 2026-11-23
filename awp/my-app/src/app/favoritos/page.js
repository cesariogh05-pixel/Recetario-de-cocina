"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "../base/supabase";
import { obtenerCategorias } from "../actions/recetasAction";
import TarjetaReceta from "../componentes/tarjetaReceta";

// =========================
// CONFIGURACIÓN DE CATEGORÍAS
// =========================

const IMAGEN_TODAS = "/categorias/Todas.png";

const COLORES_CATEGORIAS = {
  todas: "#F6DFCE",
  desayunos: "#DFEBCB",
  comidas: "#FFE8B0",
  postres: "#EEDFF0",
  bebidas: "#D8EDF0",
};

const BORDES_CATEGORIAS = {
  todas: "#E5BEA5",
  desayunos: "#C5D7AB",
  comidas: "#EED28D",
  postres: "#D7BBD9",
  bebidas: "#B3D7DE",
};

// =========================
// FUNCIONES AUXILIARES
// =========================

// Convertir tiempo a minutos para ordenar

function convertirMinutos(tiempo) {
  const texto = String(tiempo ?? "").toLowerCase().trim();

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
    (horas ? Number(horas[1].replace(",", ".")) * 60 : 0) +
    (minutos ? Number(minutos[1].replace(",", ".")) : 0)
  );
}

// Normalizar los valores de dificultad

function normalizarDificultad(valor) {
  const texto = String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (texto === "facil") return "facil";

  if (
    ["media", "medio", "intermedia", "intermedio"].includes(texto)
  ) {
    return "intermedia";
  }

  if (texto === "dificil") return "dificil";

  return texto;
}

// Comprobar el filtro de porciones

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
// COMPONENTE FAVORITOS
// =========================

export default function Favoritos() {

  const [supabase] = useState(() => createClient());

  // Estados de autenticación

  const [usuario, setUsuario] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // Estados de datos

  const [guardadas, setGuardadas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [errorCategorias, setErrorCategorias] = useState(false);

  // Estados de filtros

  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [orden, setOrden] = useState("nombre");
  const [dificultad, setDificultad] = useState("Todas");
  const [porciones, setPorciones] = useState("Todas");

  // Estado de eliminación

  const [eliminando, setEliminando] = useState(null);

  // Referencias de seguridad

  const usuarioRef = useRef(null);
  const versionRef = useRef(0);
  const ocupadoRef = useRef(false);

  // =========================
  // DETECTAR SESIÓN
  // =========================

  useEffect(() => {

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (evento, sesion) => {

        const nuevoUsuario = sesion?.user ?? null;
        const nuevoId = nuevoUsuario?.id ?? null;

        if (
          evento === "INITIAL_SESSION" ||
          nuevoId !== usuarioRef.current
        ) {

          versionRef.current++;

          usuarioRef.current = nuevoId;

          setGuardadas([]);
          setListo(!nuevoId);
          setError("");
          setErrorAccion("");

          // Restablecer todos los filtros

          setCategoria("Todas");
          setBusqueda("");
          setDificultad("Todas");
          setPorciones("Todas");
          setOrden("nombre");

        }

        setUsuario(nuevoUsuario);
        setCargandoSesion(false);

      }
    );

    return () => {
      versionRef.current++;
      subscription.unsubscribe();
    };

  }, [supabase]);

  // =========================
  // CARGAR CATEGORÍAS
  // =========================

  useEffect(() => {

    let activo = true;

    async function cargarCategorias() {

      try {

        setErrorCategorias(false);

        const datos = await obtenerCategorias();

        if (activo) {
          setCategorias(datos);
        }

      } catch (err) {

        console.error(
          "Error al cargar categorías:",
          err
        );

        if (activo) {
          setErrorCategorias(true);
        }

      }

    }

    cargarCategorias();

    return () => {
      activo = false;
    };

  }, []);

  // =========================
  // CARGAR FAVORITOS
  // =========================

  const idUsuario = usuario?.id;

  useEffect(() => {

    let activo = true;
    let solicitud = 0;

    if (!idUsuario) {

      setGuardadas([]);
      setListo(true);

      return;

    }

    const cargarFavoritos = async (
      mostrarCarga = false
    ) => {

      const actual = ++solicitud;
      const version = versionRef.current;

      try {

        if (mostrarCarga) {
          setListo(false);
        }

        setError("");

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
          .eq("id_usuario", idUsuario)
          .order("fecha", {
            ascending: false,
          });

        if (error) throw error;

        const recetasGuardadas = (data || [])
          .filter((item) => item.recetas)
          .map((item) => ({
            ...item.recetas,
            id_favorito: item.id_favorito,
            fecha_favorito: item.fecha,
          }));

        if (
          activo &&
          actual === solicitud &&
          version === versionRef.current
        ) {

          setGuardadas(recetasGuardadas);

        }

      } catch (err) {

        console.error(
          "Error al cargar favoritos:",
          err
        );

        if (
          activo &&
          actual === solicitud &&
          version === versionRef.current
        ) {

          setError(
            "No se pudieron cargar tus recetas favoritas."
          );

        }

      } finally {

        if (
          activo &&
          actual === solicitud &&
          version === versionRef.current
        ) {

          setListo(true);

        }

      }

    };

    cargarFavoritos(true);

    // Actualizar cuando cambian los favoritos

    const actualizarFavoritos = () => {
      cargarFavoritos(false);
    };

    window.addEventListener(
      "misabor:favoritos-cambio",
      actualizarFavoritos
    );

    // Actualizar al regresar a la aplicación

    window.addEventListener(
      "focus",
      actualizarFavoritos
    );

    return () => {

      activo = false;

      window.removeEventListener(
        "misabor:favoritos-cambio",
        actualizarFavoritos
      );

      window.removeEventListener(
        "focus",
        actualizarFavoritos
      );

    };

  }, [idUsuario, supabase]);

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

    guardadas.forEach((r) => {

      cantidades[r.id_categoria] =
        (cantidades[r.id_categoria] || 0) + 1;

    });

    return cantidades;

  }, [guardadas]);

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

    const texto = busqueda.trim().toLowerCase();

    const lista = guardadas.filter((r) => {

      const nombreCategoria =
        nombresCategorias[r.id_categoria] || "";

      // Filtro por categoría

      const coincideCategoria =
        categoria === "Todas" ||
        r.id_categoria === categoria;

      // Filtro por búsqueda

      const coincideBusqueda =
        (r.nombre || "").toLowerCase().includes(texto) ||
        (r.descripcion || "").toLowerCase().includes(texto) ||
        nombreCategoria.toLowerCase().includes(texto);

      // Filtro por dificultad

      const coincideDificultad =
        dificultad === "Todas" ||
        normalizarDificultad(r.dificultad) === dificultad;

      // Filtro por número de porciones

      const coincideCantidad =
        coincidePorciones(r.porciones, porciones);

      return (
        coincideCategoria &&
        coincideBusqueda &&
        coincideDificultad &&
        coincideCantidad
      );

    });

    // Ordenar recetas

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
    guardadas,
    busqueda,
    categoria,
    orden,
    dificultad,
    porciones,
    nombresCategorias,
  ]);

  // =========================
  // ELIMINAR FAVORITO
  // =========================

  const quitarFavorito = async (idReceta) => {

    if (ocupadoRef.current) return;

    const id = usuarioRef.current;

    if (!id) {

      window.dispatchEvent(
        new Event("misabor:abrir-auth")
      );

      return;

    }

    const version = versionRef.current;

    ocupadoRef.current = true;

    setEliminando(idReceta);
    setErrorAccion("");

    try {

      const { error } = await supabase
        .from("favoritos")
        .delete()
        .eq("id_usuario", id)
        .eq("id_receta", idReceta);

      if (error) throw error;

      // Evitar cambios si el usuario cerró sesión

      if (version !== versionRef.current) return;

      // Eliminar la receta de la interfaz

      setGuardadas((prev) =>
        prev.filter(
          (r) => r.id_receta !== idReceta
        )
      );

      // Actualizar el contador del layout

      window.dispatchEvent(
        new Event("misabor:favoritos-cambio")
      );

    } catch (err) {

      console.error(
        "Error al eliminar favorito:",
        err
      );

      if (version === versionRef.current) {

        setErrorAccion(
          "No se pudo eliminar la receta. Intenta nuevamente."
        );

      }

    } finally {

      ocupadoRef.current = false;
      setEliminando(null);

    }

  };

  // =========================
  // ABRIR AUTENTICACIÓN
  // =========================

  const abrirAutenticacion = () => {

    window.dispatchEvent(
      new Event("misabor:abrir-auth")
    );

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
  };

  // =========================
  // IR A LOS FILTROS
  // =========================

  const irAFiltros = () => {

    document
      .querySelector('select[aria-label="Filtrar por dificultad"]')
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

  };

  // =========================
  // INTERFAZ DE FAVORITOS
  // =========================

  return (

    <div className="min-h-screen bg-[#FAF6EA] text-[#3B2A1A]">

      {/* =========================
          PORTADA DE FAVORITOS
      ========================= */}

      <section
        className="relative bg-[#F8EAD9] bg-cover bg-center"
        style={{
          backgroundImage: "url('/banner-favoritos.png')",
        }}
      >

        <div className="mx-auto flex min-h-[375px] max-w-6xl items-center px-6 py-12 md:min-h-[390px]">

          <div className="relative w-full max-w-[490px]">

            {/* =========================
                MARCADOR CON CORAZÓN
            ========================= */}

            <div className="mb-4 flex items-center gap-3">

              <svg
                width="28"
                height="36"
                viewBox="0 0 32 42"
                fill="none"
                className="shrink-0"
                aria-hidden="true"
              >

                <path
                  d="M4 1H28C29.7 1 31 2.4 31 4V40L16 31L1 40V4C1 2.4 2.3 1 4 1Z"
                  fill="#CE7951"
                />

                <path
                  d="M16 23L10 17C5 12 12 7 16 12C20 7 27 12 22 17L16 23Z"
                  fill="#FFF8EB"
                />

              </svg>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B16F45]">

                Tus recetas guardadas

              </p>

            </div>

            {/* =========================
                TÍTULO PRINCIPAL
            ========================= */}

            <div className="relative">

              <h1 className="titulo mb-6 text-4xl leading-[1.15] text-[#75472E] md:text-[54px]">

                Un rincón para

                <br />

                <span className="relative inline-block">

                  tus favoritos

                  {/* SUBRAYADO DORADO */}

                  <svg
                    viewBox="0 0 320 15"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute -bottom-2 left-0 h-[11px] w-full"
                    aria-hidden="true"
                  >

                    <path
                      d="M4 10C73 1 178 1 285 5Q304 6 316 2"
                      fill="none"
                      stroke="#E7B86F"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                  </svg>

                </span>

                {" "}♡

              </h1>

              {/* DESTELLOS DECORATIVOS */}

              <svg
                width="36"
                height="55"
                viewBox="0 0 48 70"
                fill="none"
                className="pointer-events-none absolute -right-1 -top-3 hidden opacity-90 lg:block"
                aria-hidden="true"
              >

                <path
                  d="M17 2C17 16 22 21 32 23C22 25 17 31 17 44C17 31 12 25 2 23C12 21 17 16 17 2Z"
                  fill="#E9B75E"
                />

                <path
                  d="M38 29C38 38 41 41 47 43C41 45 38 48 38 57C38 48 35 45 29 43C35 41 38 38 38 29Z"
                  fill="#F0CD86"
                />

                <path
                  d="M20 48C20 55 23 58 28 59C23 61 20 64 20 70C20 64 17 61 12 59C17 58 20 55 20 48Z"
                  fill="#E9B75E"
                />

              </svg>

            </div>

            {/* =========================
                DESCRIPCIÓN
            ========================= */}

            <p className="mb-6 max-w-[400px] text-base leading-relaxed text-[#6B5140]">

              Todas esas recetas que te encantaron,
              reunidas en un solo lugar.

            </p>

            {/* =========================
                BUSCADOR
            ========================= */}

            <div className="flex w-full items-center gap-3">

              <form
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  irAFiltros();
                }}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-[#A78169] bg-[#FFFDF9] px-5 py-3 shadow-sm transition-all focus-within:ring-4 focus-within:ring-[#E7B86F]/20"
              >

                <svg
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#805039"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="shrink-0"
                  aria-hidden="true"
                >

                  <circle cx="10.5" cy="10.5" r="7" />

                  <path d="m16 16 5 5" />

                </svg>

                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(e.target.value)
                  }
                  placeholder="Buscar entre mis recetas guardadas..."
                  aria-label="Buscar recetas guardadas"
                  className="w-full min-w-0 bg-transparent text-sm text-[#593827] outline-none placeholder:text-[#927C6B]"
                />

              </form>

              {/* BOTÓN AMARILLO DE FILTROS */}

              <button
                type="button"
                onClick={irAFiltros}
                title="Ver filtros"
                aria-label="Ir a los filtros de favoritos"
                className="flex h-[49px] w-[55px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#EACB85] bg-[#F6DFA0] text-[#75472E] shadow-sm transition-all duration-200 hover:bg-[#EBC879] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#805039]"
              >

                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >

                  <path d="M3 6H7M11 6H21" />

                  <circle cx="9" cy="6" r="2" />

                  <path d="M3 12H13M17 12H21" />

                  <circle cx="15" cy="12" r="2" />

                  <path d="M3 18H7M11 18H21" />

                  <circle cx="9" cy="18" r="2" />

                </svg>

              </button>

            </div>

          </div>

        </div>

      </section>

      {/* =========================
          CATEGORÍAS
      ========================= */}

      <section className="relative z-0 isolate border-b border-[#E9DFD0] py-9">

        <div className="mx-auto max-w-6xl px-6">

          {/* TÍTULO DECORATIVO */}

          <div className="mb-7 flex items-center gap-3 sm:gap-4">

            <h2 className="titulo text-2xl font-bold text-[#603B2A] sm:text-3xl">

              Explora tus categorías

            </h2>

            {/* HOJAS DECORATIVAS */}

            <svg
              width="38"
              height="38"
              viewBox="0 0 42 42"
              fill="none"
              className="shrink-0"
              aria-hidden="true"
            >

              <path
                d="M5 37Q24 25 35 5"
                stroke="#7E8A49"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="M22 23Q18 7 37 3Q39 19 22 23Z"
                fill="#A4B45F"
                stroke="#788A43"
                strokeWidth="1.2"
              />

              <path
                d="M15 29Q1 25 10 12Q23 13 15 29Z"
                fill="#B5C77B"
                stroke="#788A43"
                strokeWidth="1.2"
              />

              <path
                d="M17 32Q28 21 39 28Q32 39 17 32Z"
                fill="#9DAF5A"
                stroke="#788A43"
                strokeWidth="1.2"
              />

              <path
                d="M26 17L34 7M12 18L15 28M23 31L35 29"
                stroke="#788A43"
                strokeWidth="1"
                strokeLinecap="round"
              />

            </svg>

            {/* LÍNEA DECORATIVA */}

            <div
              aria-hidden="true"
              className="hidden h-px flex-1 bg-gradient-to-r from-[#BC8968] to-[#DBC3AC]/40 md:block"
            />

          </div>

          {errorCategorias && (

            <p className="mb-4 text-sm text-[#A34737]">

              No se pudieron cargar las categorías.

            </p>

          )}

          {/* =========================
              TARJETAS DE CATEGORÍAS
          ========================= */}

          <div className="flex gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-5 md:overflow-visible">

            {opcionesCategorias.map((cat) => {

              const nombre = cat.nombre
                .toLowerCase()
                .trim();

              // Cantidad de favoritos por categoría

              const cantidad =
                cat.id_categoria === "Todas"
                  ? guardadas.length
                  : conteos[cat.id_categoria] || 0;

              // Categoría seleccionada

              const activa =
                categoria === cat.id_categoria;

              // Color de la categoría

              const color =
                COLORES_CATEGORIAS[nombre] ||
                "#F6DFCE";

              // Color del borde

              const borde =
                BORDES_CATEGORIAS[nombre] ||
                "#E5BEA5";

              // Imagen de la categoría

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
                  className={`relative flex min-h-[145px] w-[175px] shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] border-[1.5px] px-3 py-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#805039] md:w-full ${
                    activa
                      ? "shadow-[0_4px_10px_rgba(128,80,57,0.15)]"
                      : "shadow-[0_2px_5px_rgba(128,80,57,0.07)]"
                  }`}
                  style={{
                    backgroundColor: color,
                    borderColor: activa
                      ? "#805039"
                      : borde,
                  }}
                >

                  {/* FONDO DECORATIVO */}

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.06]"
                    style={{
                      backgroundImage: "url('/fondonuevo.jpg')",
                    }}
                  />

                  {/* IMAGEN DE CATEGORÍA */}

                  <div className="relative z-10 mb-1 h-[65px] w-[75px]">

                    {imagen && (

                      <img
                        src={imagen}
                        alt=""
                        className="h-full w-full object-contain"
                      />

                    )}

                  </div>

                  {/* NOMBRE */}

                  <span className="titulo relative z-10 text-lg font-bold text-[#603B2A]">

                    {cat.nombre}

                  </span>

                  {/* CONTADOR */}

                  <span className="relative z-10 mt-1 text-xs text-[#795A48]">

                    {cargandoSesion || !listo
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
          RECETAS GUARDADAS
          DISEÑO ORIGINAL
      ========================= */}

      <main className="mx-auto w-full max-w-6xl px-6 py-10">

        {/* =========================
            ENCABEZADO Y FILTROS
        ========================= */}

        <div className="relative z-0 mb-7 flex flex-wrap items-center justify-between gap-5">

          {/* Título y cantidad de recetas */}

          <div>

            <h2 className="titulo mb-2 text-3xl text-[#603B2A]">

              Mis recetas guardadas

            </h2>

            <p
              className="text-sm text-[#795A48]"
              aria-live="polite"
            >

              {cargandoSesion || !listo
                ? "Cargando favoritos..."
                : !usuario
                  ? "Inicia sesión para consultar tus recetas"
                  : error
                    ? "Favoritos no disponibles"
                    : `Mostrando ${resultados.length} ${
                        resultados.length === 1
                          ? "receta"
                          : "recetas"
                      }`}

            </p>

          </div>

          {/* =========================
              FILTROS HORIZONTALES
          ========================= */}

          <div className="flex flex-wrap items-center gap-3">

            {/* Icono de filtros */}

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

            {/* =========================
                FILTRO POR DIFICULTAD
            ========================= */}

            <select
              value={dificultad}
              onChange={(e) =>
                setDificultad(e.target.value)
              }
              aria-label="Filtrar por dificultad"
              className={`rounded-full border px-4 py-2.5 text-sm text-[#805039] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#805039] ${
                dificultad !== "Todas"
                  ? "bg-[#EAD9C5] border-[#805039]"
                  : "bg-transparent border-[#CBB69E] hover:bg-[#F0E5D5]"
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

            {/* =========================
                FILTRO POR PORCIONES
            ========================= */}

            <select
              value={porciones}
              onChange={(e) =>
                setPorciones(e.target.value)
              }
              aria-label="Filtrar por porciones"
              className={`rounded-full border px-4 py-2.5 text-sm text-[#805039] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#805039] ${
                porciones !== "Todas"
                  ? "bg-[#EAD9C5] border-[#805039]"
                  : "bg-transparent border-[#CBB69E] hover:bg-[#F0E5D5]"
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

            {/* =========================
                ORDENAR RECETAS
            ========================= */}

            <select
              value={orden}
              onChange={(e) =>
                setOrden(e.target.value)
              }
              aria-label="Ordenar recetas"
              className="rounded-full border border-[#CBB69E] bg-transparent px-4 py-2.5 text-sm text-[#805039] cursor-pointer hover:bg-[#F0E5D5] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#805039]"
            >

              <option value="nombre">

                Nombre (A-Z)

              </option>

              <option value="tiempo">

                Menor tiempo

              </option>

            </select>

            {/* =========================
                BOTÓN LIMPIAR FILTROS
            ========================= */}

            <button
              type="button"
              onClick={limpiarFiltros}
              title="Limpiar filtros"
              aria-label="Limpiar filtros"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#805039] hover:bg-[#EAD9C5] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[#805039]"
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

        {/* =========================
            ERROR AL ELIMINAR
        ========================= */}

        {errorAccion && (

          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600"
          >

            {errorAccion}

          </div>

        )}

        {/* =========================
            ESTADOS DE FAVORITOS
        ========================= */}

        {cargandoSesion || !listo ? (

          /* CARGANDO FAVORITOS */

          <p className="py-16 text-center text-[#806B5A]">

            Cargando tus favoritos...

          </p>

        ) : !usuario ? (

          /* =========================
              USUARIO SIN SESIÓN
          ========================= */

          <div className="rounded-3xl border border-[#E9DFD0] bg-[#FFFDF9] px-6 py-16 text-center shadow-sm">

            <div className="mb-4 text-6xl text-[#B77E72]">

              ♡

            </div>

            <h3 className="titulo mb-3 text-3xl text-[#603B2A]">

              Tus recetas, siempre contigo

            </h3>

            <p className="mx-auto mb-7 max-w-md leading-relaxed text-[#806B5A]">

              Inicia sesión o crea una cuenta para guardar
              tus recetas favoritas y encontrarlas
              fácilmente cuando quieras.

            </p>

            <button
              type="button"
              onClick={abrirAutenticacion}
              className="inline-block cursor-pointer rounded-full bg-[#805039] px-7 py-3 font-semibold text-white transition-colors hover:bg-[#603B2A]"
            >

              Iniciar sesión

            </button>

            <div className="mt-4">

              <Link
                href="/explorar"
                className="text-sm font-medium text-[#805039] hover:underline"
              >

                Seguir explorando recetas

              </Link>

            </div>

          </div>

        ) : error ? (

          /* =========================
              ERROR DE CONEXIÓN
          ========================= */

          <div className="rounded-3xl border border-[#E9DFD0] bg-[#FFFDF9] px-6 py-16 text-center shadow-sm">

            <h3 className="titulo mb-3 text-3xl text-[#603B2A]">

              No pudimos cargar tus favoritos

            </h3>

            <p className="mx-auto mb-7 max-w-md text-[#806B5A]">

              {error} Comprueba tu conexión e intenta
              nuevamente.

            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cursor-pointer rounded-full bg-[#805039] px-7 py-3 font-semibold text-white hover:bg-[#603B2A]"
            >

              Volver a intentar

            </button>

          </div>

        ) : guardadas.length === 0 ? (

          /* =========================
              SIN FAVORITOS GUARDADOS
          ========================= */

          <div className="rounded-3xl border border-[#E9DFD0] bg-[#FFFDF9] px-6 py-16 text-center shadow-sm">

            <div className="mb-4 text-6xl text-[#B77E72]">

              ♡

            </div>

            <h3 className="titulo mb-3 text-3xl text-[#603B2A]">

              Tu recetario está esperando

            </h3>

            <p className="mx-auto mb-7 max-w-md leading-relaxed text-[#806B5A]">

              Aquí aparecerán todas las recetas que
              guardes como favoritas. Por ahora,
              tu recetario está vacío.

            </p>

            <Link
              href="/explorar"
              className="inline-block rounded-full bg-[#805039] px-7 py-3 font-semibold text-white transition-colors hover:bg-[#603B2A]"
            >

              Explorar recetas

            </Link>

          </div>

        ) : resultados.length === 0 ? (

          /* =========================
              SIN COINCIDENCIAS
          ========================= */

          <div className="rounded-3xl bg-[#FFFDF9] px-6 py-16 text-center">

            <h3 className="titulo mb-3 text-2xl">

              No encontramos coincidencias

            </h3>

            <p className="text-[#806B5A]">

              Prueba con otra búsqueda o modifica
              los filtros seleccionados.

            </p>

            <button
              type="button"
              onClick={limpiarFiltros}
              className="mt-5 cursor-pointer rounded-full bg-[#805039] px-6 py-3 font-semibold text-white hover:bg-[#603B2A]"
            >

              Limpiar filtros

            </button>

          </div>

        ) : (

          /* =========================
              TARJETAS DE RECETAS
              COMPONENTE REUTILIZABLE
          ========================= */

          <div className="relative z-0 isolate grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">

            {resultados.map((r) => (

              <TarjetaReceta
                key={r.id_receta}
                receta={r}
                nombreCategoria={
                  nombresCategorias[r.id_categoria] ||
                  "Sin categoría"
                }
                esFavorito={true}
                onToggleFavorito={quitarFavorito}
                deshabilitado={eliminando !== null}
                procesando={eliminando === r.id_receta}
              />

            ))}

          </div>

        )}

      </main>

    </div>

  );

}