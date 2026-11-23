"use client";

import { useState } from "react";
import Link from "next/link";

// =========================
// FORMATO DEL TIEMPO
// =========================

function mostrarTiempo(tiempo) {
  const texto = String(tiempo ?? "").trim();

  if (!texto) return "No especificado";

  return /^\d+$/.test(texto) ? `${texto} min` : texto;
}

// =========================
// ICONOS
// =========================

function Icono({ children, tamano = 16 }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

// =========================
// TARJETA DE RECETA DE USUARIO
// =========================

export default function TarjetaRecetaUsuario({
  receta,
  nombreCategoria = "Sin categoría",
  esMia = false,
  procesando = false,
  onVer,
  onEditar,
  onEliminar,
  onCambiarVisibilidad,
}) {
  const [confirmando, setConfirmando] = useState(false);

  const publica = receta.visibilidad === "publica";

  return (

    <article className="flex flex-col overflow-hidden rounded-[22px] border border-[#E9DFD0] bg-[#FFFDF9] shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">

      {/* =========================
          IMAGEN DE LA RECETA
      ========================= */}

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

        {/* ETIQUETA DE VISIBILIDAD (solo el autor la ve) */}

        {esMia && (

          <span
            className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-md ${
              publica
                ? "bg-[#E5EBD8] text-[#52683D]"
                : "bg-white text-[#805039]"
            }`}
          >

            {publica ? (

              <Icono tamano={14}>
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
              </Icono>

            ) : (

              <Icono tamano={14}>
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </Icono>

            )}

            {publica ? "Pública" : "Privada"}

          </span>

        )}

      </div>

      {/* =========================
          INFORMACIÓN DE LA RECETA
      ========================= */}

      <div className="flex flex-1 flex-col p-5">

        <span className="mb-1 text-xs font-bold uppercase tracking-wider text-[#B56A35]">
          {nombreCategoria}
        </span>

        <h3 className="titulo mb-2 text-2xl text-[#44291E]">
          {receta.nombre}
        </h3>

        <p className="mb-3 flex-1 text-sm leading-relaxed text-[#765D4E]">
          {receta.descripcion || "Sin descripción."}
        </p>

        {/* AUTOR (en la comunidad) */}

        {!esMia && receta.autor_nombre && (

          <p className="mb-3 text-xs text-[#8C6D53]">
            Por{" "}
            <span className="font-semibold text-[#805039]">
              {receta.autor_nombre}
            </span>
          </p>

        )}

        {/* CARACTERÍSTICAS */}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EFE6D5] pt-4 text-xs text-[#805039]">

          <span className="flex items-center gap-1">
            ⏱ {mostrarTiempo(receta.tiempo)}
          </span>

          <span className="flex items-center gap-1">
            🍽 {receta.porciones ?? "—"} porc.
          </span>

          <span className="flex items-center gap-1">

            <Icono>
              <path d="M6 13.87A4 4 0 0 1 7.41 6.1a5 5 0 0 1 9.18 0A4 4 0 0 1 18 13.87V21H6Z" />
              <path d="M6 17h12" />
            </Icono>

            {receta.dificultad}

          </span>

        </div>

        {/* BOTÓN VER RECETA */}

        <Link
          href={`/receta?id=${receta.id_receta}`}
          className="block w-full cursor-pointer rounded-full bg-[#805039] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#603B2A]"
        >
          Ver receta
        </Link>

        {/* =========================
            ACCIONES DEL AUTOR
        ========================= */}

        {esMia && (

          <div className="mt-3">

            {confirmando ? (

              <div
                role="alert"
                className="rounded-2xl bg-[#FAECE7] p-3 text-center"
              >

                <p className="mb-2 text-sm text-[#A34737]">
                  ¿Eliminar esta receta? No se puede deshacer.
                </p>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    disabled={procesando}
                    className="flex-1 cursor-pointer rounded-full border border-[#CBB69E] bg-white py-2 text-sm font-medium text-[#805039] transition-colors hover:bg-[#F0E5D5] disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => onEliminar?.(receta)}
                    disabled={procesando}
                    className="flex-1 cursor-pointer rounded-full bg-[#A34737] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#843725] disabled:cursor-wait disabled:opacity-60"
                  >
                    {procesando ? "Eliminando..." : "Eliminar"}
                  </button>

                </div>

              </div>

            ) : (

              <div className="flex items-center justify-between gap-1 text-sm">

                <button
                  type="button"
                  onClick={() => onEditar?.(receta)}
                  disabled={procesando}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[#805039] transition-colors hover:bg-[#F0E5D5] disabled:opacity-50"
                >

                  <Icono>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </Icono>

                  Editar

                </button>

                <button
                  type="button"
                  onClick={() => onCambiarVisibilidad?.(receta)}
                  disabled={procesando}
                  title={
                    publica
                      ? "Volver esta receta privada"
                      : "Compartir con la comunidad"
                  }
                  className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[#805039] transition-colors hover:bg-[#F0E5D5] disabled:cursor-wait disabled:opacity-50"
                >

                  {procesando ? "…" : publica ? "Hacer privada" : "Hacer pública"}

                </button>

                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  disabled={procesando}
                  aria-label={`Eliminar ${receta.nombre}`}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[#A34737] transition-colors hover:bg-[#FAECE7] disabled:opacity-50"
                >

                  <Icono>
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="m19 6-1 14H6L5 6" />
                  </Icono>

                  Eliminar

                </button>

              </div>

            )}

          </div>

        )}

      </div>

    </article>

  );
}
