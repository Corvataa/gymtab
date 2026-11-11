import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sesionActual } from "@/lib/session";
import { pesos } from "@/lib/periodo";
import Logo from "../Logo";
import FormRegistro from "./FormRegistro";

export const dynamic = "force-dynamic";

export default async function Registro() {
  if ((await sesionActual())?.rol === "socio") redirect("/inicio");
  const planes = await db.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } });

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 px-4 py-8">
      <Link href="/" className="self-start">
        <Logo className="h-9" />
      </Link>
      <div>
        <h1 className="text-4xl font-extrabold uppercase leading-none">Crear cuenta</h1>
        <p className="mt-2 text-zinc-400">
          Completá tus datos. El gimnasio revisa tu solicitud y, cuando la aprueba, ya podés entrar.
        </p>
      </div>
      <FormRegistro planes={planes.map((p) => ({ id: p.id, texto: `${p.name} — ${pesos(p.price)}` }))} />
      <p className="text-center text-sm text-zinc-400">
        ¿Ya tenés cuenta?{" "}
        <Link href="/" className="font-semibold text-orange-500 underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
