"use client";
import { useState, useTransition } from "react";
import { registrarConsumo, type Resultado } from "../acciones";

type P = { id: string; name: string; price: number; emoji: string };

const pesos = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function Productos({ productos }: { productos: P[] }) {
  const [elegido, setElegido] = useState<P | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [aviso, setAviso] = useState<Resultado>(null);
  const [cargando, startTransition] = useTransition();

  function confirmar() {
    if (!elegido) return;
    startTransition(async () => {
      const r = await registrarConsumo(elegido.id, cantidad);
      setAviso(r);
      if (r?.ok) setElegido(null);
      setTimeout(() => setAviso(null), 4000);
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {productos.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setElegido(p);
              setCantidad(1);
            }}
            className="tarjeta flex flex-col items-start gap-1 text-left transition hover:border-emerald-600 active:scale-[0.98]"
          >
            <span className="text-3xl">{p.emoji}</span>
            <span className="font-medium leading-tight">{p.name}</span>
            <span className="text-sm text-zinc-500">{pesos(p.price)}</span>
          </button>
        ))}
      </div>

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

      {elegido && (
        <div
          className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !cargando && setElegido(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 dark:bg-zinc-900 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-4xl">{elegido.emoji}</span>
              <div>
                <p className="text-lg font-bold">{elegido.name}</p>
                <p className="text-zinc-500">{pesos(elegido.price)} c/u</p>
              </div>
            </div>
            <div className="my-6 flex items-center justify-center gap-6">
              <button
                aria-label="Menos"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                className="btn-secundario h-12 w-12 rounded-full p-0 text-2xl"
              >
                −
              </button>
              <span className="w-8 text-center text-3xl font-bold">{cantidad}</span>
              <button
                aria-label="Más"
                onClick={() => setCantidad((c) => Math.min(10, c + 1))}
                className="btn-secundario h-12 w-12 rounded-full p-0 text-2xl"
              >
                +
              </button>
            </div>
            <button onClick={confirmar} disabled={cargando} className="btn-primario w-full">
              {cargando ? "Anotando…" : `Sumar ${pesos(elegido.price * cantidad)} a mi cuota`}
            </button>
            <button
              onClick={() => setElegido(null)}
              disabled={cargando}
              className="mt-2 w-full py-2 text-sm text-zinc-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
