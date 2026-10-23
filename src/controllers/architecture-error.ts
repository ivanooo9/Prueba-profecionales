import { Response } from "express";

/**
 * Clasificador centralizado de errores HTTP para el módulo de Arquitectura (ARQ PRO STUDIO).
 * 
 * Mapeo canónico:
 * - 400: Solicitud inválida, datos incompletos o incumplimiento de reglas de negocio.
 * - 401: Ausencia de autenticación válida o credenciales no suministradas.
 * - 403: Acceso denegado o prohibido para el recurso/organización.
 * - 404: Recurso inexistente o no accesible.
 * - 409: Conflicto de estado, duplicidad de clave única o concurrencia.
 * - 500: Error interno no previsto (sanitizando detalles de Prisma/filesystem).
 */
export function handleArchitectureError(
  res: Response,
  error: any,
  defaultFallbackMessage: string = "Error interno del servidor en el módulo de arquitectura."
): Response {
  if (res.headersSent) {
    return res;
  }

  const message: string = typeof error === "string" ? error : error?.message || "";
  const lowerMsg = message.toLowerCase();
  const code: string = error?.code || "";
  const explicitStatus: number | undefined = error?.status || error?.statusCode;

  // 1. Estado explícito si fue establecido en el objeto de error
  if (explicitStatus && [400, 401, 403, 404, 409, 500].includes(explicitStatus)) {
    return res.status(explicitStatus).json({
      success: false,
      error: message || defaultFallbackMessage,
    });
  }

  // 2. Errores 401 - Autenticación
  if (
    lowerMsg.includes("no autenticado") ||
    lowerMsg.includes("sesión expirada") ||
    lowerMsg.includes("sesion expirada") ||
    lowerMsg.includes("token inválido") ||
    lowerMsg.includes("token invalido") ||
    lowerMsg.includes("sin credenciales") ||
    lowerMsg.includes("unauthorized")
  ) {
    return res.status(401).json({
      success: false,
      error: message || "No autenticado. Inicie sesión para continuar.",
    });
  }

  // 3. Errores 403 - Permisos / Prohibido
  if (
    lowerMsg.includes("no autorizado") ||
    lowerMsg.includes("no tiene permiso") ||
    lowerMsg.includes("acceso denegado") ||
    lowerMsg.includes("prohibido") ||
    lowerMsg.includes("forbidden")
  ) {
    return res.status(403).json({
      success: false,
      error: message || "Acceso prohibido para este recurso.",
    });
  }

  // 4. Errores 404 - No Encontrado
  if (
    lowerMsg.includes("no encontrado") ||
    lowerMsg.includes("no encontrada") ||
    lowerMsg.includes("no existe") ||
    code === "P2025"
  ) {
    return res.status(404).json({
      success: false,
      error: message || "Recurso no encontrado.",
    });
  }

  // 5. Errores 409 - Conflicto / Claves duplicadas / Concurrencia
  if (
    lowerMsg.includes("ya existe") ||
    lowerMsg.includes("conflicto") ||
    lowerMsg.includes("concurrencia") ||
    lowerMsg.includes("unique constraint") ||
    code === "P2002"
  ) {
    return res.status(409).json({
      success: false,
      error: message || "Conflicto con un recurso existente.",
    });
  }

  // 6. Errores 400 - Validación de Negocio / Reglas del Dominio
  const isBusinessValidation =
    lowerMsg.includes("obligatorio") ||
    lowerMsg.includes("obligatoria") ||
    lowerMsg.includes("inválido") ||
    lowerMsg.includes("invalido") ||
    lowerMsg.includes("inválida") ||
    lowerMsg.includes("invalida") ||
    lowerMsg.includes("inactivo") ||
    lowerMsg.includes("inactiva") ||
    lowerMsg.includes("no coincide") ||
    lowerMsg.includes("no coinciden") ||
    lowerMsg.includes("debe ser") ||
    lowerMsg.includes("debe tener") ||
    lowerMsg.includes("no puede") ||
    lowerMsg.includes("no se puede") ||
    lowerMsg.includes("vacío") ||
    lowerMsg.includes("vacio") ||
    lowerMsg.includes("formato") ||
    lowerMsg.includes("no permitido") ||
    lowerMsg.includes("no permitida") ||
    lowerMsg.includes("desactivado") ||
    lowerMsg.includes("desactivada") ||
    lowerMsg.includes("pertenece a") ||
    lowerMsg.includes("fuera de rango") ||
    lowerMsg.includes("requerido") ||
    lowerMsg.includes("requerida") ||
    lowerMsg.includes("archivado") ||
    lowerMsg.includes("aprobado");

  if (isBusinessValidation) {
    return res.status(400).json({
      success: false,
      error: message || "Validación de negocio o solicitud incorrecta.",
    });
  }

  // 7. Errores 500 - Error Interno no previsto
  console.error(`[Architecture Module Error 500]:`, error);

  // Evitar revelar detalles internos de Prisma, queries SQL, paths o stack traces al cliente
  const isInternalSensitive =
    code.startsWith("P") ||
    lowerMsg.includes("prisma") ||
    lowerMsg.includes("invocation") ||
    lowerMsg.includes("syntaxerror") ||
    lowerMsg.includes("typeerror") ||
    lowerMsg.includes("referenceerror") ||
    lowerMsg.includes("econnrefused") ||
    lowerMsg.includes("enoent");

  const sanitizedMessage = isInternalSensitive
    ? defaultFallbackMessage
    : message || defaultFallbackMessage;

  return res.status(500).json({
    success: false,
    error: sanitizedMessage,
  });
}
