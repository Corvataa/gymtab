import Link from "next/link";
import { db } from "@/lib/db";
import { configuracion } from "@/lib/cuotas";
import { DIAS, asegurarClases, fechaAR, horaAR, nombreDia } from "@/lib/clases";
import { actualizarHorario, crearHorario } from "../../acciones";
import Avisos from "../../Avisos";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

const SelectorDia = ({ valor }: { valor?: number }) => (
  <select name="weekday" defaultValue={valor ?? 1} className="input" aria-label="Día">
    {DIAS.slice(1).map((d, i) => (
      <option key={d} value={i + 1}>{d}</option>
    ))}
  </select>
);

export default async function Clases({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const cfg = await configuracion();
  await asegurarClases(cfg.bookingDays);
  const ahora = new Date();

  const [horarios, proximas, ocupacion] = await Promise.all([
    db.classSchedule.findMany({ orderBy: [{ active: "desc" }, { weekday: "asc" }, { startTime: "asc" }] }),
    db.classSession.findMany({
      where: { startsAt: { gt: new Date(ahora.getTime() - 3 * 3600000), lt: new Date(ahora.getTime() + 7 * 86400000) } },
      orderBy: { startsAt: "asc" },
    }),
    db.booking.groupBy({ by: ["sessionId", "status"], where: { status: { in: ["confirmed", "waitlist"] } }, _count: true }),
  ]);
  const cuenta = (id: string, status: string) =>
    ocupacion.find((o) => o.sessionId === id && o.status === status)?._count ?? 0;

  const porDia = new Map<string, typeof proximas>();
  for (const c of proximas) {
    const f = fechaAR(c.startsAt);
    porDia.set(f, [...(porDia.get(f) ?? []), c]);
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Clases</h1>
      <Avisos ok={ok} error={error} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Próximos 7 días</h2>
        {porDia.size === 0 && <p className="tarjeta text-zinc-500">Cargá horarios abajo para que aparezcan las clases.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {[...porDia.entries()].map(([fecha, lista]) => (
            <div key={fecha} className="tarjeta flex flex-col gap-1 p-0">
              <p className="border-b border-zinc-200 px-4 py-2 font-semibold dark:border-zinc-800">{nombreDia(fecha)}</p>
              {lista.map((c) => {
                const conf = cuenta(c.id, "confirmed");
                const espera = cuenta(c.id, "waitlist");
                return (
                  <Link key={c.id} href={`/admin/clases/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <span className={c.cancelled ? "text-zinc-400 line-through" : ""}>
                      <span className="tabular-nums">{horaAR(c.startsAt)}</span> · {c.name}
                    </span>
                    <span className="text-sm tabular-nums">
                      {c.cancelled ? (
                        <span className="text-red-600">suspendida</span>
                      ) : (
                        <>
                          <span className={conf >= c.capacity ? "font-semibold text-amber-700 dark:text-amber-400" : ""}>
                            {conf}/{c.capacity}
                          </span>
                          {espera > 0 && <span className="text-zinc-500"> +{espera} espera</span>}
                        </>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Horarios semanales</h2>
        <form action={crearHorario} className="tarjeta grid gap-3 sm:grid-cols-6">
          <input name="name" placeholder="Clase (ej: Funcional)" required className="input sm:col-span-2" />
          <SelectorDia />
          <input name="startTime" placeholder="07:00" required className="input" aria-label="Hora" />
          <input name="capacity" placeholder="Cupo" inputMode="numeric" required className="input" />
          <input name="durationMin" placeholder="Min (60)" inputMode="numeric" className="input" />
          <input name="coach" placeholder="Coach (opcional)" className="input sm:col-span-3" />
          <button className="btn-primario sm:col-span-3">+ Agregar horario</button>
        </form>

        <ul className="flex flex-col gap-2">
          {horarios.map((h) => (
            <li key={h.id}>
              <form
                action={actualizarHorario}
                className={`tarjeta grid items-center gap-2 sm:grid-cols-[1.5fr_1fr_6rem_5rem_5rem_1fr_auto_auto] ${h.active ? "" : "opacity-60"}`}
              >
                <input type="hidden" name="id" value={h.id} />
                <input name="name" defaultValue={h.name} required className="input" aria-label="Clase" />
                <SelectorDia valor={h.weekday} />
                <input name="startTime" defaultValue={h.startTime} required className="input" aria-label="Hora" />
                <input name="capacity" defaultValue={h.capacity} inputMode="numeric" className="input" aria-label="Cupo" />
                <input name="durationMin" defaultValue={h.durationMin} inputMode="numeric" className="input" aria-label="Minutos" />
                <input name="coach" defaultValue={h.coach ?? ""} placeholder="Coach" className="input" aria-label="Coach" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={h.active} className="h-5 w-5" />
                  Activo
                </label>
                <button className="btn-secundario py-2">Guardar</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
