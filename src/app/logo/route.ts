// Sirve el logo del gimnasio como imagen. La URL lleva ?v=<versión> para que,
// al subir uno nuevo, los celulares no muestren el viejo guardado.
import { db } from "@/lib/db";

export async function GET() {
  const cfg = await db.settings.findUnique({ where: { id: 1 }, select: { logo: true } });
  const m = cfg?.logo?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) return new Response("Sin logo", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
