"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import { createClient } from "../base/supabase";
import { esAdmin } from "../base/admin";

import {
  obtenerCategorias,
  eliminarRecetaCatalogo,
} from "../actions/recetasAction";

import {
  obtenerMisRecetas,
  obtenerRecetasComunidad,
  cambiarVisibilidad,
  eliminarReceta,
} from "../actions/misRecetasAction";

import FormularioReceta from "../componentes/FormularioReceta";
import TarjetaRecetaUsuario from "../componentes/tarjetaRecetaUsuario";
import DetalleReceta from "../componentes/DetalleReceta";

// =========================
// FUNCIONES AUXILIARES
// =========================

function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizarDificultad(valor) {
  const texto = normalizar(valor);

  if (texto === "facil") return "facil";

  if (
    ["media", "medio", "intermedia", "intermedio"].includes(texto)
  ) {
    return "intermedia";
  }

  if (texto === "dificil") return "dificil";

  return texto;
}

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

const abrirAutenticacion = () =>
  window.dispatchEvent(new Event("misabor:abrir-auth"));

// =========================
// COMPONENTE RECETAS
// =========================

export default function Recetas() {
  const [supabase] = useState(() => createClient());

  // Sesión
  const [usuario, setUsuario] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [soyAdmin, setSoyAdmin] = useState(false);

  // Datos
  const [misRecetas, setMisRecetas] = useState([]);
  const [comunidad, setComunidad] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Interfaz
  const [tab, setTab] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesandoId, setProcesandoId] = useState(null);

  // =========================
  // FAVORITOS
  // =========================

  const [favoritos, setFavoritos] = useState([]);
  const [procesandoFavorito, setProcesandoFavorito] = useState(null);
  const [cargandoFavoritos, setCargandoFavoritos] = useState(true);

  const usuarioFavoritosRef = useRef(null);
  const ocupadoFavoritosRef = useRef(false);

  // Filtros
  const [dificultad, setDificultad] = useState("Todas");
  const [porciones, setPorciones] = useState("Todas");
  const [orden, setOrden] = useState("nombre");

  // Formularios y detalle
  const [formularioAbierto, setFormularioAbierto] =
    useState(false);

  const [modoAdminForm, setModoAdminForm] = useState(false);
  const [recetaEditando, setRecetaEditando] = useState(null);
  const [recetaDetalle, setRecetaDetalle] = useState(null);

  const idUsuario = usuario?.id;

  const tabActiva = tab ?? (usuario ? "mias" : "comunidad");

  // =========================
  // DETECTAR SESIÓN Y ADMIN
  // =========================

  useEffect(() => {
    let activo = true;

    const cargarUsuarioInicial = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!activo) return;

      setUsuario(user ?? null);
      setSoyAdmin(esAdmin(user));
      setCargandoSesion(false);
    };

    cargarUsuarioInicial();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (!activo) return;

      const userActual = session?.user ?? null;

      setUsuario(userActual);
      setSoyAdmin(esAdmin(userActual));
      setCargandoSesion(false);
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // =========================
  // CARGAR DATOS
  // =========================

  const cargarComunidad = useCallback(async () => {
    try {
      setComunidad(await obtenerRecetasComunidad());
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las recetas de la comunidad.");
    }
  }, []);

  const cargarMisRecetas = useCallback(async () => {
    try {
      setMisRecetas(await obtenerMisRecetas());
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar tus recetas.");
    }
  }, []);

  // Categorías y recetas públicas

  useEffect(() => {
    let activo = true;

    const iniciar = async () => {
      try {
        const cats = await obtenerCategorias();

        if (activo) setCategorias(cats);
      } catch (e) {
        console.error(e);
      }

      await cargarComunidad();

      if (activo) setCargando(false);
    };

    iniciar();

    return () => {
      activo = false;
    };
  }, [cargarComunidad]);

  // Recetas del usuario

  useEffect(() => {
    if (!idUsuario) {
      setMisRecetas([]);
      return;
    }

    cargarMisRecetas();
  }, [idUsuario, cargarMisRecetas]);

  // =========================
  // CARGAR FAVORITOS
  // =========================

  useEffect(() => {
    let activo = true;

    usuarioFavoritosRef.current = idUsuario ?? null;

    setFavoritos([]);

    if (!idUsuario) {
      setCargandoFavoritos(false);
      return;
    }

    setCargandoFavoritos(true);

    const cargarFavoritos = async () => {
      try {
        const { data, error } = await supabase
          .from("favoritos")
          .select("id_receta")
          .eq("id_usuario", idUsuario);

        if (error) throw error;

        if (activo) {
          setFavoritos(
            (data || []).map((f) => String(f.id_receta))
          );

          setCargandoFavoritos(false);
        }
      } catch (e) {
        console.error("Error al cargar favoritos:", e);

        if (activo) {
          setError(
            "No se pudieron cargar tus favoritos. Recarga la página."
          );
        }
      }
    };

    cargarFavoritos();

    return () => {
      activo = false;
      usuarioFavoritosRef.current = null;
    };
  }, [idUsuario, supabase]);

  // =========================
  // GUARDAR Y QUITAR FAVORITOS
  // =========================

  const toggleFavorito = async (idReceta) => {
    if (!idUsuario) {
      abrirAutenticacion();
      return;
    }

    if (
      cargandoFavoritos ||
      ocupadoFavoritosRef.current
    ) {
      return;
    }

    const usuarioActual = idUsuario;
    const id = String(idReceta);
    const existe = favoritos.includes(id);

    ocupadoFavoritosRef.current = true;

    setProcesandoFavorito(id);
    setError("");

    try {
      if (existe) {
        const { error } = await supabase
          .from("favoritos")
          .delete()
          .eq("id_usuario", usuarioActual)
          .eq("id_receta", idReceta);

        if (error) throw error;

        if (usuarioFavoritosRef.current !== usuarioActual) {
          return;
        }

        setFavoritos((prev) =>
          prev.filter((f) => f !== id)
        );

      } else {
        const { error } = await supabase
          .from("favoritos")
          .insert({
            id_usuario: usuarioActual,
            id_receta: idReceta,
          });

        if (error && error.code !== "23505") {
          throw error;
        }

        if (usuarioFavoritosRef.current !== usuarioActual) {
          return;
        }

        setFavoritos((prev) => [
          ...new Set([...prev, id]),
        ]);
      }

      // Actualizar contador de favoritos del menú

      window.dispatchEvent(
        new Event("misabor:favoritos-cambio")
      );

    } catch (e) {
      console.error("Error al actualizar favorito:", e);

      if (usuarioFavoritosRef.current === usuarioActual) {
        setError("No se pudo actualizar el favorito.");
      }

    } finally {
      ocupadoFavoritosRef.current = false;
      setProcesandoFavorito(null);
    }
  };

  // =========================
  // ACCIONES
  // =========================

  const nuevaReceta = () => {
    if (!usuario) {
      abrirAutenticacion();
      return;
    }

    setModoAdminForm(false);
    setRecetaEditando(null);
    setFormularioAbierto(true);
  };

  const nuevaRecetaCatalogo = () => {
    if (!usuario) {
      abrirAutenticacion();
      return;
    }

    if (!soyAdmin) return;

    setModoAdminForm(true);
    setRecetaEditando(null);
    setFormularioAbierto(true);
  };

const editarReceta = (receta) => {
  const editarComoAdmin =
    soyAdmin && receta.id_usuario !== idUsuario;

  setModoAdminForm(editarComoAdmin);
  setRecetaEditando(receta);
  setFormularioAbierto(true);
};

  const cerrarFormulario = () => {
    setFormularioAbierto(false);
    setModoAdminForm(false);
  };

  const recetaGuardada = async (receta, editando) => {
    const fueCatalogo = modoAdminForm;

    setFormularioAbierto(false);
    setModoAdminForm(false);
    setError("");

    if (fueCatalogo) {
      setMensaje("Receta añadida al catálogo principal correctamente.");
      return;
    }

    setTab("mias");

    setMensaje(
      editando
        ? "Tu receta se actualizó correctamente."
        : receta?.visibilidad === "publica"
          ? "Receta guardada. Ya aparece en la comunidad."
          : "Receta guardada. Solo tú puedes verla."
    );

    await Promise.all([
      cargarMisRecetas(),
      cargarComunidad(),
    ]);
  };

  const alternarVisibilidad = async (receta) => {
    if (procesandoId) return;

    const nueva =
      receta.visibilidad === "publica"
        ? "privada"
        : "publica";

    setProcesandoId(receta.id_receta);
    setError("");
    setMensaje("");

    const respuesta = await cambiarVisibilidad(
      receta.id_receta,
      nueva
    );

    if (respuesta.ok) {
      setMensaje(
        nueva === "publica"
          ? "Tu receta ahora es pública y aparece en la comunidad."
          : "Tu receta ahora es privada. Solo tú puedes verla."
      );

      await Promise.all([
        cargarMisRecetas(),
        cargarComunidad(),
      ]);

    } else {
      setError(respuesta.error);
    }

    setProcesandoId(null);
  };

  const borrarReceta = async (receta) => {
    if (procesandoId) return;

    setProcesandoId(receta.id_receta);
    setError("");
    setMensaje("");

    const respuesta = await eliminarReceta(receta.id_receta);

    if (respuesta.ok) {
      setMensaje("La receta se eliminó correctamente.");

      await Promise.all([
        cargarMisRecetas(),
        cargarComunidad(),
      ]);

    } else {
      setError(respuesta.error);
    }

    setProcesandoId(null);
  };

  const borrarRecetaDeDetalle = async (receta) => {
    if (!receta) return;

    setError("");
    setMensaje("");

    // Receta del catálogo principal

    if (receta.id_receta && !receta.id_usuario && soyAdmin) {
      const res = await eliminarRecetaCatalogo(
        receta.id_receta
      );

      if (res.ok) {
        setRecetaDetalle(null);

        setMensaje(
          "Receta eliminada del catálogo correctamente."
        );

      } else {
        setError(res.error);
      }

      return;
    }

    // Receta de usuario o comunidad

    await borrarReceta(receta);
    setRecetaDetalle(null);
  };

  // =========================
  // LIMPIAR FILTROS
  // =========================

  const limpiarFiltros = () => {
    setBusqueda("");
    setDificultad("Todas");
    setPorciones("Todas");
    setOrden("nombre");
  };

  const hayFiltros =
    busqueda.trim() !== "" ||
    dificultad !== "Todas" ||
    porciones !== "Todas" ||
    orden !== "nombre";

  // =========================
  // DATOS DERIVADOS
  // =========================

  const nombresCategorias = useMemo(() => {
    const mapa = {};

    categorias.forEach((c) => {
      mapa[String(c.id_categoria)] = c.nombre;
    });

    return mapa;
  }, [categorias]);

  // =========================
  // FILTRAR Y ORDENAR RECETAS
  // =========================

  const resultados = useMemo(() => {
    const lista =
      tabActiva === "mias" ? misRecetas : comunidad;

    const texto = normalizar(busqueda);

    const filtradas = lista.filter((r) => {
      const coincideBusqueda =
        texto === "" ||
        normalizar(r.nombre).includes(texto) ||
        normalizar(r.descripcion).includes(texto);

      const coincideDificultad =
        dificultad === "Todas" ||
        normalizarDificultad(r.dificultad) === dificultad;

      return (
        coincideBusqueda &&
        coincideDificultad &&
        coincidePorciones(r.porciones, porciones)
      );
    });

    return [...filtradas].sort((a, b) => {
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
    tabActiva,
    misRecetas,
    comunidad,
    busqueda,
    dificultad,
    porciones,
    orden,
  ]);

  const nombreCategoria = (receta) =>
    nombresCategorias[String(receta.id_categoria)] ||
    "Sin categoría";

  // =========================
  // INTERFAZ
  // =========================

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <section className="relative isolate z-0 overflow-hidden bg-[#F3EBDA] px-8 pt-16 pb-20 text-center md:pt-20 md:pb-24">

        {/* FONDO ILUSTRADO */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-repeat opacity-[0.10]"
          style={{
            backgroundImage: "url('/fondo explorar.png')",
            backgroundSize: "900px",
            backgroundPosition: "center",
          }}
        />

        {/* CONTENIDO DEL BANNER */}

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-4">

          <p className="text-xs font-bold tracking-widest text-[#8C6D53] uppercase">
            RECETAS
          </p>

          <h1 className="titulo text-5xl leading-tight text-[var(--foreground)] m-0">
            Guarda las recetas
            <br />
            que te hacen feliz
          </h1>

          <p className="text-lg text-[#6B5B4F] mb-2">
            Añade tus propias recetas y decide si son solo para ti
            o si quieres compartirlas con la comunidad.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">

            <button
              type="button"
              onClick={nuevaReceta}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-[#805039] px-7 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-[#603B2A]"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>

              Añadir receta

            </button>

            {soyAdmin && (
              <button
                type="button"
                onClick={nuevaRecetaCatalogo}
                className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-[#805039] bg-[#FFFDF8] px-6 py-3 font-semibold text-[#805039] shadow-sm transition-colors hover:bg-[#F0E5D5]"
              >
                + Añadir al catálogo (Admin)
              </button>
            )}

          </div>

        </div>

        {/* EFECTO ONDULADO INFERIOR */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px"
        >
          <svg
            viewBox="0 0 1440 40"
            preserveAspectRatio="none"
            className="block h-[25px] w-full"
          >
            <path
              d="M0,20 C240,60 480,-10 720,20 C960,50 1200,-5 1440,20 L1440,40 L0,40 Z"
              fill="var(--background)"
            />
          </svg>
        </div>

      </section>

      {/* =========================
          CONTENIDO PRINCIPAL
      ========================= */}

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">

        {/* =========================
            PESTAÑAS Y FILTROS
        ========================= */}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">

          {/* MIS RECETAS Y COMUNIDAD */}

          <div
            role="tablist"
            aria-label="Tipo de recetas"
            className="flex flex-wrap items-center gap-2"
          >
            {[
              {
                id: "mias",
                texto: "Mis recetas",
                cantidad: misRecetas.length,
              },
              {
                id: "comunidad",
                texto: "Comunidad",
                cantidad: comunidad.length,
              },
            ].map((opcion) => (

              <button
                key={opcion.id}
                type="button"
                role="tab"
                aria-selected={tabActiva === opcion.id}
                onClick={() => {
                  setTab(opcion.id);
                  limpiarFiltros();
                }}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors ${
                  tabActiva === opcion.id
                    ? "border-[#805039] bg-[#805039] text-white"
                    : "border-[#CBB69E] text-[#805039] hover:bg-[#F0E5D5]"
                }`}
              >

                {opcion.texto}

                <span
                  className={`rounded-full px-2 text-xs leading-5 font-bold ${
                    tabActiva === opcion.id
                      ? "bg-white/25"
                      : "bg-[#EBDDC5]"
                  }`}
                >
                  {opcion.id === "mias" && !usuario
                    ? 0
                    : opcion.cantidad}
                </span>

              </button>

            ))}

          </div>

          {/* =========================
              FILTROS
          ========================= */}

          {!(tabActiva === "mias" && !usuario) && (

            <div className="flex flex-wrap items-center gap-3">

              {/* ICONO DE FILTROS */}

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

              {/* DIFICULTAD */}

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

              {/* PORCIONES */}

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

              {/* ORDENAR RECETAS */}

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

              {/* LIMPIAR FILTROS */}

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

          )}

        </div>

        {/* =========================
            BUSCADOR
        ========================= */}

        {!(tabActiva === "mias" && !usuario) && (

          <div className="mb-8 flex justify-end">

            <input
              type="search"
              placeholder="Buscar en esta lista..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              aria-label="Buscar receta"
              className="w-full rounded-full border border-[#D9C8B0] bg-[#FFFDF9] px-5 py-2.5 text-sm outline-none shadow-sm transition-all focus:border-[var(--foreground)] focus:shadow-md sm:w-72"
            />

          </div>

        )}

        {/* =========================
            MENSAJES
        ========================= */}

        {error && (

          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600"
          >
            {error}
          </div>

        )}

        {mensaje && (

          <div
            role="status"
            className="mb-6 rounded-xl bg-[#E5EBD8] px-5 py-3 text-sm text-[#52683D]"
          >
            {mensaje}
          </div>

        )}

        {/* =========================
            CONTENIDO
        ========================= */}

        {cargando || cargandoSesion ? (

          <div className="text-center py-16 px-8">

            <p className="titulo text-2xl text-[#8C6D53]">
              Cargando recetas...
            </p>

          </div>

        ) : tabActiva === "mias" && !usuario ? (

          <div className="text-center py-16 px-8 bg-[#FFFDF9] rounded-2xl border border-[#EFE6D5]">

            <p className="titulo text-2xl text-[var(--foreground)] mb-2">
              Inicia sesión para guardar tus recetas
            </p>

            <p className="text-[#6B5B4F]">
              Tus recetas se guardan en tu cuenta y solo tú
              decides si las compartes.
            </p>

            <button
              type="button"
              onClick={abrirAutenticacion}
              className="mt-5 cursor-pointer rounded-full bg-[#805039] px-6 py-3 font-medium text-white transition-colors hover:bg-[#603B2A]"
            >
              Iniciar sesión
            </button>

          </div>

        ) : resultados.length === 0 ? (

          <div className="text-center py-16 px-8 bg-[#FFFDF9] rounded-2xl border border-[#EFE6D5]">

            <p className="titulo text-2xl text-[var(--foreground)] mb-2">

              {hayFiltros
                ? "No encontramos recetas"
                : tabActiva === "mias"
                  ? "Aún no tienes recetas"
                  : "Todavía no hay recetas en la comunidad"}

            </p>

            <p className="text-[#6B5B4F]">

              {hayFiltros
                ? "Prueba con otra búsqueda o modifica los filtros seleccionados."
                : tabActiva === "mias"
                  ? "Añade la primera y empieza tu recetario personal."
                  : "Sé la primera persona en compartir una."}

            </p>

            {hayFiltros ? (

              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-5 cursor-pointer rounded-full bg-[#805039] px-5 py-3 font-medium text-white transition-all hover:opacity-90"
              >
                Limpiar filtros
              </button>

            ) : (

              <button
                type="button"
                onClick={nuevaReceta}
                className="mt-5 cursor-pointer rounded-full bg-[#805039] px-5 py-3 font-medium text-white transition-all hover:opacity-90"
              >
                Añadir receta
              </button>

            )}

          </div>

        ) : (

          /* =========================
              TARJETAS DE RECETAS
          ========================= */

          <div className="relative z-0 isolate grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">

            {resultados.map((r) => {

              const esFavorito = favoritos.includes(
                String(r.id_receta)
              );

              return (

                <div
                  key={r.id_receta}
                  className="relative isolate flex min-w-0 flex-col [&>*:last-child]:flex-1"
                >

                  {/* =========================
                      BOTÓN RÁPIDO DE FAVORITOS
                  ========================= */}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      toggleFavorito(r.id_receta);
                    }}
                    disabled={
                      cargandoFavoritos ||
                      procesandoFavorito !== null
                    }
                    title={
                      esFavorito
                        ? "Quitar de favoritos"
                        : "Guardar en favoritos"
                    }
                    aria-label={
                      esFavorito
                        ? "Quitar de favoritos"
                        : "Guardar en favoritos"
                    }
                    aria-pressed={esFavorito}
                    className={`absolute right-4 top-4 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white shadow-sm transition-all duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-[#805039] disabled:cursor-wait disabled:opacity-60 ${
                      esFavorito
                        ? "text-[#C74740]"
                        : "text-[#805039]"
                    }`}
                  >

                    <svg
                      width="21"
                      height="21"
                      viewBox="0 0 24 24"
                      fill={
                        esFavorito
                          ? "currentColor"
                          : "none"
                      }
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>

                  </button>

                  {/* TARJETA ORIGINAL */}

                  <TarjetaRecetaUsuario
                    receta={r}
                    nombreCategoria={nombreCategoria(r)}
                    esMia={r.id_usuario === idUsuario}
                    procesando={procesandoId === r.id_receta}
                    onVer={setRecetaDetalle}
                    onEditar={editarReceta}
                    onEliminar={borrarReceta}
                    onCambiarVisibilidad={alternarVisibilidad}
                  />

                </div>

              );
            })}

          </div>

        )}

      </main>

      {/* =========================
          FORMULARIO DE RECETA
      ========================= */}

      <FormularioReceta
        abierto={formularioAbierto}
        cerrar={cerrarFormulario}
        categorias={categorias}
        receta={recetaEditando}
        modoAdmin={modoAdminForm}
        onGuardada={recetaGuardada}
      />

      {/* =========================
          DETALLE DE RECETA
      ========================= */}

      {recetaDetalle && (
        <DetalleReceta
          receta={recetaDetalle}
          cerrado={() => setRecetaDetalle(null)}
          cerrar={() => setRecetaDetalle(null)}
          nombreCategoria={nombreCategoria(recetaDetalle)}
          esMia={recetaDetalle.id_usuario === idUsuario}
          soyAdmin={soyAdmin}
          onEliminar={borrarRecetaDeDetalle}
        />
      )}

    </div>
  );
}