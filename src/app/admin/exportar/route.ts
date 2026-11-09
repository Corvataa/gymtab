// Descarga un CSV (se abre con Excel / Google Sheets) con el estado de cuotas del mes
import { ESTADOS, resumenSocios } from "@/lib/cuotas";
import { esPeriodo, periodoActual } from "@/lib/periodo";
import { sesionActual } from "@/lib/session";

export async function GET(req: Request) {
  if ((await sesionActual())?.rol !== "admin") {
    return new Response("No autorizado", { status: 401 });
  }
  const p = new URL(req.url).searchParams.get("periodo");
  const periodo = esPeriodo(p) ? p : periodoActual();
  const { filas } = await resumenSocios(periodo);

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lineas = ["Socio;DNI;Plan;Estado;Cuota;Consumos sin cobrar;A cobrar;Cobrado"];
  for (const f of filas) {
    lineas.push(
      [
        esc(f.socio.name),
        esc(f.socio.dni),
        esc(f.socio.plan?.name ?? ""),
        ESTADOS[f.estado].texto,
        f.cuota,
        f.consumos,
        f.aCobrar,
        f.pago?.total ?? 0,
      ].join(";"),
    );
  }
  // ﻿ hace que Excel reconozca los acentos
  return new Response("﻿" + lineas.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cuotas-${periodo}.csv"`,
    },
  });
}
