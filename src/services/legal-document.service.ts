import { db } from "../lib/db";
import { LegalCaseOperationsService } from "./legal-case-operations.service";
import { LegalStorageService } from "./legal-storage.service";

export interface CreateDocumentInput {
  title: string;
  documentType: string;
  description?: string | null;
  status?: string;
}

export interface UploadFileInput {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  notes?: string | null;
}

export interface UpdateDocumentInput {
  title?: string;
  documentType?: string;
  description?: string | null;
  status?: string;
}

export interface DocumentFilters {
  status?: string;
  documentType?: string;
  search?: string;
}

export class LegalDocumentService {
  // -------------------------------------------------------------
  // CREACIÓN DE DOCUMENTO Y VERSIÓN INICIAL (v1)
  // -------------------------------------------------------------
  public static async createDocument(
    organizationId: number,
    legalCaseId: number,
    data: CreateDocumentInput,
    file: UploadFileInput,
    authUserId?: number | null
  ) {
    if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
      throw new Error("El título del documento es obligatorio.");
    }
    if (!data.documentType || typeof data.documentType !== "string" || !data.documentType.trim()) {
      throw new Error("El tipo de documento es obligatorio (ej. Demanda, Contestación, etc.).");
    }
    if (!file || !file.buffer) {
      throw new Error("Se requiere adjuntar un archivo para crear el documento inicial.");
    }

    // 1. Validar existencia y jerarquía del caso en la organización
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    // 2. Guardar archivo físico en el almacenamiento privado seguro
    const storedFile = await LegalStorageService.saveFile(
      organizationId,
      legalCaseId,
      file.originalName,
      file.mimeType,
      file.buffer
    );

    try {
      // 3. Crear documento y versión 1 dentro de una transacción
      const result = await db.$transaction(async (tx) => {
        const legalDocument = await tx.legalDocument.create({
          data: {
            organizationId,
            legalCaseId,
            title: data.title.trim(),
            documentType: data.documentType.trim(),
            description: data.description ? data.description.trim() : null,
            status: data.status ? data.status.trim() : "ACTIVE",
            createdByUserId: authUserId || null,
          },
        });

        const initialVersion = await tx.legalDocumentVersion.create({
          data: {
            organizationId,
            legalDocumentId: legalDocument.id,
            versionNumber: 1,
            fileName: storedFile.sanitizedFileName,
            storageKey: storedFile.storageKey,
            mimeType: storedFile.mimeType,
            fileSize: storedFile.fileSize,
            checksum: storedFile.checksum,
            notes: file.notes ? file.notes.trim() : "Versión inicial (v1)",
            uploadedByUserId: authUserId || null,
            fileUrl: `/api/organizations/${organizationId}/legal/cases/${legalCaseId}/documents/${legalDocument.id}/versions/TEMP/file`,
          },
        });

        const fileUrl = `/api/organizations/${organizationId}/legal/cases/${legalCaseId}/documents/${legalDocument.id}/versions/${initialVersion.id}/file`;
        const updatedVersion = await tx.legalDocumentVersion.update({
          where: { id: initialVersion.id },
          data: { fileUrl },
        });

        return {
          ...legalDocument,
          latestVersionNumber: 1,
          versionCount: 1,
          versions: [updatedVersion],
        };
      });

      // Retornar sin efectos secundarios en actividades/tareas
      return result;
    } catch (dbError) {
      // Compensación: eliminar archivo físico huérfano si la transacción falla
      await LegalStorageService.deleteFile(organizationId, legalCaseId, storedFile.storageKey);
      throw dbError;
    }
  }

  // -------------------------------------------------------------
  // AÑADIR NUEVA VERSIÓN A DOCUMENTO EXISTENTE (v2, v3, ...)
  // Concurrencia protegida mediante advisory locks por documento
  // -------------------------------------------------------------
  public static async addVersion(
    organizationId: number,
    legalCaseId: number,
    documentId: number,
    file: UploadFileInput,
    authUserId?: number | null
  ) {
    if (!file || !file.buffer) {
      throw new Error("Se requiere adjuntar un archivo para la nueva versión.");
    }

    // 1. Validar caso en la organización
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    // 2. Validar que el documento existe y pertenece a este caso y organización
    const doc = await db.legalDocument.findFirst({
      where: {
        id: documentId,
        legalCaseId,
        organizationId,
      },
    });

    if (!doc) {
      throw new Error(`Documento con ID ${documentId} no encontrado en el expediente ${legalCaseId}.`);
    }

    if (doc.status === "ARCHIVED" || doc.status === "Archivado") {
      throw new Error("No se pueden añadir versiones a un documento que se encuentra archivado.");
    }

    // 3. Guardar archivo físico en almacenamiento seguro
    const storedFile = await LegalStorageService.saveFile(
      organizationId,
      legalCaseId,
      file.originalName,
      file.mimeType,
      file.buffer
    );

    try {
      const newVersion = await db.$transaction(async (tx) => {
        // Bloqueo consultivo a nivel de transacción para serializar la generación de versiones concurrentes
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`legal_doc_version_${organizationId}_${documentId}`}))`;

        // Calcular el siguiente número de versión atómicamente
        const maxVersion = await tx.legalDocumentVersion.aggregate({
          where: { legalDocumentId: documentId },
          _max: { versionNumber: true },
        });

        const nextVersionNumber = (maxVersion._max.versionNumber || 0) + 1;

        const version = await tx.legalDocumentVersion.create({
          data: {
            organizationId,
            legalDocumentId: documentId,
            versionNumber: nextVersionNumber,
            fileName: storedFile.sanitizedFileName,
            storageKey: storedFile.storageKey,
            mimeType: storedFile.mimeType,
            fileSize: storedFile.fileSize,
            checksum: storedFile.checksum,
            notes: file.notes ? file.notes.trim() : null,
            uploadedByUserId: authUserId || null,
            fileUrl: `/api/organizations/${organizationId}/legal/cases/${legalCaseId}/documents/${documentId}/versions/TEMP/file`,
          },
        });

        const fileUrl = `/api/organizations/${organizationId}/legal/cases/${legalCaseId}/documents/${documentId}/versions/${version.id}/file`;
        const updatedVersion = await tx.legalDocumentVersion.update({
          where: { id: version.id },
          data: { fileUrl },
        });

        // Actualizar fecha de modificación del documento lógico
        await tx.legalDocument.update({
          where: { id: documentId },
          data: { updatedAt: new Date() },
        });

        return updatedVersion;
      });

      return newVersion;
    } catch (dbError) {
      // Compensación: eliminar archivo físico si la transacción falla
      await LegalStorageService.deleteFile(organizationId, legalCaseId, storedFile.storageKey);
      throw dbError;
    }
  }

  // -------------------------------------------------------------
  // LISTAR DOCUMENTOS DE UN EXPEDIENTE (Strictly Read-Only)
  // -------------------------------------------------------------
  public static async listDocuments(
    organizationId: number,
    legalCaseId: number,
    filters: DocumentFilters = {}
  ) {
    // Validar caso en la organización
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    const where: any = {
      organizationId,
      legalCaseId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.documentType) {
      where.documentType = filters.documentType;
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    const documents = await db.legalDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            uploadedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return documents.map((doc) => {
      const latestVersion = doc.versions[0] || null;
      return {
        ...doc,
        versionCount: doc.versions.length,
        latestVersion,
      };
    });
  }

  // -------------------------------------------------------------
  // OBTENER DETALLE DE DOCUMENTO CON HISTORIAL DE VERSIONES
  // -------------------------------------------------------------
  public static async getDocument(
    organizationId: number,
    legalCaseId: number,
    documentId: number
  ) {
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    const document = await db.legalDocument.findFirst({
      where: {
        id: documentId,
        legalCaseId,
        organizationId,
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            uploadedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!document) {
      throw new Error(`Documento con ID ${documentId} no encontrado en el caso ${legalCaseId}.`);
    }

    return {
      ...document,
      versionCount: document.versions.length,
      latestVersion: document.versions[0] || null,
    };
  }

  // -------------------------------------------------------------
  // ACTUALIZAR METADATOS DEL DOCUMENTO (Inmutabilidad relacional)
  // -------------------------------------------------------------
  public static async updateDocument(
    organizationId: number,
    legalCaseId: number,
    documentId: number,
    data: UpdateDocumentInput
  ) {
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    const doc = await db.legalDocument.findFirst({
      where: {
        id: documentId,
        legalCaseId,
        organizationId,
      },
    });

    if (!doc) {
      throw new Error(`Documento con ID ${documentId} no encontrado en el caso ${legalCaseId}.`);
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
        throw new Error("El título del documento no puede estar vacío.");
      }
      updateData.title = data.title.trim();
    }

    if (data.documentType !== undefined) {
      if (!data.documentType || typeof data.documentType !== "string" || !data.documentType.trim()) {
        throw new Error("El tipo de documento no puede estar vacío.");
      }
      updateData.documentType = data.documentType.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    if (data.status !== undefined) {
      updateData.status = data.status.trim();
    }

    const updated = await db.legalDocument.update({
      where: { id: documentId },
      data: updateData,
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            uploadedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return {
      ...updated,
      versionCount: updated.versions.length,
      latestVersion: updated.versions[0] || null,
    };
  }

  // -------------------------------------------------------------
  // DESCARGA PROTEGIDA DE ARCHIVO DE VERSIÓN ESPECÍFICA
  // -------------------------------------------------------------
  public static async getVersionFile(
    organizationId: number,
    legalCaseId: number,
    documentId: number,
    versionId: number
  ) {
    // 1. Validar caso en la organización
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    // 2. Validar que la versión exista y pertenezca al documento y organización correctos
    const version = await db.legalDocumentVersion.findFirst({
      where: {
        id: versionId,
        legalDocumentId: documentId,
        organizationId,
      },
      include: {
        legalDocument: true,
      },
    });

    if (!version) {
      throw new Error(`Versión documental con ID ${versionId} no encontrada.`);
    }

    // 3. Validar jerarquía estricta: documento pertenece al caso
    if (version.legalDocument.legalCaseId !== legalCaseId) {
      throw new Error("Violación de jerarquía: El documento no pertenece al caso especificado.");
    }

    // 4. Obtener archivo físico
    const fileData = await LegalStorageService.getFile(
      organizationId,
      legalCaseId,
      version.storageKey
    );

    return {
      buffer: fileData.buffer,
      fileName: version.fileName,
      mimeType: version.mimeType,
      fileSize: version.fileSize,
      checksum: version.checksum,
      versionNumber: version.versionNumber,
    };
  }

  // -------------------------------------------------------------
  // ARCHIVAR DOCUMENTO (Conservación histórica sin borrado físico)
  // -------------------------------------------------------------
  public static async archiveDocument(
    organizationId: number,
    legalCaseId: number,
    documentId: number
  ) {
    return LegalDocumentService.updateDocument(organizationId, legalCaseId, documentId, {
      status: "ARCHIVED",
    });
  }
}
