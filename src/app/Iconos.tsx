// Íconos simples (trazos), para no depender de librerías externas
type P = { className?: string };
const base = (className = "h-6 w-6") => ({
  className,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
});

export const IconoCuenta = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></svg>
);
export const IconoClases = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h3" /></svg>
);
export const IconoEntreno = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></svg>
);
export const IconoMarcas = ({ className }: P) => (
  <svg {...base(className)}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></svg>
);
export const IconoLlave = ({ className }: P) => (
  <svg {...base(className)}><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M16 7l3 3M14 9l2 2" /></svg>
);
export const IconoSalir = ({ className }: P) => (
  <svg {...base(className)}><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" /></svg>
);
