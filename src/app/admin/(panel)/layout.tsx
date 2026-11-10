import Link from "next/link";
import { configuracion } from "@/lib/cuotas";
import { exigirAdmin } from "@/lib/session";
import { salirAdmin } from "../acciones";

export const dynamic = "force-dynamic";

const links = [
  ["/admin", "Inicio"],
  ["/admin/socios", "Socios"],
  ["/admin/clases", "Clases"],
  ["/admin/entrenamientos", "Entrenamientos"],
  ["/admin/planes", "Planes"],
  ["/admin/productos", "Productos"],
  ["/admin/qr", "QR"],
  ["/admin/configuracion", "Configuración"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  const cfg = await configuracion();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-lg font-black tracking-tight">TUTUKAPP</p>
          <p className="text-xs text-zinc-500">{cfg.gymName}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              {label}
            </Link>
          ))}
          <form action={salirAdmin}>
            <button className="rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800">Salir</button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
