import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/session";
import Logo from "../Logo";
import FormActivar from "./FormActivar";

export default async function Activar() {
  if ((await sesionActual())?.rol === "socio") redirect("/inicio");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 px-4 py-8">
      <Link href="/" className="self-start">
        <Logo className="h-9" />
      </Link>
      <div>
        <h1 className="text-4xl font-extrabold uppercase leading-none">Activá tu cuenta</h1>
        <p className="mt-2 text-zinc-400">
          Si ya eras socio del gimnasio, tus datos ya están cargados. Poné el email que usabas en la otra app,
          tu DNI y elegí un PIN. El gimnasio confirma que sos vos y listo.
        </p>
      </div>
      <FormActivar />
      <p className="text-center text-sm text-zinc-400">
        ¿Sos nuevo?{" "}
        <Link href="/registro" className="font-semibold text-orange-500 underline underline-offset-4">
          Creá tu cuenta
        </Link>
      </p>
    </main>
  );
}
