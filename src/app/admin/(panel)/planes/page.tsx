import { db } from "@/lib/db";
import { pesos } from "@/lib/periodo";
import { actualizarPlan, crearPlan } from "../../acciones";
import Avisos from "../../Avisos";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function Planes({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const planes = await db.plan.findMany({
    orderBy: [{ active: "desc" }, { price: "asc" }],
    include: { _count: { select: { members: { where: { active: true } } } } },
  });

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Planes</h1>
        <p className="text-zinc-500">Las opciones de cuota mensual. Cada socio tiene un plan.</p>
      </div>
      <Avisos ok={ok} error={error} />

      <form action={crearPlan} className="tarjeta grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto]">
        <input name="name" placeholder="Nombre (ej: 3 veces por semana)" required className="input" />
        <input name="price" placeholder="Cuota $" inputMode="numeric" required className="input" />
        <input name="classesPerWeek" placeholder="Clases/semana" inputMode="numeric" className="input" />
        <button className="btn-primario">+ Agregar</button>
      </form>
      <p className="-mt-2 text-sm text-zinc-500">
        Dejá &quot;clases por semana&quot; vacío si el plan es libre. Si cambiás la cuota, los cobros ya hechos no cambian.
      </p>

      <ul className="flex flex-col gap-3">
        {planes.length === 0 && <li className="tarjeta text-zinc-500">Todavía no hay planes.</li>}
        {planes.map((p) => (
          <li key={p.id}>
            <form
              action={actualizarPlan}
              className={`tarjeta grid items-center gap-3 sm:grid-cols-[1fr_10rem_10rem_auto_auto] ${p.active ? "" : "opacity-60"}`}
            >
              <input type="hidden" name="id" value={p.id} />
              <div>
                <input name="name" defaultValue={p.name} required className="input" />
                <p className="mt-1 text-xs text-zinc-500">
                  {p._count.members} socio{p._count.members === 1 ? "" : "s"} · {pesos(p.price)}
                </p>
              </div>
              <input name="price" defaultValue={p.price} inputMode="numeric" required className="input" aria-label="Cuota" />
              <input
                name="classesPerWeek"
                defaultValue={p.classesPerWeek ?? ""}
                placeholder="Libre"
                inputMode="numeric"
                className="input"
                aria-label="Clases por semana"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={p.active} className="h-5 w-5" />
                Activo
              </label>
              <button className="btn-secundario py-2">Guardar</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
