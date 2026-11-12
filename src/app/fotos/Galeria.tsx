"use client";
import { useEffect, useState } from "react";

type Foto = { id: string; caption: string | null; date: string };
type Dia = { fecha: string; titulo: string; fotos: Foto[] };

export default function Galeria({ dias }: { dias: Dia[] }) {
  const todas = dias.flatMap((d) => d.fotos);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [aviso, setAviso] = useState("");
  const foto = abierta !== null ? todas[abierta] : null;

  // Cerrar con Escape y moverse con las flechas del teclado
  useEffect(() => {
    if (abierta === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierta(null);
      if (e.key === "ArrowRight") setAbierta((i) => (i! + 1) % todas.length);
      if (e.key === "ArrowLeft") setAbierta((i) => (i! - 1 + todas.length) % todas.length);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, todas.length]);

  async function compartir(f: Foto) {
    try {
      const r = await fetch(`/fotos/${f.id}/imagen`);
      const blob = await r.blob();
      const archivo = new File([blob], `tutukapp-${f.date}.jpg`, { type: blob.type || "image/jpeg" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], text: f.caption ?? undefined });
        return;
      }
      setAviso("Tu navegador no permite compartir directo: descargala y subila desde tu galería.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setAviso("No se pudo compartir. Probá descargándola.");
    }
    setTimeout(() => setAviso(""), 4000);
  }

  let indice = -1;
  return (
    <>
      {dias.map((d) => (
        <section key={d.fecha} className="flex flex-col gap-2">
          <h2 className="text-xl font-bold uppercase">
            {d.titulo} <span className="text-sm font-normal normal-case text-zinc-500">· {d.fotos.length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-1.5">
            {d.fotos.map((f) => {
              indice++;
              const i = indice;
              return (
                <button
                  key={f.id}
                  onClick={() => setAbierta(i)}
                  className="aspect-square overflow-hidden rounded-lg bg-white/5 transition active:scale-95"
                  aria-label={f.caption ?? "Ver foto"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/fotos/${f.id}/mini`} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {foto && abierta !== null && (
        <div role="dialog" aria-label="Foto" className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setAbierta(null)}>
          <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <span className="text-sm text-zinc-400">
              {abierta + 1} / {todas.length}
            </span>
            <button aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl">✕</button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/fotos/${foto.id}/imagen`} alt={foto.caption ?? "Foto del día"} className="max-h-full max-w-full rounded-lg object-contain" />
            {todas.length > 1 && (
              <>
                <button
                  aria-label="Anterior"
                  onClick={() => setAbierta((abierta - 1 + todas.length) % todas.length)}
                  className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-2xl"
                >
                  ‹
                </button>
                <button
                  aria-label="Siguiente"
                  onClick={() => setAbierta((abierta + 1) % todas.length)}
                  className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-2xl"
                >
                  ›
                </button>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            {foto.caption && <p className="text-center text-sm text-zinc-300">{foto.caption}</p>}
            {aviso && <p className="text-center text-sm text-yellow-300">{aviso}</p>}
            <div className="flex gap-2">
              <button onClick={() => compartir(foto)} className="btn-primario flex-1">Compartir</button>
              <a href={`/fotos/${foto.id}/imagen?descargar`} download className="btn-secundario flex-1">Descargar</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
