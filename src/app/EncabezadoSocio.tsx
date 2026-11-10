import Link from "next/link";
import { salir } from "./acciones";

export default function EncabezadoSocio({ titulo }: { titulo: string }) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <p className="text-xs font-black tracking-widest text-emerald-700 dark:text-emerald-400">TUTUKAPP</p>
        <h1 className="text-xl font-bold">{titulo}</h1>
      </div>
      <div className="flex items-center gap-4 text-sm text-zinc-500">
        <Link href="/tienda/pin" className="underline">Cambiar PIN</Link>
        <form action={salir}>
          <button className="underline">Salir</button>
        </form>
      </div>
    </header>
  );
}
