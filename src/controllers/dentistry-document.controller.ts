import { Request, Response } from "express";
import { DentistryDocumentService } from "../services/dentistry-document.service";

export class DentistryDocumentController {
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
   * POST /api/organizations/:id/dentistry/patients/:patientId/documents
   * Registra una nueva ficha de documento (radiografía, foto, consentimiento, etc.).
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

      const {
        title,
        type,
        date,
        description,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        treatmentPlanId,
        treatmentItemId,
        executionId,
      } = req.body;

      const doc = await DentistryDocumentService.createDocument(
        org.id,
        patientId,
        {
          title,
          type,
          date,
          description,
          fileName,
          fileUrl,
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
   * Elimina una ficha de documento verificando aislamiento tenant.
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

      const result = await DentistryDocumentService.deleteDocument(org.id, documentId);

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
