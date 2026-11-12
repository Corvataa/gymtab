"use server";
// Acciones del administrador del gimnasio
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { esPeriodo, periodoActual } from "@/lib/periodo";
import { METODOS, consumosSinCobrar } from "@/lib/cuotas";
import { cancelarReserva, horaValida, limpiarClasesFuturas } from "@/lib/clases";
import { esTipo } from "@/lib/entreno";
import { leerExcelSocios } from "@/lib/importar";
import { borrarFotosViejas } from "@/lib/fotos";
import { cerrarSesion, exigirAdmin, iniciarSesion } from "@/lib/session";
import { ipCliente, limpiarFallos, mensajeBloqueo, minutosBloqueado, registrarFallo } from "@/lib/throttle";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const entero = (f: FormData, k: string) => Math.round(Number(texto(f, k).replace(/[^\d]/g, "")));
const pinValido = (pin: string) => /^\d{4,6}$/.test(pin);
const opcional = (f: FormData, k: string) => texto(f, k) || null;

// Arma la URL de vuelta con un mensaje (?ok=... o ?error=...), codificando tildes y espacios
const aviso = (ruta: string, tipo: "ok" | "error", mensaje: string) =>
  `${ruta}${ruta.includes("?") ? "&" : "?"}${new URLSearchParams({ [tipo]: mensaje })}`;

export async function loginAdmin(_prev: string | null, form: FormData): Promise<string | null> {
  const clave = texto(form, "clave");
  const key = `admin:${await ipCliente()}`;
  const bloqueo = await minutosBloqueado(key);
  if (bloqueo) return mensajeBloqueo(bloqueo);

  // Ignoramos espacios y comillas que se cuelan al cargar la variable en Vercel
  const esperada = (process.env.ADMIN_PASSWORD ?? "").trim().replace(/^["'](.*)["']$/, "$1");
  if (!esperada) {
    return "Falta configurar ADMIN_PASSWORD en Vercel (Variables ambientales) y hacer Redeploy.";
  }
  if (clave !== esperada) {
    await registrarFallo(key);
    // Queda en los registros de Vercel para diagnosticar (sin mostrar la contraseña)
    console.warn("Login admin fallido", {
      caracteresEsperados: esperada.length,
      caracteresRecibidos: clave.length,
      soloDifiereEnMayusculas: clave.toLowerCase() === esperada.toLowerCase(),
    });
    return clave.toLowerCase() === esperada.toLowerCase()
      ? "Contraseña incorrecta: revisá las mayúsculas y minúsculas"
      : "Contraseña incorrecta";
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
      email: opcional(form, "email")?.toLowerCase() ?? null,
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
  const email = opcional(form, "email")?.toLowerCase() ?? null;
  const dniTexto = texto(form, "dni").replace(/\D/g, "");
  const dni = dniTexto || null;
  if (dni && (dni.length < 7 || dni.length > 9)) redirect(aviso(`/admin/socios/${id}`, "error", "Revisá el DNI"));
  const repetido = await db.member.findFirst({
    where: { id: { not: id }, OR: [...(dni ? [{ dni }, { pendingDni: dni }] : []), ...(email ? [{ email }] : [])] },
  });
  if (repetido) redirect(aviso(`/admin/socios/${id}`, "error", `Ese DNI o email ya lo tiene ${repetido.name}`));
  await db.member.update({
    where: { id },
    data: {
      name: texto(form, "name"),
      phone: opcional(form, "phone"),
      email: email,
      dni: dni,
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
  const cancelHours = entero(form, "cancelHours");
  const bookingDays = entero(form, "bookingDays");
  if (bookingDays < 1 || bookingDays > 30) redirect(aviso("/admin/configuracion", "error", "Los días para reservar deben ser entre 1 y 30"));
  const datos = {
    gymName: texto(form, "gymName") || "Mi gimnasio",
    dueDay: dia,
    blockOverdue: form.get("blockOverdue") === "on",
    cancelHours: Math.min(cancelHours, 72),
    bookingDays,
    photoDays: Math.min(Math.max(entero(form, "photoDays") || 30, 1), 365),
  };
  await db.settings.upsert({ where: { id: 1 }, create: { id: 1, ...datos }, update: datos });
  revalidatePath("/", "layout");
  redirect(aviso("/admin/configuracion", "ok", "Configuración guardada"));
}

// ---------- Clases ----------

function datosHorario(form: FormData) {
  const name = texto(form, "name");
  const weekday = entero(form, "weekday");
  const startTime = texto(form, "startTime");
  const capacity = entero(form, "capacity");
  const durationMin = entero(form, "durationMin") || 60;
  if (!name || weekday < 1 || weekday > 7 || !horaValida(startTime) || capacity < 1) {
    redirect(aviso("/admin/clases", "error", "Revisá nombre, día, horario (ej: 07:00) y cupo"));
  }
  return { name, weekday, startTime, capacity, durationMin, coach: opcional(form, "coach") };
}

export async function crearHorario(form: FormData) {
  await exigirAdmin();
  await db.classSchedule.create({ data: datosHorario(form) });
  revalidatePath("/admin/clases");
  redirect(aviso("/admin/clases", "ok", "Horario creado"));
}

export async function actualizarHorario(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  await db.classSchedule.update({
    where: { id },
    data: { ...datosHorario(form), active: form.get("active") === "on" },
  });
  // Las clases futuras sin reservas se vuelven a generar con los datos nuevos
  await limpiarClasesFuturas(id);
  revalidatePath("/admin/clases");
  redirect(aviso("/admin/clases", "ok", "Horario guardado. Las clases que ya tienen reservas no cambian."));
}

export async function alternarSuspension(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  const c = await db.classSession.findUniqueOrThrow({ where: { id } });
  await db.classSession.update({ where: { id }, data: { cancelled: !c.cancelled } });
  redirect(aviso(`/admin/clases/${id}`, "ok", c.cancelled ? "Clase reactivada" : "Clase suspendida"));
}

export async function cambiarCupo(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  const capacity = entero(form, "capacity");
  if (capacity < 1) redirect(aviso(`/admin/clases/${id}`, "error", "Cupo inválido"));
  await db.classSession.update({ where: { id }, data: { capacity } });
  redirect(aviso(`/admin/clases/${id}`, "ok", "Cupo actualizado"));
}

// Recepción anota a un socio (puede pasar el cupo)
export async function anotarSocio(form: FormData) {
  await exigirAdmin();
  const sessionId = texto(form, "sessionId");
  const memberId = texto(form, "memberId");
  if (!memberId) redirect(aviso(`/admin/clases/${sessionId}`, "error", "Elegí un socio"));
  await db.booking.upsert({
    where: { sessionId_memberId: { sessionId, memberId } },
    create: { sessionId, memberId, status: "confirmed" },
    update: { status: "confirmed", cancelledAt: null },
  });
  redirect(aviso(`/admin/clases/${sessionId}`, "ok", "Socio anotado"));
}

export async function quitarReserva(form: FormData) {
  await exigirAdmin();
  const sessionId = texto(form, "sessionId");
  const r = await cancelarReserva(texto(form, "bookingId"), { sinLimiteDeTiempo: true });
  redirect(aviso(`/admin/clases/${sessionId}`, r.ok ? "ok" : "error", r.mensaje));
}

// ---------- Entrenamientos ----------

function datosEntreno(form: FormData, volver: string) {
  const date = texto(form, "date");
  const title = texto(form, "title");
  const description = String(form.get("description") ?? "").trim();
  const scoreType = texto(form, "scoreType");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title || !description || !esTipo(scoreType)) {
    redirect(aviso(volver, "error", "Completá fecha, título, entrenamiento y tipo de resultado"));
  }
  return { date, title, description, scoreType, published: form.get("published") === "on" };
}

export async function crearEntreno(form: FormData) {
  await exigirAdmin();
  const w = await db.workout.create({ data: datosEntreno(form, "/admin/entrenamientos/nuevo") });
  redirect(aviso(`/admin/entrenamientos/${w.id}`, "ok", "Entrenamiento creado"));
}

export async function actualizarEntreno(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  const actual = await db.workout.findUniqueOrThrow({ where: { id }, include: { _count: { select: { results: true } } } });
  const datos = datosEntreno(form, `/admin/entrenamientos/${id}`);
  if (actual._count.results > 0 && datos.scoreType !== actual.scoreType) {
    redirect(aviso(`/admin/entrenamientos/${id}`, "error", "Ya hay resultados cargados: no se puede cambiar el tipo de resultado"));
  }
  await db.workout.update({ where: { id }, data: datos });
  redirect(aviso(`/admin/entrenamientos/${id}`, "ok", "Entrenamiento guardado"));
}

export async function borrarEntreno(form: FormData) {
  await exigirAdmin();
  await db.workout.delete({ where: { id: texto(form, "id") } });
  redirect(aviso("/admin/entrenamientos", "ok", "Entrenamiento borrado"));
}

export async function borrarResultadoAdmin(form: FormData) {
  await exigirAdmin();
  const workoutId = texto(form, "workoutId");
  await db.workoutResult.deleteMany({ where: { id: texto(form, "id") } });
  redirect(aviso(`/admin/entrenamientos/${workoutId}`, "ok", "Resultado borrado"));
}

// ---------- Logo ----------

const LOGO_VALIDO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export async function guardarLogo(form: FormData) {
  await exigirAdmin();
  const logo = String(form.get("logo") ?? "");
  if (!LOGO_VALIDO.test(logo) || logo.length > 900_000) {
    redirect(aviso("/admin/configuracion", "error", "Elegí una imagen PNG, JPG o WEBP"));
  }
  await db.settings.upsert({
    where: { id: 1 },
    create: { id: 1, logo, logoVersion: 1 },
    update: { logo, logoVersion: { increment: 1 } },
  });
  revalidatePath("/", "layout");
  redirect(aviso("/admin/configuracion", "ok", "Logo actualizado"));
}

export async function quitarLogo() {
  await exigirAdmin();
  await db.settings.update({ where: { id: 1 }, data: { logo: null, logoVersion: { increment: 1 } } });
  revalidatePath("/", "layout");
  redirect(aviso("/admin/configuracion", "ok", "Logo quitado"));
}

// ---------- Solicitudes de alta ----------

export async function aprobarSocio(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  await db.member.update({
    where: { id },
    data: { approved: true, active: true, planId: opcional(form, "planId") },
  });
  revalidatePath("/admin", "layout");
  redirect(aviso("/admin/socios", "ok", "Socio aprobado: ya puede entrar a la app"));
}

export async function rechazarSocio(form: FormData) {
  await exigirAdmin();
  // Solo se borran solicitudes que todavía no fueron aprobadas
  await db.member.deleteMany({ where: { id: texto(form, "id"), approved: false } });
  revalidatePath("/admin", "layout");
  redirect(aviso("/admin/socios", "ok", "Solicitud rechazada"));
}

// ---------- Importar socios desde Excel ----------

export type ResumenImportacion = {
  ok: boolean;
  mensaje: string;
  importado?: boolean;
  total?: number;
  nuevos?: number;
  activos?: number;
  pausados?: number;
  yaEstaban?: number;
  repetidos?: number;
  conProblemas?: number;
  muestra?: { fila: number; nombre: string; email: string; dni: string; estado: string; nota: string }[];
} | null;

export async function importarSocios(_prev: ResumenImportacion, form: FormData): Promise<ResumenImportacion> {
  await exigirAdmin();
  const archivo = form.get("archivo");
  const confirmar = form.get("modo") === "importar";
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "Elegí el Excel con los socios" };
  if (archivo.size > 5_000_000) return { ok: false, mensaje: "El archivo es muy grande (máximo 5 MB)" };

  const { filas, error } = await leerExcelSocios(await archivo.arrayBuffer());
  if (error) return { ok: false, mensaje: error };
  if (filas.length === 0) return { ok: false, mensaje: "El Excel no tiene socios" };

  // ¿Quiénes ya están en la app? (por email o DNI)
  const existentes = await db.member.findMany({ select: { email: true, dni: true, pendingDni: true } });
  const emails = new Set(existentes.map((m) => m.email).filter(Boolean));
  const dnis = new Set(existentes.flatMap((m) => [m.dni, m.pendingDni]).filter(Boolean));

  const vistos = new Set<string>();
  const nuevos: typeof filas = [];
  const muestra: NonNullable<NonNullable<ResumenImportacion>["muestra"]> = [];
  let yaEstaban = 0, repetidos = 0;
  for (const f of filas) {
    let estado: string;
    if ((f.email && emails.has(f.email)) || (f.dni && dnis.has(f.dni))) {
      yaEstaban++;
      estado = "Ya estaba";
    } else if ((f.email && vistos.has(f.email)) || (f.dni && vistos.has(f.dni))) {
      repetidos++;
      estado = "Repetido en el Excel";
    } else {
      nuevos.push(f);
      estado = f.active ? "Nuevo" : "Nuevo (pausado)";
    }
    if (f.email) vistos.add(f.email);
    if (f.dni) vistos.add(f.dni);
    if (muestra.length < 400) {
      muestra.push({ fila: f.fila, nombre: f.name, email: f.email ?? "—", dni: f.dni ?? "—", estado, nota: f.problemas.join(" · ") });
    }
  }

  const resumen = {
    ok: true,
    total: filas.length,
    nuevos: nuevos.length,
    activos: nuevos.filter((f) => f.active).length,
    pausados: nuevos.filter((f) => !f.active).length,
    yaEstaban,
    repetidos,
    conProblemas: filas.filter((f) => f.problemas.length).length,
    muestra,
  };
  if (!confirmar) return { ...resumen, mensaje: "Vista previa: todavía no se cargó nada." };

  const ahora = new Date();
  const creados = await db.member.createMany({
    data: nuevos.map((f) => ({
      name: f.name,
      email: f.email,
      phone: f.phone,
      dni: f.dni,
      birthDate: f.birthDate,
      active: f.active,
      approved: true,
      pinHash: null, // activa su cuenta desde la app
      importedAt: ahora,
      legacy: f.legacy,
      ...(f.createdAt ? { createdAt: f.createdAt } : {}),
    })),
    skipDuplicates: true,
  });
  revalidatePath("/admin", "layout");
  return {
    ...resumen,
    importado: true,
    mensaje: `Listo: se cargaron ${creados.count} socios. Ahora pueden activar su cuenta desde la app.`,
  };
}

// ---------- Activaciones de socios importados ----------

export async function aprobarActivacion(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  const m = await db.member.findUniqueOrThrow({ where: { id } });
  if (!m.pendingPinHash || !m.pendingDni) redirect(aviso("/admin/socios", "error", "Esa activación ya no está pendiente"));
  const otro = await db.member.findFirst({ where: { id: { not: id }, dni: m.pendingDni } });
  if (otro) redirect(aviso("/admin/socios", "error", `El DNI ${m.pendingDni} ya lo tiene ${otro.name}. Revisalo antes de aprobar.`));
  await db.member.update({
    where: { id },
    data: {
      dni: m.pendingDni,
      pinHash: m.pendingPinHash,
      pendingDni: null,
      pendingPinHash: null,
      activationRequestedAt: null,
      active: true,
      approved: true,
      planId: opcional(form, "planId") ?? m.planId,
    },
  });
  revalidatePath("/admin", "layout");
  redirect(aviso("/admin/socios", "ok", `${m.name} ya puede entrar a la app`));
}

export async function rechazarActivacion(form: FormData) {
  await exigirAdmin();
  await db.member.update({
    where: { id: texto(form, "id") },
    data: { pendingDni: null, pendingPinHash: null, activationRequestedAt: null },
  });
  revalidatePath("/admin", "layout");
  redirect(aviso("/admin/socios", "ok", "Activación rechazada. El socio puede volver a pedirla."));
}

// ---------- Asignar plan a varios socios ----------

export async function asignarPlanVarios(form: FormData) {
  await exigirAdmin();
  const ids = form.getAll("ids").map(String).filter(Boolean);
  const planId = opcional(form, "planId");
  const volver = `/admin/socios${texto(form, "filtro") ? `?filtro=${texto(form, "filtro")}` : ""}`;
  if (!ids.length) redirect(aviso(volver, "error", "Marcá al menos un socio"));
  const r = await db.member.updateMany({ where: { id: { in: ids } }, data: { planId } });
  revalidatePath("/admin", "layout");
  redirect(aviso(volver, "ok", `Plan actualizado en ${r.count} socio${r.count === 1 ? "" : "s"}`));
}

// ---------- Marcar la cuota del mes como pagada a varios socios ----------
// Para quienes ya pagaron por fuera de la app (por ejemplo, en la aplicación anterior).

export async function marcarCuotaPagaVarios(form: FormData) {
  await exigirAdmin();
  const ids = form.getAll("ids").map(String).filter(Boolean);
  const periodo = texto(form, "period");
  const volver = `/admin/socios${texto(form, "filtro") ? `?filtro=${texto(form, "filtro")}` : ""}`;
  if (!ids.length) redirect(aviso(volver, "error", "Marcá al menos un socio"));
  if (!esPeriodo(periodo)) redirect(aviso(volver, "error", "Elegí el mes"));

  const [socios, yaPagaron] = await Promise.all([
    db.member.findMany({ where: { id: { in: ids } }, include: { plan: true } }),
    db.payment.findMany({ where: { memberId: { in: ids }, period: periodo, voided: false, coversFee: true }, select: { memberId: true } }),
  ]);
  const pagos = new Set(yaPagaron.map((p) => p.memberId));
  const nuevos = socios.filter((m) => !pagos.has(m.id));
  await db.payment.createMany({
    data: nuevos.map((m) => ({
      memberId: m.id,
      period: periodo,
      planName: m.plan?.name ?? null,
      feeAmount: m.plan?.price ?? 0,
      consumosAmount: 0,
      total: m.plan?.price ?? 0,
      method: "externo",
      coversFee: true,
      notes: "Marcado como pagado desde la lista de socios",
    })),
  });
  revalidatePath("/admin", "layout");
  const extra = pagos.size ? ` (${pagos.size} ya la tenían pagada)` : "";
  redirect(aviso(volver, "ok", `Cuota marcada como pagada en ${nuevos.length} socio${nuevos.length === 1 ? "" : "s"}${extra}`));
}

// ---------- Fotos del día ----------

const IMAGEN_VALIDA = /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/;

// Sube UNA foto ya achicada en el navegador (el formulario las manda de a una)
export async function subirFotoDelDia(datos: {
  date: string;
  caption: string;
  image: string;
  thumb: string;
  width: number;
  height: number;
}): Promise<{ ok: boolean; mensaje: string }> {
  await exigirAdmin();
  const { date, image, thumb } = datos;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, mensaje: "Fecha inválida" };
  if (!IMAGEN_VALIDA.test(image) || !IMAGEN_VALIDA.test(thumb)) return { ok: false, mensaje: "Imagen inválida" };
  if (image.length > 1_500_000 || thumb.length > 200_000) return { ok: false, mensaje: "La foto es muy pesada" };
  await db.gymPhoto.create({
    data: {
      date,
      caption: datos.caption.trim().slice(0, 120) || null,
      image,
      thumb,
      width: Math.round(datos.width) || 1,
      height: Math.round(datos.height) || 1,
    },
  });
  return { ok: true, mensaje: "Foto subida" };
}

// Al terminar de subir: borra las fotos vencidas y actualiza las pantallas
export async function terminarSubidaFotos() {
  await exigirAdmin();
  await borrarFotosViejas();
  revalidatePath("/fotos");
  revalidatePath("/inicio");
  revalidatePath("/admin/fotos");
}

export async function borrarFotoDelDia(form: FormData) {
  await exigirAdmin();
  await db.gymPhoto.deleteMany({ where: { id: texto(form, "id") } });
  revalidatePath("/fotos");
  revalidatePath("/inicio");
  redirect(aviso("/admin/fotos", "ok", "Foto borrada"));
}

export async function borrarFotosDelDia(form: FormData) {
  await exigirAdmin();
  const r = await db.gymPhoto.deleteMany({ where: { date: texto(form, "date") } });
  revalidatePath("/fotos");
  revalidatePath("/inicio");
  redirect(aviso("/admin/fotos", "ok", `Se borraron ${r.count} fotos`));
}
