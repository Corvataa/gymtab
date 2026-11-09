# TUTUKAPP

Sistema para gimnasios: socios, planes, cobro de cuotas y una **cuenta de consumos**
(agua, barritas, bebidas…) que se suma a la cuota en lugar de pagar en el momento.

## Qué hace

**Socio** (desde el celular, escaneando el QR):
- Entra con su DNI y un PIN (y lo puede cambiar).
- Ve el estado de su cuota (al día, pendiente o vencida) y cuánto le toca pagar: cuota + consumos.
- Toca el producto que sacó, elige la cantidad y confirma. Puede anularlo durante 10 minutos.

**Administración** (`/admin`):
- **Inicio:** cuotas del mes: cobrado, falta cobrar, socios al día, pendientes y vencidos. Planilla CSV.
- **Socios:** alta con plan, datos de contacto, tope de consumos, pausar, cambiar PIN.
  En la ficha de cada socio: **registrar cobro** (cuota + consumos sin cobrar, medio de pago), historial y anulación de cobros.
- **Planes:** opciones de cuota (ej: 3 veces por semana, libre) con su precio.
- **Productos:** lo que se vende y su precio.
- **QR:** cartel para imprimir.
- **Configuración:** nombre del gimnasio, día de vencimiento, bloquear consumos a quien tiene la cuota vencida.

### Cómo funcionan las cuotas
- Cada mes el socio debe la cuota de su plan. Hasta el día de vencimiento figura **Pendiente**; después, **Vencida**.
- Al cobrar, se incluyen todos los consumos que todavía no se cobraron. Los consumos posteriores quedan para el próximo cobro.
- Si se anula un cobro, sus consumos vuelven a quedar pendientes.

## Publicarla en internet (Supabase + Vercel)

### 1. Base de datos en Supabase
1. En [supabase.com](https://supabase.com) creá un proyecto (región **South America (São Paulo)**). Guardá la contraseña de la base de datos.
2. Arriba tocá **Connect** → pestaña **ORMs** → **Prisma**. Ahí aparecen `DATABASE_URL` y `DIRECT_URL`.
   Reemplazá `[YOUR-PASSWORD]` por tu contraseña.

### 2. App en Vercel
1. En [vercel.com](https://vercel.com): **Add New → Project** → elegí el repositorio → **Import**.
2. En **Environment Variables** cargá estas 4:

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | la de Supabase (puerto 6543) |
   | `DIRECT_URL` | la de Supabase (puerto 5432) |
   | `ADMIN_PASSWORD` | la contraseña del panel de administración |
   | `SESSION_SECRET` | una clave larga al azar (40+ caracteres) |

3. Tocá **Deploy**. Al publicar se crean solas las tablas de la base de datos.
4. Entrá a `https://tu-app.vercel.app/admin`, cargá productos y socios, e imprimí el QR.

Cada vez que se sube un cambio a GitHub, Vercel publica la nueva versión automáticamente.

## Cómo correrla en tu compu (para programar)

Necesitás [Node.js](https://nodejs.org) 20 o más nuevo y una base de datos PostgreSQL
(podés usar un segundo proyecto de Supabase como base de pruebas).

```bash
npm install                 # instala las dependencias (una sola vez)
cp .env.example .env        # crea el archivo de configuración; completalo
npm run db:migrate          # crea las tablas
npm run db:seed             # carga productos y un socio de prueba
npm run dev                 # arranca la app en http://localhost:3000
```

- Socio de prueba: DNI `30111222`, PIN `1234`
- Admin: http://localhost:3000/admin con tu `ADMIN_PASSWORD`

## Cómo está organizado el código

```
prisma/
  schema.prisma        ← las tablas: Settings, Plan, Member (socios), Payment (cobros), Product, Consumption (consumos), LoginThrottle
  migrations/          ← historial de cambios a las tablas (se aplican al publicar)
  seed.ts              ← datos de ejemplo
src/
  lib/
    db.ts              ← conexión a la base de datos
    session.ts         ← login y sesiones (cookies)
    throttle.ts        ← bloqueo tras 5 intentos fallidos
    periodo.ts         ← fechas, meses y formato de pesos
    cuotas.ts          ← estado de cuota de cada socio y montos a cobrar
  app/                 ← cada carpeta es una página (dirección web)
    page.tsx           ← "/"  login del socio
    acciones.ts        ← lo que puede hacer un socio (entrar, anotar, anular)
    tienda/            ← "/tienda"  pantalla principal del socio
      pin/             ← "/tienda/pin"  el socio cambia su PIN
    admin/
      acciones.ts      ← lo que puede hacer el admin
      login/           ← "/admin/login"
      (panel)/         ← páginas del panel (el paréntesis no aparece en la URL)
        page.tsx       ← "/admin" resumen del mes
        socios/        ← "/admin/socios" y "/admin/socios/[id]" (ficha + cobros)
        planes/
        configuracion/
        productos/
        qr/
      exportar/        ← descarga del CSV
```

Conceptos clave para ir aprendiendo:
- **Next.js**: el framework. Cada `page.tsx` es una página.
- **`"use server"`**: código que corre en el servidor (acceso a la base de datos, validaciones). El usuario no puede modificarlo.
- **`"use client"`**: componentes interactivos que corren en el celular (botones, ventanas).
- **Prisma**: traduce la base de datos a código. `db.member.findMany()` = "traeme todos los socios".
- **Tailwind**: los estilos van como clases en el HTML (`bg-emerald-600` = fondo verde).

## Hecho y pendiente

- [x] Preparada para Supabase + Vercel.
- [x] Bloqueo de 15 minutos tras 5 intentos de PIN o contraseña fallidos.
- [x] El socio puede cambiar su propio PIN.
- [x] Planes, cobro de cuotas con consumos incluidos, estados al día / pendiente / vencida.
- [ ] Cobro online con Mercado Pago.
- [ ] Reservas de clases con cupos.
- [ ] Entrenamiento del día y registro de marcas.
- [ ] Avisos de vencimiento (email o WhatsApp).
