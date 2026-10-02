import { toast } from "sonner"

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Valida un archivo antes de subirlo a Cloudinary u otro servicio.
 * @param file El archivo a validar
 * @param options Opciones de validación (opcional)
 * @returns true si es válido, false si no
 */
export function validateUpload(file: File, options: { 
  maxSize?: number, 
  allowedTypes?: string[],
  errorMsgSize?: string,
  errorMsgType?: string
} = {}) {
  const {
    maxSize = MAX_FILE_SIZE,
    allowedTypes = ALLOWED_IMAGE_TYPES,
    errorMsgSize = "El archivo es demasiado pesado (máximo 10 MB)",
    errorMsgType = "Formato no soportado. Usa JPG, PNG o WEBP."
  } = options

  if (!allowedTypes.includes(file.type)) {
    toast.error(errorMsgType)
    return false
  }

  if (file.size > maxSize) {
    toast.error(errorMsgSize)
    return false
  }

  return true
}
