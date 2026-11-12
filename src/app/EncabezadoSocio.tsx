import Link from "next/link";
import { db } from "@/lib/db";
import { sesionActual } from "@/lib/session";
import Logo from "./Logo";
import Avatar from "./Avatar";

// Encabezado de las pantallas del socio: logo, título y su foto (que lleva a "Mi perfil")
export default async function EncabezadoSocio({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  const s = await sesionActual();
  const socio =
    s?.rol === "socio"
      ? await db.member.findUnique({ where: { id: s.id }, select: { id: true, name: true, avatarVersion: true } })
      : null;
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Logo className="h-9" />
        {socio && (
          <Link href="/perfil" aria-label="Mi perfil" title="Mi perfil" className="rounded-full transition hover:scale-105">
            <Avatar id={socio.id} nombre={socio.name} version={socio.avatarVersion} tam={42} />
          </Link>
        )}
      </div>
      <div>
        {subtitulo && <p className="text-sm text-zinc-400">{subtitulo}</p>}
        <h1 className="text-4xl font-extrabold uppercase leading-none">{titulo}</h1>
      </div>
    </header>
  );
}
