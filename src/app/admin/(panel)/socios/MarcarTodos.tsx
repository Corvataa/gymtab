"use client";
import { useEffect } from "react";

// Casilla "Marcar todos": marca o desmarca todas las casillas de la lista de socios
export default function MarcarTodos() {
  useEffect(() => {
    const todos = document.querySelector<HTMLInputElement>("[data-marcar-todos]");
    if (!todos) return;
    const alCambiar = () =>
      document.querySelectorAll<HTMLInputElement>('input[name="ids"][form="asignar"]').forEach((c) => (c.checked = todos.checked));
    todos.addEventListener("change", alCambiar);
    return () => todos.removeEventListener("change", alCambiar);
  }, []);
  return null;
}
