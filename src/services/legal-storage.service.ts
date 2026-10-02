import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";

export interface StoredFileInfo {
  storageKey: string;
  sanitizedFileName: string;
  fileSize: number;
  checksum: string;
  mimeType: string;
  absolutePath: string;
}

export class LegalStorageService {
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

  private static readonly ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
  ]);

  private static readonly DISALLOWED_EXTENSIONS = new Set([
    ".exe",
    ".bat",
    ".cmd",
    ".sh",
    ".bin",
    ".msi",
    ".dll",
    ".com",
    ".vbs",
    ".ps1",
    ".py",
    ".js",
    ".php",
    ".cgi",
    ".jar",
    ".apk",
    ".scr",
  ]);

  private static getBaseDir(organizationId: number, legalCaseId: number): string {
    const baseStorage = path.resolve(process.cwd(), "storage", "legal");
    return path.join(baseStorage, String(organizationId), String(legalCaseId));
  }

  public static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== "string") {
      return `document_${Date.now()}`;
    }

    // Remover caracteres de control y nulos
    let clean = fileName.replace(/[\x00-\x1f\x80-\x9f]/g, "");

    // Extraer solo el basename para evitar inyección de rutas (../../ o C:\)
    clean = path.basename(clean);

    // Reemplazar caracteres peligrosos o separadores por guion bajo
    clean = clean.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    // Prevenir nombres de archivo que sean solo puntos o vacíos
    if (!clean || clean.replace(/\./g, "").trim().length === 0) {
      clean = `document_${Date.now()}`;
    }

    // Limitar longitud
    if (clean.length > 200) {
      const ext = path.extname(clean);
      const name = path.basename(clean, ext).substring(0, 190);
      clean = `${name}${ext}`;
    }

    return clean;
  }

  public static validateFile(
    fileName: string,
    mimeType: string,
    fileSize: number
  ): void {
    if (!fileSize || fileSize <= 0) {
      throw new Error("El archivo está vacío (0 bytes).");
    }

    if (fileSize > LegalStorageService.MAX_FILE_SIZE) {
      throw new Error(
        `El archivo excede el tamaño máximo permitido de 25MB (${fileSize} bytes).`
      );
    }

    const ext = path.extname(fileName).toLowerCase();
    if (LegalStorageService.DISALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(
        `Tipo de archivo potencialmente inseguro no permitido (${ext}).`
      );
    }

    const normalizedMime = (mimeType || "").toLowerCase().trim();
    if (!LegalStorageService.ALLOWED_MIME_TYPES.has(normalizedMime)) {
      // También permitir si la extensión es válida común
      const validExtensions = [
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".txt",
      ];
      if (!validExtensions.includes(ext)) {
        throw new Error(
          `Formato de archivo MIME no permitido: ${mimeType || "desconocido"}. Tipos permitidos: PDF, Word, Excel, Imágenes (JPG, PNG, WEBP), Texto.`
        );
      }
    }
  }

  public static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  public static async saveFile(
    organizationId: number,
    legalCaseId: number,
    originalName: string,
    mimeType: string,
    buffer: Buffer
  ): Promise<StoredFileInfo> {
    const fileSize = buffer.length;
    LegalStorageService.validateFile(originalName, mimeType, fileSize);

    const sanitizedFileName = LegalStorageService.sanitizeFileName(originalName);
    const checksum = LegalStorageService.calculateChecksum(buffer);

    const dirPath = LegalStorageService.getBaseDir(organizationId, legalCaseId);
    await fs.mkdir(dirPath, { recursive: true });

    const uniqueId = crypto.randomUUID();
    const storageKey = `${uniqueId}_${sanitizedFileName}`;
    const destinationPath = path.join(dirPath, storageKey);

    // Doble verificación contra path traversal
    const resolvedPath = path.resolve(destinationPath);
    if (!resolvedPath.startsWith(path.resolve(dirPath))) {
      throw new Error("Intento de violación de directorio (path traversal detectado).");
    }

    await fs.writeFile(resolvedPath, buffer);

    return {
      storageKey,
      sanitizedFileName,
      fileSize,
      checksum,
      mimeType: mimeType || "application/octet-stream",
      absolutePath: resolvedPath,
    };
  }

  public static async getFile(
    organizationId: number,
    legalCaseId: number,
    storageKey: string
  ): Promise<{ buffer: Buffer; absolutePath: string }> {
    if (!storageKey || typeof storageKey !== "string") {
      throw new Error("Clave de almacenamiento no válida.");
    }

    // Sanitizar storageKey contra path traversal
    const cleanKey = path.basename(storageKey);
    const dirPath = LegalStorageService.getBaseDir(organizationId, legalCaseId);
    const filePath = path.join(dirPath, cleanKey);
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(path.resolve(dirPath))) {
      throw new Error("Acceso a ruta de archivo inválida.");
    }

    if (!fsSync.existsSync(resolvedPath)) {
      throw new Error("El archivo físico no fue encontrado en el almacenamiento.");
    }

    const buffer = await fs.readFile(resolvedPath);
    return {
      buffer,
      absolutePath: resolvedPath,
    };
  }

  public static async deleteFile(
    organizationId: number,
    legalCaseId: number,
    storageKey: string
  ): Promise<void> {
    try {
      if (!storageKey) return;
      const cleanKey = path.basename(storageKey);
      const dirPath = LegalStorageService.getBaseDir(organizationId, legalCaseId);
      const filePath = path.join(dirPath, cleanKey);
      const resolvedPath = path.resolve(filePath);

      if (resolvedPath.startsWith(path.resolve(dirPath)) && fsSync.existsSync(resolvedPath)) {
        await fs.unlink(resolvedPath);
      }
    } catch {
      // Ignorar error al limpiar archivo en compensación
    }
  }
}
