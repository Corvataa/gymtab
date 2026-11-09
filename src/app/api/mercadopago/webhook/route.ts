// Mercado Pago llama a esta dirección cada vez que cambia el estado de un pago
import { firmaValida, procesarPagoMP } from "@/lib/mercadopago";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const cuerpo = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
  const tipo = url.searchParams.get("type") ?? cuerpo.type;
  const id = url.searchParams.get("data.id") ?? String(cuerpo.data?.id ?? "");

  if (tipo !== "payment" || !id) return new Response("ignorado", { status: 200 });
  if (!firmaValida(req, id)) return new Response("firma inválida", { status: 401 });

  try {
    await procesarPagoMP(id);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("Error procesando aviso de Mercado Pago", e);
    // Respondemos error para que Mercado Pago vuelva a intentar más tarde
    return new Response("error", { status: 500 });
  }
}
