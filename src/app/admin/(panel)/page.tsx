import Link from "next/link";
import { db } from "@/lib/db";
import { nombrePeriodo, periodoActual, pesos, ultimosPeriodos } from "@/lib/periodo";

type Props = { searchParams: Promise<{ periodo?: string }> };

export default async function Resumen({ searchParams }: Props) {
  const { periodo: p } = await searchParams;
  const periodo = p && /^\d{4}-\d{2}$/.test(p) ? p : periodoActual();

  const [socios, consumos] = await Promise.all([
    db.member.findMany({ orderBy: { name: "asc" } }),
    db.consumption.findMany({ where: { period: periodo, voided: false } }),
  ]);

  // Sumamos los consumos de cada socio
  const totales = new Map<string, { monto: number; items: number }>();
  for (const c of consumos) {
    const t = totales.get(c.memberId) ?? { monto: 0, items: 0 };
    t.monto += c.unitPrice * c.quantity;
    t.items += c.quantity;
    totales.set(c.memberId, t);
  }
  const filas = socios
    .filter((s) => totales.has(s.id))
    .map((s) => ({ ...s, ...totales.get(s.id)! }))
    .sort((a, b) => b.monto - a.monto);
  const totalGeneral = filas.reduce((s, f) => s + f.monto, 0);

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Resumen de {nombrePeriodo(periodo)}</h1>
          <p className="text-zinc-500">Montos a sumar a la cuota de cada socio</p>
        </div>
        <form className="flex gap-2">
          <select name="periodo" defaultValue={periodo} className="input w-auto py-2">
            {ultimosPeriodos().map((x) => (
              <option key={x} value={x}>
                {nombrePeriodo(x)}
              </option>
            ))}
          </select>
          <button className="btn-secundario py-2">Ver</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="tarjeta">
          <p className="text-sm text-zinc-500">Total a cobrar</p>
          <p className="text-2xl font-bold">{pesos(totalGeneral)}</p>
        </div>
        <div className="tarjeta">
          <p className="text-sm text-zinc-500">Socios con consumos</p>
          <p className="text-2xl font-bold">{filas.length}</p>
        </div>
        <div className="tarjeta col-span-2 sm:col-span-1">
          <p className="text-sm text-zinc-500">Productos vendidos</p>
          <p className="text-2xl font-bold">{filas.reduce((s, f) => s + f.items, 0)}</p>
        </div>
      </div>

      <div className="tarjeta overflow-x-auto p-0">
        {filas.length === 0 ? (
          <p className="p-4 text-zinc-500">No hay consumos en este mes.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium">Socio</th>
                <th className="px-4 py-3 font-medium">DNI</th>
                <th className="px-4 py-3 text-right font-medium">Productos</th>
                <th className="px-4 py-3 text-right font-medium">A sumar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filas.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/socios/${f.id}?periodo=${periodo}`} className="font-medium underline">
                      {f.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{f.dni}</td>
                  <td className="px-4 py-3 text-right">{f.items}</td>
                  <td className="px-4 py-3 text-right font-semibold">{pesos(f.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <a href={`/admin/exportar?periodo=${periodo}`} className="btn-secundario self-start">
        ⬇ Descargar planilla (CSV)
      </a>
      <p className="text-sm text-zinc-500">
        Mientras no haya integración con CrossHero, usá esta lista para sumar cada monto a la cuota del socio.
      </p>
    </main>
  );
}
