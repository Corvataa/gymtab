import Link from "next/link";
import { db } from "@/lib/db";
import { exigirSocio } from "@/lib/session";
import { nombrePeriodo, periodoActual, pesos, fechaHora } from "@/lib/periodo";
import { salir, totalDelMes } from "../acciones";
import Productos from "./Productos";
import BotonAnular from "./BotonAnular";

export const dynamic = "force-dynamic";

export default async function Tienda() {
  const memberId = await exigirSocio();
  const periodo = periodoActual();

  const [socio, productos, consumos, total] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: memberId } }),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.consumption.findMany({
      where: { memberId, period: periodo },
      orderBy: { createdAt: "desc" },
    }),
    totalDelMes(memberId, periodo),
  ]);

  const porcentaje = Math.min(100, Math.round((total / socio.monthlyLimit) * 100));
  const ahora = Date.now();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">Hola,</p>
          <h1 className="text-xl font-bold">{socio.name.split(" ")[0]}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <Link href="/tienda/pin" className="underline">Cambiar PIN</Link>
          <form action={salir}>
            <button className="underline">Salir</button>
          </form>
        </div>
      </header>

      <section className="tarjeta">
        <p className="text-sm text-zinc-500">Se suma a tu cuota de {nombrePeriodo(periodo)}</p>
        <p className="mt-1 text-3xl font-bold">{pesos(total)}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full ${porcentaje > 85 ? "bg-amber-500" : "bg-emerald-600"}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">Tope mensual: {pesos(socio.monthlyLimit)}</p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">¿Qué sacaste?</h2>
        {productos.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay productos cargados.</p>
        ) : (
          <Productos productos={productos.map(({ id, name, price, emoji }) => ({ id, name, price, emoji }))} />
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Tus consumos del mes</h2>
        {consumos.length === 0 ? (
          <p className="text-sm text-zinc-500">Nada por ahora.</p>
        ) : (
          <ul className="tarjeta divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
            {consumos.map((c) => {
              const anulable = !c.voided && ahora - c.createdAt.getTime() < 10 * 60000;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className={c.voided ? "text-zinc-400 line-through" : ""}>
                    <p className="font-medium">
                      {c.quantity} × {c.productName}
                    </p>
                    <p className="text-xs text-zinc-500">{fechaHora(c.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={c.voided ? "text-zinc-400 line-through" : "font-semibold"}>
                      {pesos(c.unitPrice * c.quantity)}
                    </span>
                    {anulable && <BotonAnular id={c.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
