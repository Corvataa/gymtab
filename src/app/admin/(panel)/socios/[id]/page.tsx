import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { METODOS, calcularEstado, configuracion, consumosSinCobrar } from "@/lib/cuotas";
import { esPeriodo, fechaHora, nombrePeriodo, periodoActual, periodoSiguiente, periodosCobro, pesos, ultimosPeriodos } from "@/lib/periodo";
import { actualizarSocio, agregarConsumoAdmin, alternarAnulado, anularCobro, cambiarPin, registrarCobro } from "../../../acciones";
import Avisos from "../../../Avisos";
import EtiquetaEstado from "../../../Estado";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; periodo?: string }>;
};

const NOMBRE_METODO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
};

export default async function Socio({ params, searchParams }: Props) {
  const { id } = await params;
  const { ok, error, periodo: p } = await searchParams;
  const periodo = esPeriodo(p) ? p : periodoActual();

  const socio = await db.member.findUnique({ where: { id }, include: { plan: true } });
  if (!socio) notFound();
  const [consumos, productos, planes, pagos, pendientes, cfg] = await Promise.all([
    db.consumption.findMany({ where: { memberId: id, period: periodo }, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.plan.findMany({ where: { OR: [{ active: true }, { id: socio.planId ?? "" }] }, orderBy: { price: "asc" } }),
    db.payment.findMany({ where: { memberId: id }, orderBy: { createdAt: "desc" }, take: 24 }),
    consumosSinCobrar(id),
    configuracion(),
  ]);

  const pagados = new Set(pagos.filter((x) => !x.voided).map((x) => x.period));
  const actual = periodoActual();
  const estado = calcularEstado(!!socio.planId, pagados.has(actual), actual, cfg.dueDay);
  // Mes que se propone cobrar: el actual si no está pago; si no, el siguiente
  const mesACobrar = pagados.has(actual) ? periodoSiguiente(actual) : actual;
  const cuota = socio.plan?.price ?? 0;
  const totalMes = consumos.filter((c) => !c.voided).reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{socio.name}</h1>
          <p className="text-zinc-500">
            DNI {socio.dni}
            {socio.phone && ` · ${socio.phone}`} · {socio.plan?.name ?? "sin plan"}
          </p>
        </div>
        <EtiquetaEstado estado={estado} />
      </div>
      <Avisos ok={ok} error={error} />

      {/* Cobro */}
      <form action={registrarCobro} className="tarjeta flex flex-col gap-4 border-emerald-600/40">
        <h2 className="text-lg font-semibold">Registrar cobro</h2>
        <input type="hidden" name="memberId" value={socio.id} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Cuota del mes
            <select name="period" defaultValue={mesACobrar} className="input">
              {periodosCobro().map((x) => (
                <option key={x} value={x} disabled={pagados.has(x)}>
                  {nombrePeriodo(x)}{pagados.has(x) ? " (pagada)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Monto de la cuota ($)
            <input name="feeAmount" defaultValue={cuota} inputMode="numeric" className="input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Medio de pago
            <select name="method" className="input" defaultValue="efectivo">
              {METODOS.map((m) => (
                <option key={m} value={m}>{NOMBRE_METODO[m]}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="includeConsumos" defaultChecked disabled={!pendientes.total} className="h-5 w-5" />
          Incluir consumos sin cobrar: <strong>{pesos(pendientes.total)}</strong> ({pendientes.ids.length})
        </label>
        <input name="notes" placeholder="Nota (opcional)" className="input" />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            Cuota {pesos(cuota)} + consumos {pesos(pendientes.total)}
          </span>
          <span className="text-xl font-bold">Total {pesos(cuota + pendientes.total)}</span>
        </div>
        <p className="-mt-2 text-xs text-zinc-500">Si cambiás el monto o destildás consumos, el total final se recalcula al guardar.</p>
        <button className="btn-primario">Registrar cobro</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <form action={actualizarSocio} className="tarjeta flex flex-col gap-3">
          <h2 className="font-semibold">Datos</h2>
          <input type="hidden" name="id" value={socio.id} />
          <label className="flex flex-col gap-1 text-sm">
            Nombre
            <input name="name" defaultValue={socio.name} required className="input" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Teléfono
              <input name="phone" defaultValue={socio.phone ?? ""} inputMode="tel" className="input" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input name="email" type="email" defaultValue={socio.email ?? ""} className="input" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Plan
            <select name="planId" defaultValue={socio.planId ?? ""} className="input">
              <option value="">Sin plan</option>
              {planes.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name} — {pesos(pl.price)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tope de consumos por mes ($)
            <input name="monthlyLimit" defaultValue={socio.monthlyLimit} inputMode="numeric" className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={socio.active} className="h-5 w-5" />
            Activo (si lo destildás, no puede entrar ni sumar consumos)
          </label>
          <button className="btn-secundario">Guardar datos</button>
        </form>

        <div className="flex flex-col gap-4">
          <section className="tarjeta flex flex-col gap-2">
            <h2 className="font-semibold">Historial de cobros</h2>
            {pagos.length === 0 && <p className="text-sm text-zinc-500">Todavía no hay cobros.</p>}
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {pagos.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className={x.voided ? "text-zinc-400 line-through" : ""}>
                    <p className="font-medium first-letter:uppercase">{nombrePeriodo(x.period)}</p>
                    <p className="text-xs text-zinc-500">
                      {fechaHora(x.createdAt)} · {NOMBRE_METODO[x.method] ?? x.method}
                      {x.consumosAmount > 0 && ` · incluye ${pesos(x.consumosAmount)} de consumos`}
                      {x.notes && ` · ${x.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={x.voided ? "text-zinc-400 line-through" : "font-semibold"}>{pesos(x.total)}</span>
                    {!x.voided && (
                      <form action={anularCobro}>
                        <input type="hidden" name="id" value={x.id} />
                        <button className="text-xs text-zinc-500 underline">Anular</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <form action={agregarConsumoAdmin} className="tarjeta flex flex-col gap-3">
            <h2 className="font-semibold">Anotar consumo (recepción)</h2>
            <input type="hidden" name="memberId" value={socio.id} />
            <div className="flex gap-2">
              <select name="productId" required className="input">
                {productos.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.emoji} {pr.name} — {pesos(pr.price)}</option>
                ))}
              </select>
              <input name="cantidad" defaultValue={1} inputMode="numeric" className="input w-20" aria-label="Cantidad" />
            </div>
            <button className="btn-secundario">Agregar</button>
          </form>

          <form action={cambiarPin} className="tarjeta flex flex-col gap-3">
            <h2 className="font-semibold">Cambiar PIN</h2>
            <input type="hidden" name="id" value={socio.id} />
            <div className="flex gap-2">
              <input name="pin" placeholder="Nuevo PIN" inputMode="numeric" maxLength={6} required className="input" />
              <button className="btn-secundario">Cambiar</button>
            </div>
          </form>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Consumos de {nombrePeriodo(periodo)}: {pesos(totalMes)}</h2>
          <form className="flex gap-2">
            <select name="periodo" defaultValue={periodo} className="input w-auto py-2">
              {ultimosPeriodos().map((x) => (
                <option key={x} value={x}>{nombrePeriodo(x)}</option>
              ))}
            </select>
            <button className="btn-secundario py-2">Ver</button>
          </form>
        </div>
        <ul className="tarjeta divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
          {consumos.length === 0 && <li className="p-4 text-zinc-500">Sin consumos.</li>}
          {consumos.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className={c.voided ? "text-zinc-400 line-through" : ""}>
                <p className="font-medium">{c.quantity} × {c.productName}</p>
                <p className="text-xs text-zinc-500">{fechaHora(c.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={c.voided ? "text-zinc-400 line-through" : "font-semibold"}>{pesos(c.unitPrice * c.quantity)}</span>
                {c.paymentId ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">cobrado</span>
                ) : (
                  <form action={alternarAnulado}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-xs text-zinc-500 underline">{c.voided ? "Restaurar" : "Anular"}</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
