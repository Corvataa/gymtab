// Bloqueo por intentos fallidos: después de 5 errores, se bloquea 15 minutos.
import { headers } from "next/headers";
import { db } from "./db";

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

// Devuelve cuántos minutos faltan para desbloquear (0 = no está bloqueado)
export async function minutosBloqueado(key: string): Promise<number> {
  const t = await db.loginThrottle.findUnique({ where: { key } });
  if (!t?.lockedUntil) return 0;
  const faltan = t.lockedUntil.getTime() - Date.now();
  return faltan > 0 ? Math.ceil(faltan / 60000) : 0;
}

export async function registrarFallo(key: string) {
  const t = await db.loginThrottle.upsert({
    where: { key },
    create: { key, failures: 1 },
    update: { failures: { increment: 1 } },
  });
  if (t.failures >= MAX_INTENTOS) {
    await db.loginThrottle.update({
      where: { key },
      data: { failures: 0, lockedUntil: new Date(Date.now() + MINUTOS_BLOQUEO * 60000) },
    });
  }
}

export async function limpiarFallos(key: string) {
  await db.loginThrottle.deleteMany({ where: { key } });
}

export function mensajeBloqueo(minutos: number) {
  return `Demasiados intentos. Probá de nuevo en ${minutos} minuto${minutos === 1 ? "" : "s"}.`;
}

// IP de quien hace el pedido (Vercel la pone en x-forwarded-for)
export async function ipCliente(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "desconocida";
}
