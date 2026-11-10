import { configuracion } from "@/lib/cuotas";
import { exigirAdmin } from "@/lib/session";
import { salirAdmin } from "../acciones";
import NavAdmin from "../NavAdmin";
import Logo from "../../Logo";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  const cfg = await configuracion();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <Logo className="h-10" />
          <span className="hidden border-l border-white/15 pl-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 sm:block">
            {cfg.gymName}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <NavAdmin />
          <form action={salirAdmin}>
            <button className="rounded-lg px-3 py-2 text-zinc-500 hover:bg-white/10 hover:text-white">Salir</button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
