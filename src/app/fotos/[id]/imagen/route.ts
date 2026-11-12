import { servirFoto } from "@/lib/fotos";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const descargar = new URL(req.url).searchParams.has("descargar");
  return servirFoto((await params).id, "image", descargar);
}
