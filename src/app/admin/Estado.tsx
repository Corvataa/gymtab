import { ESTADOS, type Estado } from "@/lib/cuotas";

export default function EtiquetaEstado({ estado }: { estado: Estado }) {
  const e = ESTADOS[estado];
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${e.clase}`}>{e.texto}</span>;
}
