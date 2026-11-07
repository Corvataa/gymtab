"use server";
// Acciones del administrador del gimnasio
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { periodoActual } from "@/lib/periodo";
import { cerrarSesion, exigirAdmin, iniciarSesion } from "@/lib/session";
import { ipCliente, limpiarFallos, mensajeBloqueo, minutosBloqueado, registrarFallo } from "@/lib/throttle";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const entero = (f: FormData, k: string) => Math.round(Number(texto(f, k).replace(/[^\d]/g, "")));
const pinValido = (pin: string) => /^\d{4,6}$/.test(pin);

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

  if (!name || dni.length < 6) redirect("/admin/socios?error=Completá nombre y DNI");
  if (!pinValido(pin)) redirect("/admin/socios?error=El PIN debe tener de 4 a 6 números");
  if (await db.member.findUnique({ where: { dni } })) {
    redirect("/admin/socios?error=Ya existe un socio con ese DNI");
  }
  await db.member.create({
    data: { name, dni, monthlyLimit, pinHash: await bcrypt.hash(pin, 10) },
  });
  revalidatePath("/admin/socios");
  redirect("/admin/socios?ok=Socio creado");
}

export async function actualizarSocio(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  await db.member.update({
    where: { id },
    data: {
      name: texto(form, "name"),
      monthlyLimit: entero(form, "monthlyLimit"),
      active: form.get("active") === "on",
    },
  });
  revalidatePath(`/admin/socios/${id}`);
  redirect(`/admin/socios/${id}?ok=Datos guardados`);
}

export async function cambiarPin(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  const pin = texto(form, "pin");
  if (!pinValido(pin)) redirect(`/admin/socios/${id}?error=El PIN debe tener de 4 a 6 números`);
  await db.member.update({ where: { id }, data: { pinHash: await bcrypt.hash(pin, 10) } });
  redirect(`/admin/socios/${id}?ok=PIN actualizado`);
}

// Recepción anota un consumo a nombre de un socio
export async function agregarConsumoAdmin(form: FormData) {
  await exigirAdmin();
  const memberId = texto(form, "memberId");
  const producto = await db.product.findUnique({ where: { id: texto(form, "productId") } });
  const cantidad = Math.max(1, entero(form, "cantidad") || 1);
  if (!producto) redirect(`/admin/socios/${memberId}?error=Elegí un producto`);
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
  redirect(`/admin/socios/${memberId}?ok=Consumo agregado`);
}

export async function alternarAnulado(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  const c = await db.consumption.findUniqueOrThrow({ where: { id } });
  await db.consumption.update({ where: { id }, data: { voided: !c.voided } });
  revalidatePath(`/admin/socios/${c.memberId}`);
  revalidatePath("/admin");
}

// ---------- Productos ----------

export async function crearProducto(form: FormData) {
  await exigirAdmin();
  const name = texto(form, "name");
  const price = entero(form, "price");
  if (!name || !price) redirect("/admin/productos?error=Completá nombre y precio");
  await db.product.create({ data: { name, price, emoji: texto(form, "emoji") || "🥤" } });
  revalidatePath("/admin/productos");
  redirect("/admin/productos?ok=Producto creado");
}

export async function actualizarProducto(form: FormData) {
  await exigirAdmin();
  const price = entero(form, "price");
  if (!price) redirect("/admin/productos?error=Precio inválido");
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
  redirect("/admin/productos?ok=Producto guardado");
}
