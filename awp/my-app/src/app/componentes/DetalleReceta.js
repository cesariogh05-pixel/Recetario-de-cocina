"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../base/supabase";
import { esAdmin } from "../base/admin";

function mostrarTiempo(tiempo) {
  const texto = String(tiempo ?? "").trim();

  if (!texto) return "No especificado";

  return /^\d+$/.test(texto) ? `${texto} min` : texto;
}

export default function DetalleReceta({
  receta,
  nombreCategoria = "Sin categoría",
  esMia = false,
  cerrar,
  onEliminar,
}) {
  const [supabase] = useState(() => createClient());
  const [soyAdmin, setSoyAdmin] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const dialogRef = useRef(null);
  const abierto = Boolean(receta);

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

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (abierto && !dialog.open) {
      dialog.showModal();
    } else if (!abierto && dialog.open) {
      dialog.close();
    }
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;

    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [abierto]);

  const manejarEliminar = async () => {
    if (!receta || !onEliminar || eliminando) return;

    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar "${receta.nombre}"?`
    );
    if (!confirmar) return;

    setEliminando(true);
    try {
      await onEliminar(receta);
    } finally {
      setEliminando(false);
    }
  };

  const publica = receta?.visibilidad === "publica";

  const listaConsejos = Array.isArray(receta?.consejos)
    ? receta.consejos
    : receta?.consejos
      ? [receta.consejos]
      : [];
  const ingredientesLista = Array.isArray(receta?.ingredientes)
    ? receta.ingredientes
    : [];
  const instruccionesLista = Array.isArray(receta?.instrucciones)
    ? receta.instrucciones
    : [];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="detalle-receta-titulo"
      onCancel={(e) => {
        e.preventDefault();
        if (!eliminando) cerrar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !eliminando) cerrar();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-[720px] max-h-[92dvh] overflow-y-auto rounded-[28px] bg-[#FFFDF8] p-0 text-[#603B2A] shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
    >
      {receta && (
        <div className="relative">
          <button
            type="button"
            onClick={cerrar}
            disabled={eliminando}
            aria-label="Cerrar ventana"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-[#805039] shadow-md transition-colors hover:bg-[#F0E5D5] disabled:opacity-50"
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

          {receta.imagen && (
            <div className="h-60 w-full bg-[#F4EADB]">
              <img
                src={receta.imagen}
                alt={receta.nombre}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="px-6 py-8 sm:px-9">
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B56A35]">
                {nombreCategoria}
              </span>

              {esMia && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    publica
                      ? "bg-[#E5EBD8] text-[#52683D]"
                      : "bg-[#EBDDC5] text-[#805039]"
                  }`}
                >
                  {publica ? "Pública" : "Privada"}
                </span>
              )}
            </div>

            <h2
              id="detalle-receta-titulo"
              className="titulo text-3xl font-bold text-[#44291E] sm:text-4xl"
            >
              {receta.nombre}
            </h2>

            {!esMia && receta.autor_nombre && (
              <p className="mt-1 text-sm text-[#8C6D53]">
                Por{" "}
                <span className="font-semibold text-[#805039]">
                  {receta.autor_nombre}
                </span>
              </p>
            )}

            {receta.descripcion && (
              <p className="mt-3 leading-relaxed text-[#765D4E]">
                {receta.descripcion}
              </p>
            )}

            <div className="mb-8 mt-5 flex flex-wrap gap-3 text-sm text-[#805039]">
              <span className="rounded-full bg-[#F3E8DA] px-4 py-2">
                ⏱ {mostrarTiempo(receta.tiempo)}
              </span>

              <span className="rounded-full bg-[#F3E8DA] px-4 py-2">
                🍽 {receta.porciones} porciones
              </span>

              <span className="rounded-full bg-[#F3E8DA] px-4 py-2">
                {receta.dificultad}
              </span>
            </div>

            <h3 className="titulo mb-3 text-2xl font-bold">
              Ingredientes
            </h3>

            <ul className="mb-8 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-[#603B2A]">
              {ingredientesLista.map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>

            <h3 className="titulo mb-3 text-2xl font-bold">
              Preparación
            </h3>

            <ol className="mb-8 flex list-decimal flex-col gap-3 pl-5 text-sm leading-relaxed text-[#603B2A]">
              {instruccionesLista.map((paso, i) => (
                <li key={i}>{paso}</li>
              ))}
            </ol>

            {listaConsejos.length > 0 && (
              <div className="mb-8 rounded-2xl bg-[#F8F1E4] p-4 text-sm text-[#603B2A]">
                <p className="titulo mb-1 font-bold">Consejos</p>
                {listaConsejos.map((consejo, i) => (
                  <p key={i} className="text-[#765D4E]">
                    {consejo}
                  </p>
                ))}
              </div>
            )}

            {soyAdmin && onEliminar && (
              <div className="mt-6 flex justify-end border-t border-[#E5DAC3] pt-5">
                <button
                  type="button"
                  onClick={manejarEliminar}
                  disabled={eliminando}
                  className="cursor-pointer rounded-full bg-[#A34737] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {eliminando ? "Eliminando..." : "Eliminar receta"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}