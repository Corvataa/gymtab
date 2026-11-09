"use server";
// Acciones del lado del servidor para los socios.
// "use server" significa que este código corre en el servidor, nunca en el celular.

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { periodoActual, pesos } from "@/lib/periodo";
import { estadoSocio } from "@/lib/cuotas";
import { crearLinkDePago, mercadoPagoActivo } from "@/lib/mercadopago";
import { headers } from "next/headers";
import { cerrarSesion, exigirSocio, iniciarSesion } from "@/lib/session";
import { limpiarFallos, mensajeBloqueo, minutosBloqueado, registrarFallo } from "@/lib/throttle";

export type Resultado = { ok: boolean; mensaje: string; dni?: string } | null;

const MINUTOS_PARA_ANULAR = 10;

export async function loginSocio(_prev: Resultado, form: FormData): Promise<Resultado> {
  const dni = String(form.get("dni") ?? "").replace(/\D/g, "");
  const pin = String(form.get("pin") ?? "");

  const clave = `socio:${dni}`;
  const bloqueo = await minutosBloqueado(clave);
  if (bloqueo) return { ok: false, mensaje: mensajeBloqueo(bloqueo), dni };

  const socio = await db.member.findUnique({ where: { dni } });
  if (!socio || !(await bcrypt.compare(pin, socio.pinHash))) {
    await registrarFallo(clave);
    return { ok: false, mensaje: "DNI o PIN incorrectos", dni };
  }
  await limpiarFallos(clave);
  if (!socio.active) {
    return { ok: false, mensaje: "Tu cuenta está pausada. Consultá en recepción.", dni };
  }
  await iniciarSesion({ rol: "socio", id: socio.id });
  redirect("/tienda");
}

export async function cambiarMiPin(_prev: Resultado, form: FormData): Promise<Resultado> {
  const memberId = await exigirSocio();
  const actual = String(form.get("actual") ?? "");
  const nuevo = String(form.get("nuevo") ?? "");
  const repetido = String(form.get("repetido") ?? "");

  const socio = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  const clave = `socio:${socio.dni}`;
  const bloqueo = await minutosBloqueado(clave);
  if (bloqueo) return { ok: false, mensaje: mensajeBloqueo(bloqueo) };

  if (!(await bcrypt.compare(actual, socio.pinHash))) {
    await registrarFallo(clave);
    return { ok: false, mensaje: "El PIN actual no es correcto" };
  }
  if (!/^\d{4,6}$/.test(nuevo)) return { ok: false, mensaje: "El PIN nuevo debe tener de 4 a 6 números" };
  if (nuevo !== repetido) return { ok: false, mensaje: "Los PIN nuevos no coinciden" };

  await db.member.update({ where: { id: memberId }, data: { pinHash: await bcrypt.hash(nuevo, 10) } });
  await limpiarFallos(clave);
  return { ok: true, mensaje: "¡Listo! Tu PIN fue cambiado." };
}

export async function salir() {
  await cerrarSesion();
  redirect("/");
}

// Total consumido por un socio en un mes (sin contar anulados)
export async function totalDelMes(memberId: string, periodo = periodoActual()) {
  const consumos = await db.consumption.findMany({
    where: { memberId, period: periodo, voided: false },
    select: { unitPrice: true, quantity: true },
  });
  return consumos.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
}

export async function registrarConsumo(productId: string, cantidad: number): Promise<Resultado> {
  const memberId = await exigirSocio();
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) {
    return { ok: false, mensaje: "Cantidad inválida" };
  }

  const [socio, producto] = await Promise.all([
    db.member.findUnique({ where: { id: memberId } }),
    db.product.findUnique({ where: { id: productId } }),
  ]);
  if (!socio?.active) return { ok: false, mensaje: "Tu cuenta está pausada" };
  const { estado, cfg } = await estadoSocio(memberId);
  if (cfg.blockOverdue && estado === "vencida") {
    return { ok: false, mensaje: "Tu cuota está vencida. Pagala para seguir sumando consumos." };
  }
  if (!producto?.active) return { ok: false, mensaje: "Ese producto no está disponible" };

  // Controlamos el tope mensual
  const periodo = periodoActual();
  const total = await totalDelMes(memberId, periodo);
  const monto = producto.price * cantidad;
  if (total + monto > socio.monthlyLimit) {
    const disponible = Math.max(0, socio.monthlyLimit - total);
    return {
      ok: false,
      mensaje: `Superás tu tope mensual. Te quedan ${pesos(disponible)}.`,
    };
  }

  await db.consumption.create({
    data: {
      memberId,
      productId,
      productName: producto.name,
      unitPrice: producto.price,
      quantity: cantidad,
      period: periodo,
    },
  });
  revalidatePath("/tienda");
  return { ok: true, mensaje: `Anotado: ${cantidad} × ${producto.name}` };
}

export async function anularConsumo(id: string): Promise<Resultado> {
  const memberId = await exigirSocio();
  const c = await db.consumption.findUnique({ where: { id } });
  if (!c || c.memberId !== memberId || c.voided || c.paymentId) {
    return { ok: false, mensaje: "No se encontró el consumo" };
  }
  const minutos = (Date.now() - c.createdAt.getTime()) / 60000;
  if (minutos > MINUTOS_PARA_ANULAR) {
    return { ok: false, mensaje: "Ya pasaron más de 10 minutos. Pedilo en recepción." };
  }
  await db.consumption.update({ where: { id }, data: { voided: true } });
  revalidatePath("/tienda");
  return { ok: true, mensaje: "Consumo anulado" };
}

// El socio toca "Pagar con Mercado Pago": creamos el link y lo mandamos ahí
export async function pagarOnline() {
  const memberId = await exigirSocio();
  if (!mercadoPagoActivo()) redirect("/tienda?pago=no_disponible");
  const h = await headers();
  const urlBase = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  let link: string;
  try {
    link = await crearLinkDePago(memberId, urlBase);
  } catch (e) {
    console.error("No se pudo crear el pago", e);
    redirect("/tienda?pago=error");
  }
  redirect(link);
}
