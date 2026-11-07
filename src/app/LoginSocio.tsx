"use client";
// "use client" = este componente corre en el celular (es interactivo)
import { useActionState } from "react";
import { loginSocio } from "./acciones";

export default function LoginSocio() {
  const [estado, accion, cargando] = useActionState(loginSocio, null);

  return (
    <form action={accion} className="tarjeta flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">DNI</span>
        <input name="dni" defaultValue={estado?.dni} key={estado?.dni} inputMode="numeric" autoComplete="username" required className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">PIN</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={6}
          required
          className="input"
        />
      </label>
      {estado && !estado.ok && <p className="text-sm text-red-600">{estado.mensaje}</p>}
      <button disabled={cargando} className="btn-primario">
        {cargando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
