// Lectura de un Excel de socios exportado de otra aplicación (por ejemplo CrossHero).
// Reconoce las columnas por su título, así sirve aunque cambien de orden.
import ExcelJS from "exceljs";

export type FilaImportada = {
  fila: number;
  name: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  active: boolean;
  createdAt: Date | null;
  birthDate: string | null;
  legacy: Record<string, string>;
  problemas: string[];
};

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Títulos posibles de cada dato
const COLUMNAS: Record<string, string[]> = {
  nombre: ["nombre", "nombre y apellido", "nombre completo", "cliente", "socio"],
  apellido: ["apellido", "apellidos"],
  email: ["email", "e-mail", "correo", "correo electronico", "mail"],
  telefono: ["telefono", "celular", "movil", "tel"],
  dni: ["dni", "documento", "nro documento", "numero de documento"],
  estado: ["estado"],
  alta: ["fecha de alta", "alta", "fecha alta"],
  nacimiento: ["fecha de nacimiento", "nacimiento"],
};
// Datos que se guardan solo para consultar (título original -> etiqueta)
const EXTRA: Record<string, string> = {
  genero: "Género",
  direccion: "Dirección",
  ciudad: "Ciudad",
  provincia: "Provincia",
  mrr: "Cobro mensual automático (MRR)",
  cltv: "Total pagado histórico (CLTV)",
  "ultima reserva": "Última reserva",
  "fecha de alta": "Fecha de alta",
  "actualizacion de estado": "Último cambio de estado",
  estado: "Estado en la app anterior",
  notas: "Notas",
};

function texto(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return `${String(v.getUTCDate()).padStart(2, "0")}/${String(v.getUTCMonth() + 1).padStart(2, "0")}/${v.getUTCFullYear()}`;
  if (typeof v === "object") {
    if ("text" in v && v.text) return String(v.text); // hipervínculos
    if ("result" in v && v.result != null) return texto(v.result as ExcelJS.CellValue); // fórmulas
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
  }
  return String(v).trim();
}

// "24/02/2022" -> Date (mediodía, para que la zona horaria no cambie el día)
function fecha(s: string): Date | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 15));
  return isNaN(d.getTime()) ? null : d;
}

// "maximiliano ulloa" -> "Maximiliano Ulloa" (solo si la palabra está toda en minúsculas o mayúsculas)
function nombrePropio(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((p) => (p === p.toLowerCase() || p === p.toUpperCase() ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(" ");
}

export async function leerExcelSocios(archivo: ArrayBuffer): Promise<{ filas: FilaImportada[]; error?: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(archivo);
  } catch {
    return { filas: [], error: "No se pudo leer el archivo. Tiene que ser un Excel (.xlsx)." };
  }
  const ws = wb.worksheets[0];
  if (!ws) return { filas: [], error: "El Excel está vacío." };

  // Buscamos la fila de títulos (la primera que tenga "nombre" y "email" o "dni")
  let filaTitulos = 0;
  const posicion: Record<string, number> = {};
  const extras: Record<number, string> = {};
  for (let f = 1; f <= Math.min(10, ws.rowCount) && !filaTitulos; f++) {
    const titulos = (ws.getRow(f).values as ExcelJS.CellValue[]).map((v) => sinTildes(texto(v)));
    const buscar = (claves: string[]) => titulos.findIndex((t) => claves.includes(t));
    if (buscar(COLUMNAS.nombre) > 0 && (buscar(COLUMNAS.email) > 0 || buscar(COLUMNAS.dni) > 0)) {
      filaTitulos = f;
      for (const [dato, claves] of Object.entries(COLUMNAS)) {
        const i = buscar(claves);
        if (i > 0) posicion[dato] = i;
      }
      titulos.forEach((t, i) => {
        if (EXTRA[t]) extras[i] = EXTRA[t];
      });
    }
  }
  if (!filaTitulos) return { filas: [], error: "No encontré las columnas Nombre y Email (o DNI) en las primeras filas." };

  const filas: FilaImportada[] = [];
  for (let f = filaTitulos + 1; f <= ws.rowCount; f++) {
    const row = ws.getRow(f);
    const val = (dato: string) => (posicion[dato] ? texto(row.getCell(posicion[dato]).value) : "");
    const nombre = [val("nombre"), val("apellido")].filter(Boolean).join(" ");
    if (!nombre && !val("email") && !val("dni")) continue; // fila vacía

    const problemas: string[] = [];
    let email: string | null = val("email").toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      problemas.push(`email inválido (${email})`);
      email = null;
    }
    const dniTexto = val("dni").replace(/\D/g, "");
    const dni = dniTexto.length >= 7 && dniTexto.length <= 9 ? dniTexto : null;
    if (dniTexto && !dni) problemas.push(`DNI inválido (${val("dni")})`);
    const phone = val("telefono").replace(/[^\d+]/g, "") || null;
    const nac = fecha(val("nacimiento"));
    if (!nombre) problemas.push("sin nombre");
    if (!email && !dni) problemas.push("sin email ni DNI: no va a poder activar su cuenta sola");

    const legacy: Record<string, string> = {};
    for (const [i, etiqueta] of Object.entries(extras)) {
      const v = texto(row.getCell(Number(i)).value).trim();
      if (v) legacy[etiqueta] = v;
    }

    filas.push({
      fila: f,
      name: nombrePropio(nombre || email || dni || "Sin nombre"),
      email,
      phone,
      dni,
      active: sinTildes(val("estado") || "activo") !== "inactivo",
      createdAt: fecha(val("alta")),
      birthDate: nac ? nac.toISOString().slice(0, 10) : null,
      legacy,
      problemas,
    });
  }
  return { filas };
}
