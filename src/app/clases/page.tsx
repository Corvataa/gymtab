import { db } from "@/lib/db";
import { exigirSocio } from "@/lib/session";
import { configuracion } from "@/lib/cuotas";
import { asegurarClases, fechaAR, horaAR, nombreDia, rangoSemana } from "@/lib/clases";
import EncabezadoSocio from "../EncabezadoSocio";
import NavSocio from "../NavSocio";
import BotonClase from "./BotonClase";

export const dynamic = "force-dynamic";

export default async function Clases() {
  const memberId = await exigirSocio();
  const cfg = await configuracion();
  await asegurarClases(cfg.bookingDays);

  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + (cfg.bookingDays + 1) * 86400000);
  const semana = rangoSemana(ahora);

  const [socio, clases, ocupacion, mias, usadasSemana] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: memberId }, include: { plan: true } }),
    db.classSession.findMany({ where: { startsAt: { gt: ahora, lt: hasta } }, orderBy: { startsAt: "asc" } }),
    db.booking.groupBy({ by: ["sessionId"], where: { status: "confirmed" }, _count: true }),
    db.booking.findMany({
      where: { memberId, status: { in: ["confirmed", "waitlist"] }, session: { startsAt: { gt: ahora } } },
    }),
    db.booking.count({
      where: {
        memberId,
        status: { in: ["confirmed", "waitlist"] },
        session: { startsAt: { gte: semana.desde, lt: semana.hasta }, cancelled: false },
      },
    }),
  ]);

  const ocupados = new Map(ocupacion.map((o) => [o.sessionId, o._count]));
  const miReserva = new Map(mias.map((b) => [b.sessionId, b]));

  // Posición en lista de espera
  const posiciones = new Map<string, number>();
  for (const b of mias.filter((x) => x.status === "waitlist")) {
    const antes = await db.booking.count({
      where: { sessionId: b.sessionId, status: "waitlist", createdAt: { lt: b.createdAt } },
    });
    posiciones.set(b.sessionId, antes + 1);
  }

  // Agrupamos por día
  const porDia = new Map<string, typeof clases>();
  for (const c of clases) {
    const f = fechaAR(c.startsAt);
    porDia.set(f, [...(porDia.get(f) ?? []), c]);
  }
  const hoy = fechaAR(ahora);
  const limite = socio.plan?.classesPerWeek;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      <EncabezadoSocio titulo="Clases" />

      <NavSocio activa="clases" />

      <section className="tarjeta">
        <p className="text-sm text-zinc-500">Esta semana</p>
        {socio.plan ? (
          <p className="mt-1 text-lg font-bold">
            {limite ? `Reservaste ${usadasSemana} de ${limite} clases` : `Reservaste ${usadasSemana} clases · plan libre`}
          </p>
        ) : (
          <p className="mt-1 font-medium text-amber-700 dark:text-amber-400">
            Necesitás un plan para reservar. Consultá en recepción.
          </p>
        )}
        <p className="mt-1 text-xs text-zinc-500">Podés cancelar hasta {cfg.cancelHours} h antes de la clase.</p>
      </section>

      {porDia.size === 0 && <p className="text-zinc-500">No hay clases programadas en los próximos días.</p>}

      {[...porDia.entries()].map(([fecha, lista]) => (
        <section key={fecha} className="flex flex-col gap-2">
          <h2 className="font-semibold">
            {fecha === hoy ? "Hoy" : fecha === fechaAR(new Date(ahora.getTime() + 86400000)) ? "Mañana" : nombreDia(fecha)}
          </h2>
          {lista.map((c) => {
            const ocup = ocupados.get(c.id) ?? 0;
            const libres = Math.max(0, c.capacity - ocup);
            const mia = miReserva.get(c.id);
            return (
              <div
                key={c.id}
                className={`tarjeta flex items-center justify-between gap-3 ${
                  mia?.status === "confirmed" ? "border-emerald-600" : ""
                } ${c.cancelled ? "opacity-60" : ""}`}
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    <span className="tabular-nums">{horaAR(c.startsAt)}</span> · {c.name}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {c.cancelled ? (
                      <span className="font-medium text-red-600">Suspendida</span>
                    ) : mia?.status === "confirmed" ? (
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">Reservada ✓</span>
                    ) : mia?.status === "waitlist" ? (
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        Lista de espera · puesto {posiciones.get(c.id)}
                      </span>
                    ) : libres > 0 ? (
                      `${libres} lugar${libres === 1 ? "" : "es"} libre${libres === 1 ? "" : "s"}`
                    ) : (
                      "Completa"
                    )}
                    {c.coach && ` · ${c.coach}`}
                  </p>
                </div>
                {!c.cancelled && socio.plan && (
                  <BotonClase
                    sessionId={c.id}
                    bookingId={mia?.id}
                    texto={mia ? "Cancelar" : libres > 0 ? "Reservar" : "Anotarme en espera"}
                    tipo={mia ? "cancelar" : "reservar"}
                  />
                )}
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
