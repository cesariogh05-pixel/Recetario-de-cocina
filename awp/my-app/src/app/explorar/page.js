"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Fraunces, DM_Sans } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["600", "700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });

const CATEGORIAS = ["Todas", "Desayunos", "Comidas", "Postres", "Bebidas"];

const RECETAS = [
  { id: 1, nombre: "Chilaquiles verdes", categoria: "Desayunos", tiempo: 25, porciones: 2, dificultad: "Fácil", emoji: "-", descripcion: "Totopos bañados en salsa verde con crema, queso y cebolla." },
  { id: 2, nombre: "Huevos a la mexicana", categoria: "Desayunos", tiempo: 15, porciones: 2, dificultad: "Fácil", emoji: "-", descripcion: "Huevo revuelto con jitomate, cebolla y chile serrano." },
  { id: 3, nombre: "Pozole rojo", categoria: "Comidas", tiempo: 120, porciones: 6, dificultad: "Media", emoji: "-", descripcion: "Caldo de maíz cacahuazintle con carne y chiles guajillo." },
  { id: 4, nombre: "Pollo en mole", categoria: "Comidas", tiempo: 90, porciones: 4, dificultad: "Media", emoji: "-", descripcion: "Pollo cocido en un mole espeso, dulce y ligeramente picante." },
  { id: 5, nombre: "Sopa de tortilla", categoria: "Comidas", tiempo: 40, porciones: 4, dificultad: "Fácil", emoji: "-", descripcion: "Caldo de jitomate con tiras de tortilla, aguacate y queso." },
  { id: 6, nombre: "Arroz con leche", categoria: "Postres", tiempo: 50, porciones: 6, dificultad: "Fácil", emoji: "-", descripcion: "Cremoso, con canela y un toque de vainilla." },
  { id: 7, nombre: "Flan casero", categoria: "Postres", tiempo: 70, porciones: 8, dificultad: "Media", emoji: "-", descripcion: "Flan suave con caramelo dorado, clásico de la abuela." },
  { id: 8, nombre: "Agua de jamaica", categoria: "Bebidas", tiempo: 15, porciones: 6, dificultad: "Fácil", emoji: "-", descripcion: "Refrescante, ácida y perfecta para el calor." },
  { id: 9, nombre: "Chocolate caliente", categoria: "Bebidas", tiempo: 10, porciones: 2, dificultad: "Fácil", emoji: "-", descripcion: "Chocolate de mesa con leche, canela y espuma." },
];

const STORAGE_KEY = "misabor-favoritos";

export default function Explorar() {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [orden, setOrden] = useState("nombre");
  const [favoritos, setFavoritos] = useState([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const guardados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(guardados)) setFavoritos(guardados);
    } catch {}
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos));
    } catch {}
  }, [favoritos, listo]);

  const toggleFavorito = (id) =>
    setFavoritos((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = RECETAS.filter(
      (r) =>
        (categoria === "Todas" || r.categoria === categoria) &&
        (q === "" ||
          r.nombre.toLowerCase().includes(q) ||
          r.descripcion.toLowerCase().includes(q))
    );
    return [...lista].sort((a, b) =>
      orden === "tiempo" ? a.tiempo - b.tiempo : a.nombre.localeCompare(b.nombre)
    );
  }, [busqueda, categoria, orden]);

  return (
    <div className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col ${dmSans.className}`}>
        
      <section className="py-16 px-8 text-center bg-gradient-to-b from-[#F9F2DF] to-[var(--background)] border-b border-[#EFE6D5]">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <p className="text-xs font-bold tracking-widest text-[#8C6D53] uppercase">EXPLORAR RECETAS</p>
          <h1 className={`text-5xl leading-tight text-[var(--foreground)] m-0 ${fraunces.className}`}>
            Descubre tu próximo
            <br />
            plato favorito
          </h1>
          <p className="text-lg text-[#6B5B4F] mb-4">
            Busca por nombre o filtra por categoría y encuentra algo rico para hoy.
          </p>

          <div className="w-full max-w-md">
            <input
              type="search"
              placeholder="Buscar receta… (ej. pozole)"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar receta"
              className="w-full px-5 py-3.5 rounded-full border border-[#D9C8B0] bg-[#FFFDF9] text-[var(--foreground)] text-base outline-none shadow-sm focus:border-[var(--foreground)] focus:shadow-md transition-all"
            />
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto py-12 px-8 w-full flex-1">
        <div className="flex justify-between items-center flex-wrap gap-6 mb-6">
          <div className="flex gap-3 flex-wrap">
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                className={`px-5 py-2 rounded-full border border-[#D9C8B0] bg-[#FFFDF9] text-[#6B5B4F] font-medium cursor-pointer transition-all hover:border-[var(--foreground)] hover:text-[var(--foreground)] ${
                  categoria === c ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]" : ""
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 text-sm text-[#6B5B4F] font-medium">
            Ordenar por
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[#D9C8B0] bg-[#FFFDF9] text-[var(--foreground)] font-sans cursor-pointer outline-none"
            >
              <option value="nombre">Nombre (A-Z)</option>
              <option value="tiempo">Menor tiempo</option>
            </select>
          </label>
        </div>

        <p className="text-sm text-[#8C6D53] mb-8 font-medium">
          {resultados.length} {resultados.length === 1 ? "receta" : "recetas"}
        </p>

        {resultados.length === 0 ? (
          <div className="text-center py-16 px-8 bg-[#FFFDF9] rounded-2xl border border-[#EFE6D5]">
            <p className={`text-2xl text-[var(--foreground)] mb-2 ${fraunces.className}`}>
              No encontramos recetas
            </p>
            <p className="text-[#6B5B4F]">Prueba con otra palabra o cambia la categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {resultados.map((r) => {
              const esFav = favoritos.includes(r.id);
              return (
                <article key={r.id} className="bg-[#FFFDF9] rounded-2xl overflow-hidden border border-[#EFE6D5] shadow-sm flex flex-col transition-all hover:-translate-y-1 hover:shadow-md">
                  <div className="bg-gradient-to-br from-[#F4EADB] to-[#EFE6D5] h-40 flex items-center justify-center relative">
                    <span className="text-6xl">{r.emoji}</span>
                    <button
                      className={`absolute top-4 right-4 bg-[#FFFDF9] border-none w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-xl text-[#8C6D53] shadow transition-transform hover:scale-110 ${
                        esFav ? "text-[#E63946]" : ""
                      }`}
                      onClick={() => toggleFavorito(r.id)}
                      aria-label={esFav ? "Quitar de favoritos" : "Agregar a favoritos"}
                      aria-pressed={esFav}
                    >
                      {esFav ? "♥" : "♡"}
                    </button>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <span className="text-xs font-bold tracking-wider uppercase text-[#8C6D53] mb-2">{r.categoria}</span>
                    <h3 className={`text-2xl text-[var(--foreground)] mb-2 ${fraunces.className}`}>
                      {r.nombre}
                    </h3>
                    <p className="text-sm text-[#6B5B4F] mb-5 flex-1 leading-relaxed">{r.descripcion}</p>

                    <div className="flex gap-4 text-xs text-[#6B5B4F] mb-5 pt-3 border-t border-[#F4EADB]">
                      <span>⏱ {r.tiempo} min</span>
                      <span>🍽 {r.porciones} porc.</span>
                      <span>{r.dificultad}</span>
                    </div>

                    <Link href={`/receta?id=${r.id}`} className="block text-center bg-[var(--foreground)] text-[var(--background)] py-3 rounded-lg no-underline font-semibold transition-opacity hover:opacity-95">
                      Ver receta
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}