"use client";
import { useActionState, useTransition } from "react";
import { guardarPerfil } from "../acciones";

type Datos = { nickname: string; goal: string; phone: string; email: string; birthDate: string; emergencyContact: string };

export default function FormPerfil({ datos }: { datos: Datos }) {
  const [estado, accion, cargando] = useActionState(guardarPerfil, null);
  const [, startTransition] = useTransition();
  const etiqueta = "text-xs font-semibold uppercase tracking-wider text-zinc-400";

  return (
    <form
      // Enviamos a mano para que, si hay un error, no se borre lo que ya escribió
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(() => accion(f));
      }}
      className="tarjeta flex flex-col gap-4 p-5"
    >
      <h2 className="text-xl font-bold uppercase">Mis datos</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Apodo</span>
          <input name="nickname" defaultValue={datos.nickname} maxLength={24} placeholder="Cómo te dicen" className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Fecha de nac.</span>
          <input name="birthDate" type="date" defaultValue={datos.birthDate} className="input" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={etiqueta}>Mi objetivo</span>
        <input name="goal" defaultValue={datos.goal} maxLength={80} placeholder="Ej: bajar 5 kg, mi primer muscle-up…" className="input" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Teléfono</span>
          <input name="phone" type="tel" defaultValue={datos.phone} autoComplete="tel" className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Email</span>
          <input name="email" type="email" defaultValue={datos.email} autoComplete="email" className="input" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={etiqueta}>Contacto de emergencia</span>
        <input
          name="emergencyContact"
          defaultValue={datos.emergencyContact}
          maxLength={100}
          placeholder="Nombre y teléfono (ej: Ana, mamá — 2945 123456)"
          className="input"
        />
      </label>
      <p className="-mt-2 text-xs text-zinc-500">El apodo es el nombre que aparece en el ranking. El contacto de emergencia solo lo ve el gimnasio.</p>
      {estado && <p className={`text-sm font-medium ${estado.ok ? "text-orange-400" : "text-red-400"}`}>{estado.mensaje}</p>}
      <button disabled={cargando} className="btn-primario">{cargando ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
