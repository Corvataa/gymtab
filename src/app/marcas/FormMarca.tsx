"use client";
import { useActionState, useState } from "react";
import { agregarMarca } from "../acciones";

export default function FormMarca({ ejercicios, hoy }: { ejercicios: string[]; hoy: string }) {
  const [estado, accion, cargando] = useActionState(agregarMarca, null);
  const [elegido, setElegido] = useState(ejercicios[0]);

  return (
    <form action={accion} className="tarjeta flex flex-col gap-3">
      <h2 className="font-semibold">Nueva marca</h2>
      <select name="movement" value={elegido} onChange={(e) => setElegido(e.target.value)} className="input">
        {ejercicios.map((e) => (
          <option key={e} value={e}>{e}</option>
        ))}
        <option value="otro">Otro ejercicio…</option>
      </select>
      {elegido === "otro" && <input name="otro" placeholder="Nombre del ejercicio" required maxLength={60} className="input" />}
      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-2 flex flex-col gap-1 text-sm">
          Peso (kg)
          <input name="kilos" placeholder="72,5" inputMode="decimal" required className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Reps
          <input name="reps" defaultValue={1} inputMode="numeric" className="input" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input name="date" type="date" defaultValue={hoy} max={hoy} className="input" aria-label="Fecha" />
        <input name="notes" placeholder="Nota (opcional)" maxLength={200} className="input" />
      </div>
      {estado && <p className={`text-sm font-medium ${estado.ok ? "text-orange-700 dark:text-orange-400" : "text-red-600"}`}>{estado.mensaje}</p>}
      <button disabled={cargando} className="btn-primario">{cargando ? "Guardando…" : "Guardar marca"}</button>
    </form>
  );
}
