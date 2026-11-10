"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { borrarMiResultado, guardarResultado } from "../acciones";

type Props = {
  workoutId: string;
  tipo: string;
  actual?: { value: number; rx: boolean; notes: string };
};

export default function FormResultado({ workoutId, tipo, actual }: Props) {
  const [estado, accion, cargando] = useActionState(guardarResultado, null);
  const [editando, setEditando] = useState(!actual);
  const [borrando, startTransition] = useTransition();
  const v = actual?.value;

  // Después de guardar bien, volvemos a mostrar los botones
  useEffect(() => {
    if (estado?.ok) setEditando(false);
  }, [estado]);

  if (!editando && actual) {
    return (
      <div className="flex flex-col gap-2">
        {estado?.ok && <p className="text-sm font-medium text-orange-700 dark:text-orange-400">{estado.mensaje}</p>}
        <div className="flex gap-2">
        <button onClick={() => setEditando(true)} className="btn-secundario flex-1 py-2 text-sm">Editar mi resultado</button>
        <button
          disabled={borrando}
          onClick={() => confirm("¿Borrar tu resultado?") && startTransition(() => borrarMiResultado(workoutId))}
          className="btn-secundario py-2 text-sm text-red-600"
        >
          Borrar
        </button>
        </div>
      </div>
    );
  }

  return (
    <form action={accion} className="tarjeta flex flex-col gap-3">
      <h3 className="font-semibold">Tu resultado</h3>
      <input type="hidden" name="workoutId" value={workoutId} />

      {tipo === "time" && (
        <label className="flex flex-col gap-1 text-sm">
          Tiempo (minutos:segundos)
          <input
            name="tiempo"
            placeholder="12:34"
            defaultValue={v ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}` : ""}
            inputMode="numeric"
            required
            className="input"
          />
        </label>
      )}
      {tipo === "reps" && (
        <label className="flex flex-col gap-1 text-sm">
          Repeticiones
          <input name="reps" defaultValue={v ?? ""} inputMode="numeric" required className="input" />
        </label>
      )}
      {tipo === "rounds_reps" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Rondas
            <input name="rondas" defaultValue={v ? Math.floor(v / 1000) : ""} inputMode="numeric" required className="input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            + Repeticiones
            <input name="reps" defaultValue={v ? v % 1000 : ""} inputMode="numeric" className="input" />
          </label>
        </div>
      )}
      {tipo === "weight" && (
        <label className="flex flex-col gap-1 text-sm">
          Peso (kg)
          <input
            name="kilos"
            placeholder="72,5"
            defaultValue={v ? String(v / 10).replace(".", ",") : ""}
            inputMode="decimal"
            required
            className="input"
          />
        </label>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="rx" defaultChecked={actual?.rx ?? true} className="h-5 w-5" />
        RX (lo hice como estaba escrito, sin adaptar)
      </label>
      <input name="notes" placeholder="Nota (opcional)" defaultValue={actual?.notes} maxLength={200} className="input" />
      {estado && <p className={`text-sm ${estado.ok ? "text-orange-700 dark:text-orange-400" : "text-red-600"}`}>{estado.mensaje}</p>}
      <button disabled={cargando} className="btn-primario">{cargando ? "Guardando…" : "Guardar resultado"}</button>
    </form>
  );
}
