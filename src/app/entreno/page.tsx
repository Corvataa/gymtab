import Link from "next/link";
import { db } from "@/lib/db";
import { exigirSocio } from "@/lib/session";
import { fechaAR, nombreDia, sumarDias } from "@/lib/clases";
import { TIPOS, mostrarResultado, nombreCorto, ordenarRanking } from "@/lib/entreno";
import EncabezadoSocio from "../EncabezadoSocio";
import NavSocio from "../NavSocio";
import FormResultado from "./FormResultado";
import Avatar from "../Avatar";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ fecha?: string }> };

export default async function Entreno({ searchParams }: Props) {
  const memberId = await exigirSocio();
  const hoy = fechaAR(new Date());
  const { fecha: f } = await searchParams;
  const fecha = f && /^\d{4}-\d{2}-\d{2}$/.test(f) && f <= hoy ? f : hoy;

  const entrenos = await db.workout.findMany({
    where: { date: fecha, published: true },
    orderBy: { createdAt: "asc" },
    include: { results: { include: { member: { select: { id: true, name: true, nickname: true, avatarVersion: true } } } } },
  });

  const etiquetaDia = fecha === hoy ? "Hoy" : fecha === sumarDias(hoy, -1) ? "Ayer" : nombreDia(fecha);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-28 pt-6">
      <EncabezadoSocio titulo="Entrenamiento" />

      <div className="flex items-center justify-between">
        <Link href={`/entreno?fecha=${sumarDias(fecha, -1)}`} className="btn-secundario px-3 py-2" aria-label="Día anterior">←</Link>
        <p className="font-semibold">{etiquetaDia}</p>
        {fecha < hoy ? (
          <Link href={`/entreno?fecha=${sumarDias(fecha, 1)}`} className="btn-secundario px-3 py-2" aria-label="Día siguiente">→</Link>
        ) : (
          <span className="w-11" />
        )}
      </div>

      {entrenos.length === 0 && (
        <p className="tarjeta text-center text-zinc-500">Todavía no hay entrenamiento publicado para este día.</p>
      )}

      {entrenos.map((w) => {
        const ranking = ordenarRanking(w.scoreType, w.results);
        const mio = w.results.find((r) => r.memberId === memberId);
        return (
          <article key={w.id} className="flex flex-col gap-3">
            <section className="tarjeta">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">{w.title}</h2>
                {w.scoreType !== "none" && (
                  <span className="text-xs text-zinc-500">{TIPOS[w.scoreType as keyof typeof TIPOS]?.corto}</span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-line leading-relaxed">{w.description}</p>
            </section>

            {w.scoreType !== "none" && (
              <>
                <FormResultado
                  workoutId={w.id}
                  tipo={w.scoreType}
                  actual={mio ? { value: mio.value, rx: mio.rx, notes: mio.notes ?? "" } : undefined}
                />
                <section className="tarjeta overflow-hidden p-0">
                  <h3 className="border-b border-zinc-200 px-4 py-2 font-semibold dark:border-zinc-800">
                    Ranking ({ranking.length})
                  </h3>
                  {ranking.length === 0 && <p className="px-4 py-3 text-sm text-zinc-500">Sé el primero en cargar tu resultado.</p>}
                  <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {ranking.map((r, i) => (
                      <li
                        key={r.id}
                        className={`flex items-center justify-between gap-3 px-4 py-2 ${
                          r.memberId === memberId ? "bg-orange-50 dark:bg-orange-950/40" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-6 text-right text-sm text-zinc-400 tabular-nums">{i + 1}</span>
                          <Avatar id={r.member.id} nombre={r.member.name} version={r.member.avatarVersion} tam={30} />
                          <span className="font-medium">{r.member.nickname || nombreCorto(r.member.name)}</span>
                          {!r.rx && <span className="rounded bg-zinc-200 px-1.5 text-xs dark:bg-zinc-700">adaptado</span>}
                        </span>
                        <span className="font-semibold tabular-nums">{mostrarResultado(w.scoreType, r.value)}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </article>
        );
      })}
      <NavSocio activa="entreno" />
    </main>
  );
}
