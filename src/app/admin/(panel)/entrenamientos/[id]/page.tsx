import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fechaAR } from "@/lib/clases";
import { mostrarResultado, ordenarRanking } from "@/lib/entreno";
import { actualizarEntreno, borrarEntreno, borrarResultadoAdmin, crearEntreno } from "../../../acciones";
import Avisos from "../../../Avisos";
import FormEntreno from "../../../FormEntreno";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function Entreno({ params, searchParams }: Props) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  if (id === "nuevo") {
    return (
      <main className="flex flex-col gap-5">
        <Link href="/admin/entrenamientos" className="text-sm text-zinc-500 underline">← Entrenamientos</Link>
        <h1 className="text-2xl font-bold">Nuevo entrenamiento</h1>
        <Avisos ok={ok} error={error} />
        <FormEntreno
          w={{ date: fechaAR(new Date()), title: "WOD", description: "", scoreType: "time", published: true }}
          accion={crearEntreno}
          boton="Publicar"
        />
      </main>
    );
  }

  const w = await db.workout.findUnique({
    where: { id },
    include: { results: { include: { member: { select: { name: true } } } } },
  });
  if (!w) notFound();
  const ranking = ordenarRanking(w.scoreType, w.results);

  return (
    <main className="flex flex-col gap-5">
      <Link href="/admin/entrenamientos" className="text-sm text-zinc-500 underline">← Entrenamientos</Link>
      <h1 className="text-2xl font-bold">{w.title}</h1>
      <Avisos ok={ok} error={error} />
      <FormEntreno w={w} accion={actualizarEntreno} boton="Guardar cambios" />

      {w.scoreType !== "none" && (
        <section className="tarjeta flex flex-col gap-2">
          <h2 className="font-semibold">Resultados ({ranking.length})</h2>
          {ranking.length === 0 && <p className="text-sm text-zinc-500">Nadie cargó resultado todavía.</p>}
          <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {ranking.map((r, i) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="mr-2 text-zinc-400 tabular-nums">{i + 1}.</span>
                  <Link href={`/admin/socios/${r.memberId}`} className="underline">{r.member.name}</Link>
                  {!r.rx && <span className="ml-2 rounded bg-zinc-200 px-1.5 text-xs dark:bg-zinc-700">adaptado</span>}
                  {r.notes && <span className="block text-xs text-zinc-500">{r.notes}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{mostrarResultado(w.scoreType, r.value)}</span>
                  <form action={borrarResultadoAdmin}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="workoutId" value={w.id} />
                    <button className="text-xs text-zinc-500 underline">Borrar</button>
                  </form>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <form action={borrarEntreno}>
        <input type="hidden" name="id" value={w.id} />
        <button className="text-sm text-red-600 underline">Borrar este entrenamiento</button>
      </form>
    </main>
  );
}
