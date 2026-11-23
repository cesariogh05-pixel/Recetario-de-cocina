"use client";

import { useState } from "react";
import Link from "next/link";

function mostrarTiempo(tiempo) {
  const texto = String(tiempo ?? "").trim();

  if (!texto) return "No especificado";

  return /^\d+$/.test(texto)
    ? `${texto} min`
    : texto;
}

export default function TarjetaReceta({
  receta,
  nombreCategoria = "Sin categoría",
  esFavorito = false,
  onToggleFavorito,
  deshabilitado = false,
  procesando = false,
  soyAdmin = false,
  onEliminar,
  onEditar
}) {
  const [eliminando, setEliminando] = useState(false);

  const manejarEliminar = async () => {
    if (!onEliminar || eliminando) return;

    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar "${receta.nombre}" del catálogo?`
    );
    if (!confirmar) return;

    setEliminando(true);
    try {
      await onEliminar(receta);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-[22px] border border-[#E9DFD0] bg-[#FFFDF9] shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      {/* IMAGEN DE LA RECETA */}
      <div className="relative h-[185px] bg-[#F4EADB]">
        {receta.imagen ? (
          <img
            src={receta.imagen}
            alt={receta.nombre}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#8C6D53]">
            Imagen no disponible
          </div>
        )}

        {/* BOTONES ADMIN (SOLO ADMIN) */}
{soyAdmin && (
  <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
    

    {onEliminar && (
      <button
        type="button"
        disabled={eliminando || deshabilitado}
        onClick={manejarEliminar}
        aria-label={`Eliminar ${receta.nombre}`}
        title="Eliminar receta del catálogo"
        className="flex h-9 cursor-pointer items-center justify-center rounded-full bg-[#A34737] px-3 text-xs font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {eliminando ? "Borrando..." : "Eliminar"}
      </button>
    )}
  </div>
)}

        {/* BOTÓN DE FAVORITOS */}
        <button
          type="button"
          disabled={deshabilitado || procesando || eliminando}
          onClick={() => onToggleFavorito?.(receta.id_receta)}
          aria-pressed={esFavorito}
          aria-label={
            esFavorito
              ? `Quitar ${receta.nombre} de favoritos`
              : `Agregar ${receta.nombre} a favoritos`
          }
          title={
            esFavorito
              ? "Quitar de favoritos"
              : "Agregar a favoritos"
          }
          className={`absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-2xl shadow-md transition-transform hover:scale-110 disabled:cursor-wait disabled:opacity-60 ${
            esFavorito
              ? "text-[#E85A55]"
              : "text-[#8C6D53]"
          }`}
        >
          {procesando
            ? "…"
            : esFavorito
              ? "♥"
              : "♡"}
        </button>
      </div>

      {/* INFORMACIÓN DE LA RECETA */}
      <div className="flex flex-1 flex-col p-5">
        <span className="mb-1 text-xs font-bold uppercase tracking-wider text-[#B56A35]">
          {nombreCategoria}
        </span>

        <h3 className="titulo mb-2 text-2xl text-[#44291E]">
          {receta.nombre}
        </h3>

        <p className="mb-5 flex-1 text-sm leading-relaxed text-[#765D4E]">
          {receta.descripcion}
        </p>

        {/* CARACTERÍSTICAS */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EFE6D5] pt-4 text-xs text-[#805039]">
          <span className="flex items-center gap-1">
            ⏱ {mostrarTiempo(receta.tiempo)}
          </span>

          <span className="flex items-center gap-1">
            🍽 {receta.porciones ?? "—"} porc.
          </span>

          <span className="flex items-center gap-1">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M6 13.87A4 4 0 0 1 7.41 6.1a5 5 0 0 1 9.18 0A4 4 0 0 1 18 13.87V21H6Z" />
              <path d="M6 17h12" />
            </svg>
            {receta.dificultad}
          </span>
        </div>

        {/* BOTÓN VER RECETA */}
        <Link
          href={`/receta?id=${receta.id_receta}`}
          className="block rounded-full bg-[#805039] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#603B2A]"
        >
          Ver receta
        </Link>
      </div>
    </article>
  );
}