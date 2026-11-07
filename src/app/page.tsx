import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/session";
import LoginSocio from "./LoginSocio";

export default async function Inicio() {
  const s = await sesionActual();
  if (s?.rol === "socio") redirect("/tienda");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <div className="text-5xl">💧</div>
        <h1 className="mt-3 text-3xl font-bold">GymTab</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Sacá lo que necesites y se suma a tu cuota del mes.
        </p>
      </div>
      <LoginSocio />
      <Link href="/admin" className="text-center text-sm text-zinc-500 underline">
        Acceso administración
      </Link>
    </main>
  );
}
