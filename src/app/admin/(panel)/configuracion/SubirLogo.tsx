"use client";
import { useState } from "react";
import { guardarLogo, quitarLogo } from "../../../admin/acciones";

const MAXIMO = 512; // px del lado más largo

// Achica la imagen en el navegador antes de subirla, para que pese poco
function achicar(archivo: File): Promise<string> {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, MAXIMO / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL("image/webp", 0.9);
      ok(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png"));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => mal(new Error("No se pudo leer la imagen"));
    img.src = URL.createObjectURL(archivo);
  });
}

export default function SubirLogo({ actual }: { actual: string | null }) {
  const [vista, setVista] = useState<string | null>(null);
  const [error, setError] = useState("");

  return (
    <div className="tarjeta flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold uppercase">Logo del gimnasio</h2>
        <p className="text-sm text-zinc-400">
          Aparece en el inicio de sesión, en la app de los socios, en el panel y en el cartel del QR.
          Ideal: PNG con fondo transparente.
        </p>
      </div>

      <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-white/15 bg-black p-4">
        {vista || actual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vista ?? actual!} alt="Logo" className="max-h-28 w-auto object-contain" />
        ) : (
          <span className="text-sm text-zinc-500">Todavía no subiste un logo</span>
        )}
      </div>

      <form action={guardarLogo} className="flex flex-col gap-3">
        <input type="hidden" name="logo" value={vista ?? ""} />
        <label className="btn-secundario cursor-pointer">
          Elegir imagen…
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={async (e) => {
              setError("");
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setVista(await achicar(f));
              } catch {
                setError("No se pudo leer esa imagen. Probá con un PNG o JPG.");
              }
            }}
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {vista && <button className="btn-primario">Guardar logo</button>}
      </form>

      {actual && !vista && (
        <form action={quitarLogo}>
          <button className="text-sm text-zinc-400 underline">Quitar logo</button>
        </form>
      )}
    </div>
  );
}
