import { Request, Response } from "express";
import { DentistryBudgetService } from "../services/dentistry-budget.service";

export class DentistryBudgetController {
  /**
   * Obtiene la lista de presupuestos formales del paciente (READ-ONLY).
   */
  public static async getBudgets(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const budgets = await DentistryBudgetService.getBudgets(org.id, patientId);
      return res.status(200).json({ success: true, data: budgets });
    } catch (error: any) {
      console.error("[DentistryBudgetController.getBudgets] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener presupuestos del paciente.",
      });
    }
  }

  /**
   * Obtiene el detalle de un presupuesto formal específico con desglose de pagos y balance.
   */
  public static async getBudgetById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const budgetId = parseInt(String(req.params.budgetId), 10);
      if (isNaN(patientId) || isNaN(budgetId)) {
        return res.status(400).json({ success: false, error: "Parámetros de ID inválidos." });
      }

      const budget = await DentistryBudgetService.getBudgetById(org.id, patientId, budgetId);
      return res.status(200).json({ success: true, data: budget });
    } catch (error: any) {
      console.error("[DentistryBudgetController.getBudgetById] Error:", error);
      const status = error.message?.includes("no encontrado") ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Error al obtener detalle del presupuesto.",
      });
    }
  }

  /**
   * Genera un nuevo presupuesto formal a partir de un plan de tratamiento existente.
   */
  public static async createBudgetFromPlan(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const planId = parseInt(String(req.params.planId), 10);
      if (isNaN(patientId) || isNaN(planId)) {
        return res.status(400).json({ success: false, error: "Parámetros de ID inválidos." });
      }

      const { title, discount, notes } = req.body;
      const budget = await DentistryBudgetService.createBudgetFromPlan(
        org.id,
        patientId,
        planId,
        {
          title,
          discount: typeof discount === "number" ? discount : Number(discount) || 0,
          notes,
        }
      );

      return res.status(201).json({
        success: true,
        message: "Presupuesto formal generado exitosamente.",
        data: budget,
      });
    } catch (error: any) {
      console.error("[DentistryBudgetController.createBudgetFromPlan] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al generar presupuesto desde el plan.",
      });
    }
  }

  /**
   * Actualiza el estado o notas/descuento de un presupuesto.
   */
  public static async updateBudget(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const budgetId = parseInt(String(req.params.budgetId), 10);
      if (isNaN(patientId) || isNaN(budgetId)) {
        return res.status(400).json({ success: false, error: "Parámetros de ID inválidos." });
      }

      const { status, notes, discount } = req.body;
      const updated = await DentistryBudgetService.updateBudget(
        org.id,
        patientId,
        budgetId,
        {
          status,
          notes,
          discount: discount !== undefined ? (typeof discount === "number" ? discount : Number(discount)) : undefined,
        }
      );

      return res.status(200).json({
        success: true,
        message: "Presupuesto actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[DentistryBudgetController.updateBudget] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar presupuesto.",
      });
    }
  }

  /**
   * Registra un pago o abono formal contra el presupuesto, garantizando integridad financiera ante concurrencia.
   */
  public static async recordPayment(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const budgetId = parseInt(String(req.params.budgetId), 10);
      if (isNaN(patientId) || isNaN(budgetId)) {
        return res.status(400).json({ success: false, error: "Parámetros de ID inválidos." });
      }

      const { amount, paymentMethod, reference, notes } = req.body;
      const parsedAmount = typeof amount === "number" ? amount : parseFloat(amount);

      const result = await DentistryBudgetService.recordPayment(
        org.id,
        patientId,
        budgetId,
        {
          amount: parsedAmount,
          paymentMethod,
          reference,
          notes,
        }
      );

      return res.status(201).json({
        success: true,
        message: "Abono / pago registrado exitosamente.",
        data: result,
      });
    } catch (error: any) {
      console.error("[DentistryBudgetController.recordPayment] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar pago.",
      });
    }
  }

  /**
   * Obtiene la lista de pagos de un presupuesto específico.
   */
  public static async getPayments(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const budgetId = parseInt(String(req.params.budgetId), 10);
      if (isNaN(patientId) || isNaN(budgetId)) {
        return res.status(400).json({ success: false, error: "Parámetros de ID inválidos." });
      }

      const payments = await DentistryBudgetService.getPayments(org.id, patientId, budgetId);
      return res.status(200).json({ success: true, data: payments });
    } catch (error: any) {
      console.error("[DentistryBudgetController.getPayments] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener historial de pagos.",
      });
    }
  }
}
