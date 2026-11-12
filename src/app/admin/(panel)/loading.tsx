// Lo que se ve al instante al cambiar de sección en el panel, mientras llegan los datos
export default function Cargando() {
  return (
    <main className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-white/10" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="tarjeta h-24 animate-pulse" />
        ))}
      </div>
      <div className="tarjeta h-80 animate-pulse" />
    </main>
  );
}
