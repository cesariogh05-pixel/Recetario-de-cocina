import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const titulos = Fraunces({
  variable: "--font-titulos",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const cuerpo = DM_Sans({
  variable: "--font-cuerpo",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mi Sabor | Recetas caseras",
  description: "Recetas caseras para compartir en la mesa de siempre.",
};

const enlaces = [
  { href: "/", texto: "Inicio" },
  { href: "/explorar", texto: "Explorar" },
  { href: "/receta", texto: "Receta" },
  { href: "/favoritos", texto: "Favoritos", contador: 0 },
];

export default function RootLayout({ children }) {
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
                  src="/logoo.png"
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
                    <span className="rounded-full bg-[#EBDDC5] px-2 text-xs leading-5">
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
