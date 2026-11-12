// Fotos del día: servir las imágenes (solo con sesión iniciada) y borrar las viejas
import { db } from "./db";
import { sesionActual } from "./session";
import { configuracion } from "./cuotas";
import { fechaAR, sumarDias } from "./clases";

export async function servirFoto(id: string, campo: "image" | "thumb", descargar = false) {
  // Son fotos de personas: solo las ven socios o el gimnasio con sesión iniciada
  if (!(await sesionActual())) return new Response("No autorizado", { status: 401 });
  const f = await db.gymPhoto.findUnique({
    where: { id },
    select: { date: true, ...(campo === "image" ? { image: true } : { thumb: true }) },
  });
  const valor = f ? (campo === "image" ? (f as { image?: string }).image : (f as { thumb?: string }).thumb) : null;
  const m = valor?.match(/^data:(image\/(?:jpeg|webp|png));base64,(.+)$/);
  if (!f || !m) return new Response("No encontrada", { status: 404 });
  const ext = m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg";
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "private, max-age=31536000, immutable",
      ...(descargar ? { "Content-Disposition": `attachment; filename="tutukapp-${f.date}-${id.slice(-5)}.${ext}"` } : {}),
    },
  });
}

// Borra las fotos más viejas que los días configurados
export async function borrarFotosViejas() {
  const cfg = await configuracion();
  const limite = sumarDias(fechaAR(new Date()), -cfg.photoDays);
  await db.gymPhoto.deleteMany({ where: { date: { lt: limite } } });
}
