import Link from "next/link";
import { db } from "@/lib/db";
import { exigirSocio } from "@/lib/session";
import { nombrePeriodo, periodoActual, pesos } from "@/lib/periodo";
import { consumosSinCobrar, estadoSocio, ESTADOS } from "@/lib/cuotas";
import { fechaAR, horaAR, nombreDia, sumarDias } from "@/lib/clases";
import { mostrarResultado } from "@/lib/entreno";
import { mercadoPagoActivo, procesarPagoMP, type ResultadoPago } from "@/lib/mercadopago";
import { pagarOnline } from "../acciones";
import EncabezadoSocio from "../EncabezadoSocio";
import NavSocio from "../NavSocio";
import { IconoClases, IconoEntreno, IconoTienda } from "../Iconos";
import CartelInstalar from "../CartelInstalar";

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

// Título de cada tarjeta del resumen
const Titulo = ({ children, href, accion }: { children: React.ReactNode; href?: string; accion?: string }) => (
  <div className="flex items-center justify-between gap-2">
    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{children}</h2>
    {href && accion && (
      <Link href={href} className="text-sm font-semibold text-orange-500 hover:text-orange-400">
        {accion} →
      </Link>
    )}
  </div>
);

export default async function Inicio({ searchParams }: Props) {
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

  const hoy = fechaAR(new Date());
  const [{ socio, pago, estado, cfg }, pendientes, proxima, entrenos, fotos] = await Promise.all([
    estadoSocio(memberId, periodo),
    consumosSinCobrar(memberId),
    db.booking.findFirst({
      where: { memberId, status: { in: ["confirmed", "waitlist"] }, session: { startsAt: { gt: new Date() }, cancelled: false } },
      include: { session: true },
      orderBy: { session: { startsAt: "asc" } },
    }),
    db.workout.findMany({
      where: { date: hoy, published: true },
      orderBy: { createdAt: "asc" },
      include: { results: { where: { memberId } } },
    }),
    db.gymPhoto.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 4, select: { id: true, date: true } }),
  ]);

  const cuota = pago ? 0 : (socio.plan?.price ?? 0);
  const aPagar = cuota + pendientes.total;
  const diaClase = proxima ? fechaAR(proxima.session.startsAt) : null;
  const etiquetaDia = (f: string) => (f === hoy ? "Hoy" : f === sumarDias(hoy, 1) ? "Mañana" : nombreDia(f));

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-28 pt-6">
      <EncabezadoSocio titulo={socio.nickname || socio.name.split(" ")[0]} subtitulo="Hola," />

      {mensajePago && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            mensajePago.ok ? "bg-orange-500/15 text-orange-300" : "bg-red-500/15 text-red-300"
          }`}
        >
          {mensajePago.texto}
        </p>
      )}

      {/* Cuota */}
      <section className="tarjeta flex flex-col gap-1 border-orange-500/30">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            {pago ? "Tu próximo pago" : `Cuota de ${nombrePeriodo(periodo)}`}
          </h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADOS[estado].clase}`}>{ESTADOS[estado].texto}</span>
        </div>
        <p className="font-display text-5xl font-extrabold">{pesos(aPagar)}</p>
        <p className="text-sm text-zinc-400">
          {cuota > 0 && <>Cuota {socio.plan?.name} {pesos(cuota)}</>}
          {cuota > 0 && pendientes.total > 0 && " + "}
          {pendientes.total > 0 && <>tienda {pesos(pendientes.total)}</>}
          {aPagar === 0 && "Estás al día. ¡A entrenar!"}
        </p>
        {estado === "pendiente" && <p className="text-xs text-yellow-300">Vence el día {cfg.dueDay}</p>}
        {estado === "vencida" && <p className="text-xs text-red-400">Tu cuota está vencida.</p>}
        {aPagar > 0 && mercadoPagoActivo() && (
          <form action={pagarOnline} className="mt-3">
            <button className="btn w-full bg-sky-500 font-bold text-white hover:bg-sky-400">Pagar con Mercado Pago</button>
          </form>
        )}
      </section>

      {/* Próxima clase */}
      <section className="tarjeta flex flex-col gap-3">
        <Titulo href="/clases" accion={proxima ? "Ver clases" : undefined}>Tu próxima clase</Titulo>
        {proxima && diaClase ? (
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-orange-500 text-black">
              <IconoClases className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold uppercase leading-tight">
                {etiquetaDia(diaClase)} · {horaAR(proxima.session.startsAt)}
              </p>
              <p className="text-sm text-zinc-400">
                {proxima.session.name}
                {proxima.status === "waitlist" && <span className="text-yellow-300"> · en lista de espera</span>}
              </p>
            </div>
          </div>
        ) : (
          <Link href="/clases" className="btn-secundario">
            <IconoClases className="h-5 w-5" /> Reservar una clase
          </Link>
        )}
      </section>

      {/* Entrenamiento de hoy */}
      <section className="tarjeta flex flex-col gap-3">
        <Titulo href="/entreno" accion={entrenos.length ? "Ver" : undefined}>Entrenamiento de hoy</Titulo>
        {entrenos.length === 0 ? (
          <p className="text-sm text-zinc-500">El coach todavía no publicó el entrenamiento de hoy.</p>
        ) : (
          entrenos.map((w) => (
            <Link key={w.id} href="/entreno" className="flex items-start gap-4 rounded-xl hover:bg-white/5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/10 text-orange-500">
                <IconoEntreno className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold uppercase leading-tight">{w.title}</p>
                <p className="line-clamp-2 text-sm text-zinc-400">{w.description}</p>
                {w.results[0] && (
                  <p className="mt-1 text-sm font-semibold text-orange-500">
                    Tu resultado: {mostrarResultado(w.scoreType, w.results[0].value)}
                  </p>
                )}
              </div>
            </Link>
          ))
        )}
      </section>

      {/* Fotos del día */}
      {fotos.length > 0 && (
        <Link href="/fotos" className="tarjeta flex flex-col gap-3 hover:border-orange-500/50">
          <Titulo>Fotos {fotos[0].date === hoy ? "de hoy" : "del gimnasio"}</Titulo>
          <div className="grid grid-cols-4 gap-1.5">
            {fotos.map((f) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.id} src={`/fotos/${f.id}/mini`} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </div>
          <span className="text-sm font-semibold text-orange-500">Ver todas y compartir →</span>
        </Link>
      )}

      {/* Tienda */}
      <Link href="/tienda" className="tarjeta flex items-center gap-4 hover:border-orange-500/50">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/10 text-orange-500">
          <IconoTienda className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <p className="font-display text-2xl font-bold uppercase leading-tight">Tienda</p>
          <p className="text-sm text-zinc-400">
            {pendientes.total > 0
              ? `${pesos(pendientes.total)} sin pagar · se suma a tu cuota`
              : "Agua, bebidas y más: lo sacás y se suma a tu cuota"}
          </p>
        </div>
        <span className="text-orange-500" aria-hidden>→</span>
      </Link>

      <CartelInstalar conBarra />
      <NavSocio activa="inicio" />
    </main>
  );
}
