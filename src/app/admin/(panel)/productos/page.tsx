import { db } from "@/lib/db";
import { actualizarProducto, crearProducto } from "../../acciones";
import Avisos from "../../Avisos";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function Productos({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const productos = await db.product.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <main className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Productos</h1>
      <Avisos ok={ok} error={error} />

      <form action={crearProducto} className="tarjeta grid grid-cols-[4rem_1fr] gap-3 sm:grid-cols-[4rem_1fr_10rem_auto]">
        <input name="emoji" placeholder="🥤" maxLength={4} className="input text-center" />
        <input name="name" placeholder="Nombre (ej: Agua 500ml)" required className="input" />
        <input name="price" placeholder="Precio $" inputMode="numeric" required className="input col-span-2 sm:col-span-1" />
        <button className="btn-primario col-span-2 sm:col-span-1">+ Agregar</button>
      </form>

      <p className="text-sm text-zinc-500">
        Si cambiás un precio, los consumos ya anotados mantienen el precio viejo.
      </p>

      <ul className="flex flex-col gap-3">
        {productos.map((p) => (
          <li key={p.id}>
            <form action={actualizarProducto} className={`tarjeta grid grid-cols-[4rem_1fr] items-center gap-3 sm:grid-cols-[4rem_1fr_10rem_auto_auto] ${p.active ? "" : "opacity-60"}`}>
              <input type="hidden" name="id" value={p.id} />
              <input name="emoji" defaultValue={p.emoji} maxLength={4} className="input text-center" />
              <input name="name" defaultValue={p.name} required className="input" />
              <input name="price" defaultValue={p.price} inputMode="numeric" required className="input" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={p.active} className="h-5 w-5" />
                Visible
              </label>
              <button className="btn-secundario col-span-2 py-2 sm:col-span-1">Guardar</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
