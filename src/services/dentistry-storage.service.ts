import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";

export interface StoredDentalFileInfo {
  storageKey: string;
  sanitizedFileName: string;
  fileSize: number;
  checksum: string;
  mimeType: string;
  absolutePath: string;
}

export class DentistryStorageService {
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
    "image/gif",
    "image/tiff",
    "application/dicom",
    "image/x-dicom",
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

  public static getRootStorageDir(): string {
    return (
      process.env.DENTAL_STORAGE_DIR ||
      process.env.DENTISTRY_STORAGE_DIR ||
      path.resolve(process.cwd(), "storage", "dentistry")
    );
  }

  private static getBaseDir(organizationId: number, patientId: number): string {
    const baseStorage = DentistryStorageService.getRootStorageDir();
    return path.join(baseStorage, String(organizationId), String(patientId));
  }

  public static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== "string") {
      return `doc_${Date.now()}`;
    }

    // Remover caracteres de control y nulos
    let clean = fileName.replace(/[\x00-\x1f\x80-\x9f]/g, "");

    // Normalizar separadores de ruta tanto de Windows (\) como de POSIX (/)
    clean = clean.replace(/\\/g, "/");

    // Extraer solo el basename para evitar inyección de rutas (../../ o C:\)
    clean = path.posix.basename(clean);

    // Reemplazar caracteres especiales o potencialmente inseguros por guion bajo
    clean = clean.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    // Remover puntos iniciales consecutivos para evitar archivos ocultos o secuencias de escape
    clean = clean.replace(/^\.+/, "");

    // Prevenir nombres de archivo que sean solo puntos o vacíos
    if (!clean || clean.replace(/\./g, "").trim().length === 0) {
      clean = `doc_${Date.now()}`;
    }

    // Limitar longitud
    if (clean.length > 200) {
      const ext = path.extname(clean);
      const name = path.basename(clean, ext).substring(0, 190);
      clean = `${name}${ext}`;
    }

    return clean;
  }

  /**
   * Comprueba la firma binaria (magic bytes) del buffer según la extensión y el tipo MIME declarado.
   */
  public static hasExpectedContentSignature(
    ext: string,
    mimeType: string,
    buffer: Buffer
  ): boolean {
    if (!buffer || buffer.length === 0) return false;

    // 1. Bloqueo incondicional de ejecutables binarios
    // Windows PE (MZ)
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return false;
    }
    // Linux ELF (\x7fELF)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x7f &&
      buffer[1] === 0x45 &&
      buffer[2] === 0x4c &&
      buffer[3] === 0x46
    ) {
      return false;
    }

    const normalizedExt = ext.toLowerCase().trim();

    // 2. Comprobación de cabecera binaria según formato
    switch (normalizedExt) {
      case ".pdf":
        // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2d)
        return (
          buffer.length >= 5 &&
          buffer.subarray(0, 5).toString("ascii") === "%PDF-"
        );

      case ".png":
        // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
        return (
          buffer.length >= 8 &&
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47 &&
          buffer[4] === 0x0d &&
          buffer[5] === 0x0a &&
          buffer[6] === 0x1a &&
          buffer[7] === 0x0a
        );

      case ".jpg":
      case ".jpeg":
        // JPEG magic bytes: FF D8 FF
        return (
          buffer.length >= 3 &&
          buffer[0] === 0xff &&
          buffer[1] === 0xd8 &&
          buffer[2] === 0xff
        );

      case ".webp":
        // WEBP: "RIFF" en 0-3 y "WEBP" en 8-11
        return (
          buffer.length >= 12 &&
          buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
          buffer.subarray(8, 12).toString("ascii") === "WEBP"
        );

      case ".gif":
        // GIF87a o GIF89a
        if (buffer.length < 6) return false;
        const gifHeader = buffer.subarray(0, 6).toString("ascii");
        return gifHeader === "GIF87a" || gifHeader === "GIF89a";

      case ".tif":
      case ".tiff":
        // TIFF: II*\0 (0x49 0x49 0x2A 0x00) little-endian o MM\0* (0x4D 0x4D 0x00 0x2A) big-endian
        if (buffer.length < 4) return false;
        const isLittleEndian =
          buffer[0] === 0x49 &&
          buffer[1] === 0x49 &&
          buffer[2] === 0x2a &&
          buffer[3] === 0x00;
        const isBigEndian =
          buffer[0] === 0x4d &&
          buffer[1] === 0x4d &&
          buffer[2] === 0x00 &&
          buffer[3] === 0x2a;
        return isLittleEndian || isBigEndian;

      case ".dcm":
        // DICOM Part 10 Medical Image: preámbulo de 128 bytes seguido de "DICM" (bytes 128 a 131)
        if (
          buffer.length >= 132 &&
          buffer.subarray(128, 132).toString("ascii") === "DICM"
        ) {
          return true;
        }
        // Algunos DICOM legacy sin preámbulo arrancan con etiquetas de grupo (mínimo 256 bytes)
        return buffer.length >= 256;

      case ".doc":
      case ".xls":
        // OLE2 Compound Document: D0 CF 11 E0 A1 B1 1A E1
        return (
          buffer.length >= 8 &&
          buffer[0] === 0xd0 &&
          buffer[1] === 0xcf &&
          buffer[2] === 0x11 &&
          buffer[3] === 0xe0 &&
          buffer[4] === 0xa1 &&
          buffer[5] === 0xb1 &&
          buffer[6] === 0x1a &&
          buffer[7] === 0xe1
        );

      case ".docx":
      case ".xlsx":
        // Office OpenXML ZIP container: PK\x03\x04 (0x50 0x4B 0x03 0x04)
        return (
          buffer.length >= 4 &&
          buffer[0] === 0x50 &&
          buffer[1] === 0x4b &&
          buffer[2] === 0x03 &&
          buffer[3] === 0x04
        );

      case ".txt":
        // Texto plano: muestra inicial no debe contener byte nulo ni caracteres binarios de control
        const sampleLength = Math.min(buffer.length, 512);
        for (let i = 0; i < sampleLength; i++) {
          const byte = buffer[i];
          if (byte === 0x00) return false;
          if (
            byte < 0x09 ||
            (byte > 0x0a && byte < 0x0d) ||
            (byte > 0x0d && byte < 0x20 && byte !== 0x1b)
          ) {
            return false;
          }
        }
        return true;

      default:
        return false;
    }
  }

  public static validateFile(
    fileName: string,
    mimeType: string,
    fileSize: number,
    buffer?: Buffer
  ): void {
    if (!fileSize || fileSize <= 0) {
      throw new Error("El archivo clínico está vacío (0 bytes).");
    }

    if (fileSize > DentistryStorageService.MAX_FILE_SIZE) {
      throw new Error(
        `El archivo excede el tamaño máximo permitido de 25MB (${fileSize} bytes).`
      );
    }

    const ext = path.extname(fileName).toLowerCase();
    if (DentistryStorageService.DISALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(
        `Tipo de archivo potencialmente inseguro no permitido en historia clínica (${ext}).`
      );
    }

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
      ".gif",
      ".tif",
      ".tiff",
      ".dcm",
      ".txt",
    ];

    if (!validExtensions.includes(ext)) {
      throw new Error(
        `Extensión de archivo no permitida en historia clínica: ${ext || "sin extensión"}. Extensiones permitidas: PDF, Word, Excel, Imágenes (JPG, PNG, WEBP, GIF, TIFF), DICOM (.dcm), TXT.`
      );
    }

    const normalizedMime = (mimeType || "").toLowerCase().trim();
    if (normalizedMime && !DentistryStorageService.ALLOWED_MIME_TYPES.has(normalizedMime)) {
      throw new Error(
        `Formato de archivo MIME no permitido: ${mimeType || "desconocido"}. Tipos permitidos: PDF, Word, Excel, Imágenes radiográficas/clínicas (JPG, PNG, WEBP), DICOM (.dcm), TXT.`
      );
    }

    // Validación de contenido binario mediante inspección de buffer
    if (buffer) {
      // Bloqueo explícito de ejecutables
      if (
        (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) ||
        (buffer.length >= 4 &&
          buffer[0] === 0x7f &&
          buffer[1] === 0x45 &&
          buffer[2] === 0x4c &&
          buffer[3] === 0x46)
      ) {
        throw new Error(
          "El archivo contiene una firma de ejecutable binario no admitido (PE/ELF)."
        );
      }

      const isValidSignature = DentistryStorageService.hasExpectedContentSignature(
        ext,
        normalizedMime,
        buffer
      );

      if (!isValidSignature) {
        throw new Error(
          `La firma binaria del contenido no coincide con el tipo de archivo declarado (${ext} / ${mimeType}).`
        );
      }
    }
  }

  public static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  public static async saveFile(
    organizationId: number,
    patientId: number,
    originalName: string,
    mimeType: string,
    buffer: Buffer
  ): Promise<StoredDentalFileInfo> {
    const fileSize = buffer.length;
    DentistryStorageService.validateFile(originalName, mimeType, fileSize, buffer);

    const sanitizedFileName = DentistryStorageService.sanitizeFileName(originalName);
    const checksum = DentistryStorageService.calculateChecksum(buffer);

    const dirPath = DentistryStorageService.getBaseDir(organizationId, patientId);
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
    patientId: number,
    storageKey: string
  ): Promise<{ buffer: Buffer; absolutePath: string }> {
    if (!storageKey || typeof storageKey !== "string") {
      throw new Error("Clave de almacenamiento no válida.");
    }

    const cleanKey = path.basename(storageKey);
    const dirPath = DentistryStorageService.getBaseDir(organizationId, patientId);
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
    patientId: number,
    storageKey: string
  ): Promise<void> {
    if (!storageKey) return;
    const cleanKey = path.basename(storageKey);
    const dirPath = DentistryStorageService.getBaseDir(organizationId, patientId);
    const filePath = path.join(dirPath, cleanKey);
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(path.resolve(dirPath))) {
      throw new Error("Ruta de archivo inválida para eliminación.");
    }

    if (fsSync.existsSync(resolvedPath)) {
      await fs.unlink(resolvedPath);
    }
  }
}
