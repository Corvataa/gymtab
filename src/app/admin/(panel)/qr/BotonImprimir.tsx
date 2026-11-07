"use client";
export default function BotonImprimir() {
  return (
    <button onClick={() => window.print()} className="btn-primario print:hidden">
      🖨 Imprimir
    </button>
  );
}
