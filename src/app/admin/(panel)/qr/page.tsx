import { headers } from "next/headers";
import QRCode from "qrcode";
import BotonImprimir from "./BotonImprimir";
import { configuracion } from "@/lib/cuotas";
import Logo from "../../../Logo";

export default async function QR() {
  // Armamos la dirección de la app a partir de la URL actual
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/`;
  const qr = await QRCode.toDataURL(url, { width: 600, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
  const cfg = await configuracion();

  return (
    <main className="flex flex-col items-center gap-5">
      <p className="text-zinc-400 print:hidden">Imprimí este cartel y pegalo en la heladera o en la recepción.</p>
      <div
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border-2 border-orange-500 bg-black p-8 text-center text-white"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <Logo className="h-16" conMarca={false} />
        <div>
          <p className="font-display text-4xl font-extrabold uppercase italic leading-none">¿Sacaste algo?</p>
          <p className="mt-2 text-lg">
            Escaneá y <span className="font-bold text-orange-500">sumalo a tu cuota</span>
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`Código QR para ${url}`} className="w-60 rounded-xl bg-white p-3" />
        <p className="text-xs text-zinc-400">También reservás clases y cargás tus marcas</p>
        <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
          TUTUKAPP · {cfg.gymName}
        </p>
      </div>
      <BotonImprimir />
    </main>
  );
}
