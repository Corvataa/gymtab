// Sirve la foto de perfil de un socio. La URL lleva ?v=<versión> para que, al cambiarla,
// los celulares no sigan mostrando la vieja.
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await db.member.findUnique({ where: { id }, select: { avatar: true } });
  const datos = m?.avatar?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!datos) return new Response("Sin foto", { status: 404 });
  return new Response(Buffer.from(datos[2], "base64"), {
    headers: { "Content-Type": datos[1], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
