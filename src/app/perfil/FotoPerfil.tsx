"use client";
import { useState, useTransition } from "react";
import { guardarFoto, quitarFoto, type Resultado } from "../acciones";

const LADO = 320; // px: la foto se guarda cuadrada de 320x320

// Recorta al centro en cuadrado y achica la foto en el celular, antes de subirla
function prepararFoto(archivo: File): Promise<string> {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = LADO;
      canvas.getContext("2d")!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
      URL.revokeObjectURL(img.src);
      const webp = canvas.toDataURL("image/webp", 0.85);
      ok(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => mal(new Error("imagen"));
    img.src = URL.createObjectURL(archivo);
  });
}

export default function FotoPerfil({ children, tieneFoto }: { children: React.ReactNode; tieneFoto: boolean }) {
  const [aviso, setAviso] = useState<Resultado>(null);
  const [cargando, startTransition] = useTransition();

  const avisar = (r: Resultado) => {
    setAviso(r);
    setTimeout(() => setAviso(null), 3500);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <label className={`relative cursor-pointer ${cargando ? "opacity-50" : ""}`} title="Cambiar foto">
        {children}
        <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-black bg-orange-500 text-black" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Cambiar foto de perfil"
          disabled={cargando}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const foto = await prepararFoto(f);
              startTransition(async () => avisar(await guardarFoto(foto)));
            } catch {
              avisar({ ok: false, mensaje: "No se pudo leer esa imagen. Probá con otra." });
            }
          }}
        />
      </label>
      {tieneFoto && (
        <button
          disabled={cargando}
          onClick={() => startTransition(async () => avisar(await quitarFoto()))}
          className="text-xs text-zinc-500 underline"
        >
          Quitar foto
        </button>
      )}
      {aviso && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-xl px-4 py-3 text-center font-medium text-white shadow-lg ${
            aviso.ok ? "bg-orange-600" : "bg-red-600"
          }`}
        >
          {aviso.mensaje}
        </div>
      )}
    </div>
  );
}
