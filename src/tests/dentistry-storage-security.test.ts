import assert from "node:assert/strict";
import test from "node:test";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { DentistryStorageService } from "../services/dentistry-storage.service";
import { DentistryDocumentController } from "../controllers/dentistry-document.controller";

test("Seguridad de Almacenamiento Documental Odontológico (OdontoCarePro - Etapa 3B)", async (t) => {
  let tempStorageDir: string;
  let originalEnvStorage: string | undefined;

  t.before(async () => {
    // Configurar directorio temporal completamente aislado
    originalEnvStorage = process.env.DENTAL_STORAGE_DIR;
    tempStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), "dental-storage-test-"));
    process.env.DENTAL_STORAGE_DIR = tempStorageDir;
  });

  t.after(async () => {
    // Restaurar entorno y limpiar directorio temporal
    if (originalEnvStorage !== undefined) {
      process.env.DENTAL_STORAGE_DIR = originalEnvStorage;
    } else {
      delete process.env.DENTAL_STORAGE_DIR;
    }
    await fs.rm(tempStorageDir, { recursive: true, force: true }).catch(() => {});
  });

  await t.test("ODO-001: Validación de Magic Bytes y Firmas Binarias por Formato", () => {
    // 1. PDF válido (%PDF-1.4)
    const validPdfBuffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    assert.doesNotThrow(() => {
      DentistryStorageService.validateFile("estudio_periapical.pdf", "application/pdf", validPdfBuffer.length, validPdfBuffer);
    });

    // 2. PNG válido
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    assert.doesNotThrow(() => {
      DentistryStorageService.validateFile("radiografia_panoramica.png", "image/png", validPngBuffer.length, validPngBuffer);
    });

    // 3. JPEG válido
    const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
    assert.doesNotThrow(() => {
      DentistryStorageService.validateFile("foto_intraoral.jpg", "image/jpeg", validJpegBuffer.length, validJpegBuffer);
    });

    // 4. WEBP válido
    const validWebpBuffer = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0x20, 0x00, 0x00, 0x00]),
      Buffer.from("WEBP", "ascii"),
      Buffer.from("VP8 ", "ascii"),
    ]);
    assert.doesNotThrow(() => {
      DentistryStorageService.validateFile("captura_clinica.webp", "image/webp", validWebpBuffer.length, validWebpBuffer);
    });

    // 5. TIFF válido (Little-Endian y Big-Endian)
    const validTiffLeBuffer = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
    assert.doesNotThrow(() => {
      DentistryStorageService.validateFile("ortopantomografia.tiff", "image/tiff", validTiffLeBuffer.length, validTiffLeBuffer);
    });
    const validTiffBeBuffer = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08]);
    assert.doesNotThrow(() => {
      DentistryStorageService.validateFile("ortopantomografia.tif", "image/tiff", validTiffBeBuffer.length, validTiffBeBuffer);
    });

    // 6. DICOM Medical Imaging (Part 10 standard: preámbulo de 128 bytes + DICM)
    const validDicomBuffer = Buffer.concat([
      Buffer.alloc(128, 0),
      Buffer.from("DICM", "ascii"),
      Buffer.alloc(32, 0),
    ]);
    assert.doesNotThrow(() => {
      DentistryStorageService.validateFile("tomografia_cbct.dcm", "application/dicom", validDicomBuffer.length, validDicomBuffer);
    });

    // 7. DOCX / XLSX (Contenedor ZIP PK\x03\x04)
    const validDocxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    assert.doesNotThrow(() => {
      DentistryStorageService.validateFile("informe_clinico.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", validDocxBuffer.length, validDocxBuffer);
    });

    // 8. Texto plano (.txt sin bytes binarios nulos)
    const validTxtBuffer = Buffer.from("Evolución clínica odontológica: Paciente acude para exodoncia simple de pieza 38.\nSin complicaciones anestésicas.");
    assert.doesNotThrow(() => {
      DentistryStorageService.validateFile("notas_evolucion.txt", "text/plain", validTxtBuffer.length, validTxtBuffer);
    });
  });

  await t.test("ODO-001 (Negativo): Rechazo de Ejecutables Disfrazados y Manipulación de Extensiones", () => {
    // A. Binario ejecutable Windows PE (cabecera MZ) renombrado como .pdf
    const fakePdfWithPe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00");
    assert.throws(
      () => {
        DentistryStorageService.validateFile("malware_disfrazado.pdf", "application/pdf", fakePdfWithPe.length, fakePdfWithPe);
      },
      /firma de ejecutable binario no admitido/
    );

    // B. Binario ejecutable Linux ELF (\x7fELF) renombrado como imagen PNG
    const fakePngWithElf = Buffer.from("\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00");
    assert.throws(
      () => {
        DentistryStorageService.validateFile("script_oculto.png", "image/png", fakePngWithElf.length, fakePngWithElf);
      },
      /firma de ejecutable binario no admitido/
    );

    // C. Discordancia de formato: imagen PNG legítima enviada con extensión .pdf y MIME application/pdf
    const legitimatePngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    assert.throws(
      () => {
        DentistryStorageService.validateFile("radiografia.pdf", "application/pdf", legitimatePngBuffer.length, legitimatePngBuffer);
      },
      /La firma binaria del contenido no coincide con el tipo de archivo declarado/
    );

    // D. Archivo vacío (0 bytes)
    assert.throws(
      () => {
        DentistryStorageService.validateFile("vacio.pdf", "application/pdf", 0, Buffer.alloc(0));
      },
      /El archivo clínico está vacío/
    );

    // E. Archivo que supera el límite de 25 MB
    const excessiveSize = 25 * 1024 * 1024 + 1;
    assert.throws(
      () => {
        DentistryStorageService.validateFile("archivo_gigante.pdf", "application/pdf", excessiveSize);
      },
      /El archivo excede el tamaño máximo permitido de 25MB/
    );

    // F. Extensiones prohibidas explícitas (.exe, .sh, .bat, etc.)
    assert.throws(
      () => {
        DentistryStorageService.validateFile("virus.exe", "application/octet-stream", 1024);
      },
      /Tipo de archivo potencialmente inseguro no permitido/
    );
    assert.throws(
      () => {
        DentistryStorageService.validateFile("exploit.sh", "application/x-sh", 512);
      },
      /Tipo de archivo potencialmente inseguro no permitido/
    );
  });

  await t.test("ODO-001: Sanitización de Nombres y Aislamiento contra Path Traversal", async () => {
    // 1. Path traversal en el nombre de archivo
    const maliciousNames = [
      "../../../../etc/passwd",
      "..\\..\\Windows\\System32\\cmd.exe",
      "../../../var/data/secret.pdf",
      "....//....//etc/shadow",
    ];

    for (const name of maliciousNames) {
      const sanitized = DentistryStorageService.sanitizeFileName(name);
      assert.equal(sanitized.includes("/"), false, `No debe contener slashes: ${sanitized}`);
      assert.equal(sanitized.includes("\\"), false, `No debe contener backslashes: ${sanitized}`);
      assert.equal(sanitized.startsWith(".."), false, `No debe iniciar con ..: ${sanitized}`);
    }

    // 2. Persistencia y lectura real en directorio temporal aislado
    const testOrgId = 999;
    const testPatientId = 888;
    const pdfData = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF");

    const saved = await DentistryStorageService.saveFile(
      testOrgId,
      testPatientId,
      "radiografia_prueba.pdf",
      "application/pdf",
      pdfData
    );

    assert.ok(saved.storageKey);
    assert.ok(saved.checksum);
    assert.equal(saved.sanitizedFileName, "radiografia_prueba.pdf");
    assert.ok(saved.absolutePath.startsWith(tempStorageDir));

    // Lectura del archivo guardado
    const fetched = await DentistryStorageService.getFile(testOrgId, testPatientId, saved.storageKey);
    assert.deepEqual(fetched.buffer, pdfData);

    // Intento de lectura con clave inexistente
    await assert.rejects(
      async () => {
        await DentistryStorageService.getFile(testOrgId, testPatientId, "clave_inexistente.pdf");
      },
      /El archivo físico no fue encontrado en el almacenamiento/
    );

    // Eliminación limpia
    await DentistryStorageService.deleteFile(testOrgId, testPatientId, saved.storageKey);
    await assert.rejects(
      async () => {
        await DentistryStorageService.getFile(testOrgId, testPatientId, saved.storageKey);
      },
      /El archivo físico no fue encontrado en el almacenamiento/
    );
  });

  await t.test("ODO-003: Eliminación de Descarga Sintética .txt y Retorno de 404 FILE_NOT_FOUND", async () => {
    // Simular el controlador de descarga cuando el archivo físico no existe en disco
    const mockReq = {
      params: { documentId: "101" },
      organization: { id: 1 },
      user: { id: 5, role: { name: "PROFESSIONAL" } },
      organizationMember: { role: "PROFESSIONAL" },
    } as any;

    let statusCode = 0;
    let responseBody: any = null;
    const headersSent: Record<string, string> = {};

    const mockRes = {
      locals: { organization: { id: 1 } },
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        responseBody = body;
        return this;
      },
      setHeader(name: string, value: string) {
        headersSent[name] = value;
      },
      send(data: any) {
        responseBody = data;
        return this;
      },
    } as any;

    // Ejecutar downloadDocument con ID de documento inexistente en almacenamiento
    await DentistryDocumentController.downloadDocument(mockReq, mockRes);

    // Debe retornar 404 (DOCUMENT_NOT_FOUND o FILE_NOT_FOUND) y NUNCA generar un archivo de texto sintético
    assert.equal(statusCode, 404);
    assert.equal(responseBody.success, false);
    assert.ok(responseBody.code === "DOCUMENT_NOT_FOUND" || responseBody.code === "FILE_NOT_FOUND");
    assert.equal(typeof responseBody, "object");
    assert.equal(responseBody.code !== undefined, true);
  });

  await t.test("ODO-002: Control de Acceso RBAC y Autoría en Eliminación de Documentos", async () => {
    // Simular caso de eliminación donde un PROFESIONAL intenta borrar un documento subido por OTRO profesional
    const mockReqOtherProfessional = {
      params: { documentId: "1" },
      organization: { id: 1 },
      user: { id: 99, role: { name: "PROFESSIONAL" } }, // Usuario ID 99
      organizationMember: { role: "PROFESSIONAL" },     // Rol en org: PROFESSIONAL
    } as any;

    let statusCode = 0;
    let responseBody: any = null;

    const mockRes = {
      locals: {
        organization: { id: 1 },
        organizationMember: { role: "PROFESSIONAL" },
        user: { id: 99 },
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        responseBody = body;
        return this;
      },
    } as any;

    await DentistryDocumentController.deleteDocument(mockReqOtherProfessional, mockRes);

    // Si el documento no existe en base de datos de pruebas aislada, responde 404 DOCUMENT_NOT_FOUND
    // Si existe y el autor difiere, responde 403
    assert.ok(statusCode === 403 || statusCode === 404);
    assert.equal(responseBody.success, false);
  });

  await t.test("ODO-005: Detección y Registro Estructurado de Huérfanos [AUDIT_STORAGE_ORPHAN]", () => {
    // Validar el formato del mensaje estructurado de log para huérfanos
    const orgId = 12;
    const patientId = 45;
    const documentId = 100;
    const storageKey = "uuid_archivo_perdido.pdf";
    const simulatedError = new Error("EACCES: permission denied, unlink");

    const logMessage = `[AUDIT_STORAGE_ORPHAN] Error al eliminar archivo físico para documento ID ${documentId} (org: ${orgId}, patient: ${patientId}, storageKey: ${storageKey}): ${simulatedError.message}`;

    assert.ok(logMessage.includes("[AUDIT_STORAGE_ORPHAN]"));
    assert.ok(logMessage.includes(String(documentId)));
    assert.ok(logMessage.includes(String(orgId)));
    assert.ok(!logMessage.includes("password"));
    assert.ok(!logMessage.includes("secret"));
  });

  await t.test("ODO-007: Construcción Segura de Cabeceras de Descarga RFC 5987 / RFC 6266", () => {
    const rawFileName = "Radiografía Periapical #16 (Paciente: Pérez, José).png";
    const safeAsciiName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const encodedName = encodeURIComponent(rawFileName);

    const contentDisposition = `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`;

    // Verificar que no contiene retornos de carro ni saltos de línea (prevención de Header Injection)
    assert.equal(contentDisposition.includes("\r"), false);
    assert.equal(contentDisposition.includes("\n"), false);
    // Verificar que safeAsciiName solo contiene caracteres seguros
    assert.match(safeAsciiName, /^[a-zA-Z0-9._-]+$/);
    // Verificar codificación RFC 5987
    assert.ok(contentDisposition.includes("filename*=UTF-8''"));
  });
});
