import { Request, Response } from "express";
import { DentistryConsentService } from "../services/dentistry-consent.service";
import { extractOrganizationId } from "../lib/organization.middleware";

export class DentistryConsentController {
  private static getOrgId(req: Request, res: Response): number | null {
    const org = (req as any).organization || res.locals.organization;
    if (org?.id) return Number(org.id);
    return extractOrganizationId(req);
  }

  private static getUserId(req: Request, res: Response): number | undefined {
    const user = (req as any).user || res.locals.user;
    if (user?.id) return Number(user.id);
    return undefined;
  }

  // =========================================================================
  // 1. PLANTILLAS DE CONSENTIMIENTO
  // =========================================================================

  public static async listTemplates(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

      const templates = await DentistryConsentService.listTemplates(orgId, { category, isActive });
      return res.status(200).json({ success: true, data: templates });
    } catch (error: any) {
      console.error("[DentistryConsentController.listTemplates] Error:", error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al listar plantillas de consentimiento.",
      });
    }
  }

  public static async getTemplateById(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const templateId = parseInt(String(req.params.templateId), 10);
      if (isNaN(templateId)) {
        return res.status(400).json({ success: false, error: "ID de plantilla inválido." });
      }

      const template = await DentistryConsentService.getTemplateById(orgId, templateId);
      return res.status(200).json({ success: true, data: template });
    } catch (error: any) {
      console.error("[DentistryConsentController.getTemplateById] Error:", error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al obtener la plantilla de consentimiento.",
      });
    }
  }

  public static async createTemplate(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const template = await DentistryConsentService.createTemplate(orgId, req.body);
      return res.status(201).json({ success: true, data: template });
    } catch (error: any) {
      console.error("[DentistryConsentController.createTemplate] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al crear plantilla de consentimiento.",
      });
    }
  }

  public static async updateTemplate(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const templateId = parseInt(String(req.params.templateId), 10);
      if (isNaN(templateId)) {
        return res.status(400).json({ success: false, error: "ID de plantilla inválido." });
      }

      const template = await DentistryConsentService.updateTemplate(orgId, templateId, req.body);
      return res.status(200).json({ success: true, data: template });
    } catch (error: any) {
      console.error("[DentistryConsentController.updateTemplate] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al actualizar plantilla de consentimiento.",
      });
    }
  }

  public static async deactivateTemplate(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const templateId = parseInt(String(req.params.templateId), 10);
      if (isNaN(templateId)) {
        return res.status(400).json({ success: false, error: "ID de plantilla inválido." });
      }

      const template = await DentistryConsentService.deactivateTemplate(orgId, templateId);
      return res.status(200).json({ success: true, data: template });
    } catch (error: any) {
      console.error("[DentistryConsentController.deactivateTemplate] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al desactivar plantilla de consentimiento.",
      });
    }
  }

  // =========================================================================
  // 2. CONSENTIMIENTOS INFORMADOS CLÍNICOS
  // =========================================================================

  public static async listConsents(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const rawPatientId = req.params.patientId || req.query.patientId;
      const patientId = rawPatientId ? parseInt(String(rawPatientId), 10) : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const treatmentPlanId = req.query.treatmentPlanId ? parseInt(String(req.query.treatmentPlanId), 10) : undefined;
      const appointmentId = req.query.appointmentId ? parseInt(String(req.query.appointmentId), 10) : undefined;

      const consents = await DentistryConsentService.listConsents(
        orgId,
        patientId && !isNaN(patientId) ? patientId : undefined,
        {
          status,
          treatmentPlanId: treatmentPlanId && !isNaN(treatmentPlanId) ? treatmentPlanId : undefined,
          appointmentId: appointmentId && !isNaN(appointmentId) ? appointmentId : undefined,
        }
      );

      return res.status(200).json({ success: true, data: consents });
    } catch (error: any) {
      console.error("[DentistryConsentController.listConsents] Error:", error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al listar consentimientos.",
      });
    }
  }

  public static async getConsentById(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const consentId = parseInt(String(req.params.consentId), 10);
      if (isNaN(consentId)) {
        return res.status(400).json({ success: false, error: "ID de consentimiento inválido." });
      }

      const consent = await DentistryConsentService.getConsentById(orgId, consentId);
      return res.status(200).json({ success: true, data: consent });
    } catch (error: any) {
      console.error("[DentistryConsentController.getConsentById] Error:", error);
      const statusCode = error.statusCode || 404;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Consentimiento no encontrado.",
      });
    }
  }

  public static async createConsent(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const rawPatientId = req.params.patientId || req.body.patientId;
      const patientId = rawPatientId ? parseInt(String(rawPatientId), 10) : undefined;
      const userId = DentistryConsentController.getUserId(req, res);

      const payload = {
        ...req.body,
        patientId: patientId || req.body.patientId,
      };

      const consent = await DentistryConsentService.createConsent(orgId, payload, userId);
      return res.status(201).json({ success: true, data: consent });
    } catch (error: any) {
      console.error("[DentistryConsentController.createConsent] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al registrar consentimiento en borrador.",
      });
    }
  }

  public static async updateConsentDraft(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const consentId = parseInt(String(req.params.consentId), 10);
      if (isNaN(consentId)) {
        return res.status(400).json({ success: false, error: "ID de consentimiento inválido." });
      }

      const consent = await DentistryConsentService.updateConsentDraft(orgId, consentId, req.body);
      return res.status(200).json({ success: true, data: consent });
    } catch (error: any) {
      console.error("[DentistryConsentController.updateConsentDraft] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al actualizar borrador de consentimiento.",
      });
    }
  }

  public static async issueConsent(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const consentId = parseInt(String(req.params.consentId), 10);
      if (isNaN(consentId)) {
        return res.status(400).json({ success: false, error: "ID de consentimiento inválido." });
      }

      const userId = DentistryConsentController.getUserId(req, res);
      const professionalName = req.body?.professionalName;

      const consent = await DentistryConsentService.issueConsent(orgId, consentId, userId, professionalName);
      return res.status(200).json({ success: true, data: consent });
    } catch (error: any) {
      console.error("[DentistryConsentController.issueConsent] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al emitir consentimiento informado.",
      });
    }
  }

  public static async signConsent(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const consentId = parseInt(String(req.params.consentId), 10);
      if (isNaN(consentId)) {
        return res.status(400).json({ success: false, error: "ID de consentimiento inválido." });
      }

      const consent = await DentistryConsentService.signConsent(orgId, consentId, req.body);
      return res.status(200).json({ success: true, data: consent });
    } catch (error: any) {
      console.error("[DentistryConsentController.signConsent] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al registrar la firma del consentimiento.",
      });
    }
  }

  public static async cancelConsent(req: Request, res: Response) {
    try {
      const orgId = DentistryConsentController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const consentId = parseInt(String(req.params.consentId), 10);
      if (isNaN(consentId)) {
        return res.status(400).json({ success: false, error: "ID de consentimiento inválido." });
      }

      const { reason } = req.body;
      const consent = await DentistryConsentService.cancelConsent(orgId, consentId, reason);
      return res.status(200).json({ success: true, data: consent });
    } catch (error: any) {
      console.error("[DentistryConsentController.cancelConsent] Error:", error);
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al cancelar consentimiento.",
      });
    }
  }
}
