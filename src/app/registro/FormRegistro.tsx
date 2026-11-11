"use client";
import Link from "next/link";
import { useActionState, useTransition } from "react";
import { registrarse } from "../acciones";

export default function FormRegistro({ planes }: { planes: { id: string; texto: string }[] }) {
  const [estado, accion, cargando] = useActionState(registrarse, null);
  const [, startTransition] = useTransition();

  if (estado?.ok) {
    return (
      <div className="tarjeta flex flex-col items-center gap-4 p-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-2xl font-black text-black">✓</div>
        <p className="font-medium">{estado.mensaje}</p>
        <Link href="/" className="btn-primario w-full">Volver al inicio</Link>
      </div>
    );
  }

  const etiqueta = "text-xs font-semibold uppercase tracking-wider text-zinc-400";
  return (
    <form
      // Enviamos a mano para que, si hay un error, no se borre lo que la persona ya escribió
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="tarjeta flex flex-col gap-4 p-5"
    >
      <label className="flex flex-col gap-1">
        <span className={etiqueta}>Nombre y apellido</span>
        <input name="name" autoComplete="name" required className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className={etiqueta}>DNI</span>
        <input name="dni" inputMode="numeric" autoComplete="username" required className="input" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Teléfono</span>
          <input name="phone" type="tel" autoComplete="tel" className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Email (opcional)</span>
          <input name="email" type="email" autoComplete="email" className="input" />
        </label>
      </div>
      {planes.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Plan que te interesa</span>
          <select name="planId" defaultValue="" className="input">
            <option value="">Lo elijo en el gimnasio</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>{p.texto}</option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Elegí un PIN</span>
          <input name="pin" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" required className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Repetí el PIN</span>
          <input name="pin2" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" required className="input" />
        </label>
      </div>
      <p className="-mt-2 text-xs text-zinc-500">El PIN son 4 a 6 números. Lo vas a usar para entrar a la app.</p>
      {estado && !estado.ok && <p className="text-sm text-red-400">{estado.mensaje}</p>}
      <button disabled={cargando} className="btn-primario">{cargando ? "Enviando…" : "Crear cuenta"}</button>
    </form>
  );
}
