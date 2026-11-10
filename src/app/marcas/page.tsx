import { db } from "@/lib/db";
import { exigirSocio } from "@/lib/session";
import { fechaAR } from "@/lib/clases";
import { EJERCICIOS, kilos, unaRepEstimada } from "@/lib/entreno";
import EncabezadoSocio from "../EncabezadoSocio";
import NavSocio from "../NavSocio";
import FormMarca from "./FormMarca";
import BotonBorrarMarca from "./BotonBorrarMarca";

export const dynamic = "force-dynamic";

export default async function Marcas() {
  const memberId = await exigirSocio();
  const marcas = await db.personalRecord.findMany({
    where: { memberId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  // Agrupamos por ejercicio
  const porEjercicio = new Map<string, typeof marcas>();
  for (const m of marcas) porEjercicio.set(m.movement, [...(porEjercicio.get(m.movement) ?? []), m]);
  const grupos = [...porEjercicio.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const propios = grupos.map(([n]) => n).filter((n) => !EJERCICIOS.includes(n));

  const fecha = (f: string) => f.split("-").reverse().join("/");

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-28 pt-6">
      <EncabezadoSocio titulo="Mis marcas" />

      <FormMarca ejercicios={[...EJERCICIOS, ...propios]} hoy={fechaAR(new Date())} />

      {grupos.length === 0 && (
        <p className="tarjeta text-center text-zinc-500">Cargá tu primera marca para empezar a ver tu progreso.</p>
      )}

      {grupos.map(([ejercicio, lista]) => {
        const mejor = lista.reduce((a, b) => (b.reps === 1 && (a.reps !== 1 || b.weight > a.weight) ? b : a), lista[0]);
        const mejorEstimada = Math.max(...lista.map((m) => unaRepEstimada(m.weight, m.reps)));
        const mejorReal1 = lista.filter((m) => m.reps === 1).reduce((x, m) => Math.max(x, m.weight), 0);
        return (
          <section key={ejercicio} className="tarjeta flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">{ejercicio}</h2>
              <span className="text-xl font-bold">
                {mejorReal1 ? kilos(mejorReal1) : `${kilos(mejor.weight)} × ${mejor.reps}`}
              </span>
            </div>
            {mejorEstimada > mejorReal1 && (
              <p className="text-xs text-zinc-500">Máximo estimado para 1 repetición: {kilos(mejorEstimada)}</p>
            )}
            <details className="text-sm">
              <summary className="cursor-pointer text-zinc-500">Historial ({lista.length})</summary>
              <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                {lista.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <span className="font-medium">{kilos(m.weight)}</span>
                      {m.reps > 1 && <span> × {m.reps}</span>}
                      <span className="text-zinc-500"> · {fecha(m.date)}</span>
                      {m.notes && <span className="block text-xs text-zinc-500">{m.notes}</span>}
                    </span>
                    <BotonBorrarMarca id={m.id} />
                  </li>
                ))}
              </ul>
            </details>
          </section>
        );
      })}
      <NavSocio activa="marcas" />
    </main>
  );
}
