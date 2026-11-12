// Foto de perfil redonda; si el socio no subió foto, muestra sus iniciales
type Props = { id: string; nombre: string; version: number; tam?: number; className?: string };

export function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export default function Avatar({ id, nombre, version, tam = 40, className = "" }: Props) {
  const estilo = { width: tam, height: tam, fontSize: Math.round(tam * 0.38) };
  if (version > 0) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/avatar/${id}?v=${version}`}
        alt={nombre}
        style={estilo}
        className={`shrink-0 rounded-full object-cover ring-2 ring-orange-500/60 ${className}`}
      />
    );
  }
  return (
    <span
      aria-label={nombre}
      style={estilo}
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 font-display font-bold text-black ${className}`}
    >
      {iniciales(nombre)}
    </span>
  );
}
