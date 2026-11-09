import Link from "next/link";
import { db } from "@/lib/db";
import { resumenSocios } from "@/lib/cuotas";
import { periodoActual, pesos } from "@/lib/periodo";
import { crearSocio } from "../../acciones";
import Avisos from "../../Avisos";
import EtiquetaEstado from "../../Estado";

type Props = { searchParams: Promise<{ ok?: string; error?: string; q?: string }> };

export default async function Socios({ searchParams }: Props) {
  const { ok, error, q } = await searchParams;
  const [socios, planes, { filas }] = await Promise.all([
    db.member.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { dni: { contains: q } }] } : undefined,
      include: { plan: true },
      orderBy: { name: "asc" },
    }),
    db.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
    resumenSocios(periodoActual()),
  ]);
  const estados = new Map(filas.map((f) => [f.socio.id, f]));

  return (
    <main className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Socios</h1>
      <Avisos ok={ok} error={error} />

      <form action={crearSocio} className="tarjeta grid gap-3 sm:grid-cols-6">
        <input name="name" placeholder="Nombre y apellido" required className="input sm:col-span-2" />
        <input name="dni" placeholder="DNI" inputMode="numeric" required className="input" />
        <input name="phone" placeholder="Teléfono" inputMode="tel" className="input" />
        <input name="pin" placeholder="PIN (4-6 números)" inputMode="numeric" maxLength={6} required className="input sm:col-span-2" />
        <select name="planId" className="input sm:col-span-3" defaultValue="">
          <option value="">Sin plan</option>
          {planes.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {pesos(p.price)}</option>
          ))}
        </select>
        <input name="monthlyLimit" placeholder="Tope de consumos $ (20000)" inputMode="numeric" className="input sm:col-span-3" />
        <button className="btn-primario sm:col-span-6">+ Agregar socio</button>
      </form>
      {planes.length === 0 && (
        <p className="-mt-2 text-sm text-amber-700 dark:text-amber-400">
          Tip: primero creá los <Link href="/admin/planes" className="underline">planes</Link> para poder asignarlos.
        </p>
      )}

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o DNI" className="input" />
        <button className="btn-secundario">Buscar</button>
      </form>

      <ul className="tarjeta divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
        {socios.length === 0 && <li className="p-4 text-zinc-500">No hay socios.</li>}
        {socios.map((s) => {
          const f = estados.get(s.id);
          return (
            <li key={s.id}>
              <Link href={`/admin/socios/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-zinc-500">DNI {s.dni} · {s.plan?.name ?? "sin plan"}</p>
                </div>
                {s.active && f ? (
                  <EtiquetaEstado estado={f.estado} />
                ) : (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-700">pausado</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
