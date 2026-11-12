import Link from "next/link";
import { db } from "@/lib/db";
import { exigirSocio } from "@/lib/session";
import { pesos } from "@/lib/periodo";
import { salir } from "../acciones";
import Avatar from "../Avatar";
import NavSocio from "../NavSocio";
import { IconoLlave, IconoSalir } from "../Iconos";
import FotoPerfil from "./FotoPerfil";
import FormPerfil from "./FormPerfil";

export const dynamic = "force-dynamic";

export default async function Perfil() {
  const memberId = await exigirSocio();
  const socio = await db.member.findUniqueOrThrow({ where: { id: memberId }, include: { plan: true } });
  const desde = socio.createdAt.toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-28 pt-6">
      <Link href="/inicio" className="self-start text-sm text-zinc-400 underline">← Volver</Link>

      <section className="flex flex-col items-center gap-3 text-center">
        <FotoPerfil tieneFoto={socio.avatarVersion > 0}>
          <Avatar id={socio.id} nombre={socio.name} version={socio.avatarVersion} tam={112} />
        </FotoPerfil>
        <div>
          <h1 className="text-4xl font-extrabold uppercase leading-none">{socio.nickname || socio.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-zinc-400">{socio.name}</p>
          {socio.goal && <p className="mt-2 font-medium text-orange-400">🎯 {socio.goal}</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1">{socio.plan ? `${socio.plan.name} · ${pesos(socio.plan.price)}` : "Sin plan"}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">Socio desde {desde}</span>
          {socio.dni && <span className="rounded-full bg-white/10 px-3 py-1">DNI {socio.dni}</span>}
        </div>
      </section>

      <FormPerfil
        datos={{
          nickname: socio.nickname ?? "",
          goal: socio.goal ?? "",
          phone: socio.phone ?? "",
          email: socio.email ?? "",
          birthDate: socio.birthDate ?? "",
          emergencyContact: socio.emergencyContact ?? "",
        }}
      />

      <div className="flex flex-col gap-2">
        <Link href="/tienda/pin" className="btn-secundario justify-start">
          <IconoLlave className="h-5 w-5 text-orange-500" /> Cambiar PIN
        </Link>
        <form action={salir}>
          <button className="btn-secundario w-full justify-start text-red-300">
            <IconoSalir className="h-5 w-5" /> Cerrar sesión
          </button>
        </form>
      </div>
      <p className="text-center text-xs text-zinc-500">Tu nombre y tu DNI los cambia el gimnasio. Pedilo en recepción.</p>

      <NavSocio activa="inicio" />
    </main>
  );
}
