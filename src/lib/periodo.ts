// Utilidades de fechas y montos, siempre en hora de Argentina
const TZ = "America/Argentina/Buenos_Aires";

// Devuelve el mes actual como "2026-11"
export function periodoActual(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(fecha);
  const y = partes.find((p) => p.type === "year")!.value;
  const m = partes.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

// "2026-11" -> "noviembre 2026"
export function nombrePeriodo(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  return new Date(y, m - 1, 15).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

// Lista de los últimos N meses, el más reciente primero
export function ultimosPeriodos(n = 12): string[] {
  const res: string[] = [];
  const [y, m] = periodoActual().split("-").map(Number);
  for (let i = 0; i < n; i++) {
    const d = new Date(y, m - 1 - i, 15);
    res.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return res;
}

export function pesos(monto: number): string {
  return monto.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export function fechaHora(fecha: Date): string {
  return fecha.toLocaleString("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
