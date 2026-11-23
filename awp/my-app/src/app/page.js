"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

import TarjetaReceta from "./componentes/tarjetaReceta";
import { createClient } from "./base/supabase";

import {
  obtenerRecetas,
  obtenerCategorias,
} from "./actions/recetasAction";

// =========================
// COLORES DE LAS CATEGORÍAS
// =========================

const COLORES_CATEGORIAS = {
  desayunos: "#DFEBCB",
  comidas: "#FFE8B0",
  postres: "#EEDFF0",
  bebidas: "#D8EDF0",
};

// =========================
// CONVERTIR TIEMPO A MINUTOS
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
    (horas ? Number(horas[1].replace(",", ".")) * 60 : 0) +
    (minutos ? Number(minutos[1].replace(",", ".")) : 0)
  );
}

// =========================
// COMPONENTE INICIO
// =========================

export default function Home() {

  const [supabase] = useState(() => createClient());

  // Estados de datos

  const [recetas, setRecetas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Estados de favoritos

  const [favoritos, setFavoritos] = useState([]);
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(null);
  const [errorFavoritos, setErrorFavoritos] = useState("");

  // Referencias de autenticación

  const usuarioRef = useRef(null);
  const ocupadoRef = useRef(false);
  const versionRef = useRef(0);

  // =========================
  // CARGAR RECETAS Y CATEGORÍAS
  // =========================

  useEffect(() => {

    let activo = true;

    async function cargarDatos() {

      try {

        setCargando(true);
        setError("");

        const [datosRecetas, datosCategorias] =
          await Promise.all([
            obtenerRecetas(),
            obtenerCategorias(),
          ]);

        if (activo) {

          setRecetas(datosRecetas || []);
          setCategorias(datosCategorias || []);

        }

      } catch (err) {

        console.error(
          "Error al cargar el inicio:",
          err
        );

        if (activo) {

          setError(
            "No se pudieron cargar las recetas. Intenta nuevamente."
          );

        }

      } finally {

        if (activo) {
          setCargando(false);
        }

      }

    }

    cargarDatos();

    return () => {
      activo = false;
    };

  }, []);

  // =========================
  // DETECTAR SESIÓN Y FAVORITOS
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
              "Error al cargar favoritos:",
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

  async function toggleFavorito(idReceta) {

    if (!listo || ocupadoRef.current) return;

    const usuario = usuarioRef.current;

    // Abrir modal si no tiene sesión

    if (!usuario) {

      window.dispatchEvent(
        new Event("misabor:abrir-auth")
      );

      return;

    }

    const version = versionRef.current;
    const clave = String(idReceta);
    const existe = favoritos.includes(clave);

    ocupadoRef.current = true;

    setGuardando(idReceta);
    setErrorFavoritos("");

    try {

      let consulta;

      if (existe) {

        // Eliminar favorito

        consulta = supabase
          .from("favoritos")
          .delete()
          .eq("id_usuario", usuario)
          .eq("id_receta", idReceta);

      } else {

        // Agregar favorito

        consulta = supabase
          .from("favoritos")
          .insert({
            id_usuario: usuario,
            id_receta: idReceta,
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

      // Actualizar contador del menú

      window.dispatchEvent(
        new Event("misabor:favoritos-cambio")
      );

    } catch (err) {

      console.error(
        "Error al modificar favorito:",
        err
      );

      if (version === versionRef.current) {

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
  // CANTIDAD POR CATEGORÍA
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
  // RECETAS PARA EMPEZAR
  // =========================

  const recetasDestacadas = useMemo(() => {

    const seleccionadas = [];
    const categoriasUsadas = new Set();

    // Seleccionar recetas de categorías diferentes

    for (const receta of recetas) {

      if (
        !categoriasUsadas.has(receta.id_categoria)
      ) {

        seleccionadas.push(receta);

        categoriasUsadas.add(
          receta.id_categoria
        );

      }

      if (seleccionadas.length === 3) break;

    }

    // Completar las tres tarjetas si es necesario

    if (seleccionadas.length < 3) {

      for (const receta of recetas) {

        const existe = seleccionadas.some(
          (r) => r.id_receta === receta.id_receta
        );

        if (!existe) {
          seleccionadas.push(receta);
        }

        if (seleccionadas.length === 3) break;

      }

    }

    return seleccionadas;

  }, [recetas]);

  // =========================
  // RECETAS RÁPIDAS
  // =========================

  const recetasRapidas = useMemo(() => {

    const idsDestacadas = new Set(
      recetasDestacadas.map(
        (r) => r.id_receta
      )
    );

    return recetas
      .filter((r) => {

        const minutos = convertirMinutos(r.tiempo);

        return (
          minutos > 0 &&
          minutos <= 30 &&
          !idsDestacadas.has(r.id_receta)
        );

      })
      .sort(
        (a, b) =>
          convertirMinutos(a.tiempo) -
          convertirMinutos(b.tiempo)
      )
      .slice(0, 3);

  }, [recetas, recetasDestacadas]);

  // =========================
  // INTERFAZ DE INICIO
  // =========================

  return (

    <main className="flex-1 bg-[#FAF6EA]">

      {/* =========================
          BANNER PRINCIPAL
      ========================= */}

      <section className="relative overflow-hidden">

        {/* IMAGEN DE FONDO */}

        <Image
          src="/fondonuevo.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-65"
          aria-hidden="true"
        />

        {/* DEGRADADO DE LA IMAGEN */}

        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF6EA] via-[#FAF6EA]/85 to-transparent md:via-[#FAF6EA]/50" />

        {/* CONTENIDO DEL BANNER */}

        <div className="relative mx-auto max-w-5xl px-5 py-20 md:py-32">

          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#C27A4A]">

            Recetas de casa

          </p>

          <h1 className="titulo max-w-2xl text-5xl font-bold leading-tight text-[#5A3322] md:text-6xl">

            Cocina con cariño, come con sabor

          </h1>

          <p className="mt-5 max-w-md text-lg leading-8 text-[#6F5A44]">

            Recetas caseras para compartir en la mesa de siempre.

          </p>

          <div className="mt-8 flex flex-wrap gap-3">

            <Link
              href="/explorar"
              className="rounded-full bg-[#7B4A32] px-6 py-3 font-medium text-[#FAF7F0] transition-colors hover:bg-[#5A3322]"
            >

              Explorar recetas

            </Link>

            <Link
              href="/favoritos"
              className="rounded-full border-2 border-[#7B4A32] px-6 py-3 font-medium text-[#7B4A32] transition-colors hover:bg-[#7B4A32] hover:text-[#FAF7F0]"
            >

              Mis favoritos

            </Link>

          </div>

        </div>

        {/* =========================
            EFECTO ONDULADO INFERIOR
        ========================= */}

        <div className="pointer-events-none absolute inset-x-0 bottom-[-1px] z-20">

          <svg
            viewBox="0 0 1440 30"
            preserveAspectRatio="none"
            className="block h-[35px] w-full"
            aria-hidden="true"
          >

            <path
              d="M0 17 C180 40 400 1 600 9 S820 31 1050 16 S1300 3 1440 15 V30 H0 Z"
              fill="#F3EBDA"
            />

          </svg>

        </div>

      </section>

      {/* =========================
          RECETAS PARA EMPEZAR
      ========================= */}

      <section className="relative z-0 isolate bg-[#F3EBDA] py-16">

        <div className="mx-auto max-w-6xl px-6">

          {/* ENCABEZADO */}

          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

            <div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#B56A35]">

                Inspiración para tu mesa

              </p>

              <h2 className="titulo text-3xl font-bold text-[#5A3322] md:text-4xl">

                Recetas para empezar

              </h2>

              <p className="mt-3 text-sm text-[#765D4E] md:text-base">

                Descubre algo delicioso para preparar hoy.

              </p>

            </div>

            <Link
              href="/explorar"
              className="flex items-center gap-2 text-sm font-semibold text-[#805039] hover:underline"
            >

              Ver todas

              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >

                <path d="M5 12h14" />

                <path d="m12 5 7 7-7 7" />

              </svg>

            </Link>

          </div>

          {/* ERROR DE FAVORITOS */}

          {errorFavoritos && (

            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600"
            >

              {errorFavoritos}

            </div>

          )}

          {/* ESTADOS DE CARGA */}

          {cargando ? (

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">

              {[1, 2, 3].map((item) => (

                <div
                  key={item}
                  className="animate-pulse overflow-hidden rounded-[22px] border border-[#E9DFD0] bg-[#FFFDF9]"
                >

                  <div className="h-[185px] bg-[#E8DCC8]" />

                  <div className="space-y-4 p-5">

                    <div className="h-3 w-24 rounded bg-[#E8DCC8]" />

                    <div className="h-6 w-3/4 rounded bg-[#E8DCC8]" />

                    <div className="h-4 w-full rounded bg-[#E8DCC8]" />

                    <div className="h-4 w-2/3 rounded bg-[#E8DCC8]" />

                    <div className="h-10 rounded-full bg-[#E8DCC8]" />

                  </div>

                </div>

              ))}

            </div>

          ) : error ? (

            <div className="rounded-2xl bg-[#FFFDF9] px-6 py-12 text-center">

              <p className="text-[#A34737]">

                {error}

              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 cursor-pointer rounded-full bg-[#805039] px-6 py-3 text-sm font-semibold text-white"
              >

                Volver a intentar

              </button>

            </div>

          ) : recetasDestacadas.length === 0 ? (

            <p className="py-10 text-center text-[#765D4E]">

              Próximamente encontrarás deliciosas recetas aquí.

            </p>

          ) : (

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">

              {recetasDestacadas.map((r) => (

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
                  deshabilitado={
                    !listo || guardando !== null
                  }
                  procesando={
                    guardando === r.id_receta
                  }
                />

              ))}

            </div>

          )}

        </div>

      </section>

      {/* =========================
          CATEGORÍAS
          SECCIÓN COMPACTA
      ========================= */}

      <section className="relative z-0 isolate py-10">

        <div className="mx-auto max-w-5xl px-6">

          {/* ENCABEZADO */}

          <div className="mb-6 text-center">

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#B56A35]">

              Un sabor para cada momento

            </p>

            <h2 className="titulo text-3xl font-bold text-[#5A3322]">

              ¿Qué se te antoja hoy?

            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm text-[#765D4E]">

              Encuentra la receta perfecta para cada momento del día.

            </p>

          </div>

          {/* TARJETAS DE CATEGORÍAS */}

          {cargando ? (

            <p className="text-center text-[#765D4E]">

              Cargando categorías...

            </p>

          ) : error ? (

            <p className="text-center text-[#765D4E]">

              Las categorías no están disponibles por ahora.

            </p>

          ) : (

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">

              {categorias.map((cat) => {

                const nombre = cat.nombre
                  .toLowerCase()
                  .trim();

                const color =
                  COLORES_CATEGORIAS[nombre] ||
                  "#F6DFCE";

                const cantidad =
                  conteos[cat.id_categoria] || 0;

                return (

                  <Link
                    key={cat.id_categoria}
                    href={`/explorar?categoria=${cat.id_categoria}`}
                    className="group relative flex min-h-[145px] flex-col items-center justify-center overflow-hidden rounded-[20px] border border-black/5 px-3 py-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                    style={{
                      backgroundColor: color,
                    }}
                  >

                    {/* FONDO DECORATIVO */}

                    <div
                      className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.10]"
                      style={{
                        backgroundImage:
                          "url('/fondonuevo.jpg')",
                      }}
                    />

                    {/* ILUSTRACIÓN */}

                    <div className="relative z-10 mb-2 h-[65px] w-[75px] md:h-[75px] md:w-[85px]">

                      {cat.imagenes && (

                        <img
                          src={cat.imagenes.trim()}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                        />

                      )}

                    </div>

                    {/* NOMBRE DE CATEGORÍA */}

                    <h3 className="titulo relative z-10 text-lg font-bold text-[#603B2A]">

                      {cat.nombre}

                    </h3>

                    {/* CANTIDAD DE RECETAS */}

                    <p className="relative z-10 mt-1 text-xs text-[#795A48]">

                      {cantidad}{" "}

                      {cantidad === 1
                        ? "receta"
                        : "recetas"}

                    </p>

                  </Link>

                );

              })}

            </div>

          )}

        </div>

      </section>

      {/* =========================
          RECETAS RÁPIDAS
      ========================= */}

      {!cargando &&
        !error &&
        recetasRapidas.length > 0 && (

        <section className="relative z-0 isolate border-y border-[#E9DFD0] bg-[#F3EBDA] py-16">

          <div className="mx-auto max-w-6xl px-6">

            {/* ENCABEZADO */}

            <div className="mb-8 flex flex-wrap items-end justify-between gap-5">

              <div>

                <div className="mb-3 flex items-center gap-2 text-[#B56A35]">

                  {/* ICONO DE RELOJ */}

                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >

                    <circle cx="12" cy="12" r="9" />

                    <path d="M12 7v5l3 2" />

                  </svg>

                  <span className="text-xs font-bold uppercase tracking-[0.18em]">

                    Sin complicaciones

                  </span>

                </div>

                <h2 className="titulo text-3xl font-bold text-[#5A3322] md:text-4xl">

                  Poco tiempo, mucho sabor

                </h2>

                <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#765D4E] md:text-base">

                  Recetas listas en 30 minutos o menos,
                  ideales para esos días en los que tienes
                  poco tiempo para cocinar.

                </p>

              </div>

              {/* ENLACE CON ORDEN DE MENOR TIEMPO */}

              <Link
                href="/explorar?orden=tiempo"
                className="flex items-center gap-2 text-sm font-semibold text-[#805039] hover:underline"
              >

                Explorar más

                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >

                  <path d="M5 12h14" />

                  <path d="m12 5 7 7-7 7" />

                </svg>

              </Link>

            </div>

            {/* TARJETAS DE RECETAS RÁPIDAS */}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">

              {recetasRapidas.map((r) => (

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
                  deshabilitado={
                    !listo || guardando !== null
                  }
                  procesando={
                    guardando === r.id_receta
                  }
                />

              ))}

            </div>

          </div>

        </section>

      )}

      {/* =========================
          INVITACIÓN A FAVORITOS
          ANCHO COMPLETO
      ========================= */}

      <section className="w-full">

        <div className="relative overflow-hidden bg-[#7B4A32] px-6 py-16 text-center text-[#FAF7F0] md:px-10 md:py-20">

          {/* FONDO DECORATIVO */}

          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.06]"
            style={{
              backgroundImage:
                "url('/fondonuevo.jpg')",
            }}
          />

          <div className="relative flex flex-col items-center">

            {/* ICONO DE RECETARIO */}

            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#F6DFA0]/40 bg-white/10">

              <svg
                width="42"
                height="42"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F6DFA0"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >

                <path d="M4 19V5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1 0-4h14" />

                <path d="M12.5 12.5 9 9a2.1 2.1 0 0 1 3.5-2.2A2.1 2.1 0 0 1 16 9Z" />

              </svg>

            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#F6DFA0]">

              Tus sabores favoritos

            </p>

            <h2 className="titulo max-w-2xl text-3xl font-bold leading-tight md:text-5xl">

              Tu propio recetario,
              a donde vayas

            </h2>

            <p className="mx-auto mt-5 max-w-lg leading-relaxed text-[#F0E3CC]">

              Guarda las recetas que más te gustan
              y crea tu propia colección de sabores.
              Encuentra fácilmente tus platillos
              favoritos cada vez que quieras cocinar.

            </p>

            <Link
              href="/favoritos"
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#F6DFA0] px-7 py-3.5 font-semibold text-[#3B2A1A] transition-colors hover:bg-[#FAF7F0]"
            >

              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >

                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />

              </svg>

              Mis recetas favoritas

            </Link>

          </div>

        </div>

      </section>

    </main>

  );

}