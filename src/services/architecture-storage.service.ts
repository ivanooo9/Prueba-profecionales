import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";

export interface ArchitectureStoredFileInfo {
  storageKey: string;
  sanitizedFileName: string;
  fileSize: number;
  checksumSha256: string;
  mimeType: string;
  absolutePath: string;
}

export class ArchitectureStorageService {
  public static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  private static readonly ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
    "text/plain",
    "text/csv",
    "application/octet-stream",
    "application/x-dwg",
    "image/vnd.dwg",
    "image/x-dwg",
    "model/vnd.dwf",
  ]);

  private static readonly EXTENSION_TO_MIME: Record<string, string[]> = {
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".xls": ["application/vnd.ms-excel"],
    ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".webp": ["image/webp"],
    ".tiff": ["image/tiff"],
    ".tif": ["image/tiff"],
    ".txt": ["text/plain"],
    ".csv": ["text/plain", "text/csv"],
    ".dwg": ["application/x-dwg", "image/vnd.dwg", "image/x-dwg", "application/octet-stream"],
    ".dxf": ["application/octet-stream"],
    ".skp": ["application/octet-stream"],
    ".ifc": ["application/octet-stream"],
    ".rvt": ["application/octet-stream"],
  };

  private static readonly ALLOWED_EXTENSIONS = new Set(Object.keys(ArchitectureStorageService.EXTENSION_TO_MIME));

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

  public static getBaseDir(
    organizationId: number,
    projectId: number,
    documentId: number
  ): string {
    const baseStorage =
      process.env.ARCHITECTURE_STORAGE_DIR ||
      path.resolve(process.cwd(), "storage", "architecture");
    return path.join(
      baseStorage,
      String(organizationId),
      String(projectId),
      String(documentId)
    );
  }

  public static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== "string") {
      return `document_${Date.now()}`;
    }

    // Remover caracteres de control y nulos, normalizar barras de Windows a Unix
    let clean = fileName.replace(/[\x00-\x1f\x80-\x9f]/g, "").replace(/\\/g, "/");

    // Extraer solo el basename para evitar inyección de rutas (../../ o C:\)
    clean = path.basename(clean);

    // Reemplazar caracteres peligrosos o separadores por guion bajo
    clean = clean.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    // Prevenir puntos dobles o secuencias maliciosas residuales
    clean = clean.replace(/\.{2,}/g, "_");

    // Prevenir nombres de archivo que sean solo puntos o vacíos
    if (!clean || clean.replace(/\./g, "").trim().length === 0) {
      clean = `document_${Date.now()}`;
    }

    // Limitar longitud preservando extensión
    if (clean.length > 150) {
      const ext = path.extname(clean);
      const name = path.basename(clean, ext).substring(0, 140);
      clean = `${name}${ext}`;
    }

    return clean;
  }

  private static hasCompatibleMime(ext: string, mimeType: string): boolean {
    const normalizedMime = (mimeType || "").toLowerCase().trim();
    const expectedMimes = ArchitectureStorageService.EXTENSION_TO_MIME[ext] || [];

    if (!expectedMimes.length) {
      return false;
    }

    const isAllowedMime = expectedMimes.includes(normalizedMime);
    const isGenericOctetStream =
      normalizedMime === "application/octet-stream" &&
      [".dwg", ".dxf", ".skp", ".ifc", ".rvt"].includes(ext);

    return isAllowedMime || isGenericOctetStream;
  }

  private static hasExpectedContentSignature(
    ext: string,
    mimeType: string,
    buffer: Buffer
  ): boolean {
    if (!buffer || buffer.length === 0) {
      return false;
    }

    const header = buffer.subarray(0, 16);
    const normalizedMime = (mimeType || "").toLowerCase().trim();

    if (normalizedMime.startsWith("text/") || normalizedMime === "application/json") {
      const textSample = buffer.toString("utf8", 0, Math.min(buffer.length, 512));
      return !textSample.includes("\u0000") && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(textSample);
    }

    switch (ext) {
      case ".pdf":
        return header.subarray(0, 5).toString("latin1") === "%PDF-";
      case ".png":
        return header.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
      case ".jpg":
      case ".jpeg":
        return header[0] === 0xff && header[1] === 0xd8;
      case ".webp":
        return (
          header.subarray(0, 4).toString("ascii") === "RIFF" &&
          header.subarray(8, 12).toString("ascii") === "WEBP"
        );
      case ".tif":
      case ".tiff":
        return (
          header.subarray(0, 4).toString("ascii") === "II*\0" ||
          header.subarray(0, 4).toString("ascii") === "MM\0*"
        );
      case ".doc":
      case ".xls":
        return header.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1";
      case ".docx":
      case ".xlsx":
        return header.subarray(0, 4).toString("ascii") === "PK\x03\x04";
      case ".dwg":
      case ".dxf":
      case ".skp":
      case ".ifc":
      case ".rvt":
        return !(
          header.subarray(0, 2).toString("ascii") === "MZ" ||
          header.subarray(0, 4).toString("ascii") === "PK\x03\x04" ||
          /<\s*(html|script|svg|xml)/i.test(buffer.toString("utf8", 0, 256))
        );
      default:
        return true;
    }
  }

  public static validateFile(
    fileName: string,
    mimeType: string,
    fileSize: number,
    buffer?: Buffer
  ): void {
    if (!fileSize || fileSize <= 0) {
      throw new Error("El archivo está vacío (0 bytes).");
    }

    if (fileSize > ArchitectureStorageService.MAX_FILE_SIZE) {
      throw new Error(
        `El archivo excede el tamaño máximo permitido de 50MB (${fileSize} bytes).`
      );
    }

    const ext = path.extname(fileName).toLowerCase();
    if (ArchitectureStorageService.DISALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(
        `Tipo de archivo potencialmente inseguro no permitido (${ext}).`
      );
    }

    if (!ArchitectureStorageService.ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(
        `Formato o tipo de archivo no permitido (${ext || mimeType}). Formatos aceptados: PDF, CAD/BIM (.dwg, .dxf, .skp, .ifc, .rvt), Imágenes (JPG, PNG, WEBP, TIFF), Office (DOC, DOCX, XLS, XLSX) y Texto.`
      );
    }

    const normalizedMime = (mimeType || "").toLowerCase().trim();
    if (!normalizedMime) {
      throw new Error("El tipo MIME del archivo es obligatorio.");
    }

    if (!ArchitectureStorageService.ALLOWED_MIME_TYPES.has(normalizedMime)) {
      throw new Error(
        `MIME no permitido (${mimeType}). Formatos aceptados: PDF, CAD/BIM, Imágenes, Office y Texto.`
      );
    }

    if (!ArchitectureStorageService.hasCompatibleMime(ext, normalizedMime)) {
      throw new Error(
        `Tipo MIME incompatible con la extensión (${ext}) y el contenido real del archivo (${mimeType}).`
      );
    }

    if (buffer && !ArchitectureStorageService.hasExpectedContentSignature(ext, normalizedMime, buffer)) {
      throw new Error(
        `El contenido del archivo no coincide con la extensión y el MIME declarados (${ext}, ${mimeType}).`
      );
    }
  }

  public static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  public static async saveFile(
    organizationId: number,
    projectId: number,
    documentId: number,
    originalName: string,
    mimeType: string,
    buffer: Buffer
  ): Promise<ArchitectureStoredFileInfo> {
    const fileSize = buffer.length;
    ArchitectureStorageService.validateFile(originalName, mimeType, fileSize, buffer);

    const sanitizedFileName = ArchitectureStorageService.sanitizeFileName(originalName);
    const checksumSha256 = ArchitectureStorageService.calculateChecksum(buffer);

    const dirPath = ArchitectureStorageService.getBaseDir(
      organizationId,
      projectId,
      documentId
    );
    await fs.mkdir(dirPath, { recursive: true });

    const uniqueId = crypto.randomUUID();
    const storageKey = `${uniqueId}_${sanitizedFileName}`;
    const destinationPath = path.join(dirPath, storageKey);

    // Verificación estricta contra path traversal
    const resolvedPath = path.resolve(destinationPath);
    if (!resolvedPath.startsWith(path.resolve(dirPath))) {
      throw new Error("Intento de violación de directorio (path traversal detectado).");
    }

    await fs.writeFile(resolvedPath, buffer);

    return {
      storageKey,
      sanitizedFileName,
      fileSize,
      checksumSha256,
      mimeType: mimeType || "application/octet-stream",
      absolutePath: resolvedPath,
    };
  }

  public static async getFile(
    organizationId: number,
    projectId: number,
    documentId: number,
    storageKey: string
  ): Promise<{ buffer: Buffer; absolutePath: string }> {
    const resolvedPath = ArchitectureStorageService.getFilePath(
      organizationId,
      projectId,
      documentId,
      storageKey
    );

    if (!fsSync.existsSync(resolvedPath)) {
      throw new Error("El archivo físico no fue encontrado en el almacenamiento.");
    }

    const buffer = await fs.readFile(resolvedPath);
    return {
      buffer,
      absolutePath: resolvedPath,
    };
  }

  public static getFilePath(
    organizationId: number,
    projectId: number,
    documentId: number,
    storageKey: string
  ): string {
    if (!storageKey || typeof storageKey !== "string") {
      throw new Error("Clave de almacenamiento no válida.");
    }

    // Detección estricta de secuencias de path traversal o separadores de ruta en el identificador
    if (
      storageKey.includes("..") ||
      storageKey.includes("/") ||
      storageKey.includes("\\")
    ) {
      throw new Error("Acceso a ruta de archivo inválida: clave contiene caracteres de navegación.");
    }

    // Sanitizar storageKey contra path traversal
    const cleanKey = path.basename(storageKey);
    const dirPath = ArchitectureStorageService.getBaseDir(
      organizationId,
      projectId,
      documentId
    );
    const filePath = path.join(dirPath, cleanKey);
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(path.resolve(dirPath))) {
      throw new Error("Acceso a ruta de archivo inválida.");
    }

    return resolvedPath;
  }

  public static async deleteFile(
    organizationId: number,
    projectId: number,
    documentId: number,
    storageKey: string
  ): Promise<void> {
    try {
      if (!storageKey) return;
      const cleanKey = path.basename(storageKey);
      const dirPath = ArchitectureStorageService.getBaseDir(
        organizationId,
        projectId,
        documentId
      );
      const filePath = path.join(dirPath, cleanKey);
      const resolvedPath = path.resolve(filePath);

      if (
        resolvedPath.startsWith(path.resolve(dirPath)) &&
        fsSync.existsSync(resolvedPath)
      ) {
        await fs.unlink(resolvedPath);
      }
    } catch {
      // Ignorar error al limpiar archivo en compensación atómica
    }
  }
}
