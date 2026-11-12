"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links: [string, string][] = [
  ["/admin", "Inicio"],
  ["/admin/socios", "Socios"],
  ["/admin/clases", "Clases"],
  ["/admin/entrenamientos", "Entrenamientos"],
  ["/admin/fotos", "Fotos"],
  ["/admin/planes", "Planes"],
  ["/admin/productos", "Productos"],
  ["/admin/qr", "QR"],
  ["/admin/configuracion", "Configuración"],
];

// Menú del panel; resalta la sección actual
export default function NavAdmin() {
  const ruta = usePathname();
  return (
    <>
      {links.map(([href, label]) => {
        const on = href === "/admin" ? ruta === "/admin" : ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 font-semibold transition ${
              on ? "bg-orange-500 text-black" : "text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
