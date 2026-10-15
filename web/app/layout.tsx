import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Metro Sim · Afluencia de la red de Metro de Santiago",
  description:
    "Visualización interactiva de la afluencia de pasajeros por hora en la red de Metro de Santiago, construida a partir de datos GTFS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Plotly se carga antes de la hidratación para que el mapa pueda dibujarse de inmediato */}
        <Script src="https://cdn.plot.ly/plotly-2.32.0.min.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
