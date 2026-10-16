import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metro Sim · Afluencia de la red de Metro de Santiago",
  description:
    "Visualización interactiva de la afluencia de pasajeros por hora en la red de Metro de Santiago, construida a partir de datos GTFS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Plotly se carga antes de la hidratación para que el mapa pueda dibujarse de inmediato */}
        <Script src="https://cdn.plot.ly/plotly-2.32.0.min.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
