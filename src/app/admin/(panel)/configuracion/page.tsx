import { configuracion } from "@/lib/cuotas";
import { guardarConfiguracion } from "../../acciones";
import Avisos from "../../Avisos";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function Configuracion({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const cfg = await configuracion();

  return (
    <main className="flex max-w-xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <Avisos ok={ok} error={error} />
      <form action={guardarConfiguracion} className="tarjeta flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nombre del gimnasio
          <input name="gymName" defaultValue={cfg.gymName} className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Día de vencimiento de la cuota (1 a 28)
          <input name="dueDay" defaultValue={cfg.dueDay} inputMode="numeric" className="input w-28" />
          <span className="text-xs text-zinc-500">
            Hasta ese día la cuota figura como &quot;Pendiente&quot;; después, como &quot;Vencida&quot;.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="blockOverdue" defaultChecked={cfg.blockOverdue} className="mt-0.5 h-5 w-5" />
          <span>
            No dejar sumar consumos a socios con la cuota vencida
            <span className="block text-xs text-zinc-500">Recomendado: evita que crezca la deuda de quien no paga.</span>
          </span>
        </label>
        <button className="btn-primario self-start">Guardar</button>
      </form>
    </main>
  );
}
