"use client";
import Link from "next/link";
import { useActionState, useRef, useTransition } from "react";
import { importarSocios } from "../../../acciones";

export default function FormImportar() {
  const [r, accion, cargando] = useActionState(importarSocios, null);
  const [, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  // Enviamos a mano para que el archivo elegido no se borre entre la vista previa y la importación
  const enviar = (modo: "previa" | "importar") => {
    if (!form.current) return;
    const datos = new FormData(form.current);
    datos.set("modo", modo);
    startTransition(() => accion(datos));
  };

  const Dato = ({ n, t, color = "" }: { n?: number; t: string; color?: string }) => (
    <div className="tarjeta">
      <p className="text-sm text-zinc-400">{t}</p>
      <p className={`text-2xl font-bold ${color}`}>{n ?? 0}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <form ref={form} onSubmit={(e) => { e.preventDefault(); enviar("previa"); }} className="tarjeta flex flex-wrap items-center gap-3">
        <input
          name="archivo"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-zinc-100"
        />
        <button disabled={cargando} className="btn-secundario">{cargando ? "Leyendo…" : "Ver vista previa"}</button>
      </form>

      {r && !r.ok && <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-medium text-red-300">{r.mensaje}</p>}

      {r?.ok && (
        <>
          <p className={`rounded-xl px-4 py-3 font-medium ${r.importado ? "bg-green-500/15 text-green-300" : "bg-orange-500/15 text-orange-200"}`}>
            {r.mensaje}
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Dato t="Filas en el Excel" n={r.total} />
            <Dato t={r.importado ? "Cargados" : "Se van a cargar"} n={r.nuevos} color="text-orange-500" />
            <Dato t="…activos" n={r.activos} />
            <Dato t="…pausados (inactivos)" n={r.pausados} />
            <Dato t="Ya estaban / repetidos" n={(r.yaEstaban ?? 0) + (r.repetidos ?? 0)} />
          </div>

          {!r.importado && (r.nuevos ?? 0) > 0 && (
            <button disabled={cargando} onClick={() => enviar("importar")} className="btn-primario self-start">
              {cargando ? "Importando…" : `Confirmar e importar ${r.nuevos} socios`}
            </button>
          )}
          {r.importado && (
            <Link href="/admin/socios?filtro=sinplan" className="btn-primario self-start">Asignar planes →</Link>
          )}

          {(r.conProblemas ?? 0) > 0 && (
            <p className="text-sm text-yellow-300">
              {r.conProblemas} fila{r.conProblemas === 1 ? "" : "s"} con algún dato raro (mirá la columna &quot;Nota&quot;). Igual se pueden importar.
            </p>
          )}

          <div className="tarjeta overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Fila</th>
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">DNI</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {r.muestra?.map((m) => (
                  <tr key={m.fila} className={m.estado.startsWith("Nuevo") ? "" : "text-zinc-500"}>
                    <td className="px-3 py-1.5 tabular-nums">{m.fila}</td>
                    <td className="px-3 py-1.5">{m.nombre}</td>
                    <td className="px-3 py-1.5">{m.email}</td>
                    <td className="px-3 py-1.5 tabular-nums">{m.dni}</td>
                    <td className="px-3 py-1.5">{m.estado}</td>
                    <td className="px-3 py-1.5 text-yellow-300">{m.nota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
