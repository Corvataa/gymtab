// Carga datos de ejemplo para probar: npx tsx prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const productos = [
    { name: "Agua 500ml", price: 1200, emoji: "💧" },
    { name: "Bebida isotónica", price: 2500, emoji: "🧃" },
    { name: "Barrita proteica", price: 3000, emoji: "🍫" },
    { name: "Banana", price: 800, emoji: "🍌" },
  ];
  for (const p of productos) {
    if (!(await db.product.findFirst({ where: { name: p.name } }))) await db.product.create({ data: p });
  }
  await db.member.upsert({
    where: { dni: "30111222" },
    update: {},
    create: { name: "Socio Demo", dni: "30111222", pinHash: await bcrypt.hash("1234", 10) },
  });
  console.log("Listo. Socio de prueba: DNI 30111222, PIN 1234");
}

main().finally(() => db.$disconnect());
