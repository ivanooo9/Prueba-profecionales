import { Request, Response } from "express";
import multer from "multer";
import { DentistryDocumentService } from "../services/dentistry-document.service";
import { DentistryStorageService } from "../services/dentistry-storage.service";

// Configuración de Multer en memoria para procesamiento de archivos clínicos (máx 25MB)
export const dentistryUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

export class DentistryDocumentController {
  /**
   * Extrae el payload de archivo físico ya sea de multipart/form-data (req.file) o base64 (req.body).
   */
  private static extractFilePayload(req: Request): {
    originalName: string;
    mimeType: string;
    buffer: Buffer;
  } | null {
    if (req.file) {
      return {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      };
    }

    const base64Data =
      req.body?.fileBase64 || req.body?.base64 || req.body?.fileContent;
    if (base64Data && typeof base64Data === "string") {
      const cleanBase64 = base64Data.includes(";base64,")
        ? base64Data.split(";base64,")[1]
        : base64Data;
      const buffer = Buffer.from(cleanBase64, "base64");
      const originalName =
        req.body?.fileName || req.body?.originalName || "documento_clinico.pdf";
      const mimeType = req.body?.mimeType || "application/pdf";
      return { originalName, mimeType, buffer };
    }

    return null;
  }

  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/documents
   * GET /api/organizations/:id/dentistry/documents
   * Lista documentos clínicos del paciente o de la organización.
   */
  public static async listDocuments(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const rawPatientId = req.params.patientId || req.query.patientId;
      const patientId = rawPatientId ? parseInt(String(rawPatientId), 10) : undefined;
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const skip = req.query.skip ? parseInt(String(req.query.skip), 10) : undefined;
      const take = req.query.take ? parseInt(String(req.query.take), 10) : undefined;

      const documents = await DentistryDocumentService.getDocuments(org.id, {
        patientId: patientId && !isNaN(patientId) ? patientId : undefined,
        type,
        skip,
        take,
      });

      return res.status(200).json({ success: true, data: documents });
    } catch (error: any) {
      console.error("[DentistryDocumentController.listDocuments] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al listar documentos clínicos.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/documents/:documentId
   * Obtiene detalle de una ficha de documento específica.
   */
  public static async getDocumentById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const documentId = parseInt(String(req.params.documentId), 10);
      if (isNaN(documentId)) {
        return res.status(400).json({ success: false, error: "ID de documento inválido." });
      }

      const doc = await DentistryDocumentService.getDocumentById(org.id, documentId);

      return res.status(200).json({ success: true, data: doc });
    } catch (error: any) {
      console.error("[DentistryDocumentController.getDocumentById] Error:", error);
      return res.status(404).json({
        success: false,
        error: error.message || "Documento odontológico no encontrado.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/documents/:documentId/download
   * Descarga el archivo físico del documento asegurando aislamiento multi-tenant.
   */
  public static async downloadDocument(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const documentId = parseInt(String(req.params.documentId), 10);
      if (isNaN(documentId)) {
        return res.status(400).json({ success: false, error: "ID de documento inválido." });
      }

      const doc = await DentistryDocumentService.getDocumentById(org.id, documentId);
      if (!doc) {
        return res.status(404).json({ success: false, error: "Documento no encontrado." });
      }

      const storageKey = doc.fileUrl;
      const { buffer } = await DentistryStorageService.getFile(
        org.id,
        doc.patientId,
        storageKey
      );

      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(doc.fileName)}"`
      );
      res.setHeader("Content-Length", buffer.length);
      return res.status(200).send(buffer);
    } catch (error: any) {
      console.error("[DentistryDocumentController.downloadDocument] Error:", error);
      return res.status(404).json({
        success: false,
        error: error.message || "Archivo no encontrado para descarga.",
      });
    }
  }

  /**
   * POST /api/organizations/:id/dentistry/patients/:patientId/documents
   * Registra una nueva ficha de documento y guarda el archivo físico si se envía.
   */
  public static async createDocument(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const rawPatientId = req.params.patientId || req.body.patientId;
      const patientId = parseInt(String(rawPatientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const user = (req as any).user || res.locals.user;
      const userId = user?.id ? parseInt(String(user.id), 10) : undefined;

      const filePayload = DentistryDocumentController.extractFilePayload(req);
      let fileName = req.body.fileName;
      let fileUrl = req.body.fileUrl;
      let fileSize = req.body.fileSize ? parseInt(String(req.body.fileSize), 10) : null;
      let mimeType = req.body.mimeType;

      if (filePayload) {
        const stored = await DentistryStorageService.saveFile(
          org.id,
          patientId,
          filePayload.originalName,
          filePayload.mimeType,
          filePayload.buffer
        );
        fileName = stored.sanitizedFileName;
        fileUrl = stored.storageKey;
        fileSize = stored.fileSize;
        mimeType = stored.mimeType;
      }

      const {
        title,
        type,
        date,
        description,
        treatmentPlanId,
        treatmentItemId,
        executionId,
      } = req.body;

      const doc = await DentistryDocumentService.createDocument(
        org.id,
        patientId,
        {
          title: title || (filePayload ? filePayload.originalName : "Documento Clínico"),
          type,
          date,
          description,
          fileName: fileName || "documento.pdf",
          fileUrl: fileUrl || `doc_${Date.now()}`,
          fileSize,
          mimeType,
          treatmentPlanId: treatmentPlanId ? parseInt(String(treatmentPlanId), 10) : null,
          treatmentItemId: treatmentItemId ? parseInt(String(treatmentItemId), 10) : null,
          executionId: executionId ? parseInt(String(executionId), 10) : null,
        },
        userId
      );

      return res.status(201).json({
        success: true,
        message: "Ficha documental registrada exitosamente.",
        data: doc,
      });
    } catch (error: any) {
      console.error("[DentistryDocumentController.createDocument] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar documento odontológico.",
      });
    }
  }

  /**
   * DELETE /api/organizations/:id/dentistry/documents/:documentId
   * Elimina una ficha de documento verificando aislamiento tenant y limpiando archivo físico.
   */
  public static async deleteDocument(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const documentId = parseInt(String(req.params.documentId), 10);
      if (isNaN(documentId)) {
        return res.status(400).json({ success: false, error: "ID de documento inválido." });
      }

      const doc = await DentistryDocumentService.getDocumentById(org.id, documentId).catch(() => null);

      const result = await DentistryDocumentService.deleteDocument(org.id, documentId);

      if (doc?.fileUrl) {
        await DentistryStorageService.deleteFile(org.id, doc.patientId, doc.fileUrl).catch(() => {});
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("[DentistryDocumentController.deleteDocument] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al eliminar documento odontológico.",
      });
    }
  }
}

