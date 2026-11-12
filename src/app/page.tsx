import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/session";
import { configuracion } from "@/lib/cuotas";
import LoginSocio from "./LoginSocio";
import Logo, { Marca } from "./Logo";
import CartelInstalar from "./CartelInstalar";

export default async function Inicio() {
  const s = await sesionActual();
  if (s?.rol === "socio") redirect("/inicio");
  const cfg = await configuracion();

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 overflow-hidden px-4 py-10">
      {/* resplandor naranja detrás del logo */}
      <div className="pointer-events-none absolute left-1/2 top-16 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/25 blur-3xl" />

      <div className="flex flex-col items-center text-center">
        <Logo className="h-40 drop-shadow-[0_0_25px_rgb(249_115_22_/_0.35)]" conMarca={false} />
        <div className="mt-6">
          <Marca grande />
        </div>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">{cfg.gymName}</p>
        <p className="mt-4 text-zinc-400">Tu gimnasio en el celular: reservá clases, seguí tus entrenamientos y tus marcas, y pagá tu cuota.</p>
      </div>

      <LoginSocio />

      <div className="-mt-4 flex flex-col gap-2 text-center text-sm text-zinc-400">
        <p>
          ¿Ya eras socio del gimnasio?{" "}
          <Link href="/activar" className="font-semibold text-orange-500 underline underline-offset-4">
            Activá tu cuenta
          </Link>
        </p>
        <p>
          ¿Primera vez?{" "}
          <Link href="/registro" className="font-semibold text-orange-500 underline underline-offset-4">
            Creá tu cuenta
          </Link>
        </p>
      </div>

      <Link href="/admin" className="text-center text-xs uppercase tracking-widest text-zinc-600 hover:text-zinc-400">
        Acceso administración
      </Link>

      <CartelInstalar />
    </main>
  );
}
