import type { MetadataRoute } from "next";

// Permite "instalar" la app en el celular (Agregar a pantalla de inicio)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TUTUKAPP",
    short_name: "TUTUKAPP",
    description: "Tu gimnasio: cuota, consumos, clases y entrenamiento",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "es-AR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
