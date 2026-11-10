// Lógica de clases y reservas.
// Las fechas se manejan en hora de Argentina (UTC-3, sin horario de verano).
import { db } from "./db";
import { configuracion, estadoSocio } from "./cuotas";

const OFFSET = "-03:00";
const TZ = "America/Argentina/Buenos_Aires";

export const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// ---------- Fechas ----------

// "2026-11-10" (fecha local de Argentina)
export function fechaAR(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// "07:00"
export function horaAR(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

// 1 = lunes ... 7 = domingo
export function diaSemana(fecha: string): number {
  const d = new Date(`${fecha}T12:00:00${OFFSET}`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function aFecha(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00${OFFSET}`);
}

// "Martes 10/11"
export function nombreDia(fecha: string): string {
  const [, m, d] = fecha.split("-");
  return `${DIAS[diaSemana(fecha)]} ${d}/${m}`;
}

// Semana (lunes a domingo) que contiene una fecha
export function rangoSemana(d: Date) {
  const f = fechaAR(d);
  const lunes = sumarDias(f, 1 - diaSemana(f));
  return { desde: aFecha(lunes, "00:00"), hasta: aFecha(sumarDias(lunes, 7), "00:00") };
}

export const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

// ---------- Generar clases a partir de los horarios ----------

// Crea las clases de los próximos días que todavía no existen
export async function asegurarClases(dias: number) {
  const horarios = await db.classSchedule.findMany({ where: { active: true } });
  if (!horarios.length) return;
  const hoy = fechaAR(new Date());
  const nuevas = [];
  for (let i = 0; i <= dias; i++) {
    const fecha = sumarDias(hoy, i);
    for (const h of horarios.filter((x) => x.weekday === diaSemana(fecha))) {
      nuevas.push({
        scheduleId: h.id,
        name: h.name,
        startsAt: aFecha(fecha, h.startTime),
        durationMin: h.durationMin,
        capacity: h.capacity,
        coach: h.coach,
      });
    }
  }
  await db.classSession.createMany({ data: nuevas, skipDuplicates: true });
}

// Borra las clases futuras de un horario que no tienen reservas (al editar o desactivar el horario)
export async function limpiarClasesFuturas(scheduleId: string) {
  await db.classSession.deleteMany({
    where: { scheduleId, startsAt: { gt: new Date() }, bookings: { none: {} } },
  });
}

// ---------- Reservas ----------

export type Resultado = { ok: boolean; mensaje: string };

class Rechazo extends Error {}

export async function reservar(memberId: string, sessionId: string): Promise<Resultado> {
  const [{ socio, estado, cfg }, clase] = await Promise.all([
    estadoSocio(memberId),
    db.classSession.findUnique({ where: { id: sessionId } }),
  ]);
  if (!clase || clase.cancelled) return { ok: false, mensaje: "Esa clase no está disponible" };
  if (!socio.active) return { ok: false, mensaje: "Tu cuenta está pausada" };
  if (!socio.plan) return { ok: false, mensaje: "Necesitás un plan para reservar. Consultá en recepción." };
  if (cfg.blockOverdue && estado === "vencida") {
    return { ok: false, mensaje: "Tu cuota está vencida. Pagala para poder reservar." };
  }
  const ahora = Date.now();
  if (clase.startsAt.getTime() <= ahora) return { ok: false, mensaje: "Esa clase ya empezó" };
  if (clase.startsAt.getTime() > ahora + (cfg.bookingDays + 1) * 86400000) {
    return { ok: false, mensaje: `Solo se puede reservar con ${cfg.bookingDays} días de anticipación` };
  }

  try {
    return await db.$transaction(async (tx) => {
      // Bloqueamos la clase: si dos socios reservan a la vez, el segundo espera al primero
      await tx.$executeRaw`SELECT id FROM "ClassSession" WHERE id = ${sessionId} FOR UPDATE`;

      const previa = await tx.booking.findUnique({ where: { sessionId_memberId: { sessionId, memberId } } });
      if (previa && previa.status !== "cancelled") throw new Rechazo("Ya tenés esta clase reservada");

      // Límite semanal del plan (cuentan las confirmadas y las de lista de espera)
      if (socio.plan!.classesPerWeek) {
        const { desde, hasta } = rangoSemana(clase.startsAt);
        const usadas = await tx.booking.count({
          where: {
            memberId,
            status: { in: ["confirmed", "waitlist"] },
            session: { startsAt: { gte: desde, lt: hasta }, cancelled: false },
          },
        });
        if (usadas >= socio.plan!.classesPerWeek) {
          throw new Rechazo(`Tu plan permite ${socio.plan!.classesPerWeek} clases por semana y ya las reservaste`);
        }
      }

      const ocupados = await tx.booking.count({ where: { sessionId, status: "confirmed" } });
      const status = ocupados < clase.capacity ? "confirmed" : "waitlist";
      if (previa) {
        await tx.booking.update({
          where: { id: previa.id },
          data: { status, createdAt: new Date(), cancelledAt: null },
        });
      } else {
        await tx.booking.create({ data: { sessionId, memberId, status } });
      }
      return status === "confirmed"
        ? { ok: true, mensaje: "¡Reservado! Te esperamos." }
        : { ok: true, mensaje: "La clase está llena: quedaste en lista de espera. Si se libera un lugar, entrás solo." };
    });
  } catch (e) {
    if (e instanceof Rechazo) return { ok: false, mensaje: e.message };
    throw e;
  }
}

// Cancela una reserva y, si liberó un lugar, sube al primero de la lista de espera
export async function cancelarReserva(
  bookingId: string,
  opciones: { memberId?: string; sinLimiteDeTiempo?: boolean } = {},
): Promise<Resultado> {
  const cfg = await configuracion();
  try {
    return await db.$transaction(async (tx) => {
      const r = await tx.booking.findUnique({ where: { id: bookingId }, include: { session: true } });
      if (!r || r.status === "cancelled" || (opciones.memberId && r.memberId !== opciones.memberId)) {
        throw new Rechazo("No se encontró la reserva");
      }
      await tx.$executeRaw`SELECT id FROM "ClassSession" WHERE id = ${r.sessionId} FOR UPDATE`;

      const faltanHoras = (r.session.startsAt.getTime() - Date.now()) / 3600000;
      if (!opciones.sinLimiteDeTiempo && r.status === "confirmed" && faltanHoras < cfg.cancelHours) {
        throw new Rechazo(`Solo se puede cancelar hasta ${cfg.cancelHours} h antes. Avisá en recepción.`);
      }

      await tx.booking.update({ where: { id: r.id }, data: { status: "cancelled", cancelledAt: new Date() } });

      if (r.status === "confirmed" && faltanHoras > 0) {
        const siguiente = await tx.booking.findFirst({
          where: { sessionId: r.sessionId, status: "waitlist" },
          orderBy: { createdAt: "asc" },
        });
        if (siguiente) await tx.booking.update({ where: { id: siguiente.id }, data: { status: "confirmed" } });
      }
      return { ok: true, mensaje: "Reserva cancelada" };
    });
  } catch (e) {
    if (e instanceof Rechazo) return { ok: false, mensaje: e.message };
    throw e;
  }
}
