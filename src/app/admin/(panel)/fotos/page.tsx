import { db } from "@/lib/db";
import { configuracion } from "@/lib/cuotas";
import { fechaAR, nombreDia } from "@/lib/clases";
import { borrarFotoDelDia, borrarFotosDelDia } from "../../acciones";
import Avisos from "../../Avisos";
import SubirFotos from "./SubirFotos";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function Fotos({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const [fotos, cfg] = await Promise.all([
    db.gymPhoto.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    configuracion(),
  ]);
  const porDia = new Map<string, typeof fotos>();
  for (const f of fotos) porDia.set(f.date, [...(porDia.get(f.date) ?? []), f]);
  const hoy = fechaAR(new Date());

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Fotos del día</h1>
        <p className="text-zinc-400">
          Subí las fotos de las clases: los socios las ven en la app y las pueden descargar o compartir en sus redes. Se borran
          solas a los {cfg.photoDays} días.
        </p>
      </div>
      <Avisos ok={ok} error={error} />
      <SubirFotos hoy={hoy} />

      {porDia.size === 0 && <p className="tarjeta text-zinc-500">Todavía no subiste fotos.</p>}
      {[...porDia.entries()].map(([fecha, lista]) => (
        <section key={fecha} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {fecha === hoy ? "Hoy" : nombreDia(fecha)} <span className="text-zinc-500">· {lista.length} fotos</span>
            </h2>
            <form action={borrarFotosDelDia}>
              <input type="hidden" name="date" value={fecha} />
              <button className="text-xs text-zinc-500 underline">Borrar todas las de este día</button>
            </form>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
            {lista.map((f) => (
              <div key={f.id} className="group relative aspect-square overflow-hidden rounded-xl bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/fotos/${f.id}/mini`} alt={f.caption ?? "Foto del día"} loading="lazy" className="h-full w-full object-cover" />
                {f.caption && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-xs">{f.caption}</span>
                )}
                <form action={borrarFotoDelDia} className="absolute right-1 top-1">
                  <input type="hidden" name="id" value={f.id} />
                  <button
                    aria-label="Borrar foto"
                    className="grid h-8 w-8 place-items-center rounded-full bg-black/70 text-sm text-white hover:bg-red-600"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
