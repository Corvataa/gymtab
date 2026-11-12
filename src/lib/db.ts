// Conexión única a la base de datos (se reutiliza en toda la app)
import { PrismaClient } from "@prisma/client";

// Las imágenes (foto de perfil y logo) pesan: no se traen salvo que se pidan con `select`.
// Se sirven aparte, en /avatar/<id> y /logo.
const crear = () => new PrismaClient({ omit: { member: { avatar: true }, settings: { logo: true } } });

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof crear> };

export const db = globalForPrisma.prisma ?? crear();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
