import Link from "next/link";
import { exigirSocio } from "@/lib/session";
import CambiarPin from "./CambiarPin";

export default async function PaginaPin() {
  await exigirSocio();
  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      <Link href="/perfil" className="text-sm text-zinc-500 underline">
        ← Volver
      </Link>
      <h1 className="text-xl font-bold">Cambiar mi PIN</h1>
      <CambiarPin />
    </main>
  );
}
