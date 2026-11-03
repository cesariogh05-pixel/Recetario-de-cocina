import Link from "next/link";
import Image from "next/image";

const recetas = [
  {
    id: 1,
    nombre: "-",
    imagen: "-",
    cat: "Desayuno",
    min: 25,
    color: "#CFE3C0",
  },
  {
    id: 2,
    nombre: "-",
    imagen: "-",
    cat: "Comida",
    min: 50,
    color: "#E3C9B3",
  },
  {
    id: 3,
    nombre: "-",
    imagen: "-",
    cat: "Comida",
    min: 35,
    color: "#F6DFA0",
  },
  {
    id: 6,
    nombre: "-",
    imagen: "-",
    cat: "Postre",
    min: 45,
    color: "#EADCF0",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <Image
          src="/fondo.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-65"
          aria-hidden="true"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF6EA] via-[#FAF6EA]/85 to-transparent md:via-[#FAF6EA]/50" />

        <div className="relative mx-auto max-w-5xl px-5 py-20 md:py-32">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#C27A4A]">
            Recetas de casa
          </p>

          <h1 className="titulo max-w-2xl text-5xl font-bold leading-tight text-[#5A3322] md:text-6xl">
            Cocina con cariño, come con sabor
          </h1>

          <p className="mt-5 max-w-md text-lg leading-8 text-[#6F5A44]">
            Recetas caseras para compartir en la mesa de siempre.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/explorar"
              className="rounded-full bg-[#7B4A32] px-6 py-3 font-medium text-[#FAF7F0] transition-colors hover:bg-[#5A3322]"
            >
              Explorar recetas
            </Link>

            <Link
              href="/favoritos"
              className="rounded-full border-2 border-[#7B4A32] px-6 py-3 font-medium text-[#7B4A32] transition-colors hover:bg-[#7B4A32] hover:text-[#FAF7F0]"
            >
              Mis favoritos
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#F3EBDA] py-14">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="titulo text-3xl font-bold text-[#5A3322]">
              Recetas para empezar
            </h2>

            <Link
              href="/explorar"
              className="text-sm font-medium text-[#7B4A32] underline underline-offset-4"
            >
              Ver todas
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recetas.map((r) => (
              <Link
                key={r.id}
                href={`/explorar/${r.id}`}
                className="group overflow-hidden rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] transition-shadow hover:shadow-lg"
              >
                <div
                  className="relative flex h-36 items-center justify-center text-6xl"
                  style={{ backgroundColor: r.color }}
                >
                  {r.imagen}

                  <span
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFDF8] text-lg text-[#B5533C]"
                    aria-hidden="true"
                  >
                    ♡
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="titulo text-xl font-bold text-[#3B2A1A] group-hover:text-[#7B4A32]">
                    {r.nombre}
                  </h3>

                  <p className="mt-1 text-sm text-[#6F5A44]">
                    {r.cat}, {r.min} min
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="rounded-3xl bg-[#7B4A32] px-8 py-12 text-center text-[#FAF7F0]">
          <h2 className="titulo text-3xl font-bold md:text-4xl">
            ¿Qué se te antoja hoy?
          </h2>

          <p className="mx-auto mt-3 max-w-md text-[#F0E3CC]">
            Busca una receta, guarda tus favoritas y ten siempre a la mano
            lo que más te gusta cocinar.
          </p>

          <Link
            href="/explorar"
            className="mt-6 inline-block rounded-full bg-[#F6DFA0] px-6 py-3 font-medium text-[#3B2A1A] transition-colors hover:bg-[#FAF7F0]"
          >
            Buscar una receta
          </Link>
        </div>
      </section>
    </main>
  );
}
