import { v2 as cloudinary } from "cloudinary";
import { db } from "./db";
import { cachedFetch, cacheKeyFactory as cacheKey } from "./cache";

/**
 * Sube un archivo en formato Base64 (con o sin prefijo data:...) a Cloudinary.
 * Preserva el nombre del archivo original y su extensión si se proporciona.
 * Retorna la URL segura (HTTPS) del archivo almacenado.
 */
export async function uploadBase64ToCloudinary(
  base64Str: string,
  folder: string,
  originalFilename?: string
): Promise<string> {
  if (!base64Str) {
    throw new Error("No se proporcionó contenido Base64.");
  }

  // Si ya es una URL pública (HTTP/HTTPS), no subir de nuevo
  if (base64Str.startsWith("http://") || base64Str.startsWith("https://")) {
    return base64Str;
  }

  // Validar tamaño máximo del payload (10MB ~ 14MB en base64)
  if (base64Str.length > 15 * 1024 * 1024) {
    throw new Error("El archivo excede el tamaño máximo permitido de 10MB.");
  }

  // Validar tipos de archivo permitidos (MIME Type / Header)
  if (base64Str.startsWith("data:")) {
    const allowedMimePrefixes = [
      "data:image/jpeg",
      "data:image/jpg",
      "data:image/png",
      "data:image/webp",
      "data:image/gif",
      "data:image/heic",
      "data:image/heif",
      "data:image/svg+xml",
      "data:application/pdf"
    ];
    const isAllowed = allowedMimePrefixes.some(prefix => base64Str.toLowerCase().startsWith(prefix));
    if (!isAllowed) {
      throw new Error("Formato de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP, GIF) o documentos PDF.");
    }
  }

  try {
    // 1. Fetch system credentials from database, fallback to environment variables
    const systemConfig = await cachedFetch(cacheKey.systemConfig.singleton(), () =>
      db.systemConfig.findFirst()
    );
    const cloudName = systemConfig?.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = systemConfig?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
    const apiSecret = systemConfig?.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary credentials are not configured in system settings or environment variables.");
    }

    // 2. Apply config dynamically
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });

    let uploadStr = base64Str;
    const isPdf = base64Str.includes("application/pdf") || base64Str.startsWith("JVBERi0");

    // Si no contiene el prefijo data:, se lo agregamos automáticamente
    if (!base64Str.startsWith("data:")) {
      if (isPdf) {
        uploadStr = `data:application/pdf;base64,${base64Str}`;
      } else {
        uploadStr = `data:image/png;base64,${base64Str}`;
      }
    }

    const options: any = {
      folder: `profesionales-ecuador/${folder}`
    };

    if (isPdf) {
      options.resource_type = "raw";
      let nameWithoutExt = "documento";
      if (originalFilename && typeof originalFilename === "string") {
        nameWithoutExt = originalFilename
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .replace(/_+/g, "_") || "documento";
      }
      options.public_id = `${nameWithoutExt}_${Date.now()}.pdf`;
    } else {
      options.resource_type = "auto";
      if (originalFilename && typeof originalFilename === "string") {
        let nameWithoutExt = originalFilename
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .replace(/_+/g, "_") || "archivo";
        options.public_id = `${nameWithoutExt}_${Date.now()}`;
      }
    }

    const result = await cloudinary.uploader.upload(uploadStr, options);

    return result.secure_url;
  } catch (error: any) {
    console.error(`Error al subir a Cloudinary en carpeta [${folder}]:`, error);
    throw new Error(`Fallo de subida a Cloudinary: ${error.message || error}`);
  }
}

export async function uploadBase64ToCloudinaryWithPublicId(
  base64Str: string,
  folder: string,
  originalFilename?: string
): Promise<{ secureUrl: string; publicId: string }> {
  if (!base64Str) {
    throw new Error("No se proporcionó contenido Base64.");
  }

  if (base64Str.startsWith("http://") || base64Str.startsWith("https://")) {
    return { secureUrl: base64Str, publicId: "" };
  }

  // Validar tamaño máximo (10MB)
  if (base64Str.length > 15 * 1024 * 1024) {
    throw new Error("El archivo excede el tamaño máximo permitido de 10MB.");
  }

  // Validar tipos de archivo permitidos (MIME Type / Header)
  if (base64Str.startsWith("data:")) {
    const allowedMimePrefixes = [
      "data:image/jpeg",
      "data:image/jpg",
      "data:image/png",
      "data:image/webp",
      "data:image/gif",
      "data:image/heic",
      "data:image/heif",
      "data:image/svg+xml",
      "data:application/pdf"
    ];
    const isAllowed = allowedMimePrefixes.some(prefix => base64Str.toLowerCase().startsWith(prefix));
    if (!isAllowed) {
      throw new Error("Formato de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP, GIF) o documentos PDF.");
    }
  }

  try {
    const systemConfig = await cachedFetch(cacheKey.systemConfig.singleton(), () =>
      db.systemConfig.findFirst()
    );
    const cloudName = systemConfig?.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = systemConfig?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
    const apiSecret = systemConfig?.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary credentials are not configured in system settings or environment variables.");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });

    const isPdf = base64Str.includes("application/pdf") || base64Str.startsWith("JVBERi0");
    const uploadStr = base64Str.startsWith("data:")
      ? base64Str
      : isPdf
      ? `data:application/pdf;base64,${base64Str}`
      : `data:image/png;base64,${base64Str}`;

    const options: any = {
      folder: `profesionales-ecuador/${folder}`
    };

    if (isPdf) {
      options.resource_type = "raw";
      let nameWithoutExt = "documento";
      if (originalFilename && typeof originalFilename === "string") {
        nameWithoutExt = originalFilename
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .replace(/_+/g, "_") || "documento";
      }
      options.public_id = `${nameWithoutExt}_${Date.now()}.pdf`;
    } else {
      options.resource_type = "auto";
      if (originalFilename && typeof originalFilename === "string") {
        let nameWithoutExt = originalFilename
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .replace(/_+/g, "_") || "archivo";
        options.public_id = `${nameWithoutExt}_${Date.now()}`;
      }
    }

    const result = await cloudinary.uploader.upload(uploadStr, options);

    return { secureUrl: result.secure_url, publicId: result.public_id };
  } catch (error: any) {
    console.error(`Error al subir a Cloudinary en carpeta [${folder}]:`, error);
    throw new Error(`Fallo de subida a Cloudinary: ${error.message || error}`);
  }
}

export function getSignedCloudinaryDeliveryUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  // Si la URL es de Cloudinary raw sin extensión al final, agregar .pdf para forzar apertura inline en el navegador
  if (rawUrl.includes("cloudinary.com") && rawUrl.includes("/raw/upload/")) {
    const parts = rawUrl.split("/");
    const filename = parts.pop() || "";
    if (filename && !filename.includes(".")) {
      return rawUrl + ".pdf";
    }
  }
  return rawUrl;
}
