"use client";
import { useTransition } from "react";
import { anularConsumo } from "../acciones";

export default function BotonAnular({ id }: { id: string }) {
  const [cargando, startTransition] = useTransition();
  return (
    <button
      disabled={cargando}
      onClick={() =>
        startTransition(async () => {
          const r = await anularConsumo(id);
          if (r && !r.ok) alert(r.mensaje);
        })
      }
      className="text-xs text-red-600 underline disabled:opacity-50"
    >
      Anular
    </button>
  );
}
