/**
 * Prefijo de despliegue (basePath) definido en next.config.ts.
 * En desarrollo es "" y en producción (GitHub Pages) es "/metro-sim".
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Antepone el basePath a rutas de archivos en /public.
 * Necesario para recursos cargados manualmente (new Audio, fetch, etc.),
 * ya que Next.js solo aplica el basePath automáticamente en <Link> y <Image>.
 */
export const asset = (path: string): string =>
    `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
