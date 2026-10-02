import { Request, Response } from "express";
import { LegalFinanceService } from "../services/legal-finance.service";

export class LegalFinanceController {
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

  private static getAgreementId(req: Request): number | null {
    const agreementId = req.params.agreementId;
    if (agreementId) {
      const parsed = parseInt(String(agreementId), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  private static getAuthUserId(req: Request, res: Response): number | undefined {
    const user = (req as any).user || res.locals.user;
    return user?.id ? Number(user.id) : undefined;
  }

  // -------------------------------------------------------------
  // GET: Listar acuerdos de honorarios de un caso
  // -------------------------------------------------------------
  public static async getFeeAgreements(req: Request, res: Response) {
    try {
      const orgId = LegalFinanceController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalFinanceController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const agreements = await LegalFinanceService.getFeeAgreements(orgId, caseId);
      return res.status(200).json({ success: true, data: agreements });
    } catch (error: any) {
      console.error("[LegalFinanceController.getFeeAgreements] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: error.message || "Error al obtener acuerdos de honorarios.",
      });
    }
  }

  // -------------------------------------------------------------
  // GET: Detalle de un acuerdo de honorarios
  // -------------------------------------------------------------
  public static async getFeeAgreementById(req: Request, res: Response) {
    try {
      const orgId = LegalFinanceController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalFinanceController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const agreementId = LegalFinanceController.getAgreementId(req);
      if (!agreementId) {
        return res.status(400).json({ success: false, error: "ID de acuerdo inválido." });
      }

      const agreement = await LegalFinanceService.getFeeAgreementById(orgId, caseId, agreementId);
      return res.status(200).json({ success: true, data: agreement });
    } catch (error: any) {
      console.error("[LegalFinanceController.getFeeAgreementById] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: error.message || "Error al obtener detalle del acuerdo.",
      });
    }
  }

  // -------------------------------------------------------------
  // POST: Crear nuevo acuerdo de honorarios
  // -------------------------------------------------------------
  public static async createFeeAgreement(req: Request, res: Response) {
    try {
      const orgId = LegalFinanceController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalFinanceController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const authUserId = LegalFinanceController.getAuthUserId(req, res);
      const created = await LegalFinanceService.createFeeAgreement(
        orgId,
        caseId,
        req.body,
        authUserId
      );

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error("[LegalFinanceController.createFeeAgreement] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 400).json({
        success: false,
        error: error.message || "Error al crear acuerdo de honorarios.",
      });
    }
  }

  // -------------------------------------------------------------
  // PUT: Actualizar acuerdo de honorarios
  // -------------------------------------------------------------
  public static async updateFeeAgreement(req: Request, res: Response) {
    try {
      const orgId = LegalFinanceController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalFinanceController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const agreementId = LegalFinanceController.getAgreementId(req);
      if (!agreementId) {
        return res.status(400).json({ success: false, error: "ID de acuerdo inválido." });
      }

      const updated = await LegalFinanceService.updateFeeAgreement(
        orgId,
        caseId,
        agreementId,
        req.body
      );

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error("[LegalFinanceController.updateFeeAgreement] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 400).json({
        success: false,
        error: error.message || "Error al actualizar acuerdo de honorarios.",
      });
    }
  }

  // -------------------------------------------------------------
  // POST: Registrar pago o abono (con control de concurrencia)
  // -------------------------------------------------------------
  public static async recordPayment(req: Request, res: Response) {
    try {
      const orgId = LegalFinanceController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalFinanceController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const agreementId = LegalFinanceController.getAgreementId(req);
      if (!agreementId) {
        return res.status(400).json({ success: false, error: "ID de acuerdo inválido." });
      }

      const authUserId = LegalFinanceController.getAuthUserId(req, res);
      const result = await LegalFinanceService.recordPayment(
        orgId,
        caseId,
        agreementId,
        req.body,
        authUserId
      );

      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error("[LegalFinanceController.recordPayment] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      const isConflict = error.message?.includes("supera el saldo");
      return res.status(isNotFound ? 404 : isConflict ? 409 : 400).json({
        success: false,
        error: error.message || "Error al registrar pago de honorarios.",
      });
    }
  }

  // -------------------------------------------------------------
  // GET: Listar pagos de un acuerdo
  // -------------------------------------------------------------
  public static async getPayments(req: Request, res: Response) {
    try {
      const orgId = LegalFinanceController.getOrgId(req, res);
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const caseId = LegalFinanceController.getCaseId(req);
      if (!caseId) {
        return res.status(400).json({ success: false, error: "ID de caso inválido." });
      }

      const agreementId = LegalFinanceController.getAgreementId(req);
      if (!agreementId) {
        return res.status(400).json({ success: false, error: "ID de acuerdo inválido." });
      }

      const payments = await LegalFinanceService.getPayments(orgId, caseId, agreementId);
      return res.status(200).json({ success: true, data: payments });
    } catch (error: any) {
      console.error("[LegalFinanceController.getPayments] Error:", error);
      const isNotFound = error.message?.includes("no encontrado");
      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: error.message || "Error al obtener pagos del acuerdo.",
      });
    }
  }
}
