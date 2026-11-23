"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../base/supabase";

const FORMATOS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const LIMITE = 2 * 1024 * 1024;

function obtenerRutaFoto(url) {
  if (!url) return null;

  try {
    const ruta = new URL(url).pathname;
    const prefijo = "/storage/v1/object/public/perfiles/";

    if (!ruta.startsWith(prefijo)) return null;

    return decodeURIComponent(ruta.slice(prefijo.length));
  } catch {
    return null;
  }
}

export default function PerfilPage() {
  const router = useRouter();
  const inputFoto = useRef(null);

  const [supabase] = useState(() => createClient());

  const [usuario, setUsuario] = useState(null);
  const [nombre, setNombre] = useState("");
  const [foto, setFoto] = useState(null);
  const [fechaRegistro, setFechaRegistro] = useState(null);

  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [eliminarFoto, setEliminarFoto] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // =========================
  // OBTENER PERFIL
  // =========================

  useEffect(() => {
    let activo = true;

    const cargarPerfil = async () => {
      try {
        const {
          data: { user },
          error: errorUsuario,
        } = await supabase.auth.getUser();

        if (!activo) return;

        if (errorUsuario || !user) {
          router.replace("/");
          return;
        }

        const { data, error } = await supabase
          .from("usuarios")
          .select("id_usuario, nombre, foto, fecha_registro")
          .eq("id_usuario", user.id)
          .single();

        if (error) throw error;

        if (activo) {
          setUsuario(user);
          setNombre(data.nombre || "");
          setFoto(data.foto);
          setFechaRegistro(data.fecha_registro);
        }
      } catch (error) {
        if (activo) {
          setError("No se pudo cargar tu perfil.");
          console.error(error);
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarPerfil();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") {
        router.replace("/");
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // =========================
  // VISTA PREVIA DE LA FOTO
  // =========================

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return;
    }

    const url = URL.createObjectURL(archivo);

    setVistaPrevia(url);

    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  // =========================
  // SELECCIONAR FOTOGRAFÍA
  // =========================

  const seleccionarFoto = (e) => {
    const seleccion = e.target.files?.[0];

    e.target.value = "";

    if (!seleccion) return;

    setError("");
    setMensaje("");

    if (!FORMATOS[seleccion.type]) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }

    if (seleccion.size > LIMITE) {
      setError("La imagen no puede superar los 2 MB.");
      return;
    }

    setArchivo(seleccion);
    setEliminarFoto(false);
  };

  // =========================
  // QUITAR FOTOGRAFÍA
  // =========================

  const quitarFoto = () => {
    setArchivo(null);
    setVistaPrevia(null);
    setEliminarFoto(true);
    setMensaje("");
    setError("");
  };

  // =========================
  // GUARDAR CAMBIOS
  // =========================

  const guardarCambios = async (e) => {
    e.preventDefault();

    if (!usuario || guardando) return;

    setError("");
    setMensaje("");

    if (!nombre.trim()) {
      setError("Introduce tu nombre.");
      return;
    }

    setGuardando(true);

    let nuevaFoto = foto;
    let nuevaRuta = null;
    let perfilActualizado = false;

    try {
      // Subir una fotografía nueva

      if (archivo) {
        const extension = FORMATOS[archivo.type];

        nuevaRuta =
          `${usuario.id}/avatar-${crypto.randomUUID()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
          .from("perfiles")
          .upload(nuevaRuta, archivo, {
            contentType: archivo.type,
            upsert: false,
          });

        if (errorSubida) {
          nuevaRuta = null;
          throw errorSubida;
        }

        const { data } = supabase.storage
          .from("perfiles")
          .getPublicUrl(nuevaRuta);

        nuevaFoto = data.publicUrl;
      }

      // Eliminar fotografía del perfil

      if (eliminarFoto) {
        nuevaFoto = null;
      }

      // Actualizar la tabla usuarios

      const { error: errorPerfil } = await supabase
        .from("usuarios")
        .update({
          nombre: nombre.trim(),
          foto: nuevaFoto,
        })
        .eq("id_usuario", usuario.id)
        .select("id_usuario")
        .single();

      if (errorPerfil) throw errorPerfil;

      perfilActualizado = true;

      // Eliminar la fotografía anterior
      // después de actualizar el perfil

      const rutaAnterior = obtenerRutaFoto(foto);

      if (
        foto !== nuevaFoto &&
        rutaAnterior?.startsWith(`${usuario.id}/`)
      ) {
        const { error: errorEliminar } = await supabase.storage
          .from("perfiles")
          .remove([rutaAnterior]);

        if (errorEliminar) {
          console.error(
            "No se pudo eliminar la foto anterior:",
            errorEliminar
          );
        }
      }

      setNombre(nombre.trim());
      setFoto(nuevaFoto);
      setArchivo(null);
      setVistaPrevia(null);
      setEliminarFoto(false);

      // Actualizar el avatar de la barra de navegación

      window.dispatchEvent(
        new Event("perfil-actualizado")
      );

      setMensaje("Tu perfil se actualizó correctamente.");

    } catch (error) {

      console.error(error);

      // Eliminar la imagen nueva si falló el guardado

      if (nuevaRuta && !perfilActualizado) {
        await supabase.storage
          .from("perfiles")
          .remove([nuevaRuta]);
      }

      setError(
        "No se pudieron guardar los cambios. Intenta nuevamente."
      );

    } finally {
      setGuardando(false);
    }
  };

  // =========================
  // DATOS VISUALES
  // =========================

  const inicial =
    nombre.trim().charAt(0).toUpperCase() || "U";

  const imagenActual = eliminarFoto
    ? null
    : vistaPrevia || foto;

  const fechaFormateada = fechaRegistro
    ? new Date(fechaRegistro).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "No disponible";

  // =========================
  // PANTALLA DE CARGA
  // =========================

  if (cargando) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#F8F4E8]">

        <p className="text-[#805039]">
          Cargando tu perfil...
        </p>

      </main>
    );
  }

  // =========================
  // USUARIO SIN SESIÓN
  // =========================

  if (!usuario) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#F8F4E8]">

        <p className="text-[#805039]">
          {error || "Necesitas iniciar sesión."}
        </p>

        <Link
          href="/"
          className="underline text-[#805039]"
        >
          Volver al inicio
        </Link>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F4E8] text-[#603B2A]">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <section className="relative isolate overflow-hidden border-b border-[#E5DAC3]">

        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-10"
          style={{
            backgroundImage: "url('/fondonuevo.jpg')",
          }}
        />

        <div className="mx-auto max-w-5xl px-6 py-12">

          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 text-sm text-[#805039] hover:underline"
          >
            <span>←</span>
            Volver al inicio
          </Link>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#C17B48]">
            Tu espacio personal
          </p>

          <h1 className="titulo text-4xl font-bold md:text-5xl">
            Mi perfil
          </h1>

          <p className="mt-3 text-[#8C6D53]">
            Personaliza tu experiencia en Mi Sabor.
          </p>

        </div>

      </section>

      {/* =========================
          CONTENIDO DEL PERFIL
      ========================= */}

      <section className="mx-auto max-w-5xl px-6 py-12">

        <form
          onSubmit={guardarCambios}
          className="grid gap-8 md:grid-cols-[280px_1fr]"
        >

          {/* =========================
              FOTOGRAFÍA DE PERFIL
          ========================= */}

          <div className="flex flex-col items-center rounded-3xl border border-[#E5DAC3] bg-[#FFFDF8] px-6 py-9">

            <div className="relative">

              {/* AVATAR */}

              <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-[#EBDDC5] bg-[#805039]">

                {imagenActual ? (

                  <img
                    src={imagenActual}
                    alt="Fotografía de perfil"
                    className="h-full w-full object-cover"
                  />

                ) : (

                  <span className="titulo text-6xl font-bold text-white">
                    {inicial}
                  </span>

                )}

              </div>

              {/* BOTÓN DE CÁMARA */}

              <button
                type="button"
                disabled={guardando}
                onClick={() => inputFoto.current?.click()}
                aria-label="Cambiar fotografía de perfil"
                title="Cambiar fotografía"
                className="absolute bottom-0 right-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-4 border-[#FFFDF8] bg-[#805039] text-white transition-colors hover:bg-[#603B2A] disabled:cursor-not-allowed disabled:opacity-60"
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

                  <path d="M14 4H10L8 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z" />

                  <circle cx="12" cy="13" r="3" />

                </svg>

              </button>

            </div>

            {/* NOMBRE DEL USUARIO */}

            <h2 className="titulo mt-5 break-all text-center text-2xl font-bold">
              {nombre || "Usuario"}
            </h2>

            <p className="mt-1 text-sm text-[#8C6D53]">
              Miembro de Mi Sabor
            </p>

            {/* SELECTOR DE ARCHIVOS OCULTO */}

            <input
              ref={inputFoto}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={seleccionarFoto}
              disabled={guardando}
              className="hidden"
            />

            {/* FORMATOS PERMITIDOS */}

            <p className="mt-5 text-center text-xs leading-5 text-[#8C6D53]">
              JPG, PNG o WEBP
              <br />
              Tamaño máximo: 2 MB
            </p>

            {/* ELIMINAR FOTOGRAFÍA */}

            {imagenActual && (

              <button
                type="button"
                disabled={guardando}
                onClick={quitarFoto}
                className="mt-5 cursor-pointer text-sm text-[#A34737] hover:underline"
              >
                Eliminar fotografía
              </button>

            )}

            {/* AVISO DE CAMBIOS PENDIENTES */}

            {(archivo || eliminarFoto) && (

              <p className="mt-4 text-center text-xs text-[#C17B48]">
                Guarda los cambios para aplicar la fotografía.
              </p>

            )}

          </div>

          {/* =========================
              INFORMACIÓN PERSONAL
          ========================= */}

          <div className="rounded-3xl border border-[#E5DAC3] bg-[#FFFDF8] p-7 md:p-9">

            <h2 className="titulo text-2xl font-bold">
              Información personal
            </h2>

            <p className="mb-8 mt-2 text-sm text-[#8C6D53]">
              Consulta y actualiza los datos de tu cuenta.
            </p>

            {/* NOMBRE */}

            <div className="mb-6">

              <label
                htmlFor="nombre"
                className="mb-2 block text-sm font-medium"
              >
                Nombre completo
              </label>

              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={100}
                disabled={guardando}
                required
                className="w-full rounded-xl border border-[#DBC7AE] bg-transparent px-4 py-3 outline-none transition-colors focus:border-[#805039] focus:ring-2 focus:ring-[#805039]/10"
              />

            </div>

            {/* CORREO ELECTRÓNICO */}

            <div className="mb-6">

              <label
                htmlFor="correo"
                className="mb-2 block text-sm font-medium"
              >
                Correo electrónico
              </label>

              <div className="relative">

                <input
                  id="correo"
                  type="email"
                  value={usuario.email || ""}
                  readOnly
                  className="w-full rounded-xl border border-[#E5DAC3] bg-[#F3EFE6] px-4 py-3 pr-12 text-[#8C6D53] outline-none"
                />

                <svg
                  className="absolute right-4 top-3.5 text-[#8C6D53]"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >

                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                  />

                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />

                </svg>

              </div>

              <p className="mt-2 text-xs text-[#8C6D53]">
                Por ahora no es posible modificar el correo.
              </p>

            </div>

            {/* FECHA DE REGISTRO */}

            <div className="mb-7">

              <p className="mb-2 text-sm font-medium">
                Miembro desde
              </p>

              <p className="text-sm text-[#8C6D53]">
                {fechaFormateada}
              </p>

            </div>

            {/* MENSAJE DE ERROR */}

            {error && (

              <div
                role="alert"
                className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>

            )}

            {/* MENSAJE DE ÉXITO */}

            {mensaje && (

              <div
                role="status"
                className="mb-5 rounded-xl bg-[#E5EBD8] p-4 text-sm text-[#52683D]"
              >
                {mensaje}
              </div>

            )}

            {/* BOTÓN GUARDAR CAMBIOS */}

            <button
              type="submit"
              disabled={guardando}
              className="w-full cursor-pointer rounded-full bg-[#805039] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#603B2A] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {guardando
                ? "Guardando cambios..."
                : "Guardar cambios"}

            </button>

          </div>

        </form>

        {/* =========================
            ACCESOS RÁPIDOS
        ========================= */}

{/* =========================
    ACCESOS RÁPIDOS
========================= */}

<div className="mt-8 grid gap-5 sm:grid-cols-2">

  {/* MIS FAVORITOS */}

  <Link
    href="/favoritos"
    className="relative isolate flex min-h-[175px] flex-col items-center justify-center overflow-hidden rounded-[20px] border-2 border-transparent bg-[#EFE3D3] px-6 py-7 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[#805039] hover:shadow-md"
  >

    {/* Fondo ilustrado */}

    <div
      className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-[0.10]"
      style={{
        backgroundImage: "url('/fondonuevo.jpg')",
      }}
    />

    {/* Icono */}

    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#805039"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>

    <h3 className="titulo mt-3 text-xl font-bold text-[#603B2A]">
      Mis favoritos
    </h3>

    <p className="mt-2 text-sm text-[#8C6D53]">
      Consulta las recetas que más te gustan.
    </p>

  </Link>

  {/* EXPLORAR RECETAS */}

  <Link
    href="/explorar"
    className="relative isolate flex min-h-[175px] flex-col items-center justify-center overflow-hidden rounded-[20px] border-2 border-transparent bg-[#E5EBD8] px-6 py-7 text-center text-[#52683D] transition-all duration-200 hover:-translate-y-1 hover:border-[#52683D] hover:shadow-md"
  >

    {/* Fondo ilustrado */}

    <div
      className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-[0.10]"
      style={{
        backgroundImage: "url('/fondonuevo.jpg')",
      }}
    />

    {/* Icono */}

    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />

      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>

    <h3 className="titulo mt-3 text-xl font-bold">
      Descubre nuevas recetas
    </h3>

    <p className="mt-2 text-sm">
      Encuentra inspiración para cocinar hoy.
    </p>

  </Link>

</div>

      </section>

    </main>
  );
}