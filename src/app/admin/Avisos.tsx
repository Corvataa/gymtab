// Muestra mensajes de éxito/error que vienen en la URL (?ok=... o ?error=...)
export default function Avisos({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p
      className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
        error
          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
          : "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200"
      }`}
    >
      {error ?? ok}
    </p>
  );
}
