// Tarea diaria (Vercel Cron): mantiene despierta la base de datos de Supabase
// (el plan gratuito la pausa si no tiene actividad por varios días) y borra las fotos vencidas.
import { db } from "@/lib/db";
import { borrarFotosViejas } from "@/lib/fotos";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Si está configurada CRON_SECRET en Vercel, solo Vercel puede llamar a esta tarea
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return new Response("No autorizado", { status: 401 });
  }
  const socios = await db.member.count();
  await borrarFotosViejas();
  return Response.json({ ok: true, socios, hora: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
