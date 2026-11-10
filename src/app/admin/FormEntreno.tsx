import { TIPOS } from "@/lib/entreno";

type W = { id?: string; date: string; title: string; description: string; scoreType: string; published: boolean };

// Formulario de entrenamiento (sirve para crear y para editar)
export default function FormEntreno({ w, accion, boton }: { w: W; accion: (f: FormData) => Promise<void>; boton: string }) {
  return (
    <form action={accion} className="tarjeta flex flex-col gap-3">
      {w.id && <input type="hidden" name="id" value={w.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Fecha
          <input name="date" type="date" defaultValue={w.date} required className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Título
          <input name="title" defaultValue={w.title} placeholder="WOD, Fuerza, Funcional…" required className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Resultado
          <select name="scoreType" defaultValue={w.scoreType} className="input">
            {Object.entries(TIPOS).map(([k, t]) => (
              <option key={k} value={k}>{t.texto}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Entrenamiento
        <textarea
          name="description"
          defaultValue={w.description}
          rows={8}
          required
          placeholder={"Ej:\nPor tiempo, 3 rondas:\n15 sentadillas con peso\n12 flexiones\n400 m de carrera"}
          className="input font-mono text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={w.published} className="h-5 w-5" />
        Publicado (los socios lo ven desde ese día)
      </label>
      <button className="btn-primario self-start">{boton}</button>
    </form>
  );
}
