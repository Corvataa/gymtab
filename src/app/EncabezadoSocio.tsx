import Link from "next/link";
import { salir } from "./acciones";
import Logo from "./Logo";
import { IconoLlave, IconoSalir } from "./Iconos";

// Encabezado de las pantallas del socio: logo, título y accesos a PIN / salir
export default function EncabezadoSocio({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Logo className="h-9" />
        <div className="flex items-center gap-1 text-zinc-400">
          <Link href="/tienda/pin" aria-label="Cambiar PIN" title="Cambiar PIN" className="rounded-lg p-2 hover:bg-white/10 hover:text-white">
            <IconoLlave className="h-5 w-5" />
          </Link>
          <form action={salir}>
            <button aria-label="Salir" title="Salir" className="rounded-lg p-2 hover:bg-white/10 hover:text-white">
              <IconoSalir className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
      <div>
        {subtitulo && <p className="text-sm text-zinc-400">{subtitulo}</p>}
        <h1 className="text-4xl font-extrabold uppercase leading-none">{titulo}</h1>
      </div>
    </header>
  );
}
