import Link from "next/link";
import { db } from "@/lib/db";
import { exigirSocio } from "@/lib/session";
import { nombrePeriodo, periodoActual, pesos, fechaHora } from "@/lib/periodo";
import { consumosSinCobrar, estadoSocio, ESTADOS } from "@/lib/cuotas";
import { pagarOnline, salir, totalDelMes } from "../acciones";
import { mercadoPagoActivo, procesarPagoMP, type ResultadoPago } from "@/lib/mercadopago";
import Productos from "./Productos";
import BotonAnular from "./BotonAnular";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ payment_id?: string; pago?: string }> };

const MENSAJES_PAGO: Record<string, { texto: string; ok: boolean }> = {
  aprobado: { texto: "¡Pago aprobado! Ya quedó registrado.", ok: true },
  pendiente: { texto: "Tu pago está en proceso. Cuando Mercado Pago lo apruebe, se registra solo.", ok: true },
  rechazado: { texto: "El pago fue rechazado. Probá con otro medio de pago.", ok: false },
  desconocido: { texto: "No pudimos verificar el pago. Si te lo cobraron, avisá en recepción.", ok: false },
  error: { texto: "No se pudo iniciar el pago. Probá de nuevo en unos minutos.", ok: false },
  no_disponible: { texto: "El pago online todavía no está habilitado en este gimnasio.", ok: false },
};

export default async function Tienda({ searchParams }: Props) {
  const memberId = await exigirSocio();
  const periodo = periodoActual();

  // Si vuelve de Mercado Pago, verificamos el pago antes de mostrar la pantalla
  const { payment_id, pago: avisoPago } = await searchParams;
  let resultado: ResultadoPago | string | undefined = avisoPago;
  if (payment_id && mercadoPagoActivo()) {
    try {
      resultado = await procesarPagoMP(payment_id);
    } catch (e) {
      console.error("Error verificando pago", e);
      resultado = "pendiente";
    }
  }
  const mensajePago = resultado ? MENSAJES_PAGO[resultado] : undefined;

  const [{ socio, pago, estado, cfg }, pendientes, productos, consumos, total] = await Promise.all([
    estadoSocio(memberId, periodo),
    consumosSinCobrar(memberId),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.consumption.findMany({
      where: { memberId, period: periodo },
      orderBy: { createdAt: "desc" },
    }),
    totalDelMes(memberId, periodo),
  ]);

  const cuota = pago ? 0 : (socio.plan?.price ?? 0);
  const aPagar = cuota + pendientes.total;
  const porcentaje = Math.min(100, Math.round((total / socio.monthlyLimit) * 100));
  const ahora = Date.now();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black tracking-widest text-emerald-700 dark:text-emerald-400">TUTUKAPP</p>
          <p className="text-sm text-zinc-500">Hola,</p>
          <h1 className="text-xl font-bold">{socio.name.split(" ")[0]}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <Link href="/tienda/pin" className="underline">Cambiar PIN</Link>
          <form action={salir}>
            <button className="underline">Salir</button>
          </form>
        </div>
      </header>

      {mensajePago && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            mensajePago.ok
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {mensajePago.texto}
        </p>
      )}

      <section className="tarjeta">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">{pago ? "Tu próximo cobro" : `Tu cuota de ${nombrePeriodo(periodo)}`}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADOS[estado].clase}`}>
            {ESTADOS[estado].texto}
          </span>
        </div>
        <p className="mt-1 text-3xl font-bold">{pesos(aPagar)}</p>
        <p className="text-sm text-zinc-500">
          {cuota > 0 && <>Cuota {socio.plan?.name} {pesos(cuota)} + </>}consumos {pesos(pendientes.total)}
        </p>
        {estado === "pendiente" && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Vence el día {cfg.dueDay}</p>}
        {estado === "vencida" && (
          <p className="mt-1 text-xs text-red-700 dark:text-red-400">
            Tu cuota está vencida.{cfg.blockOverdue && " Pagala para seguir sumando consumos."}
          </p>
        )}
        {aPagar > 0 && mercadoPagoActivo() && (
          <form action={pagarOnline} className="mt-4">
            <button className="btn w-full bg-sky-500 text-white hover:bg-sky-600">
              Pagar {pesos(aPagar)} con Mercado Pago
            </button>
          </form>
        )}
      </section>

      <section className="tarjeta">
        <p className="text-sm text-zinc-500">Consumos de {nombrePeriodo(periodo)}</p>
        <p className="mt-1 text-xl font-bold">{pesos(total)}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full ${porcentaje > 85 ? "bg-amber-500" : "bg-emerald-600"}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">Tope mensual: {pesos(socio.monthlyLimit)}</p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">¿Qué sacaste?</h2>
        {productos.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay productos cargados.</p>
        ) : (
          <Productos productos={productos.map(({ id, name, price, emoji }) => ({ id, name, price, emoji }))} />
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Tus consumos del mes</h2>
        {consumos.length === 0 ? (
          <p className="text-sm text-zinc-500">Nada por ahora.</p>
        ) : (
          <ul className="tarjeta divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
            {consumos.map((c) => {
              const anulable = !c.voided && ahora - c.createdAt.getTime() < 10 * 60000;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className={c.voided ? "text-zinc-400 line-through" : ""}>
                    <p className="font-medium">
                      {c.quantity} × {c.productName}
                    </p>
                    <p className="text-xs text-zinc-500">{fechaHora(c.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={c.voided ? "text-zinc-400 line-through" : "font-semibold"}>
                      {pesos(c.unitPrice * c.quantity)}
                    </span>
                    {anulable && <BotonAnular id={c.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
