# 💧 GymTab

App para que los socios del gimnasio anoten lo que consumen (agua, barritas, bebidas…)
y el monto **se sume a la cuota del mes** en lugar de pagar en el momento.

## Qué hace

**Socio** (desde el celular, escaneando el QR de la heladera):
- Entra con su DNI y un PIN.
- Toca el producto, elige la cantidad y confirma.
- Ve cuánto lleva acumulado en el mes y su tope.
- Puede anular un consumo durante 10 minutos si se equivocó.

**Administración** (`/admin`):
- **Resumen:** cuánto hay que sumarle a la cuota de cada socio, por mes. Se descarga en planilla (CSV para Excel).
- **Socios:** alta, tope mensual, pausar la cuenta (por ejemplo, si debe la cuota), cambiar PIN, anotar consumos desde recepción, anular.
- **Productos:** alta, precio, ocultar.
- **QR:** cartel para imprimir y pegar en la heladera.

## Cómo correrla en tu compu

Necesitás tener instalado [Node.js](https://nodejs.org) (versión 20 o más nueva).

```bash
npm install                 # instala las dependencias (una sola vez)
cp .env.example .env        # crea el archivo de configuración; editalo
npx prisma db push          # crea la base de datos
npx tsx prisma/seed.ts      # carga productos y un socio de prueba
npm run dev                 # arranca la app
```

Abrí http://localhost:3000
- Socio de prueba: DNI `30111222`, PIN `1234`
- Admin: http://localhost:3000/admin con la contraseña que pusiste en `.env` (`ADMIN_PASSWORD`)

## Cómo está organizado el código

```
prisma/
  schema.prisma        ← las tablas: Member (socios), Product, Consumption (consumos)
  seed.ts              ← datos de ejemplo
src/
  lib/
    db.ts              ← conexión a la base de datos
    session.ts         ← login y sesiones (cookies)
    periodo.ts         ← fechas, meses y formato de pesos
  app/                 ← cada carpeta es una página (dirección web)
    page.tsx           ← "/"  login del socio
    acciones.ts        ← lo que puede hacer un socio (entrar, anotar, anular)
    tienda/            ← "/tienda"  pantalla principal del socio
    admin/
      acciones.ts      ← lo que puede hacer el admin
      login/           ← "/admin/login"
      (panel)/         ← páginas del panel (el paréntesis no aparece en la URL)
        page.tsx       ← "/admin" resumen del mes
        socios/        ← "/admin/socios" y "/admin/socios/[id]"
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

## Pendientes antes de usarla en serio

- [ ] Publicarla en internet (Vercel + base de datos Postgres en Supabase o Neon).
- [ ] Limitar intentos de PIN (hoy alguien podría probar PINs sin límite).
- [ ] Que el socio pueda cambiar su propio PIN.
- [ ] Avisos de consumo (email o WhatsApp).
- [ ] Integración con CrossHero si abren una API.
- [ ] Pago directo con Mercado Pago.
