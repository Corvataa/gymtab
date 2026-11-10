"use client";
import { useTransition } from "react";
import { borrarMarca } from "../acciones";

export default function BotonBorrarMarca({ id }: { id: string }) {
  const [cargando, startTransition] = useTransition();
  return (
    <button
      disabled={cargando}
      onClick={() => confirm("¿Borrar esta marca?") && startTransition(() => borrarMarca(id))}
      className="text-xs text-zinc-500 underline disabled:opacity-50"
    >
      Borrar
    </button>
  );
}
