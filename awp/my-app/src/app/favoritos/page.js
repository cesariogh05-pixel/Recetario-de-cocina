
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const STORAGE_KEY = "misabor-favoritos";

const RECETAS = [];

const CATEGORIAS = [
  {
    nombre: "Todas",
    imagen: "/categorias/Todas.png",
    color: "#F6DFCE",
  },
  {
    nombre: "Desayunos",
    imagen: "/categorias/desayunos.png",
    color: "#DFEBCB",
  },
  {
    nombre: "Comidas",
    imagen: "/categorias/comidas.png",
    color: "#FFE8B0",
  },
  {
    nombre: "Postres",
    imagen: "/categorias/postres.png",
    color: "#EEDFF0",
  },
  {
    nombre: "Bebidas",
    imagen: "/categorias/bebidas.png",
    color: "#D8EDF0",
  },
];

export default function Favoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const [listo, setListo] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [orden, setOrden] = useState("nombre");

  useEffect(() => {
    try {
      const datos = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (Array.isArray(datos)) {
        setFavoritos(datos);
      }
    } catch (error) {
      console.error("Error al leer favoritos:", error);
    }

    setListo(true);
  }, []);

  const guardadas = useMemo(() => {
    return RECETAS.filter((r) => favoritos.includes(r.id));
  }, [favoritos]);

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const lista = guardadas.filter((r) => {
      const coincideCategoria =
        categoria === "Todas" || r.categoria === categoria;

      const coincideBusqueda =
        r.nombre.toLowerCase().includes(texto) ||
        r.descripcion.toLowerCase().includes(texto) ||
        r.categoria.toLowerCase().includes(texto);

      return coincideCategoria && coincideBusqueda;
    });

    return [...lista].sort((a, b) => {
      if (orden === "tiempo") return a.tiempo - b.tiempo;
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }, [guardadas, busqueda, categoria, orden]);

  const quitarFavorito = (id) => {
    const nuevos = favoritos.filter((f) => f !== id);
    setFavoritos(nuevos);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nuevos)
      );
    } catch (error) {
      console.error("Error al guardar favoritos:", error);
    }
  };

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
          <div className="w-full max-w-[490px]">

            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#B16F45]">
              TUS RECETAS GUARDADAS
            </p>

            <h1 className="titulo mb-4 text-4xl leading-[1.15] text-[#75472E] md:text-[54px]">
              Un rincón para
              <br />
              tus favoritos ♡
            </h1>

            <p className="mb-6 max-w-[400px] text-base leading-relaxed text-[#6B5140]">
              Todas esas recetas que te encantaron,
              reunidas en un solo lugar.
            </p>

            {/* BUSCADOR */}
            <div className="flex w-full items-center gap-3 rounded-full border border-[#A78169] bg-[#FFFDF9] px-5 py-3 shadow-sm">
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#805039"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="7" />
                <path d="m16 16 5 5" />
              </svg>

              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar entre mis recetas guardadas..."
                aria-label="Buscar recetas guardadas"
                className="w-full min-w-0 bg-transparent text-sm text-[#593827] outline-none placeholder:text-[#927C6B]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          CATEGORÍAS
      ========================= */}
      <section className="border-b border-[#E9DFD0] py-9">
        <div className="mx-auto max-w-6xl px-6">

          <h2 className="titulo mb-7 text-3xl font-bold text-[#603B2A]">
            Explora tus categorías
          </h2>

          <div className="flex gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-5 md:overflow-visible">

            {CATEGORIAS.map((cat) => {
              const cantidad =
                cat.nombre === "Todas"
                  ? guardadas.length
                  : guardadas.filter(
                      (r) => r.categoria === cat.nombre
                    ).length;

              const activa = categoria === cat.nombre;

              return (
                <button
                  key={cat.nombre}
                  type="button"
                  onClick={() => setCategoria(cat.nombre)}
                  aria-pressed={activa}
                  className={`relative flex min-h-[145px] w-[175px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[20px] border-2 px-3 py-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md md:w-full ${
                    activa
                      ? "border-[#805039] shadow-sm"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: cat.color }}
                >
  
                  <div
                    className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.10]"
                    style={{
                      backgroundImage: "url('/fondonuevo.jpg')",
                    }}
                  />

                  <div className="relative z-10 mb-1 h-[65px] w-[75px]">
                    <Image
                      src={cat.imagen}
                      alt=""
                      fill
                      sizes="75px"
                      className="object-contain"
                    />
                  </div>

                  <span className="titulo relative z-10 text-lg font-bold text-[#603B2A]">
                    {cat.nombre}
                  </span>

                  <span className="relative z-10 mt-1 text-xs text-[#795A48]">
                    {cantidad} {cantidad === 1 ? "receta" : "recetas"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================
          RECETAS GUARDADAS
      ========================= */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10">

        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="titulo mb-2 text-3xl text-[#603B2A]">
              Mis recetas guardadas
            </h2>

            <p className="text-sm text-[#795A48]">
              {listo
                ? `Mostrando ${resultados.length} recetas`
                : "Cargando favoritos..."}
            </p>
          </div>

          <label className="flex items-center gap-3 text-sm text-[#603B2A]">
            Ordenar por
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="rounded-full border border-[#B99B85] bg-[#FFFDF9] px-4 py-2 outline-none"
            >
              <option value="nombre">Nombre (A-Z)</option>
              <option value="tiempo">Menor tiempo</option>
            </select>
          </label>
        </div>

        {!listo ? (
          <p className="py-16 text-center text-[#806B5A]">
            Cargando tus favoritos...
          </p>
        ) : guardadas.length === 0 ? (

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

          <div className="rounded-3xl bg-[#FFFDF9] px-6 py-16 text-center">
            <h3 className="titulo mb-3 text-2xl">
              No encontramos coincidencias
            </h3>

            <p className="text-[#806B5A]">
              Prueba con otra palabra o categoría.
            </p>
          </div>

        ) : (

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resultados.map((r) => (
              <article
                key={r.id}
                className="flex flex-col overflow-hidden rounded-[22px] border border-[#E9DFD0] bg-[#FFFDF9] shadow-sm"
              >
                <div className="relative h-[185px] bg-[#F4EADB]">
                  {r.imagen ? (
                    <Image
                      src={r.imagen}
                      alt={r.nombre}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl">
                      {r.emoji || "🍽️"}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => quitarFavorito(r.id)}
                    aria-label={`Quitar ${r.nombre} de favoritos`}
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl text-[#E85A55] shadow-md"
                  >
                    ♥
                  </button>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <span className="mb-1 text-xs font-bold uppercase tracking-wider text-[#B56A35]">
                    {r.categoria}
                  </span>

                  <h3 className="titulo mb-2 text-2xl text-[#44291E]">
                    {r.nombre}
                  </h3>

                  <p className="mb-5 flex-1 text-sm leading-relaxed text-[#765D4E]">
                    {r.descripcion}
                  </p>

                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EFE6D5] pt-4 text-xs text-[#805039]">
                    <span>◷ {r.tiempo} min</span>
                    <span>♧ {r.porciones} porc.</span>
                    <span>♧ {r.dificultad}</span>
                  </div>

                  <Link
                    href={`/receta?id=${r.id}`}
                    className="block rounded-full bg-[#805039] py-3 text-center text-sm font-semibold text-white hover:bg-[#603B2A]"
                  >
                    Ver receta
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}