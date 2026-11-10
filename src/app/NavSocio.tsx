import Link from "next/link";

type Tab = "cuenta" | "clases" | "entreno" | "marcas";

// Pestañas del socio
export default function NavSocio({ activa }: { activa: Tab }) {
  const tabs: [string, Tab, string][] = [
    ["/tienda", "cuenta", "Mi cuenta"],
    ["/clases", "clases", "Clases"],
    ["/entreno", "entreno", "Entreno"],
    ["/marcas", "marcas", "Marcas"],
  ];
  return (
    <nav className="flex gap-1 rounded-xl bg-zinc-200 p-1 dark:bg-zinc-800">
      {tabs.map(([href, id, texto]) => (
        <Link
          key={id}
          href={href}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
            activa === id ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-500"
          }`}
        >
          {texto}
        </Link>
      ))}
    </nav>
  );
}
