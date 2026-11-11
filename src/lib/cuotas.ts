// Lógica de cuotas: estado de cada socio y cuánto hay que cobrarle.
import { db } from "./db";
import { diaDelMes, periodoActual } from "./periodo";

export type Estado = "al_dia" | "pendiente" | "vencida" | "sin_plan";

export const ESTADOS: Record<Estado, { texto: string; clase: string }> = {
  al_dia: { texto: "Al día", clase: "bg-green-500/15 text-green-400 ring-1 ring-green-500/30" },
  pendiente: { texto: "Pendiente", clase: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30" },
  vencida: { texto: "Vencida", clase: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30" },
  sin_plan: { texto: "Sin plan", clase: "bg-white/10 text-zinc-300 ring-1 ring-white/15" },
};

export const METODOS = ["efectivo", "transferencia", "tarjeta", "mercadopago"] as const;

// Lee la configuración del gimnasio (la crea si no existe)
// (no trae la imagen del logo, que es pesada: para eso está la dirección /logo)
export async function configuracion() {
  const omit = { logo: true } as const;
  const cfg = await db.settings.findUnique({ where: { id: 1 }, omit });
  if (cfg) return cfg;
  try {
    return await db.settings.create({ data: { id: 1 }, omit });
  } catch {
    // Otra parte de la página la creó al mismo tiempo: la leemos
    return db.settings.findUniqueOrThrow({ where: { id: 1 }, omit });
  }
}

// Estado de la cuota de un mes, sabiendo si está paga y el día de vencimiento
export function calcularEstado(
  tienePlan: boolean,
  pagado: boolean,
  periodo: string,
  diaVencimiento: number,
): Estado {
  if (pagado) return "al_dia";
  if (!tienePlan) return "sin_plan";
  const actual = periodoActual();
  if (periodo < actual) return "vencida";
  if (periodo > actual) return "pendiente";
  return diaDelMes() <= diaVencimiento ? "pendiente" : "vencida";
}

// Consumos que todavía no se incluyeron en ningún cobro
export async function consumosSinCobrar(memberId: string) {
  const consumos = await db.consumption.findMany({
    where: { memberId, voided: false, paymentId: null },
    select: { id: true, unitPrice: true, quantity: true },
  });
  return { ids: consumos.map((c) => c.id), total: consumos.reduce((s, c) => s + c.unitPrice * c.quantity, 0) };
}

// Estado de cuota de un socio para un mes
export async function estadoSocio(memberId: string, periodo = periodoActual()) {
  const [socio, pago, cfg] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: memberId }, include: { plan: true } }),
    db.payment.findFirst({ where: { memberId, period: periodo, voided: false, coversFee: true } }),
    configuracion(),
  ]);
  return { socio, pago, estado: calcularEstado(!!socio.planId, !!pago, periodo, cfg.dueDay), cfg };
}

// Para el panel: estado y montos de todos los socios activos en un mes
export async function resumenSocios(periodo: string) {
  const [socios, pagos, pendientes, cfg] = await Promise.all([
    db.member.findMany({ where: { active: true, approved: true }, include: { plan: true }, orderBy: { name: "asc" } }),
    db.payment.findMany({ where: { period: periodo, voided: false } }),
    db.consumption.findMany({
      where: { voided: false, paymentId: null },
      select: { memberId: true, unitPrice: true, quantity: true },
    }),
    configuracion(),
  ]);

  // Solo los cobros que incluyen la cuota dejan al socio "al día"
  const pagoPorSocio = new Map(pagos.filter((p) => p.coversFee).map((p) => [p.memberId, p]));
  const consumosPorSocio = new Map<string, number>();
  for (const c of pendientes) {
    consumosPorSocio.set(c.memberId, (consumosPorSocio.get(c.memberId) ?? 0) + c.unitPrice * c.quantity);
  }

  const filas = socios.map((s) => {
    const pago = pagoPorSocio.get(s.id);
    const consumos = consumosPorSocio.get(s.id) ?? 0;
    const cuota = pago ? 0 : (s.plan?.price ?? 0);
    return {
      socio: s,
      pago,
      estado: calcularEstado(!!s.planId, !!pago, periodo, cfg.dueDay),
      cuota,
      consumos,
      aCobrar: cuota + consumos,
    };
  });
  return { filas, pagos, cfg };
}
