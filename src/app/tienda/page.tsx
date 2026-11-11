import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSocio } from "@/lib/session";
import { nombrePeriodo, periodoActual, pesos, fechaHora } from "@/lib/periodo";
import { estadoSocio } from "@/lib/cuotas";
import { totalDelMes } from "../acciones";
import Productos from "./Productos";
import NavSocio from "../NavSocio";
import EncabezadoSocio from "../EncabezadoSocio";
import BotonAnular from "./BotonAnular";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

// Tienda: el socio anota lo que saca (agua, bebidas…) y se suma a su cuota
export default async function Tienda({ searchParams }: Props) {
  const memberId = await exigirSocio();

  // Los pagos de Mercado Pago ahora vuelven a /inicio: reenviamos los que llegan acá
  const params = await searchParams;
  if (params.payment_id || params.pago) {
    const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
    redirect(`/inicio?${q}`);
  }

  const periodo = periodoActual();
  const [{ socio, estado, cfg }, productos, consumos, total] = await Promise.all([
    estadoSocio(memberId, periodo),
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
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-28 pt-6">
      <EncabezadoSocio titulo="Tienda" subtitulo="Lo sacás y se suma a tu cuota" />

      {cfg.blockOverdue && estado === "vencida" && (
        <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-medium text-red-300">
          Tu cuota está vencida: pagala desde Inicio para seguir sumando consumos.
        </p>
      )}

      <section className="tarjeta">
        <p className="text-sm text-zinc-500">Consumos de {nombrePeriodo(periodo)}</p>
        <p className="mt-1 text-xl font-bold">{pesos(total)}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full ${porcentaje > 85 ? "bg-yellow-500" : "bg-orange-600"}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">Tope mensual: {pesos(socio.monthlyLimit)}</p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold uppercase">¿Qué sacaste?</h2>
        {productos.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay productos cargados.</p>
        ) : (
          <Productos productos={productos.map(({ id, name, price, emoji }) => ({ id, name, price, emoji }))} />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold uppercase">Tus consumos del mes</h2>
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
      <NavSocio activa="tienda" />
    </main>
  );
}
