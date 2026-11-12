import NavSocio from "./NavSocio";

type Tab = "inicio" | "clases" | "entreno" | "marcas" | "tienda";

// Lo que se ve al instante al cambiar de pestaña, mientras llegan los datos
export default function CargandoSocio({ activa, titulo }: { activa: Tab; titulo: string }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-28 pt-6" aria-busy="true" aria-label="Cargando">
      <div className="flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca.svg" alt="" className="h-9 w-auto opacity-80" />
        <div className="h-8 w-20 rounded-lg bg-white/5" />
      </div>
      <h1 className="text-4xl font-extrabold uppercase leading-none">{titulo}</h1>
      {[28, 20, 20, 16].map((h, i) => (
        <div key={i} className="tarjeta animate-pulse" style={{ height: `${h * 4}px` }}>
          <div className="h-3 w-1/3 rounded bg-white/10" />
          <div className="mt-3 h-6 w-1/2 rounded bg-white/10" />
        </div>
      ))}
      <NavSocio activa={activa} />
    </main>
  );
}
