"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAdmin } from "../acciones";

export default function LoginAdmin() {
  const [error, accion, cargando] = useActionState(loginAdmin, null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca.svg" alt="" className="h-20 w-auto" />
        <p className="font-display text-4xl font-extrabold uppercase italic tracking-tight">
          TUTUK<span className="text-orange-500">APP</span>
        </p>
        <h1 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Administración</h1>
      </div>
      <form action={accion} className="tarjeta flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Contraseña</span>
          <input name="clave" type="password" required className="input" autoFocus />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={cargando} className="btn-primario">
          Entrar
        </button>
      </form>
      <Link href="/" className="text-center text-sm text-zinc-500 underline">
        Volver
      </Link>
    </main>
  );
}
