import { headers } from "next/headers";
import QRCode from "qrcode";
import BotonImprimir from "./BotonImprimir";
import { configuracion } from "@/lib/cuotas";

export default async function QR() {
  // Armamos la dirección de la app a partir de la URL actual
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/`;
  const qr = await QRCode.toDataURL(url, { width: 600, margin: 1 });
  const cfg = await configuracion();

  return (
    <main className="flex flex-col items-center gap-5">
      <p className="text-zinc-500 print:hidden">Imprimí este cartel y pegalo en la heladera.</p>
      <div className="tarjeta flex w-full max-w-sm flex-col items-center gap-4 bg-white p-8 text-center text-zinc-900">
        <p className="text-3xl font-black">¿Sacaste algo?</p>
        <p className="text-lg">Escaneá y sumalo a tu cuota</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`Código QR para ${url}`} className="w-64" />
        <p className="text-sm text-zinc-500">{url}</p>
        <p className="text-xs font-bold tracking-widest text-zinc-400">TUTUKAPP · {cfg.gymName}</p>
      </div>
      <BotonImprimir />
    </main>
  );
}
