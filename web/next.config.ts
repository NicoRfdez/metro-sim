import type { NextConfig } from "next";

/**
 * Configuración para export estático (GitHub Pages).
 *
 * - `output: "export"` genera HTML/CSS/JS estático en `web/out/`.
 * - En producción el sitio vive en https://<usuario>.github.io/metro-sim/,
 *   por lo que se usa `basePath`. Se puede sobrescribir con la variable
 *   NEXT_PUBLIC_BASE_PATH (ej. "" si se usa un dominio propio).
 */
const isProd = process.env.NODE_ENV === "production";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (isProd ? "/metro-sim" : "");

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
