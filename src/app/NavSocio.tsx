import Link from "next/link";

// Pestañas del socio: "Mi cuenta" y "Clases"
export default function NavSocio({ activa }: { activa: "cuenta" | "clases" }) {
  const tab = (href: string, id: string, texto: string) => (
    <Link
      href={href}
      className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
        activa === id ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-500"
      }`}
    >
      {texto}
    </Link>
  );
  return (
    <nav className="flex gap-1 rounded-xl bg-zinc-200 p-1 dark:bg-zinc-800">
      {tab("/tienda", "cuenta", "Mi cuenta")}
      {tab("/clases", "clases", "Clases")}
    </nav>
  );
}
