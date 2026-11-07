"use client";
import { useActionState } from "react";
import { cambiarMiPin } from "../../acciones";

export default function CambiarPin() {
  const [estado, accion, cargando] = useActionState(cambiarMiPin, null);

  const campo = (name: string, label: string, autoComplete: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type="password"
        inputMode="numeric"
        maxLength={6}
        autoComplete={autoComplete}
        required
        className="input"
      />
    </label>
  );

  return (
    <form action={accion} className="tarjeta flex flex-col gap-4">
      {campo("actual", "PIN actual", "current-password")}
      {campo("nuevo", "PIN nuevo (4 a 6 números)", "new-password")}
      {campo("repetido", "Repetí el PIN nuevo", "new-password")}
      {estado && (
        <p className={`text-sm ${estado.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
          {estado.mensaje}
        </p>
      )}
      <button disabled={cargando} className="btn-primario">
        {cargando ? "Guardando…" : "Cambiar PIN"}
      </button>
    </form>
  );
}
