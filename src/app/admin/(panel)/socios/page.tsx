import Link from "next/link";
import { db } from "@/lib/db";
import { resumenSocios } from "@/lib/cuotas";
import { periodoActual, pesos } from "@/lib/periodo";
import { aprobarActivacion, aprobarSocio, asignarPlanVarios, crearSocio, rechazarActivacion, rechazarSocio } from "../../acciones";
import Avisos from "../../Avisos";
import EtiquetaEstado from "../../Estado";

type Props = { searchParams: Promise<{ ok?: string; error?: string; q?: string; filtro?: string }> };

const FILTROS = {
  todos: { texto: "Todos", where: {} },
  sinplan: { texto: "Sin plan", where: { planId: null, active: true } },
  sinactivar: { texto: "Sin activar", where: { pinHash: null } },
  pausados: { texto: "Pausados", where: { active: false } },
} as const;

export default async function Socios({ searchParams }: Props) {
  const { ok, error, q, filtro: f } = await searchParams;
  const filtro = f && f in FILTROS ? (f as keyof typeof FILTROS) : "todos";
  const [solicitudes, activaciones, socios, planes, { filas }, cuentas] = await Promise.all([
    db.member.findMany({ where: { approved: false }, include: { plan: true }, orderBy: { createdAt: "asc" } }),
    db.member.findMany({ where: { pendingPinHash: { not: null } }, include: { plan: true }, orderBy: { activationRequestedAt: "asc" } }),
    db.member.findMany({
      where: {
        approved: true,
        ...FILTROS[filtro].where,
        ...(q
          ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { dni: { contains: q } }, { email: { contains: q.toLowerCase() } }] }
          : {}),
      },
      include: { plan: true },
      orderBy: { name: "asc" },
    }),
    db.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
    resumenSocios(periodoActual()),
    Promise.all(Object.values(FILTROS).map((x) => db.member.count({ where: { approved: true, ...x.where } }))),
  ]);
  const estados = new Map(filas.map((f) => [f.socio.id, f]));
  const cantidad = Object.fromEntries(
    Object.keys(FILTROS).map((k, i) => [k, cuentas[i]]),
  ) as Record<keyof typeof FILTROS, number>;

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Socios</h1>
        <Link href="/admin/socios/importar" className="btn-secundario py-2 text-sm">⬆ Importar desde Excel</Link>
      </div>
      <Avisos ok={ok} error={error} />

      {activaciones.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-orange-500/50 bg-orange-500/5 p-4">
          <h2 className="text-xl font-bold uppercase">
            Activaciones de cuenta <span className="text-orange-500">({activaciones.length})</span>
          </h2>
          <p className="-mt-2 text-sm text-zinc-400">
            Socios que ya estaban en el gimnasio y pidieron activar su cuenta. Confirmá que sean ellos y aprobalos.
          </p>
          <ul className="flex flex-col gap-2">
            {activaciones.map((s) => (
              <li key={s.id} className="tarjeta flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-zinc-400">
                    {s.email} · DNI {s.pendingDni}
                    {s.dni === s.pendingDni && <span className="text-green-400"> · coincide con el DNI que tenía cargado ✓</span>}
                    {s.phone && ` · ${s.phone}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={aprobarActivacion} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <select name="planId" defaultValue={s.planId ?? ""} className="input w-auto py-2 text-sm" aria-label="Plan">
                      <option value="">{s.plan ? `Mantener ${s.plan.name}` : "Sin plan"}</option>
                      {planes.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {pesos(p.price)}</option>
                      ))}
                    </select>
                    <button className="btn-primario py-2 text-sm">Aprobar</button>
                  </form>
                  <form action={rechazarActivacion}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn-secundario py-2 text-sm">Rechazar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {solicitudes.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-orange-500/50 bg-orange-500/5 p-4">
          <h2 className="text-xl font-bold uppercase">
            Solicitudes de alta <span className="text-orange-500">({solicitudes.length})</span>
          </h2>
          <p className="-mt-2 text-sm text-zinc-400">Se anotaron desde la app. Revisá los datos, elegí el plan y aprobalos.</p>
          <ul className="flex flex-col gap-2">
            {solicitudes.map((s) => (
              <li key={s.id} className="tarjeta flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-zinc-400">
                    DNI {s.dni}
                    {s.phone && ` · ${s.phone}`}
                    {s.email && ` · ${s.email}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={aprobarSocio} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <select name="planId" defaultValue={s.planId ?? ""} className="input w-auto py-2 text-sm" aria-label="Plan">
                      <option value="">Sin plan</option>
                      {planes.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {pesos(p.price)}</option>
                      ))}
                    </select>
                    <button className="btn-primario py-2 text-sm">Aprobar</button>
                  </form>
                  <form action={rechazarSocio}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn-secundario py-2 text-sm">Rechazar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
        <p className="-mt-2 text-sm text-yellow-700 dark:text-yellow-400">
          Tip: primero creá los <Link href="/admin/planes" className="underline">planes</Link> para poder asignarlos.
        </p>
      )}

      <form className="flex gap-2">
        <input type="hidden" name="filtro" value={filtro} />
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, DNI o email" className="input" />
        <button className="btn-secundario">Buscar</button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(FILTROS) as (keyof typeof FILTROS)[]).map((k) => (
          <Link
            key={k}
            href={`/admin/socios?filtro=${k}`}
            className={`rounded-full px-3 py-1 ${filtro === k ? "bg-orange-500 font-semibold text-black" : "bg-white/10 hover:bg-white/15"}`}
          >
            {FILTROS[k].texto} ({cantidad[k]})
          </Link>
        ))}
      </div>

      {/* Asignar plan a los socios marcados */}
      <form id="asignar" action={asignarPlanVarios} className="tarjeta flex flex-wrap items-center gap-2 py-3">
        <input type="hidden" name="filtro" value={filtro} />
        <span className="text-sm text-zinc-400">Marcá socios en la lista y asignales un plan:</span>
        <select name="planId" className="input w-auto py-2 text-sm" aria-label="Plan a asignar" defaultValue={planes[0]?.id ?? ""}>
          {planes.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {pesos(p.price)}</option>
          ))}
          <option value="">Quitar plan</option>
        </select>
        <button className="btn-primario py-2 text-sm">Asignar plan</button>
      </form>

      <ul className="tarjeta divide-y divide-white/10 p-0">
        {socios.length === 0 && <li className="p-4 text-zinc-500">No hay socios en esta lista.</li>}
        {socios.map((s) => {
          const f = estados.get(s.id);
          return (
            <li key={s.id} className="flex items-center gap-3 pl-4 hover:bg-white/5">
              <input type="checkbox" name="ids" value={s.id} form="asignar" className="h-5 w-5 shrink-0 accent-orange-500" aria-label={`Marcar a ${s.name}`} />
              <Link href={`/admin/socios/${s.id}`} className="flex flex-1 items-center justify-between gap-3 py-3 pr-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="truncate text-sm text-zinc-500">
                    {s.dni ? `DNI ${s.dni}` : s.email ?? "sin DNI"} · {s.plan?.name ?? "sin plan"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {!s.pinHash && (
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300 ring-1 ring-sky-500/30">
                      {s.pendingPinHash ? "activación pendiente" : "sin activar"}
                    </span>
                  )}
                  {s.active && f ? (
                    <EtiquetaEstado estado={f.estado} />
                  ) : (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">pausado</span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
