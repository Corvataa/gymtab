import { db } from "@/lib/db";
import { exigirSocio } from "@/lib/session";
import { fechaAR, nombreDia, sumarDias } from "@/lib/clases";
import EncabezadoSocio from "../EncabezadoSocio";
import NavSocio from "../NavSocio";
import Galeria from "./Galeria";

export const dynamic = "force-dynamic";

export default async function Fotos() {
  await exigirSocio();
  const fotos = await db.gymPhoto.findMany({ orderBy: [{ date: "desc" }, { createdAt: "asc" }] });
  const hoy = fechaAR(new Date());
  const etiqueta = (f: string) => (f === hoy ? "Hoy" : f === sumarDias(hoy, -1) ? "Ayer" : nombreDia(f));
  const dias: { fecha: string; titulo: string; fotos: { id: string; caption: string | null; date: string }[] }[] = [];
  for (const f of fotos) {
    const ultimo = dias[dias.length - 1];
    const item = { id: f.id, caption: f.caption, date: f.date };
    if (ultimo?.fecha === f.date) ultimo.fotos.push(item);
    else dias.push({ fecha: f.date, titulo: etiqueta(f.date), fotos: [item] });
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-28 pt-6">
      <EncabezadoSocio titulo="Fotos" subtitulo="Tocá una foto para descargarla o compartirla" />
      {dias.length === 0 ? (
        <p className="tarjeta text-center text-zinc-400">Todavía no hay fotos. ¡Pronto los profes van a subir las de las clases!</p>
      ) : (
        <Galeria dias={dias} />
      )}
      <NavSocio activa="inicio" />
    </main>
  );
}
