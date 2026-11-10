"use client";
import { useState, useTransition } from "react";
import { cancelarMiReserva, reservarClase, type Resultado } from "../acciones";

type Props = { sessionId: string; bookingId?: string; texto: string; tipo: "reservar" | "cancelar" };

export default function BotonClase({ sessionId, bookingId, texto, tipo }: Props) {
  const [aviso, setAviso] = useState<Resultado>(null);
  const [cargando, startTransition] = useTransition();

  function accion() {
    if (tipo === "cancelar" && !confirm("¿Cancelar esta reserva?")) return;
    startTransition(async () => {
      const r = tipo === "reservar" ? await reservarClase(sessionId) : await cancelarMiReserva(bookingId!);
      setAviso(r);
      setTimeout(() => setAviso(null), 4500);
    });
  }

  return (
    <>
      <button
        onClick={accion}
        disabled={cargando}
        className={`shrink-0 ${tipo === "reservar" ? "btn-primario" : "btn-secundario"} px-3 py-2 text-sm`}
      >
        {cargando ? "…" : texto}
      </button>
      {aviso && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-4 z-20 mx-auto max-w-md rounded-xl px-4 py-3 text-center font-medium text-white shadow-lg ${
            aviso.ok ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {aviso.mensaje}
        </div>
      )}
    </>
  );
}
