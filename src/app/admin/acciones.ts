"use server";
// Acciones del administrador del gimnasio
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { esPeriodo, periodoActual } from "@/lib/periodo";
import { METODOS, consumosSinCobrar } from "@/lib/cuotas";
import { cerrarSesion, exigirAdmin, iniciarSesion } from "@/lib/session";
import { ipCliente, limpiarFallos, mensajeBloqueo, minutosBloqueado, registrarFallo } from "@/lib/throttle";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const entero = (f: FormData, k: string) => Math.round(Number(texto(f, k).replace(/[^\d]/g, "")));
const pinValido = (pin: string) => /^\d{4,6}$/.test(pin);
const opcional = (f: FormData, k: string) => texto(f, k) || null;

// Arma la URL de vuelta con un mensaje (?ok=... o ?error=...), codificando tildes y espacios
const aviso = (ruta: string, tipo: "ok" | "error", mensaje: string) =>
  `${ruta}?${new URLSearchParams({ [tipo]: mensaje })}`;

export async function loginAdmin(_prev: string | null, form: FormData): Promise<string | null> {
  const clave = texto(form, "clave");
  const key = `admin:${await ipCliente()}`;
  const bloqueo = await minutosBloqueado(key);
  if (bloqueo) return mensajeBloqueo(bloqueo);

  if (!process.env.ADMIN_PASSWORD || clave !== process.env.ADMIN_PASSWORD) {
    await registrarFallo(key);
    return "Contraseña incorrecta";
  }
  await limpiarFallos(key);
  await iniciarSesion({ rol: "admin" });
  redirect("/admin");
}

export async function salirAdmin() {
  await cerrarSesion();
  redirect("/admin/login");
}

// ---------- Socios ----------

export async function crearSocio(form: FormData) {
  await exigirAdmin();
  const name = texto(form, "name");
  const dni = texto(form, "dni").replace(/\D/g, "");
  const pin = texto(form, "pin");
  const monthlyLimit = entero(form, "monthlyLimit") || 20000;

  if (!name || dni.length < 6) redirect(aviso("/admin/socios", "error", "Completá nombre y DNI"));
  if (!pinValido(pin)) redirect(aviso("/admin/socios", "error", "El PIN debe tener de 4 a 6 números"));
  if (await db.member.findUnique({ where: { dni } })) {
    redirect(aviso("/admin/socios", "error", "Ya existe un socio con ese DNI"));
  }
  await db.member.create({
    data: {
      name,
      dni,
      monthlyLimit,
      phone: opcional(form, "phone"),
      planId: opcional(form, "planId"),
      pinHash: await bcrypt.hash(pin, 10),
    },
  });
  revalidatePath("/admin/socios");
  redirect(aviso("/admin/socios", "ok", "Socio creado"));
}

export async function actualizarSocio(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  await db.member.update({
    where: { id },
    data: {
      name: texto(form, "name"),
      phone: opcional(form, "phone"),
      email: opcional(form, "email"),
      planId: opcional(form, "planId"),
      monthlyLimit: entero(form, "monthlyLimit"),
      active: form.get("active") === "on",
    },
  });
  revalidatePath(`/admin/socios/${id}`);
  redirect(aviso(`/admin/socios/${id}`, "ok", "Datos guardados"));
}

export async function cambiarPin(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  const pin = texto(form, "pin");
  if (!pinValido(pin)) redirect(aviso(`/admin/socios/${id}`, "error", "El PIN debe tener de 4 a 6 números"));
  await db.member.update({ where: { id }, data: { pinHash: await bcrypt.hash(pin, 10) } });
  redirect(aviso(`/admin/socios/${id}`, "ok", "PIN actualizado"));
}

// Recepción anota un consumo a nombre de un socio
export async function agregarConsumoAdmin(form: FormData) {
  await exigirAdmin();
  const memberId = texto(form, "memberId");
  const producto = await db.product.findUnique({ where: { id: texto(form, "productId") } });
  const cantidad = Math.max(1, entero(form, "cantidad") || 1);
  if (!producto) redirect(aviso(`/admin/socios/${memberId}`, "error", "Elegí un producto"));
  await db.consumption.create({
    data: {
      memberId,
      productId: producto.id,
      productName: producto.name,
      unitPrice: producto.price,
      quantity: cantidad,
      period: periodoActual(),
    },
  });
  revalidatePath(`/admin/socios/${memberId}`);
  redirect(aviso(`/admin/socios/${memberId}`, "ok", "Consumo agregado"));
}

export async function alternarAnulado(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  const c = await db.consumption.findUniqueOrThrow({ where: { id } });
  if (c.paymentId) return; // ya se cobró: primero hay que anular el cobro
  await db.consumption.update({ where: { id }, data: { voided: !c.voided } });
  revalidatePath(`/admin/socios/${c.memberId}`);
  revalidatePath("/admin");
}

// ---------- Productos ----------

export async function crearProducto(form: FormData) {
  await exigirAdmin();
  const name = texto(form, "name");
  const price = entero(form, "price");
  if (!name || !price) redirect(aviso("/admin/productos", "error", "Completá nombre y precio"));
  await db.product.create({ data: { name, price, emoji: texto(form, "emoji") || "🥤" } });
  revalidatePath("/admin/productos");
  redirect(aviso("/admin/productos", "ok", "Producto creado"));
}

export async function actualizarProducto(form: FormData) {
  await exigirAdmin();
  const price = entero(form, "price");
  if (!price) redirect(aviso("/admin/productos", "error", "Precio inválido"));
  await db.product.update({
    where: { id: texto(form, "id") },
    data: {
      name: texto(form, "name"),
      price,
      emoji: texto(form, "emoji") || "🥤",
      active: form.get("active") === "on",
    },
  });
  revalidatePath("/admin/productos");
  redirect(aviso("/admin/productos", "ok", "Producto guardado"));
}

// ---------- Planes ----------

function datosPlan(form: FormData) {
  const name = texto(form, "name");
  const price = entero(form, "price");
  const clases = entero(form, "classesPerWeek");
  if (!name || !price) redirect(aviso("/admin/planes", "error", "Completá nombre y precio"));
  return { name, price, classesPerWeek: clases > 0 ? clases : null };
}

export async function crearPlan(form: FormData) {
  await exigirAdmin();
  await db.plan.create({ data: datosPlan(form) });
  revalidatePath("/admin/planes");
  redirect(aviso("/admin/planes", "ok", "Plan creado"));
}

export async function actualizarPlan(form: FormData) {
  await exigirAdmin();
  await db.plan.update({
    where: { id: texto(form, "id") },
    data: { ...datosPlan(form), active: form.get("active") === "on" },
  });
  revalidatePath("/admin/planes");
  redirect(aviso("/admin/planes", "ok", "Plan guardado"));
}

// ---------- Cobros ----------

// Registra el cobro de la cuota de un mes + los consumos pendientes
export async function registrarCobro(form: FormData) {
  await exigirAdmin();
  const memberId = texto(form, "memberId");
  const volver = `/admin/socios/${memberId}`;
  const periodo = texto(form, "period");
  const metodo = texto(form, "method");
  const cuota = entero(form, "feeAmount");
  const incluirConsumos = form.get("includeConsumos") === "on";

  if (!esPeriodo(periodo)) redirect(aviso(`${volver}`, "error", "Elegí el mes"));
  if (!(METODOS as readonly string[]).includes(metodo)) redirect(aviso(`${volver}`, "error", "Elegí el medio de pago"));

  const socio = await db.member.findUniqueOrThrow({ where: { id: memberId }, include: { plan: true } });
  const yaPagado = await db.payment.findFirst({ where: { memberId, period: periodo, voided: false, coversFee: true } });
  if (yaPagado) redirect(aviso(`${volver}`, "error", "Esa cuota ya está cobrada"));

  const pendientes = incluirConsumos ? await consumosSinCobrar(memberId) : { ids: [], total: 0 };
  if (cuota + pendientes.total === 0) redirect(aviso(`${volver}`, "error", "No hay nada para cobrar"));

  // Transacción: se guarda todo junto o nada
  await db.$transaction(async (tx) => {
    const pago = await tx.payment.create({
      data: {
        memberId,
        period: periodo,
        planName: socio.plan?.name ?? null,
        feeAmount: cuota,
        consumosAmount: pendientes.total,
        total: cuota + pendientes.total,
        method: metodo,
        notes: opcional(form, "notes"),
      },
    });
    if (pendientes.ids.length) {
      await tx.consumption.updateMany({
        where: { id: { in: pendientes.ids }, paymentId: null },
        data: { paymentId: pago.id },
      });
    }
  });
  revalidatePath("/admin");
  redirect(aviso(`${volver}`, "ok", "Cobro registrado"));
}

// Anula un cobro: los consumos vuelven a quedar pendientes
export async function anularCobro(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  const pago = await db.payment.findUniqueOrThrow({ where: { id } });
  await db.$transaction([
    db.payment.update({ where: { id }, data: { voided: true } }),
    db.consumption.updateMany({ where: { paymentId: id }, data: { paymentId: null } }),
  ]);
  revalidatePath("/admin");
  redirect(aviso(`/admin/socios/${pago.memberId}`, "ok", "Cobro anulado"));
}

// ---------- Configuración ----------

export async function guardarConfiguracion(form: FormData) {
  await exigirAdmin();
  const dia = entero(form, "dueDay");
  if (dia < 1 || dia > 28) redirect(aviso("/admin/configuracion", "error", "El día de vencimiento debe ser entre 1 y 28"));
  const datos = {
    gymName: texto(form, "gymName") || "Mi gimnasio",
    dueDay: dia,
    blockOverdue: form.get("blockOverdue") === "on",
  };
  await db.settings.upsert({ where: { id: 1 }, create: { id: 1, ...datos }, update: datos });
  revalidatePath("/", "layout");
  redirect(aviso("/admin/configuracion", "ok", "Configuración guardada"));
}
