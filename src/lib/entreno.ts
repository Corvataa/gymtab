// Entrenamientos, resultados y marcas personales

export const TIPOS = {
  time: { texto: "Por tiempo (menos es mejor)", corto: "Tiempo" },
  reps: { texto: "Repeticiones totales", corto: "Reps" },
  rounds_reps: { texto: "Rondas + repeticiones", corto: "Rondas" },
  weight: { texto: "Peso máximo (kg)", corto: "Peso" },
  none: { texto: "Sin resultado", corto: "—" },
} as const;

export type Tipo = keyof typeof TIPOS;
export const esTipo = (t: string): t is Tipo => t in TIPOS;

// Ejercicios sugeridos para marcas personales (el socio también puede escribir otro)
export const EJERCICIOS = [
  "Sentadilla trasera",
  "Sentadilla frontal",
  "Peso muerto",
  "Press de banca",
  "Press militar",
  "Envión (clean & jerk)",
  "Arranque (snatch)",
  "Cargada (clean)",
  "Thruster",
  "Hip thrust",
];

// ---------- Convertir lo que escribe el socio en un número ----------

// Devuelve el valor numérico o null si el formato no es válido
export function leerResultado(tipo: Tipo, form: FormData): number | null {
  const t = (k: string) => String(form.get(k) ?? "").trim();
  switch (tipo) {
    case "time": {
      const m = t("tiempo").match(/^(\d{1,3}):([0-5]\d)$/);
      if (!m) return null;
      const seg = Number(m[1]) * 60 + Number(m[2]);
      return seg > 0 ? seg : null;
    }
    case "reps": {
      const n = Number(t("reps"));
      return Number.isInteger(n) && n > 0 && n < 100000 ? n : null;
    }
    case "rounds_reps": {
      const r = Number(t("rondas") || 0);
      const n = Number(t("reps") || 0);
      if (!Number.isInteger(r) || !Number.isInteger(n) || r < 0 || n < 0 || n > 999 || r > 999) return null;
      return r * 1000 + n > 0 ? r * 1000 + n : null;
    }
    case "weight":
      return leerKilos(t("kilos"));
    default:
      return null;
  }
}

// "102,5" o "102.5" -> 1025 (décimas de kg)
export function leerKilos(texto: string): number | null {
  const n = Number(texto.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null;
  return Math.round(n * 10);
}

export function kilos(decimas: number): string {
  return `${(decimas / 10).toLocaleString("es-AR", { maximumFractionDigits: 1 })} kg`;
}

export function mostrarResultado(tipo: string, valor: number): string {
  switch (tipo) {
    case "time":
      return `${Math.floor(valor / 60)}:${String(valor % 60).padStart(2, "0")}`;
    case "reps":
      return `${valor} reps`;
    case "rounds_reps": {
      const r = Math.floor(valor / 1000);
      const n = valor % 1000;
      return n ? `${r} rondas + ${n}` : `${r} rondas`;
    }
    case "weight":
      return kilos(valor);
    default:
      return "";
  }
}

// Ranking: primero los RX; dentro de cada grupo, por tiempo (menor) o por cantidad (mayor)
export function ordenarRanking<T extends { value: number; rx: boolean; createdAt: Date }>(tipo: string, lista: T[]): T[] {
  return [...lista].sort(
    (a, b) =>
      Number(b.rx) - Number(a.rx) ||
      (tipo === "time" ? a.value - b.value : b.value - a.value) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

// "Juana Pérez" -> "Juana P." (para no mostrar apellidos completos en el ranking)
export function nombreCorto(nombre: string): string {
  const [n, a] = nombre.trim().split(/\s+/);
  return a ? `${n} ${a[0].toUpperCase()}.` : n;
}

// Peso estimado para 1 repetición (fórmula de Epley), para comparar marcas con distintas reps
export function unaRepEstimada(peso: number, reps: number): number {
  return reps <= 1 ? peso : Math.round(peso * (1 + reps / 30));
}
