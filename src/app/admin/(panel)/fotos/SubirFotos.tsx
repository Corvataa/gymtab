"use client";
import { useState } from "react";
import { subirFotoDelDia, terminarSubidaFotos } from "../../../admin/acciones";

const GRANDE = 1440; // px del lado más largo de la foto completa
const MINI = 480; // px de la miniatura

// Achica la foto en el navegador: una versión para ver/descargar y una miniatura para la galería
function preparar(archivo: File) {
  return new Promise<{ image: string; thumb: string; width: number; height: number }>((ok, mal) => {
    const img = new Image();
    img.onload = () => {
      const dibujar = (max: number, calidad: number) => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        return { url: c.toDataURL("image/jpeg", calidad), w: c.width, h: c.height };
      };
      const g = dibujar(GRANDE, 0.82);
      const m = dibujar(MINI, 0.7);
      URL.revokeObjectURL(img.src);
      ok({ image: g.url, thumb: m.url, width: g.w, height: g.h });
    };
    img.onerror = () => mal(new Error("imagen"));
    img.src = URL.createObjectURL(archivo);
  });
}

export default function SubirFotos({ hoy }: { hoy: string }) {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [fecha, setFecha] = useState(hoy);
  const [texto, setTexto] = useState("");
  const [progreso, setProgreso] = useState<{ hechas: number; errores: number } | null>(null);
  const subiendo = progreso !== null && progreso.hechas + progreso.errores < archivos.length;

  async function subir() {
    setProgreso({ hechas: 0, errores: 0 });
    let hechas = 0, errores = 0;
    for (const f of archivos) {
      try {
        const r = await subirFotoDelDia({ date: fecha, caption: texto, ...(await preparar(f)) });
        if (r.ok) hechas++; else errores++;
      } catch {
        errores++;
      }
      setProgreso({ hechas, errores });
    }
    await terminarSubidaFotos();
    setArchivos([]);
    setTexto("");
  }

  return (
    <div className="tarjeta flex flex-col gap-3 border-orange-500/30">
      <div className="flex flex-wrap items-end gap-3">
        <label className="btn-primario cursor-pointer">
          📷 Elegir fotos
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={subiendo}
            onChange={(e) => {
              setArchivos(Array.from(e.target.files ?? []));
              setProgreso(null);
              e.target.value = "";
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Día
          <input type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} className="input py-2" />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          Texto (opcional)
          <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={120} placeholder="Ej: WOD del jueves 🔥" className="input py-2" />
        </label>
      </div>

      {archivos.length > 0 && progreso === null && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-zinc-300">{archivos.length} foto{archivos.length === 1 ? "" : "s"} elegida{archivos.length === 1 ? "" : "s"}</span>
          <button onClick={subir} className="btn-primario py-2">Subir</button>
          <button onClick={() => setArchivos([])} className="text-sm text-zinc-400 underline">Cancelar</button>
        </div>
      )}

      {progreso && (
        <div className="flex flex-col gap-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${archivos.length ? ((progreso.hechas + progreso.errores) / archivos.length) * 100 : 100}%` }}
            />
          </div>
          <p className="text-sm text-zinc-300" role="status">
            {subiendo
              ? `Subiendo ${progreso.hechas + progreso.errores + 1} de ${archivos.length}…`
              : `¡Listo! Se subieron ${progreso.hechas} foto${progreso.hechas === 1 ? "" : "s"}${progreso.errores ? ` (${progreso.errores} no se pudieron subir)` : ""}.`}
          </p>
        </div>
      )}
    </div>
  );
}
