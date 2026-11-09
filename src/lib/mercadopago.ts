// Integración con Mercado Pago (Checkout Pro).
//
// Cómo funciona:
// 1. El socio toca "Pagar". Guardamos un Checkout (qué paga y cuánto) y le pedimos a
//    Mercado Pago un link de pago ("preferencia").
// 2. El socio paga en Mercado Pago.
// 3. Mercado Pago nos avisa (webhook) y además el socio vuelve a la app con el número de pago.
// 4. En ambos casos le PREGUNTAMOS a Mercado Pago el estado real del pago (no confiamos en
//    lo que llega por la URL) y, si está aprobado, registramos el cobro.
import crypto from "crypto";
import { db } from "./db";
import { consumosSinCobrar } from "./cuotas";
import { nombrePeriodo, periodoActual } from "./periodo";

const API = process.env.MP_API_URL || "https://api.mercadopago.com";

export const mercadoPagoActivo = () => !!process.env.MP_ACCESS_TOKEN;

class ErrorMP extends Error {
  constructor(public status: number, detalle: string) {
    super(`Mercado Pago respondió ${status}: ${detalle}`);
  }
}

async function mp<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new ErrorMP(res.status, await res.text());
  return res.json() as Promise<T>;
}

// Qué le toca pagar online al socio ahora: la cuota del mes (si no la pagó) + consumos sin cobrar
export async function montoAPagar(memberId: string) {
  const periodo = periodoActual();
  const [socio, cuotaPaga, pendientes] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: memberId }, include: { plan: true } }),
    db.payment.findFirst({ where: { memberId, period: periodo, voided: false, coversFee: true } }),
    consumosSinCobrar(memberId),
  ]);
  const coversFee = !cuotaPaga && !!socio.plan;
  const feeAmount = coversFee ? socio.plan!.price : 0;
  return {
    socio,
    periodo,
    coversFee,
    feeAmount,
    consumoIds: pendientes.ids,
    consumosAmount: pendientes.total,
    total: feeAmount + pendientes.total,
  };
}

// Crea el Checkout y devuelve el link de pago de Mercado Pago
export async function crearLinkDePago(memberId: string, urlBase: string): Promise<string> {
  const m = await montoAPagar(memberId);
  if (m.total <= 0) throw new Error("No hay nada para pagar");

  const checkout = await db.checkout.create({
    data: {
      memberId,
      period: m.periodo,
      coversFee: m.coversFee,
      feeAmount: m.feeAmount,
      consumoIds: m.consumoIds,
      consumosAmount: m.consumosAmount,
      total: m.total,
    },
  });

  const titulo = [
    m.coversFee && `Cuota ${nombrePeriodo(m.periodo)} (${m.socio.plan?.name})`,
    m.consumosAmount > 0 && "consumos",
  ]
    .filter(Boolean)
    .join(" + ");

  const vuelta = `${urlBase}/tienda`;
  const pref = await mp<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": checkout.id },
    body: JSON.stringify({
      items: [{ id: checkout.id, title: titulo, quantity: 1, unit_price: m.total, currency_id: "ARS" }],
      external_reference: checkout.id,
      payer: m.socio.email ? { email: m.socio.email } : undefined,
      back_urls: { success: vuelta, pending: vuelta, failure: vuelta },
      auto_return: "approved",
      notification_url: `${urlBase}/api/mercadopago/webhook`,
      statement_descriptor: "TUTUKAPP",
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    }),
  });
  await db.checkout.update({ where: { id: checkout.id }, data: { mpPreferenceId: pref.id } });
  return pref.init_point;
}

type PagoMP = {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
};

export type ResultadoPago = "aprobado" | "pendiente" | "rechazado" | "desconocido";

// Consulta un pago en Mercado Pago y, si está aprobado, registra el cobro (una sola vez)
export async function procesarPagoMP(mpPaymentId: string): Promise<ResultadoPago> {
  if (!/^\d+$/.test(mpPaymentId)) return "desconocido";
  let pago: PagoMP;
  try {
    pago = await mp<PagoMP>(`/v1/payments/${mpPaymentId}`);
  } catch (e) {
    if (e instanceof ErrorMP && e.status === 404) return "desconocido";
    throw e;
  }
  const checkout = pago.external_reference
    ? await db.checkout.findUnique({ where: { id: pago.external_reference } })
    : null;
  if (!checkout) return "desconocido";

  if (pago.status === "rejected" || pago.status === "cancelled") {
    if (checkout.status === "pending") {
      await db.checkout.update({ where: { id: checkout.id }, data: { status: "rejected" } });
    }
    return "rechazado";
  }
  if (pago.status !== "approved") return "pendiente";
  if (checkout.paymentId) return "aprobado"; // ya estaba registrado

  // Controlamos que haya pagado lo que correspondía
  if (pago.currency_id !== "ARS" || Math.round(pago.transaction_amount) < checkout.total) {
    console.error("Pago de Mercado Pago con monto inesperado", { mpPaymentId, checkout: checkout.id });
    return "desconocido";
  }

  const avisos: string[] = [];
  if (checkout.coversFee) {
    const yaPaga = await db.payment.findFirst({
      where: { memberId: checkout.memberId, period: checkout.period, voided: false, coversFee: true },
    });
    if (yaPaga) avisos.push("La cuota de este mes ya estaba cobrada: revisar si corresponde devolver.");
  }

  try {
    await db.$transaction(async (tx) => {
      const socio = await tx.member.findUniqueOrThrow({ where: { id: checkout.memberId }, include: { plan: true } });
      const cobro = await tx.payment.create({
        data: {
          memberId: checkout.memberId,
          period: checkout.period,
          planName: checkout.coversFee ? (socio.plan?.name ?? null) : null,
          feeAmount: checkout.feeAmount,
          consumosAmount: checkout.consumosAmount,
          total: checkout.total,
          method: "mercadopago",
          coversFee: checkout.coversFee,
          notes: [`Pago online #${mpPaymentId}`, ...avisos].join(" · "),
        },
      });
      // Marcamos el checkout como aprobado; si otro proceso ya lo hizo, deshacemos todo
      const marcado = await tx.checkout.updateMany({
        where: { id: checkout.id, paymentId: null },
        data: { status: "approved", paymentId: cobro.id, mpPaymentId },
      });
      if (marcado.count === 0) throw new YaProcesado();

      const incluidos = await tx.consumption.updateMany({
        where: { id: { in: checkout.consumoIds }, paymentId: null, voided: false },
        data: { paymentId: cobro.id },
      });
      if (incluidos.count < checkout.consumoIds.length) {
        await tx.payment.update({
          where: { id: cobro.id },
          data: { notes: `${cobro.notes} · Algunos consumos ya estaban cobrados o anulados: revisar.` },
        });
      }
    });
  } catch (e) {
    if (e instanceof YaProcesado) return "aprobado";
    // Si llegan dos avisos a la vez, el segundo choca con el número de pago único
    if ((e as { code?: string }).code === "P2002") return "aprobado";
    throw e;
  }
  return "aprobado";
}

class YaProcesado extends Error {}

// Verifica la firma de los avisos de Mercado Pago (si configuraste la clave secreta)
export function firmaValida(req: Request, dataId: string): boolean {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) return true;
  const firma = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const partes = Object.fromEntries(firma.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const manifiesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${partes.ts};`;
  const esperado = crypto.createHmac("sha256", secreto).update(manifiesto).digest("hex");
  return (
    esperado.length === partes.v1.length && crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(partes.v1))
  );
}
