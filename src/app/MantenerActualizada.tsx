"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La app instalada en el celular no tiene botón de recargar y, al volver a abrirla,
// el teléfono a veces muestra la pantalla vieja. Esto la mantiene al día:
// - al volver a la app después de un rato, trae los datos nuevos (fotos, clases, cuota…)
// - si se publicó una versión nueva de la app, recarga para usarla
const MINIMO_AFUERA_MS = 20_000;
const CADA_MS = 5 * 60_000;

export default function MantenerActualizada({ version }: { version: string }) {
  const router = useRouter();

  useEffect(() => {
    let ocultaDesde = 0;

    async function hayVersionNueva() {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { version: actual } = await r.json();
        return actual && actual !== version;
      } catch {
        return false; // sin conexión: seguimos con lo que hay
      }
    }

    async function actualizar() {
      if (await hayVersionNueva()) window.location.reload();
      else router.refresh();
    }

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "hidden") {
        ocultaDesde = Date.now();
      } else if (ocultaDesde && Date.now() - ocultaDesde > MINIMO_AFUERA_MS) {
        actualizar();
      }
    };
    // iOS a veces "despierta" la app sin avisar visibilidad: también miramos al volver a mostrarse
    const alMostrar = (e: PageTransitionEvent) => {
      if (e.persisted) actualizar();
    };
    const intervalo = setInterval(async () => {
      if (document.visibilityState === "visible" && (await hayVersionNueva())) window.location.reload();
    }, CADA_MS);

    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("pageshow", alMostrar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("pageshow", alMostrar);
    };
  }, [router, version]);

  return null;
}
