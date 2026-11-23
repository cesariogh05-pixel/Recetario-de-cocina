"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../base/supabase";

export default function AuthModal({ abierto, cerrar }) {

  // =========================
  // ESTADOS DEL FORMULARIO
  // =========================

  const [registro, setRegistro] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [esError, setEsError] = useState(false);

  const dialogRef = useRef(null);
  const procesandoRef = useRef(false);

  // =========================
  // ABRIR Y CERRAR LA VENTANA
  // =========================

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (abierto && !dialog.open) {
      dialog.showModal();
    } else if (!abierto && dialog.open) {
      dialog.close();
    }
  }, [abierto]);

  // Evitar desplazamiento de la página

  useEffect(() => {
    if (!abierto) return;

    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [abierto]);

  // =========================
  // CAMBIAR DE FORMULARIO
  // =========================

  const cambiarModo = (modo) => {
    if (procesandoRef.current) return;

    setRegistro(modo);
    setMensaje("");
    setEsError(false);
    setPassword("");
    setMostrarPassword(false);
  };

  // =========================
  // RESTABLECER Y CERRAR MODAL
  // =========================

  const cerrarModal = () => {
    setRegistro(false);
    setNombre("");
    setCorreo("");
    setPassword("");
    setMensaje("");
    setEsError(false);
    setMostrarPassword(false);

    cerrar();
  };

  // Evitar cerrar la ventana durante una solicitud

  const solicitarCierre = () => {
    if (procesandoRef.current) return;

    cerrarModal();
  };

  // =========================
  // AUTENTICACIÓN CON SUPABASE
  // =========================

  const manejarFormulario = async (e) => {
    e.preventDefault();

    // Evitar envíos duplicados

    if (procesandoRef.current) return;

    procesandoRef.current = true;

    setCargando(true);
    setMensaje("");
    setEsError(false);

    try {
      const supabase = createClient();

      if (registro) {

        // =========================
        // REGISTRAR USUARIO
        // =========================

        if (!nombre.trim()) {
          throw new Error("Escribe tu nombre.");
        }

        if (password.length < 6) {
          throw new Error(
            "La contraseña debe tener al menos 6 caracteres."
          );
        }

        const { data, error } = await supabase.auth.signUp({
          email: correo.trim(),
          password: password,
          options: {
            data: {
              nombre: nombre.trim(),
            },
          },
        });

        if (error) throw error;

        // Si Supabase inicia sesión automáticamente

        if (data.session) {

          cerrarModal();

        } else {

          // Si la confirmación por correo está activada

          setMensaje(
            "Revisa tu correo electrónico para confirmar tu cuenta."
          );

          setPassword("");
          setMostrarPassword(false);
        }

      } else {

        // =========================
        // INICIAR SESIÓN
        // =========================

        const { error } =
          await supabase.auth.signInWithPassword({
            email: correo.trim(),
            password: password,
          });

        if (error) throw error;

        cerrarModal();
      }

    } catch (error) {

      // =========================
      // MANEJO DE ERRORES
      // =========================

      setEsError(true);

      switch (error.code) {

        case "invalid_credentials":
          setMensaje("Correo o contraseña incorrectos.");
          break;

        case "user_already_exists":
          setMensaje("Este correo ya está registrado.");
          break;

        case "email_exists":
          setMensaje("Este correo ya está registrado.");
          break;

        case "email_not_confirmed":
          setMensaje("Primero debes confirmar tu correo electrónico.");
          break;

        case "weak_password":
          setMensaje(
            "La contraseña no cumple los requisitos de seguridad."
          );
          break;

        case "over_email_send_rate_limit":
        case "over_request_rate_limit":
          setMensaje(
            "Has realizado demasiados intentos. Espera un momento."
          );
          break;

        case "signup_disabled":
          setMensaje(
            "El registro de nuevos usuarios no está disponible."
          );
          break;

        case "unexpected_failure":
          setMensaje(
            "No se pudo completar la solicitud. Intenta nuevamente."
          );
          break;

        default:

          if (error.message === "Failed to fetch") {

            setMensaje(
              "No se pudo conectar con el servidor. Revisa tu conexión a internet."
            );

          } else {

            setMensaje(
              error.message ||
              "Ocurrió un error. Intenta nuevamente."
            );

          }
      }

    } finally {

      procesandoRef.current = false;
      setCargando(false);

    }
  };

  // =========================
  // DISEÑO DE LA VENTANA MODAL
  // =========================

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="auth-titulo"
      aria-busy={cargando}
      onCancel={(e) => {
        e.preventDefault();
        solicitarCierre();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          solicitarCierre();
        }
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-[440px] max-h-[90dvh] overflow-y-auto rounded-[28px] bg-[#FFFDF8] p-0 shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
    >

      <div className="relative px-7 py-8 sm:px-9">

        {/* BOTÓN CERRAR */}

        <button
          type="button"
          onClick={solicitarCierre}
          disabled={cargando}
          aria-label="Cerrar ventana"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#805039] transition-colors hover:bg-[#F0E5D5] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >

          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>

        </button>

        {/* LOGOTIPO Y ENCABEZADO */}

        <div className="mb-6 flex flex-col items-center text-center">

          <img
            src="/logonuevo.png"
            alt="Mi Sabor"
            className="mb-4 h-20 w-20 rounded-full object-contain"
          />

          <h2
            id="auth-titulo"
            className="titulo text-3xl font-bold text-[#603B2A]"
          >
            {registro
              ? "Crea tu cuenta"
              : "¡Bienvenido de nuevo!"}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-[#8C6D53]">

            {registro
              ? "Descubre nuevos sabores y guarda tus recetas favoritas."
              : "Inicia sesión y disfruta de tus recetas favoritas."}

          </p>

        </div>

        {/* SELECTOR DE LOGIN Y REGISTRO */}

        <div className="mb-6 flex rounded-full bg-[#F1E8D9] p-1">

          <button
            type="button"
            onClick={() => cambiarModo(false)}
            disabled={cargando}
            aria-pressed={!registro}
            className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed ${
              !registro
                ? "bg-[#805039] text-white shadow-sm"
                : "text-[#805039]"
            }`}
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            onClick={() => cambiarModo(true)}
            disabled={cargando}
            aria-pressed={registro}
            className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed ${
              registro
                ? "bg-[#805039] text-white shadow-sm"
                : "text-[#805039]"
            }`}
          >
            Registrarse
          </button>

        </div>

        {/* FORMULARIO */}

        <form
          onSubmit={manejarFormulario}
          className="flex flex-col gap-4"
        >

          {/* NOMBRE - SOLO EN REGISTRO */}

          {registro && (

            <div className="flex flex-col gap-2">

              <label
                htmlFor="auth-nombre"
                className="text-sm font-medium text-[#603B2A]"
              >
                Nombre completo
              </label>

              <input
                id="auth-nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Escribe tu nombre"
                disabled={cargando}
                required
                className="w-full rounded-xl border border-[#D9C8B0] bg-transparent px-4 py-3 text-sm text-[#603B2A] outline-none transition-all focus:border-[#805039] focus:ring-1 focus:ring-[#805039] disabled:opacity-60"
              />

            </div>

          )}

          {/* CORREO ELECTRÓNICO */}

          <div className="flex flex-col gap-2">

            <label
              htmlFor="auth-correo"
              className="text-sm font-medium text-[#603B2A]"
            >
              Correo electrónico
            </label>

            <input
              id="auth-correo"
              type="email"
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.com"
              disabled={cargando}
              required
              className="w-full rounded-xl border border-[#D9C8B0] bg-transparent px-4 py-3 text-sm text-[#603B2A] outline-none transition-all focus:border-[#805039] focus:ring-1 focus:ring-[#805039] disabled:opacity-60"
            />

          </div>

          {/* CONTRASEÑA */}

          <div className="flex flex-col gap-2">

            <label
              htmlFor="auth-password"
              className="text-sm font-medium text-[#603B2A]"
            >
              Contraseña
            </label>

            <div className="relative">

              <input
                id="auth-password"
                type={mostrarPassword ? "text" : "password"}
                autoComplete={
                  registro ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Escribe tu contraseña"
                minLength={registro ? 6 : undefined}
                disabled={cargando}
                required
                className="w-full rounded-xl border border-[#D9C8B0] bg-transparent py-3 pl-4 pr-12 text-sm text-[#603B2A] outline-none transition-all focus:border-[#805039] focus:ring-1 focus:ring-[#805039] disabled:opacity-60"
              />

              {/* MOSTRAR U OCULTAR CONTRASEÑA */}

              <button
                type="button"
                onClick={() =>
                  setMostrarPassword(!mostrarPassword)
                }
                disabled={cargando}
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#805039] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />

                  <circle cx="12" cy="12" r="3" />

                  {mostrarPassword && (
                    <path d="M3 3l18 18" />
                  )}

                </svg>

              </button>

            </div>

            {registro && (

              <p className="text-xs text-[#8C6D53]">
                Utiliza al menos 6 caracteres.
              </p>

            )}

          </div>

          {/* MENSAJES DEL FORMULARIO */}

          {mensaje && (

            <p
              role={esError ? "alert" : "status"}
              className={`rounded-xl p-3 text-center text-sm ${
                esError
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {mensaje}
            </p>

          )}

          {/* BOTÓN PRINCIPAL */}

          <button
            type="submit"
            disabled={cargando}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#805039] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#603B2A] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >

            {/* ANIMACIÓN DE CARGA */}

            {cargando && (

              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >

                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />

                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />

              </svg>

            )}

            {cargando
              ? registro
                ? "Creando cuenta..."
                : "Iniciando sesión..."
              : registro
                ? "Crear cuenta"
                : "Iniciar sesión"}

          </button>

        </form>

      </div>

    </dialog>
  );
}