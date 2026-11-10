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
  const planes = [
    { name: "2 veces por semana", price: 25000, classesPerWeek: 2 },
    { name: "3 veces por semana", price: 32000, classesPerWeek: 3 },
    { name: "Libre", price: 40000, classesPerWeek: null },
  ];
  for (const p of planes) {
    if (!(await db.plan.findFirst({ where: { name: p.name } }))) await db.plan.create({ data: p });
  }
  const plan = await db.plan.findFirstOrThrow({ where: { name: "3 veces por semana" } });
  await db.member.upsert({
    where: { dni: "30111222" },
    update: {},
    create: { name: "Socio Demo", dni: "30111222", planId: plan.id, pinHash: await bcrypt.hash("1234", 10) },
  });
  if ((await db.classSchedule.count()) === 0) {
    const horarios = [];
    for (let dia = 1; dia <= 5; dia++) {
      horarios.push({ name: "CrossTraining", weekday: dia, startTime: "07:00", capacity: 12, coach: "Coach Demo" });
      horarios.push({ name: "Funcional", weekday: dia, startTime: "19:00", capacity: 15 });
    }
    horarios.push({ name: "Open Box", weekday: 6, startTime: "10:00", capacity: 20, durationMin: 90 });
    await db.classSchedule.createMany({ data: horarios });
  }
  console.log("Listo. Socio de prueba: DNI 30111222, PIN 1234");
}

main().finally(() => db.$disconnect());
