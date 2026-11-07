import Link from "next/link";
import { db } from "@/lib/db";
import { pesos } from "@/lib/periodo";
import { crearSocio } from "../../acciones";
import Avisos from "../../Avisos";

type Props = { searchParams: Promise<{ ok?: string; error?: string; q?: string }> };

export default async function Socios({ searchParams }: Props) {
  const { ok, error, q } = await searchParams;
  const socios = await db.member.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { dni: { contains: q } }] } : undefined,
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Socios</h1>
      <Avisos ok={ok} error={error} />

      <form action={crearSocio} className="tarjeta grid gap-3 sm:grid-cols-5">
        <input name="name" placeholder="Nombre y apellido" required className="input sm:col-span-2" />
        <input name="dni" placeholder="DNI" inputMode="numeric" required className="input" />
        <input name="pin" placeholder="PIN (4-6 números)" inputMode="numeric" maxLength={6} required className="input" />
        <input name="monthlyLimit" placeholder="Tope $ (20000)" inputMode="numeric" className="input" />
        <button className="btn-primario sm:col-span-5">+ Agregar socio</button>
      </form>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o DNI" className="input" />
        <button className="btn-secundario">Buscar</button>
      </form>

      <ul className="tarjeta divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
        {socios.length === 0 && <li className="p-4 text-zinc-500">No hay socios.</li>}
        {socios.map((s) => (
          <li key={s.id}>
            <Link href={`/admin/socios/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div>
                <p className="font-medium">
                  {s.name} {!s.active && <span className="ml-1 rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">pausado</span>}
                </p>
                <p className="text-sm text-zinc-500">DNI {s.dni}</p>
              </div>
              <span className="text-sm text-zinc-500">tope {pesos(s.monthlyLimit)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
