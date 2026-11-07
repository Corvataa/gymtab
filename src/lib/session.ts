// Manejo de sesiones: guardamos una "credencial" firmada en una cookie.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Sesion = { rol: "socio"; id: string } | { rol: "admin" };

const COOKIE = "sesion";

function clave() {
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

export async function leerToken(token?: string): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    return payload.sesion as Sesion;
  } catch {
    return null;
  }
}

export async function iniciarSesion(sesion: Sesion) {
  const dias = sesion.rol === "socio" ? 90 : 7;
  const token = await new SignJWT({ sesion })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${dias}d`)
    .sign(clave());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: dias * 24 * 60 * 60,
    path: "/",
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

export async function sesionActual(): Promise<Sesion | null> {
  return leerToken((await cookies()).get(COOKIE)?.value);
}

// Usar en páginas/acciones de socio: si no hay sesión, manda al login
export async function exigirSocio(): Promise<string> {
  const s = await sesionActual();
  if (s?.rol !== "socio") redirect("/");
  return s.id;
}

// Usar en páginas/acciones de admin
export async function exigirAdmin() {
  const s = await sesionActual();
  if (s?.rol !== "admin") redirect("/admin/login");
}
