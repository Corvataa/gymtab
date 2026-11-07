import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fechaHora, nombrePeriodo, periodoActual, pesos, ultimosPeriodos } from "@/lib/periodo";
import { actualizarSocio, agregarConsumoAdmin, alternarAnulado, cambiarPin } from "../../../acciones";
import Avisos from "../../../Avisos";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; periodo?: string }>;
};

export default async function Socio({ params, searchParams }: Props) {
  const { id } = await params;
  const { ok, error, periodo: p } = await searchParams;
  const periodo = p && /^\d{4}-\d{2}$/.test(p) ? p : periodoActual();

  const socio = await db.member.findUnique({ where: { id } });
  if (!socio) notFound();
  const [consumos, productos] = await Promise.all([
    db.consumption.findMany({ where: { memberId: id, period: periodo }, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const total = consumos.filter((c) => !c.voided).reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">{socio.name}</h1>
        <p className="text-zinc-500">DNI {socio.dni}</p>
      </div>
      <Avisos ok={ok} error={error} />

      <div className="grid gap-4 md:grid-cols-2">
        <form action={actualizarSocio} className="tarjeta flex flex-col gap-3">
          <h2 className="font-semibold">Datos</h2>
          <input type="hidden" name="id" value={socio.id} />
          <label className="flex flex-col gap-1 text-sm">
            Nombre
            <input name="name" defaultValue={socio.name} required className="input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tope mensual ($)
            <input name="monthlyLimit" defaultValue={socio.monthlyLimit} inputMode="numeric" className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={socio.active} className="h-5 w-5" />
            Activo (si lo destildás, no puede sumar consumos)
          </label>
          <button className="btn-primario">Guardar</button>
        </form>

        <div className="flex flex-col gap-4">
          <form action={agregarConsumoAdmin} className="tarjeta flex flex-col gap-3">
            <h2 className="font-semibold">Anotar consumo (recepción)</h2>
            <input type="hidden" name="memberId" value={socio.id} />
            <div className="flex gap-2">
              <select name="productId" required className="input">
                {productos.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.emoji} {pr.name} — {pesos(pr.price)}
                  </option>
                ))}
              </select>
              <input name="cantidad" defaultValue={1} inputMode="numeric" className="input w-20" />
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
          <h2 className="text-lg font-semibold">
            Consumos de {nombrePeriodo(periodo)}: {pesos(total)}
          </h2>
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
                <span className={c.voided ? "text-zinc-400 line-through" : "font-semibold"}>
                  {pesos(c.unitPrice * c.quantity)}
                </span>
                <form action={alternarAnulado}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs underline text-zinc-500">{c.voided ? "Restaurar" : "Anular"}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
