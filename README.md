# TUTUKAPP

La app del gimnasio: los socios reservan clases, ven el entrenamiento del día, registran sus marcas,
pagan la cuota y anotan lo que sacan de la tienda (se suma a la cuota). El gimnasio maneja todo desde un panel.

## Qué hace

**Socio** (desde el celular, escaneando el QR):
- **Crea su cuenta** desde la app; el gimnasio la aprueba desde el panel.
- Si ya era socio (importado desde otra app), **activa su cuenta** con su email, completa el DNI y elige un PIN; el gimnasio lo aprueba.
- **Inicio:** resumen con su cuota, su próxima clase, el entrenamiento de hoy y lo pendiente de la tienda.
- Entra con su DNI y un PIN (y lo puede cambiar).
- Ve el estado de su cuota (al día, pendiente o vencida) y cuánto le toca pagar: cuota + consumos.
- **Paga online con Mercado Pago** y queda al día automáticamente.
- **Reserva clases**: ve los lugares libres, reserva, cancela o se anota en lista de espera.
- **Entreno:** ve el entrenamiento del día, carga su resultado (tiempo, reps, rondas o peso) y ve el ranking.
- **Marcas:** registra sus marcas personales por ejercicio y ve su progreso y sus récords.
- **Mi perfil:** foto, apodo (se ve en el ranking), objetivo, datos de contacto y contacto de emergencia.
- **Fotos del día:** ve las fotos que suben los profes, las descarga o las comparte directo en sus redes.
- Toca el producto que sacó, elige la cantidad y confirma. Puede anularlo durante 10 minutos.

**Administración** (`/admin`):
- **Inicio:** cuotas del mes: cobrado, falta cobrar, socios al día, pendientes y vencidos. Planilla CSV.
- **Socios:** importar desde Excel (por ejemplo, la exportación de CrossHero), activaciones y solicitudes de alta para aprobar, filtros (sin plan, sin activar, pausados), asignar plan a varios a la vez; alta con plan, datos de contacto, tope de consumos, pausar, cambiar PIN.
  En la ficha de cada socio: **registrar cobro** (cuota + consumos sin cobrar, medio de pago), historial y anulación de cobros.
- **Clases:** horarios semanales (día, hora, cupo, coach), agenda de los próximos 7 días,
  lista de anotados y de espera, anotar o quitar socios, cambiar el cupo o suspender una clase.
- **Entrenamientos:** el coach publica el entrenamiento de cada día (o lo programa para otro día, o lo deja en borrador)
  y ve los resultados de los socios.
- **Fotos:** los profes suben las fotos de las clases (varias a la vez, se achican solas). Se borran solas a los 30 días (configurable).
- **Planes:** opciones de cuota (ej: 3 veces por semana, libre) con su precio.
- **Productos:** lo que se vende y su precio.
- **QR:** cartel para imprimir.
- **Configuración:** nombre del gimnasio, día de vencimiento, bloquear consumos y reservas a quien tiene la cuota vencida,
  con cuántos días se puede reservar y hasta cuántas horas antes se puede cancelar.

#### Diseño y logo
- Tema negro y naranja, tipografías Barlow Condensed (títulos) e Inter (texto).
- El logo del gimnasio está en `public/marca.svg` (también genera los íconos de la app).
- Desde **Configuración → Logo del gimnasio** se puede subir otro logo (PNG/JPG/WEBP); se achica solo antes de subirse.

## Cómo funcionan las cuotas
- Cada mes el socio debe la cuota de su plan. Hasta el día de vencimiento figura **Pendiente**; después, **Vencida**.
- Al cobrar, se incluyen todos los consumos que todavía no se cobraron. Los consumos posteriores quedan para el próximo cobro.
- Si se anula un cobro, sus consumos vuelven a quedar pendientes.
- Si la cuota ya está paga, el socio puede pagar online solo sus consumos.

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

### Cómo funcionan las reservas
- Las clases se generan solas a partir de los horarios semanales.
- Si hay lugar, la reserva queda confirmada; si no, el socio queda en lista de espera.
- Si alguien cancela, el primero de la lista de espera entra automáticamente.
- El plan limita cuántas clases por semana (lunes a domingo) puede reservar cada socio. Las clases suspendidas no cuentan.
- El socio puede cancelar hasta X horas antes (configurable). Después, solo recepción puede quitarlo.
- Si dos socios reservan el último lugar al mismo tiempo, solo uno lo obtiene.

### Cómo funciona el entrenamiento del día
- El socio solo ve los entrenamientos publicados de hoy o de días anteriores (lo programado para mañana no se ve antes).
- Tipos de resultado: por tiempo (menos es mejor), repeticiones, rondas + repeticiones, peso máximo, o sin resultado.
- En el ranking van primero los que lo hicieron **RX** (como estaba escrito) y después los que lo adaptaron.
- En el ranking se muestra solo el nombre y la inicial del apellido.

## Activar pagos con Mercado Pago

1. Entrá a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers) con la cuenta del gimnasio
   → **Tus integraciones → Crear aplicación** → tipo **Pagos online** → **Checkout Pro**.
2. **Primero probalo:** en **Credenciales de prueba** copiá el *Access Token* y cargalo en Vercel como
   `MP_ACCESS_TOKEN`. Mercado Pago te da tarjetas y usuarios de prueba para pagar sin plata real.
3. **Webhooks** (dentro de la aplicación): URL `https://tu-app.vercel.app/api/mercadopago/webhook`,
   evento **Pagos**. Copiá la **clave secreta** y cargala en Vercel como `MP_WEBHOOK_SECRET`.
4. Cuando todo funcione, reemplazá `MP_ACCESS_TOKEN` por el de **Credenciales de producción**.
5. En Vercel, después de cambiar variables: **Deployments → ⋯ → Redeploy**.

Mientras `MP_ACCESS_TOKEN` no esté cargado, el botón de pago no aparece y todo sigue funcionando con cobro manual.
Mercado Pago cobra una comisión por cada pago (la ves en tu cuenta de Mercado Pago).

**Seguridad:** la app nunca confía en lo que llega por la URL o el aviso: siempre le consulta a Mercado Pago
el estado y el monto real del pago. Cada pago se registra una sola vez aunque lleguen avisos repetidos.

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
  schema.prisma        ← las tablas: Settings, Plan, Member (socios), Payment (cobros), Checkout (pagos online), ClassSchedule (horarios), ClassSession (clases), Booking (reservas), Workout (entrenamientos), WorkoutResult (resultados), PersonalRecord (marcas), Product, Consumption (consumos), LoginThrottle
  migrations/          ← historial de cambios a las tablas (se aplican al publicar)
  seed.ts              ← datos de ejemplo
src/
  lib/
    db.ts              ← conexión a la base de datos
    session.ts         ← login y sesiones (cookies)
    throttle.ts        ← bloqueo tras 5 intentos fallidos
    periodo.ts         ← fechas, meses y formato de pesos
    cuotas.ts          ← estado de cuota de cada socio y montos a cobrar
    mercadopago.ts     ← crear links de pago y confirmar pagos aprobados
    clases.ts          ← generar clases, reservar, cancelar y lista de espera
    entreno.ts         ← tipos de resultado, ranking y marcas personales
  app/                 ← cada carpeta es una página (dirección web)
    page.tsx           ← "/"  login del socio
    acciones.ts        ← lo que puede hacer un socio (entrar, anotar, anular)
    tienda/            ← "/tienda"  pantalla principal del socio
      pin/             ← "/tienda/pin"  el socio cambia su PIN
    clases/            ← "/clases"  el socio reserva clases
    entreno/           ← "/entreno"  entrenamiento del día, resultado y ranking
    marcas/            ← "/marcas"  marcas personales
    admin/
      acciones.ts      ← lo que puede hacer el admin
      login/           ← "/admin/login"
      (panel)/         ← páginas del panel (el paréntesis no aparece en la URL)
        page.tsx       ← "/admin" resumen del mes
        socios/        ← "/admin/socios" y "/admin/socios/[id]" (ficha + cobros)
        clases/        ← "/admin/clases" horarios y agenda; "/admin/clases/[id]" anotados
        entrenamientos/ ← "/admin/entrenamientos" publicar entrenamientos y ver resultados
        planes/
        configuracion/
        productos/
        qr/
      exportar/        ← descarga del CSV
    api/mercadopago/webhook/  ← donde Mercado Pago avisa los pagos
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
- [x] Cobro online con Mercado Pago.
- [x] Reservas de clases con cupos, lista de espera y límite semanal por plan.
- [x] Entrenamiento del día, ranking y marcas personales.
- [ ] Avisos de vencimiento (email o WhatsApp).
