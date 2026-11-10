import Link from "next/link";
import { IconoClases, IconoCuenta, IconoEntreno, IconoMarcas } from "./Iconos";

type Tab = "cuenta" | "clases" | "entreno" | "marcas";

// Barra de pestañas fija abajo, como en las apps del celular
export default function NavSocio({ activa }: { activa: Tab }) {
  const tabs = [
    { href: "/tienda", id: "cuenta", texto: "Mi cuenta", Icono: IconoCuenta },
    { href: "/clases", id: "clases", texto: "Clases", Icono: IconoClases },
    { href: "/entreno", id: "entreno", texto: "Entreno", Icono: IconoEntreno },
    { href: "/marcas", id: "marcas", texto: "Marcas", Icono: IconoMarcas },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ href, id, texto, Icono }) => {
          const on = activa === id;
          return (
            <Link
              key={id}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                on ? "text-orange-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {on && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-orange-500" />}
              <Icono className="h-6 w-6" />
              {texto}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
