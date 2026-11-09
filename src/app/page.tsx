import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/session";
import LoginSocio from "./LoginSocio";
import { configuracion } from "@/lib/cuotas";

export default async function Inicio() {
  const s = await sesionActual();
  if (s?.rol === "socio") redirect("/tienda");
  const cfg = await configuracion();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight">TUTUKAPP</h1>
        <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-400">{cfg.gymName}</p>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Sacá lo que necesites y se suma a tu cuota.
        </p>
      </div>
      <LoginSocio />
      <Link href="/admin" className="text-center text-sm text-zinc-500 underline">
        Acceso administración
      </Link>
    </main>
  );
}
