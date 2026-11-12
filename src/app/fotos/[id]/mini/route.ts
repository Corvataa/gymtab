import { servirFoto } from "@/lib/fotos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return servirFoto((await params).id, "thumb");
}
