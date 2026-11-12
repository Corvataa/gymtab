import Link from "next/link";
import FormImportar from "./FormImportar";

export default function Importar() {
  return (
    <main className="flex flex-col gap-5">
      <Link href="/admin/socios" className="text-sm text-zinc-400 underline">← Socios</Link>
      <div>
        <h1 className="text-2xl font-bold">Importar socios desde Excel</h1>
        <p className="mt-1 max-w-3xl text-zinc-400">
          Subí el Excel exportado de la otra aplicación (por ejemplo, &quot;Clientes&quot; de CrossHero). Primero vas a ver
          una vista previa; no se carga nada hasta que confirmes.
        </p>
      </div>
      <ul className="tarjeta grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
        <li>• Se reconocen las columnas <b>Nombre, Email, Teléfono, DNI, Estado</b> y <b>Fecha de alta</b>.</li>
        <li>• Los socios <b>Inactivos</b> se cargan <b>pausados</b>: si vuelven, los reactivás desde su ficha.</li>
        <li>• Los que <b>ya están</b> en la app (mismo email o DNI) no se tocan.</li>
        <li>• Cada socio activa su cuenta desde la app con <b>su email</b>, completa el DNI y elige un PIN; vos lo aprobás.</li>
        <li>• Total pagado, cobro mensual, última reserva y otros datos quedan guardados en la ficha de cada socio.</li>
        <li>• El Excel no trae planes: después asignalos desde Socios → filtro &quot;Sin plan&quot;.</li>
      </ul>
      <FormImportar />
    </main>
  );
}
