// Devuelve la versión publicada de la app, para que los celulares sepan si tienen una vieja
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA ?? "local" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
