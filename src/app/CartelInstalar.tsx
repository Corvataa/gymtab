"use client";
import { useEffect, useState } from "react";

// Cartel que explica cómo instalar la app según el celular.
// No aparece si la app ya está instalada, en computadoras, o si el socio lo cerró.

type Modo = "android-boton" | "android-menu" | "ios-safari" | "ios-otro" | "app-interna";
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const CLAVE = "tutukapp-cartel-instalar-cerrado";

function leerCerrado() {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}
function guardarCerrado() {
  try {
    localStorage.setItem(CLAVE, "1");
  } catch {
    /* sin almacenamiento disponible: no pasa nada */
  }
}

function detectar(): Modo | null {
  const ua = navigator.userAgent;
  const instalada =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (instalada) return null;

  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  if (!ios && !android) return null; // computadora

  // Navegadores dentro de otras apps (WhatsApp, Instagram, Facebook…): desde ahí no se puede instalar
  if (/FBAN|FBAV|Instagram|WhatsApp|Line\/|TikTok|; wv\)/i.test(ua)) return "app-interna";
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) ? "ios-otro" : "ios-safari";
  return "android-menu"; // si Chrome ofrece el botón, se cambia a "android-boton"
}

const IconoCompartir = () => (
  <svg viewBox="0 0 24 24" className="inline h-5 w-5 align-[-4px] text-sky-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Compartir">
    <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);

export default function CartelInstalar({ conBarra = false }: { conBarra?: boolean }) {
  const [modo, setModo] = useState<Modo | null>(null);
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (leerCerrado()) return;
    const m = detectar();
    if (!m) return;
    // Un momento después de cargar, para no tapar la pantalla de entrada
    const t = setTimeout(() => setModo((actual) => actual ?? m), 1200);
    const alOfrecer = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      setModo("android-boton");
    };
    const alInstalar = () => {
      guardarCerrado();
      setModo(null);
    };
    window.addEventListener("beforeinstallprompt", alOfrecer);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", alOfrecer);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (!modo) return null;

  const cerrar = () => {
    guardarCerrado();
    setModo(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Instalá la app"
      className={`fixed inset-x-3 z-30 mx-auto max-w-md rounded-2xl border border-orange-500/40 bg-zinc-900/95 p-4 shadow-[0_10px_40px_-10px_rgb(249_115_22_/_0.5)] backdrop-blur ${
        conBarra ? "bottom-24" : "bottom-4"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1">
          <p className="font-display text-xl font-bold uppercase leading-tight">Instalá la app</p>
          <div className="mt-1 text-sm text-zinc-300">
            {modo === "android-boton" && <p>Tenela en tu pantalla de inicio y abrila con un toque, como cualquier app.</p>}
            {modo === "android-menu" && (
              <p>
                Tocá el menú <b className="text-white">⋮</b> arriba a la derecha y elegí <b className="text-white">Instalar app</b> o{" "}
                <b className="text-white">Agregar a la pantalla principal</b>.
              </p>
            )}
            {modo === "ios-safari" && (
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  Tocá <IconoCompartir /> <b className="text-white">Compartir</b> en la barra de abajo.
                </li>
                <li>
                  Elegí <b className="text-white">Agregar a inicio</b> (puede estar más abajo en la lista).
                </li>
              </ol>
            )}
            {modo === "ios-otro" && (
              <p>
                En iPhone se instala desde <b className="text-white">Safari</b>. Copiá el link, pegalo en Safari y tocá{" "}
                <IconoCompartir /> → <b className="text-white">Agregar a inicio</b>.
              </p>
            )}
            {modo === "app-interna" && (
              <p>
                Estás dentro de otra app. Tocá los <b className="text-white">tres puntos</b> y elegí{" "}
                <b className="text-white">Abrir en el navegador</b> (Chrome o Safari) para poder instalarla. Si no aparece, copiá el link y pegalo en el navegador.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {modo === "android-boton" && evento && (
          <button
            className="btn-primario flex-1 py-2.5"
            onClick={async () => {
              await evento.prompt();
              const { outcome } = await evento.userChoice;
              if (outcome === "accepted") cerrar();
            }}
          >
            Instalar
          </button>
        )}
        {(modo === "ios-otro" || modo === "app-interna") && (
          <button
            className="btn-primario flex-1 py-2.5"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.origin);
                setCopiado(true);
              } catch {
                window.prompt("Copiá este link:", window.location.origin);
              }
            }}
          >
            {copiado ? "¡Link copiado!" : "Copiar link"}
          </button>
        )}
        <button
          onClick={cerrar}
          className={`btn-secundario py-2.5 ${modo === "android-boton" || modo === "ios-otro" || modo === "app-interna" ? "" : "flex-1"}`}
        >
          {modo === "android-boton" ? "Ahora no" : "Entendido"}
        </button>
      </div>
    </div>
  );
}
