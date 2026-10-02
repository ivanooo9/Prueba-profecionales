import { Request, Response } from "express";
import multer from "multer";
import { LegalDocumentService } from "../services/legal-document.service";

// Configuración de Multer en memoria para procesamiento de archivos en backend
export const legalUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

export class LegalDocumentController {
  private static getOrgId(req: Request, res: Response): number | null {
    const org = (req as any).organization || res.locals.organization;
    if (org?.id) return org.id;

    const paramId = req.params.id || req.params.organizationId;
    if (paramId) {
      const parsed = parseInt(String(paramId), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  private static getCaseId(req: Request): number | null {
    const caseId = req.params.caseId;
    if (caseId) {
      const parsed = parseInt(String(caseId), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  private static getDocumentId(req: Request): number | null {
    const docId = req.params.documentId || req.params.docId;
    if (docId) {
      const parsed = parseInt(String(docId), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  private static getVersionId(req: Request): number | null {
    const versionId = req.params.versionId;
    if (versionId) {
      const parsed = parseInt(String(versionId), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  private static getAuthUserId(req: Request, res: Response): number | undefined {
    const user = (req as any).user || res.locals.user;
    return user?.id ? Number(user.id) : undefined;
  }

  private static extractFilePayload(req: Request): {
    originalName: string;
    mimeType: string;
    buffer: Buffer;
    notes?: string | null;
  } | null {
    // 1. Soporte para multipart/form-data vía req.file de multer
    if (req.file) {
      return {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        notes: req.body?.notes || null,
      };
    }

    // 2. Soporte para payload Base64 (API JSON / tests)
    const base64Data = req.body?.fileBase64 || req.body?.base64 || req.body?.fileContent;
    if (base64Data && typeof base64Data === "string") {
      const cleanBase64 = base64Data.includes(";base64,")
        ? base64Data.split(";base64,")[1]
        : base64Data;
      const buffer = Buffer.from(cleanBase64, "base64");
      const originalName = req.body?.fileName || req.body?.originalName || "documento.pdf";
      const mimeType = req.body?.mimeType || "application/pdf";
      return {
        originalName,
        mimeType,
        buffer,
        notes: req.body?.notes || null,
      };
    }

    // 3. Soporte para Buffer directo en caso de llamadas internas
    if (req.body?.buffer && Buffer.isBuffer(req.body.buffer)) {
      return {
        originalName: req.body?.fileName || req.body?.originalName || "documento.pdf",
        mimeType: req.body?.mimeType || "application/pdf",
        buffer: req.body.buffer,
        notes: req.body?.notes || null,
      };
    }

    return null;
  }

  // -------------------------------------------------------------
  // GET: Listar documentos de un caso
  // -------------------------------------------------------------
  public static async getDocuments(req: Request, res: Response) {
    try {
      const orgId = LegalDocumentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalDocumentController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de expediente no válido." });
      }

      const { status, documentType, search } = req.query;

      const documents = await LegalDocumentService.listDocuments(orgId, caseId, {
        status: status ? String(status) : undefined,
        documentType: documentType ? String(documentType) : undefined,
        search: search ? String(search) : undefined,
      });

      return res.status(200).json({ success: true, data: documents });
    } catch (error: any) {
      console.error("[LegalDocumentController.getDocuments] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: error.message || "Error al obtener documentos del expediente.",
      });
    }
  }

  // -------------------------------------------------------------
  // GET: Detalle de documento con todas sus versiones
  // -------------------------------------------------------------
  public static async getDocumentById(req: Request, res: Response) {
    try {
      const orgId = LegalDocumentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalDocumentController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de expediente no válido." });
      }

      const docId = LegalDocumentController.getDocumentId(req);
      if (!docId) {
        return res.status(400).json({ success: false, error: "ID de documento no válido." });
      }

      const document = await LegalDocumentService.getDocument(orgId, caseId, docId);
      return res.status(200).json({ success: true, data: document });
    } catch (error: any) {
      console.error("[LegalDocumentController.getDocumentById] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: error.message || "Error al obtener el documento.",
      });
    }
  }

  // -------------------------------------------------------------
  // POST: Crear documento y adjuntar versión 1
  // -------------------------------------------------------------
  public static async createDocument(req: Request, res: Response) {
    try {
      const orgId = LegalDocumentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalDocumentController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de expediente no válido." });
      }

      const filePayload = LegalDocumentController.extractFilePayload(req);
      if (!filePayload) {
        return res.status(400).json({
          success: false,
          error: "Debe adjuntar un archivo para crear el documento.",
        });
      }

      const authUserId = LegalDocumentController.getAuthUserId(req, res);
      const { title, documentType, description, status, notes } = req.body;

      if (notes && !filePayload.notes) {
        filePayload.notes = notes;
      }

      const created = await LegalDocumentService.createDocument(
        orgId,
        caseId,
        {
          title,
          documentType,
          description,
          status,
        },
        filePayload,
        authUserId
      );

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error("[LegalDocumentController.createDocument] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 400).json({
        success: false,
        error: error.message || "Error al registrar el documento jurídico.",
      });
    }
  }

  // -------------------------------------------------------------
  // PUT: Actualizar metadatos de un documento
  // -------------------------------------------------------------
  public static async updateDocument(req: Request, res: Response) {
    try {
      const orgId = LegalDocumentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalDocumentController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de expediente no válido." });
      }

      const docId = LegalDocumentController.getDocumentId(req);
      if (!docId) {
        return res.status(400).json({ success: false, error: "ID de documento no válido." });
      }

      const updated = await LegalDocumentService.updateDocument(orgId, caseId, docId, req.body);
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error("[LegalDocumentController.updateDocument] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 400).json({
        success: false,
        error: error.message || "Error al actualizar metadatos del documento.",
      });
    }
  }

  // -------------------------------------------------------------
  // POST: Añadir nueva versión a un documento (v2, v3, ...)
  // -------------------------------------------------------------
  public static async addVersion(req: Request, res: Response) {
    try {
      const orgId = LegalDocumentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalDocumentController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de expediente no válido." });
      }

      const docId = LegalDocumentController.getDocumentId(req);
      if (!docId) {
        return res.status(400).json({ success: false, error: "ID de documento no válido." });
      }

      const filePayload = LegalDocumentController.extractFilePayload(req);
      if (!filePayload) {
        return res.status(400).json({
          success: false,
          error: "Debe adjuntar un archivo para la nueva versión.",
        });
      }

      const authUserId = LegalDocumentController.getAuthUserId(req, res);
      const notes = req.body?.notes;
      if (notes && !filePayload.notes) {
        filePayload.notes = notes;
      }

      const version = await LegalDocumentService.addVersion(
        orgId,
        caseId,
        docId,
        filePayload,
        authUserId
      );

      return res.status(201).json({ success: true, data: version });
    } catch (error: any) {
      console.error("[LegalDocumentController.addVersion] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 400).json({
        success: false,
        error: error.message || "Error al añadir versión documental.",
      });
    }
  }

  // -------------------------------------------------------------
  // GET: Descarga o visualización protegida del archivo físico
  // -------------------------------------------------------------
  public static async downloadVersionFile(req: Request, res: Response) {
    try {
      const orgId = LegalDocumentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalDocumentController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de expediente no válido." });
      }

      const docId = LegalDocumentController.getDocumentId(req);
      if (!docId) {
        return res.status(400).json({ success: false, error: "ID de documento no válido." });
      }

      const versionId = LegalDocumentController.getVersionId(req);
      if (!versionId) {
        return res.status(400).json({ success: false, error: "ID de versión no válido." });
      }

      const fileInfo = await LegalDocumentService.getVersionFile(orgId, caseId, docId, versionId);

      res.setHeader("Content-Type", fileInfo.mimeType || "application/octet-stream");
      res.setHeader("Content-Length", fileInfo.fileSize);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(fileInfo.fileName)}"`
      );
      if (fileInfo.checksum) {
        res.setHeader("ETag", `"${fileInfo.checksum}"`);
      }

      return res.status(200).send(fileInfo.buffer);
    } catch (error: any) {
      console.error("[LegalDocumentController.downloadVersionFile] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 403).json({
        success: false,
        error: error.message || "Error al acceder al archivo confidencial.",
      });
    }
  }

  // -------------------------------------------------------------
  // POST / PUT: Archivar documento (trazabilidad legal sin borrado)
  // -------------------------------------------------------------
  public static async archiveDocument(req: Request, res: Response) {
    try {
      const orgId = LegalDocumentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalDocumentController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de expediente no válido." });
      }

      const docId = LegalDocumentController.getDocumentId(req);
      if (!docId) {
        return res.status(400).json({ success: false, error: "ID de documento no válido." });
      }

      const archived = await LegalDocumentService.archiveDocument(orgId, caseId, docId);
      return res.status(200).json({ success: true, data: archived });
    } catch (error: any) {
      console.error("[LegalDocumentController.archiveDocument] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 400).json({
        success: false,
        error: error.message || "Error al archivar el documento.",
      });
    }
  }
}
