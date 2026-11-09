import Link from "next/link";
import { ESTADOS, resumenSocios, type Estado } from "@/lib/cuotas";
import { esPeriodo, nombrePeriodo, periodoActual, periodosCobro, pesos } from "@/lib/periodo";
import EtiquetaEstado from "../Estado";

type Props = { searchParams: Promise<{ periodo?: string; estado?: string }> };

export default async function Inicio({ searchParams }: Props) {
  const { periodo: p, estado: filtro } = await searchParams;
  const periodo = esPeriodo(p) ? p : periodoActual();
  const { filas, pagos, cfg } = await resumenSocios(periodo);

  const cuenta = (e: Estado) => filas.filter((f) => f.estado === e).length;
  const cobrado = pagos.reduce((s, x) => s + x.total, 0);
  const porCobrar = filas.filter((f) => f.estado !== "al_dia").reduce((s, f) => s + f.aCobrar, 0);
  const visibles = filtro && filtro in ESTADOS ? filas.filter((f) => f.estado === filtro) : filas;
  const url = (e?: string) => `/admin?periodo=${periodo}${e ? `&estado=${e}` : ""}`;

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cuotas de {nombrePeriodo(periodo)}</h1>
          <p className="text-zinc-500">Vencen el día {cfg.dueDay} de cada mes</p>
        </div>
        <form className="flex gap-2">
          <select name="periodo" defaultValue={periodo} className="input w-auto py-2">
            {periodosCobro().map((x) => (
              <option key={x} value={x}>{nombrePeriodo(x)}</option>
            ))}
          </select>
          <button className="btn-secundario py-2">Ver</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="tarjeta">
          <p className="text-sm text-zinc-500">Cobrado</p>
          <p className="text-2xl font-bold">{pesos(cobrado)}</p>
          <p className="text-xs text-zinc-500">{pagos.length} cobros</p>
        </div>
        <div className="tarjeta">
          <p className="text-sm text-zinc-500">Falta cobrar</p>
          <p className="text-2xl font-bold">{pesos(porCobrar)}</p>
          <p className="text-xs text-zinc-500">cuotas + consumos</p>
        </div>
        <Link href={url("al_dia")} className="tarjeta hover:border-emerald-600">
          <p className="text-sm text-zinc-500">Al día</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{cuenta("al_dia")}</p>
        </Link>
        <Link href={url("vencida")} className="tarjeta hover:border-red-600">
          <p className="text-sm text-zinc-500">Vencidas · Pendientes</p>
          <p className="text-2xl font-bold">
            <span className="text-red-700 dark:text-red-400">{cuenta("vencida")}</span>
            <span className="text-zinc-400"> · </span>
            <span className="text-amber-700 dark:text-amber-400">{cuenta("pendiente")}</span>
          </p>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={url()} className={`rounded-full px-3 py-1 ${!filtro ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-200 dark:bg-zinc-800"}`}>
          Todos ({filas.length})
        </Link>
        {(Object.keys(ESTADOS) as Estado[]).map((e) => (
          <Link key={e} href={url(e)} className={`rounded-full px-3 py-1 ${filtro === e ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-200 dark:bg-zinc-800"}`}>
            {ESTADOS[e].texto} ({cuenta(e)})
          </Link>
        ))}
      </div>

      <div className="tarjeta overflow-x-auto p-0">
        {visibles.length === 0 ? (
          <p className="p-4 text-zinc-500">No hay socios en esta lista.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium">Socio</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Cuota</th>
                <th className="px-4 py-3 text-right font-medium">Consumos</th>
                <th className="px-4 py-3 text-right font-medium">A cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {visibles.map((f) => (
                <tr key={f.socio.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/socios/${f.socio.id}?periodo=${periodo}`} className="font-medium underline">
                      {f.socio.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{f.socio.plan?.name ?? "—"}</td>
                  <td className="px-4 py-3"><EtiquetaEstado estado={f.estado} /></td>
                  <td className="px-4 py-3 text-right">{f.pago ? <span className="text-zinc-400">pagada</span> : pesos(f.cuota)}</td>
                  <td className="px-4 py-3 text-right">{pesos(f.consumos)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{pesos(f.aCobrar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <a href={`/admin/exportar?periodo=${periodo}`} className="btn-secundario self-start">
        ⬇ Descargar planilla (CSV)
      </a>
    </main>
  );
}
