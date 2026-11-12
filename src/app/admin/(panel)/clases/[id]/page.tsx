import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fechaAR, horaAR, nombreDia } from "@/lib/clases";
import { alternarSuspension, anotarSocio, cambiarCupo, quitarReserva } from "../../../acciones";
import Avisos from "../../../Avisos";
import Avatar from "../../../../Avatar";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function Clase({ params, searchParams }: Props) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const clase = await db.classSession.findUnique({
    where: { id },
    include: { bookings: { include: { member: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!clase) notFound();

  const confirmadas = clase.bookings.filter((b) => b.status === "confirmed");
  const espera = clase.bookings.filter((b) => b.status === "waitlist");
  const anotados = new Set([...confirmadas, ...espera].map((b) => b.memberId));
  const socios = await db.member.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  const Lista = ({ titulo, items, vacio }: { titulo: string; items: typeof confirmadas; vacio: string }) => (
    <section className="tarjeta flex flex-col gap-2">
      <h2 className="font-semibold">{titulo}</h2>
      {items.length === 0 && <p className="text-sm text-zinc-500">{vacio}</p>}
      <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {items.map((b, i) => (
          <li key={b.id} className="flex items-center justify-between gap-3 py-2">
            <span>
              <span className="mr-2 text-zinc-400 tabular-nums">{i + 1}.</span>
              <Link href={`/admin/socios/${b.memberId}`} className="inline-flex items-center gap-2 underline">
                <Avatar id={b.member.id} nombre={b.member.name} version={b.member.avatarVersion} tam={28} />
                {b.member.name}
              </Link>
            </span>
            <form action={quitarReserva}>
              <input type="hidden" name="bookingId" value={b.id} />
              <input type="hidden" name="sessionId" value={clase.id} />
              <button className="text-xs text-zinc-500 underline">Quitar</button>
            </form>
          </li>
        ))}
      </ol>
    </section>
  );

  return (
    <main className="flex flex-col gap-5">
      <Link href="/admin/clases" className="text-sm text-zinc-500 underline">← Clases</Link>
      <div>
        <h1 className="text-2xl font-bold">
          {clase.name} · {horaAR(clase.startsAt)}
        </h1>
        <p className="text-zinc-500">
          {nombreDia(fechaAR(clase.startsAt))} · {clase.durationMin} min{clase.coach && ` · ${clase.coach}`} ·{" "}
          {confirmadas.length}/{clase.capacity} lugares
          {clase.cancelled && <span className="ml-2 font-semibold text-red-600">SUSPENDIDA</span>}
        </p>
      </div>
      <Avisos ok={ok} error={error} />

      <div className="grid gap-4 md:grid-cols-2">
        <Lista titulo={`Anotados (${confirmadas.length})`} items={confirmadas} vacio="Nadie reservó todavía." />
        <div className="flex flex-col gap-4">
          <Lista titulo={`Lista de espera (${espera.length})`} items={espera} vacio="Sin lista de espera." />

          <form action={anotarSocio} className="tarjeta flex flex-col gap-3">
            <h2 className="font-semibold">Anotar socio</h2>
            <input type="hidden" name="sessionId" value={clase.id} />
            <select name="memberId" className="input" defaultValue="">
              <option value="">Elegí un socio…</option>
              {socios.filter((s) => !anotados.has(s.id)).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button className="btn-secundario">Anotar (aunque esté llena)</button>
          </form>

          <form action={cambiarCupo} className="tarjeta flex items-end gap-2">
            <input type="hidden" name="id" value={clase.id} />
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Cupo de esta clase
              <input name="capacity" defaultValue={clase.capacity} inputMode="numeric" className="input" />
            </label>
            <button className="btn-secundario">Cambiar</button>
          </form>

          <form action={alternarSuspension}>
            <input type="hidden" name="id" value={clase.id} />
            <button className={clase.cancelled ? "btn-secundario w-full" : "btn w-full bg-red-600 text-white hover:bg-red-700"}>
              {clase.cancelled ? "Reactivar clase" : "Suspender esta clase"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
