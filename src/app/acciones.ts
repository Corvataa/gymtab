"use server";
// Acciones del lado del servidor para los socios.
// "use server" significa que este código corre en el servidor, nunca en el celular.

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { periodoActual, pesos } from "@/lib/periodo";
import { cerrarSesion, exigirSocio, iniciarSesion } from "@/lib/session";

export type Resultado = { ok: boolean; mensaje: string; dni?: string } | null;

const MINUTOS_PARA_ANULAR = 10;

export async function loginSocio(_prev: Resultado, form: FormData): Promise<Resultado> {
  const dni = String(form.get("dni") ?? "").replace(/\D/g, "");
  const pin = String(form.get("pin") ?? "");

  const socio = await db.member.findUnique({ where: { dni } });
  if (!socio || !(await bcrypt.compare(pin, socio.pinHash))) {
    return { ok: false, mensaje: "DNI o PIN incorrectos", dni };
  }
  if (!socio.active) {
    return { ok: false, mensaje: "Tu cuenta está pausada. Consultá en recepción.", dni };
  }
  await iniciarSesion({ rol: "socio", id: socio.id });
  redirect("/tienda");
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
  if (!c || c.memberId !== memberId || c.voided) {
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
