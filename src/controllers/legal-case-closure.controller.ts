import { Request, Response } from "express";
import { LegalCaseClosureService } from "../services/legal-case-closure.service";

export class LegalCaseClosureController {
  private static getOrgId(req: Request, res: Response): number | null {
    const org = (req as any).organization || (res.locals as any)?.organization;
    if (org?.id) return org.id;

    const paramId = req.params.id || req.params.organizationId || req.params.orgId;
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

  private static getAuthUserId(req: Request, res: Response): number | undefined {
    const user = (req as any).user || (res.locals as any)?.user;
    return user?.id ? Number(user.id) : undefined;
  }

  public static async getClosureCheck(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = LegalCaseClosureController.getOrgId(req, res);
      const caseId = LegalCaseClosureController.getCaseId(req);
      const authUserId = LegalCaseClosureController.getAuthUserId(req, res);

      if (!organizationId) {
        res.status(400).json({ success: false, error: "ID de organización no válido." });
        return;
      }
      if (!caseId) {
        res.status(400).json({ success: false, error: "ID de expediente no válido." });
        return;
      }

      const check = await LegalCaseClosureService.getClosureCheck(
        organizationId,
        caseId,
        authUserId
      );

      res.status(200).json({
        success: true,
        data: check,
        ...check,
      });
    } catch (error: any) {
      if (error.message?.includes("no encontrado")) {
        res.status(404).json({ success: false, error: error.message });
      } else {
        res.status(400).json({ success: false, error: error.message || "Error al verificar cierre del expediente." });
      }
    }
  }

  public static async closeCase(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = LegalCaseClosureController.getOrgId(req, res);
      const caseId = LegalCaseClosureController.getCaseId(req);
      const authUserId = LegalCaseClosureController.getAuthUserId(req, res);

      if (!organizationId) {
        res.status(400).json({ success: false, error: "ID de organización no válido." });
        return;
      }
      if (!caseId) {
        res.status(400).json({ success: false, error: "ID de expediente no válido." });
        return;
      }
      if (!authUserId) {
        res.status(401).json({ success: false, error: "Usuario no autenticado." });
        return;
      }

      const { reason, notes } = req.body || {};

      const result = await LegalCaseClosureService.closeCase(
        organizationId,
        caseId,
        { reason, notes },
        authUserId
      );

      res.status(200).json({
        ...result,
        message: result.alreadyClosed
          ? "El expediente ya se encontraba formalmente cerrado."
          : "Expediente formalmente cerrado con éxito.",
        data: result.case,
      });
    } catch (error: any) {
      if (error.message?.includes("no encontrado")) {
        res.status(404).json({ success: false, error: error.message });
      } else if (error.message?.includes("permisos") || error.message?.includes("membresía")) {
        res.status(403).json({ success: false, error: error.message });
      } else {
        res.status(400).json({ success: false, error: error.message || "Error al cerrar el expediente." });
      }
    }
  }

  public static async archiveCase(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = LegalCaseClosureController.getOrgId(req, res);
      const caseId = LegalCaseClosureController.getCaseId(req);
      const authUserId = LegalCaseClosureController.getAuthUserId(req, res);

      if (!organizationId) {
        res.status(400).json({ success: false, error: "ID de organización no válido." });
        return;
      }
      if (!caseId) {
        res.status(400).json({ success: false, error: "ID de expediente no válido." });
        return;
      }
      if (!authUserId) {
        res.status(401).json({ success: false, error: "Usuario no autenticado." });
        return;
      }

      const { reason, notes } = req.body || {};

      const result = await LegalCaseClosureService.archiveCase(
        organizationId,
        caseId,
        { reason, notes },
        authUserId
      );

      res.status(200).json({
        ...result,
        message: result.alreadyArchived
          ? "El expediente ya se encontraba archivado."
          : "Expediente archivado exitosamente.",
        data: result.case,
      });
    } catch (error: any) {
      if (error.message?.includes("no encontrado")) {
        res.status(404).json({ success: false, error: error.message });
      } else if (error.message?.includes("permisos") || error.message?.includes("membresía")) {
        res.status(403).json({ success: false, error: error.message });
      } else {
        res.status(400).json({ success: false, error: error.message || "Error al archivar el expediente." });
      }
    }
  }
}
