import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import MantenerActualizada from "./MantenerActualizada";

const titulos = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-titulos" });
const texto = Inter({ subsets: ["latin"], variable: "--font-texto" });

export const metadata: Metadata = {
  title: "TUTUKAPP",
  description: "Tu gimnasio en el celular: clases, entrenamientos, marcas y cuota",
  appleWebApp: { capable: true, title: "TUTUKAPP", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${titulos.variable} ${texto.variable}`}>
      <body className="min-h-dvh font-sans">
        {children}
        <MantenerActualizada version={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"} />
      </body>
    </html>
  );
}
