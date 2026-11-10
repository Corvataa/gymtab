import { db } from "@/lib/db";
import { configuracion } from "@/lib/cuotas";

// ¿Hay un logo subido desde Configuración? (consulta liviana: no trae la imagen)
export async function hayLogo() {
  return (await db.settings.count({ where: { id: 1, logo: { not: null } } })) > 0;
}

// Logo del gimnasio: el que se subió desde Configuración o, si no hay, la T de Tutuka
export default async function Logo({ className = "h-10", conMarca = true }: { className?: string; conMarca?: boolean }) {
  const [cfg, hay] = await Promise.all([configuracion(), hayLogo()]);
  const src = hay ? `/logo?v=${cfg.logoVersion}` : "/marca.svg";
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={cfg.gymName} className={`w-auto object-contain ${className}`} />
      {conMarca && <Marca />}
    </span>
  );
}

export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`font-display font-extrabold uppercase italic leading-none tracking-tight ${grande ? "text-5xl" : "text-2xl"}`}>
      TUTUK<span className="text-orange-500">APP</span>
    </span>
  );
}
