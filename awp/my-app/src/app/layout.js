"use client";

import { useEffect, useState, useRef } from "react";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AuthModal from "./componentes/AuthModal";
import { createClient } from "./base/supabase";
import RegistrarSW from "./componentes/RegistrarSW";

const titulos = Fraunces({
  variable: "--font-titulos",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const cuerpo = DM_Sans({
  variable: "--font-cuerpo",
  subsets: ["latin"],
});


export default function RootLayout({ children }) {

  // =========================
  // ESTADOS
  // =========================

  const [numFavoritos, setNumFavoritos] = useState(0);
  const [modalAbierto, setModalAbierto] = useState(false);

  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorSesion, setErrorSesion] = useState("");
  const [errorFoto, setErrorFoto] = useState(false);

  const [supabase] = useState(() => createClient());

  const menuRef = useRef(null);
  const pathname = usePathname();


  // =========================
  // CONTADOR DE FAVORITOS
  // =========================

  useEffect(() => {
    let activo = true;
    let solicitud = 0;

    const id = usuario?.id;

    setNumFavoritos(0);

    // Si no hay sesión, el contador permanece en cero
    if (!id) return;

    const actualizarContador = async () => {
      const actual = ++solicitud;

      try {
        const { count, error } = await supabase
          .from("favoritos")
          .select("id_favorito", {
            count: "exact",
            head: true,
          })
          .eq("id_usuario", id);

        if (error) throw error;

        if (activo && actual === solicitud) {
          setNumFavoritos(count ?? 0);
        }

      } catch (error) {
        console.error(
          "Error al consultar favoritos:",
          error.message
        );
      }
    };

    // Cargar el contador al iniciar sesión
    actualizarContador();

    // Actualizar cuando se agrega o elimina un favorito
    window.addEventListener(
      "misabor:favoritos-cambio",
      actualizarContador
    );

    // Actualizar al regresar a la aplicación
    window.addEventListener(
      "focus",
      actualizarContador
    );

    return () => {
      activo = false;

      window.removeEventListener(
        "misabor:favoritos-cambio",
        actualizarContador
      );

      window.removeEventListener(
        "focus",
        actualizarContador
      );
    };

  }, [usuario?.id, supabase]);

    // =========================
  // ABRIR MODAL DE AUTENTICACIÓN
  // DESDE CUALQUIER PÁGINA
  // =========================

  useEffect(() => {

    const abrirAutenticacion = () => {
      setMenuAbierto(false);
      setModalAbierto(true);
    };

    window.addEventListener(
      "misabor:abrir-auth",
      abrirAutenticacion
    );

    return () => {
      window.removeEventListener(
        "misabor:abrir-auth",
        abrirAutenticacion
      );
    };

  }, []);

  // =========================
  // DETECTAR SESIÓN ACTIVA
  // =========================

  useEffect(() => {

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, session) => {

      setUsuario(session?.user ?? null);
      setCargandoSesion(false);

      if (!session) {
        setPerfil(null);
        setMenuAbierto(false);
      }

    });

    return () => {
      subscription.unsubscribe();
    };

  }, [supabase]);

  // =========================
  // OBTENER PERFIL DEL USUARIO
  // =========================

const idUsuario = usuario?.id;

useEffect(() => {
  let activo = true;
  let solicitud = 0;

  setPerfil(null);
  setErrorFoto(false);

  if (!idUsuario) return;

  const obtenerPerfil = async () => {
    const actual = ++solicitud;

    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id_usuario, nombre, foto")
        .eq("id_usuario", idUsuario)
        .single();

      if (error) throw error;

      if (activo && actual === solicitud) {
        setPerfil(data);
        setErrorFoto(false);
      }
    } catch (error) {
      console.error(
        "Error al obtener el perfil:",
        error.message
      );
    }
  };

  obtenerPerfil();

  window.addEventListener(
    "perfil-actualizado",
    obtenerPerfil
  );

  return () => {
    activo = false;

    window.removeEventListener(
      "perfil-actualizado",
      obtenerPerfil
    );
  };
}, [idUsuario, supabase]);

  // =========================
  // CERRAR MENÚ AL HACER CLIC FUERA
  // =========================

  useEffect(() => {

    if (!menuAbierto) return;

    const manejarClickFuera = (e) => {

      if (
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setMenuAbierto(false);
      }

    };

    const manejarEscape = (e) => {

      if (e.key === "Escape") {
        setMenuAbierto(false);
      }

    };

    document.addEventListener("mousedown", manejarClickFuera);
    document.addEventListener("keydown", manejarEscape);

    return () => {
      document.removeEventListener("mousedown", manejarClickFuera);
      document.removeEventListener("keydown", manejarEscape);
    };

  }, [menuAbierto]);

  // Cerrar menú al cambiar de página

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  // =========================
  // CERRAR SESIÓN
  // =========================

  const cerrarSesion = async () => {

    if (cerrandoSesion) return;

    setCerrandoSesion(true);
    setErrorSesion("");

    try {

      const { error } = await supabase.auth.signOut({
        scope: "local",
      });

      if (error) throw error;

      setUsuario(null);
      setPerfil(null);
      setNumFavoritos(0);
      setMenuAbierto(false);
      setModalAbierto(false);

    } catch (error) {

      console.error(
        "Error al cerrar sesión:",
        error.message
      );

      setErrorSesion(
        "No se pudo cerrar sesión. Intenta nuevamente."
      );

    } finally {

      setCerrandoSesion(false);

    }

  };

  // =========================
  // DATOS DEL PERFIL
  // =========================

  const nombreUsuario =
    perfil?.nombre?.trim() ||
    usuario?.user_metadata?.nombre?.trim() ||
    usuario?.email?.split("@")[0] ||
    "Usuario";

  const inicialUsuario =
    nombreUsuario.charAt(0).toUpperCase();

  const fotoUsuario =
    perfil?.foto?.trim() || null;

  // =========================
  // ENLACES DE NAVEGACIÓN
  // =========================

  const enlaces = [
    {
      href: "/",
      texto: "Inicio",
    },
    {
      href: "/explorar",
      texto: "Explorar",
    },
    {
      href: "/favoritos",
      texto: "Favoritos",
      contador: numFavoritos,
    },
  ];

  // =========================
  // AVATAR DEL USUARIO
  // =========================

  const avatarUsuario = (
    fotoUsuario && !errorFoto ? (

      <img
        src={fotoUsuario}
        alt={`Foto de ${nombreUsuario}`}
        onError={() => setErrorFoto(true)}
        className="h-full w-full rounded-full object-cover"
      />

    ) : (

      <span className="titulo text-lg font-bold text-white">
        {inicialUsuario}
      </span>

    )
  );

  return (
    <html
      lang="es"
      className={`${titulos.variable} ${cuerpo.variable} h-full antialiased`}
  >

      <body className="min-h-full flex flex-col">
       <RegistrarSW />
        {/* =========================
            BARRA DE NAVEGACIÓN
        ========================= */}

        <header className="sticky top-0 z-50 border-b border-[#E5DAC3] bg-[#FAF6EA] shadow-sm">

          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-10 py-4">

            {/* LOGOTIPO */}

            <Link href="/" className="flex items-center gap-3">

              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white">

                <Image
                  src="/logonuevo.png"
                  alt="Mi Sabor"
                  width={300}
                  height={300}
                  className="h-full w-full object-contain"
                  priority
                />

              </div>

              <span className="titulo text-2xl font-bold text-[#6B4A28]">
                Mi Sabor
              </span>

            </Link>

            {/* MENÚ DE NAVEGACIÓN */}

            <nav className="flex flex-wrap items-center gap-1 text-sm font-medium">

              {enlaces.map((e) => (

                <Link
                  key={e.href}
                  href={e.href}
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-[#6B4A28] transition-colors hover:bg-[#EBDDC5]"
                >

                  {e.texto}

                  {e.contador !== undefined && (

                    <span className="rounded-full bg-[#EBDDC5] px-2 text-xs leading-5 font-bold">
                      {e.contador}
                    </span>

                  )}

                </Link>

              ))}

              {/* =========================
                  AUTENTICACIÓN
              ========================= */}

              {cargandoSesion ? (

                /* CARGANDO SESIÓN */

                <div
                  aria-label="Cargando sesión"
                  className="ml-2 h-10 w-10 animate-pulse rounded-full bg-[#EBDDC5]"
                />

              ) : !usuario ? (

                /* BOTÓN DE INICIAR SESIÓN */

                <button
                  type="button"
                  onClick={() => setModalAbierto(true)}
                  className="ml-2 flex items-center justify-center gap-2 rounded-full bg-[#805039] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#603B2A] cursor-pointer"
                >

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
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
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                  </svg>

                  Iniciar sesión

                </button>

              ) : (

                /* PERFIL DEL USUARIO */

                <div
                  ref={menuRef}
                  className="relative ml-2"
                >

                  {/* BOTÓN DEL AVATAR */}

                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(!menuAbierto);
                      setErrorSesion("");
                    }}
                    aria-label="Abrir menú de usuario"
                    aria-expanded={menuAbierto}
                    aria-controls="menu-usuario"
                    className="flex items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-[#EBDDC5] cursor-pointer"
                  >

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#805039]">

                      {avatarUsuario}

                    </div>

                    {/* FLECHA */}

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#805039"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`transition-transform duration-200 ${
                        menuAbierto ? "rotate-180" : ""
                      }`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>

                  </button>

                  {/* =========================
                      MENÚ DESPLEGABLE
                  ========================= */}

                  {menuAbierto && (

                    <div
                      id="menu-usuario"
                      className="absolute right-0 top-full z-50 mt-3 w-[min(270px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E5DAC3] bg-[#FFFDF8] shadow-lg"
                    >

                      {/* INFORMACIÓN DEL USUARIO */}

                      <div className="flex items-center gap-3 border-b border-[#E5DAC3] p-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#805039]">

                          {avatarUsuario}

                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="titulo truncate text-lg font-bold text-[#603B2A]">
                            {nombreUsuario}
                          </p>

                          <p className="truncate text-xs text-[#8C6D53]">
                            {usuario.email}
                          </p>

                        </div>

                      </div>

                      {/* OPCIONES DEL MENÚ */}

                      <div className="p-2">

                        {/* MI PERFIL - PRÓXIMAMENTE */}

{/* MI PERFIL */}

<Link
  href="/perfil"
  onClick={() => setMenuAbierto(false)}
  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#603B2A] transition-colors hover:bg-[#F1E8D9]"
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
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
  </svg>

  Mi perfil

</Link>
{/* MIS RECETAS */}

                        <Link
                          href="/recetas"
                          onClick={() => setMenuAbierto(false)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#603B2A] transition-colors hover:bg-[#F1E8D9]"
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
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>

                          Mis recetas

                        </Link>

                        {/* MIS FAVORITOS */}

                        <Link
                          href="/favoritos"
                          onClick={() => setMenuAbierto(false)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#603B2A] transition-colors hover:bg-[#F1E8D9]"
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
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
                          </svg>

                          Mis favoritos

                        </Link>

                      </div>

                      {/* CERRAR SESIÓN */}

                      <div className="border-t border-[#E5DAC3] p-2">

                        <button
                          type="button"
                          onClick={cerrarSesion}
                          disabled={cerrandoSesion}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#A34737] transition-colors hover:bg-[#FAECE7] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <path d="M10 17l5-5-5-5" />
                            <path d="M15 12H3" />
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                          </svg>

                          {cerrandoSesion
                            ? "Cerrando sesión..."
                            : "Cerrar sesión"}

                        </button>

                        {errorSesion && (

                          <p
                            role="alert"
                            className="px-3 pb-2 text-xs text-red-700"
                          >
                            {errorSesion}
                          </p>

                        )}

                      </div>

                    </div>

                  )}

                </div>

              )}

            </nav>

          </div>

        </header>

        {/* =========================
            CONTENIDO DE LAS PÁGINAS
        ========================= */}

        <div className="flex flex-1 flex-col">

          {children}

        </div>

        {/* =========================
            PIE DE PÁGINA
        ========================= */}

        <footer className="border-t border-[#E5DAC3] py-8 text-center text-sm text-[#8A6238]">

          <p className="titulo text-lg font-bold">

            Mi Sabor

          </p>

          <p>

            Hecho con cariño, desde 2026

          </p>

        </footer>

        {/* VENTANA DE AUTENTICACIÓN */}

        <AuthModal
          abierto={modalAbierto}
          cerrar={() => setModalAbierto(false)}
        />

      </body>

    </html>
  );
}