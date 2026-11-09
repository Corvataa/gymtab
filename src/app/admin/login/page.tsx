"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAdmin } from "../acciones";

export default function LoginAdmin() {
  const [error, accion, cargando] = useActionState(loginAdmin, null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <p className="text-3xl font-black tracking-tight">TUTUKAPP</p>
        <h1 className="text-zinc-500">Administración</h1>
      </div>
      <form action={accion} className="tarjeta flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Contraseña</span>
          <input name="clave" type="password" required className="input" autoFocus />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
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
