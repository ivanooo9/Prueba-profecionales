/**
 * Utilidades de navegación segura hacia el flujo de autenticación del Core.
 * Respeta el origen de la SPA y evita redirecciones abiertas hacia dominios no autorizados.
 */

/**
 * Obtiene la URL base del Core de Profesionales Ecuador.
 * En desarrollo/producción Vite puede configurar VITE_CORE_URL o VITE_API_BASE_URL.
 * Si no está configurada, utiliza window.location.origin (mismo origen si se sirve unificado)
 * o http://localhost:3000 como fallback local por defecto.
 */
export function getCoreBaseUrl(): string {
  const envCoreUrl = (import.meta as any).env?.VITE_CORE_URL || (import.meta as any).env?.VITE_API_BASE_URL;
  if (envCoreUrl && typeof envCoreUrl === 'string' && envCoreUrl.trim() !== '') {
    return envCoreUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    // Si la app está en un puerto de desarrollo común de Vite (ej. 5173-5179), el Core está típicamente en localhost:3000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (window.location.port && window.location.port !== '3000') {
        return `${window.location.protocol}//${window.location.hostname}:3000`;
      }
    }
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

/**
 * Valida de forma estricta que un target de redirección sea seguro:
 * - Debe ser una ruta relativa que empiece con '/' (sin doble '//' que simula protocolo relativo), O
 * - Debe ser una URL absoluta cuyo origen coincida con el origen actual de la ventana o con el Core.
 */
export function isSafeRedirectUrl(targetUrl: string, allowedOrigins: string[] = []): boolean {
  if (!targetUrl || typeof targetUrl !== 'string') return false;
  const trimmed = targetUrl.trim();

  // Ruta relativa segura
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const allAllowed = [currentOrigin, ...allowedOrigins].filter(Boolean);

    return allAllowed.some((origin) => {
      try {
        return new URL(origin).origin === parsed.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/**
 * Genera la URL completa de login en el Core con el parámetro redirect apuntando de vuelta
 * a la ubicación actual del módulo Profesores.
 */
export function buildLoginUrl(returnPath?: string): string {
  const coreBase = getCoreBaseUrl();
  const currentFullUrl = typeof window !== 'undefined' ? window.location.href : '/';
  const targetReturn = returnPath || currentFullUrl;

  const loginEndpoint = `${coreBase}/login`;
  const url = new URL(loginEndpoint, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  // Solo incluimos ?redirect si es seguro
  if (isSafeRedirectUrl(targetReturn, [coreBase])) {
    url.searchParams.set('redirect', targetReturn);
  }

  return url.toString();
}

/**
 * Redirige al usuario de manera segura al login del Core.
 */
export function navigateToLogin(returnPath?: string): void {
  if (typeof window === 'undefined') return;
  const target = buildLoginUrl(returnPath);
  window.location.href = target;
}
