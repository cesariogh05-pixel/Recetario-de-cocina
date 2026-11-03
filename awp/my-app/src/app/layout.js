"use client";

import { useEffect, useState } from "react";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const titulos = Fraunces({
  variable: "--font-titulos",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const cuerpo = DM_Sans({
  variable: "--font-cuerpo",
  subsets: ["latin"],
});

const STORAGE_KEY = "misabor-favoritos";

export default function RootLayout({ children }) {
  const [numFavoritos, setNumFavoritos] = useState(0);
  const pathname = usePathname(); // Detecta cuando cambias de página para actualizar el contador

  useEffect(() => {
    const actualizarContador = () => {
      try {
        const guardados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (Array.isArray(guardados)) {
          setNumFavoritos(guardados.length);
        }
      } catch {
        setNumFavoritos(0);
      }
    };

    // Cargar al montar
    actualizarContador();

    // Escuchar cambios en el localStorage (por si se abren pestañas o hay eventos cruzados)
    window.addEventListener("storage", actualizarContador);
    
    // Intervalo corto o evento personalizado opcional para refrescar al navegar entre páginas
    window.addEventListener("focus", actualizarContador);

    return () => {
      window.removeEventListener("storage", actualizarContador);
      window.removeEventListener("focus", actualizarContador);
    };
  }, [pathname]); // Se vuelve a verificar cada vez que cambias de ruta (ej. de Inicio a Explorar o Favoritos)

  const enlaces = [
    { href: "/", texto: "Inicio" },
    { href: "/explorar", texto: "Explorar" },
    { href: "/favoritos", texto: "Favoritos", contador: numFavoritos },
  ];

  return (
    <html
      lang="es"
      className={`${titulos.variable} ${cuerpo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-[#E5DAC3] bg-[#FAF6EA] shadow-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
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

            <nav className="flex flex-wrap gap-1 text-sm font-medium">
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
            </nav>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          {children}
        </div>

        <footer className="border-t border-[#E5DAC3] py-8 text-center text-sm text-[#8A6238]">
          <p className="titulo text-lg font-bold">
            Mi Sabor
          </p>

          <p>Hecho con cariño, desde 2026</p>
        </footer>
      </body>
    </html>
  );
}