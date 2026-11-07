// Descarga un CSV (se abre con Excel / Google Sheets) con los totales del mes
import { db } from "@/lib/db";
import { periodoActual } from "@/lib/periodo";
import { sesionActual } from "@/lib/session";

export async function GET(req: Request) {
  if ((await sesionActual())?.rol !== "admin") {
    return new Response("No autorizado", { status: 401 });
  }
  const p = new URL(req.url).searchParams.get("periodo") ?? "";
  const periodo = /^\d{4}-\d{2}$/.test(p) ? p : periodoActual();

  const consumos = await db.consumption.findMany({
    where: { period: periodo, voided: false },
    include: { member: true },
  });
  const porSocio = new Map<string, { nombre: string; dni: string; monto: number; detalle: string[] }>();
  for (const c of consumos) {
    const f = porSocio.get(c.memberId) ?? { nombre: c.member.name, dni: c.member.dni, monto: 0, detalle: [] };
    f.monto += c.unitPrice * c.quantity;
    f.detalle.push(`${c.quantity}x ${c.productName}`);
    porSocio.set(c.memberId, f);
  }

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lineas = ["Socio;DNI;Monto;Detalle"];
  for (const f of [...porSocio.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    lineas.push([esc(f.nombre), esc(f.dni), f.monto, esc(f.detalle.join(", "))].join(";"));
  }
  // ﻿ hace que Excel reconozca los acentos
  return new Response("﻿" + lineas.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="consumos-${periodo}.csv"`,
    },
  });
}
