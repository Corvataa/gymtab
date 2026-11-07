import Link from "next/link";
import { exigirAdmin } from "@/lib/session";
import { salirAdmin } from "../acciones";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  const links = [
    ["/admin", "Resumen"],
    ["/admin/socios", "Socios"],
    ["/admin/productos", "Productos"],
    ["/admin/qr", "QR"],
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-bold">💧 GymTab · Admin</span>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              {label}
            </Link>
          ))}
          <form action={salirAdmin}>
            <button className="rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              Salir
            </button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
