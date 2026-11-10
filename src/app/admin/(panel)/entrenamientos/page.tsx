import Link from "next/link";
import { db } from "@/lib/db";
import { fechaAR, nombreDia, sumarDias } from "@/lib/clases";
import { TIPOS } from "@/lib/entreno";
import Avisos from "../../Avisos";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function Entrenamientos({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const hoy = fechaAR(new Date());
  const entrenos = await db.workout.findMany({
    where: { date: { gte: sumarDias(hoy, -30) } },
    orderBy: [{ date: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { results: true } } },
  });

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Entrenamientos</h1>
          <p className="text-zinc-500">El entrenamiento del día que ven los socios. Últimos 30 días y próximos.</p>
        </div>
        <Link href="/admin/entrenamientos/nuevo" className="btn-primario">+ Nuevo entrenamiento</Link>
      </div>
      <Avisos ok={ok} error={error} />

      <ul className="tarjeta divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
        {entrenos.length === 0 && <li className="p-4 text-zinc-500">Todavía no cargaste entrenamientos.</li>}
        {entrenos.map((w) => (
          <li key={w.id}>
            <Link href={`/admin/entrenamientos/${w.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div>
                <p className="font-medium">
                  {w.date === hoy ? "Hoy" : nombreDia(w.date)} · {w.title}
                  {!w.published && <span className="ml-2 rounded bg-zinc-200 px-1.5 text-xs dark:bg-zinc-700">borrador</span>}
                  {w.date > hoy && <span className="ml-2 rounded bg-sky-100 px-1.5 text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-300">programado</span>}
                </p>
                <p className="line-clamp-1 text-sm text-zinc-500">{w.description}</p>
              </div>
              <span className="shrink-0 text-sm text-zinc-500">
                {w.scoreType === "none" ? TIPOS.none.corto : `${w._count.results} resultado${w._count.results === 1 ? "" : "s"}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
