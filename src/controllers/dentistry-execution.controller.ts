import { Request, Response } from "express";
import { DentistryExecutionService } from "../services/dentistry-execution.service";

export class DentistryExecutionController {
  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId/items/:itemId/executions
   * Lectura read-only idempotente del historial de ejecuciones de un ítem de tratamiento.
   */
  public static async getItemExecutions(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const planId = parseInt(String(req.params.planId), 10);
      const itemId = parseInt(String(req.params.itemId), 10);

      if (isNaN(patientId) || isNaN(planId) || isNaN(itemId)) {
        return res.status(400).json({
          success: false,
          error: "Identificadores de paciente, plan o ítem inválidos.",
        });
      }

      const executions = await DentistryExecutionService.getExecutions(
        org.id,
        patientId,
        planId,
        itemId
      );

      return res.status(200).json({ success: true, data: executions });
    } catch (error: any) {
      console.error("[DentistryExecutionController.getItemExecutions] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al obtener ejecuciones del procedimiento.",
      });
    }
  }

  /**
   * POST /api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId/items/:itemId/executions
   * Registrar una ejecución clínica atómica de un procedimiento.
   */
  public static async createItemExecution(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      const planId = parseInt(String(req.params.planId), 10);
      const itemId = parseInt(String(req.params.itemId), 10);

      if (isNaN(patientId) || isNaN(planId) || isNaN(itemId)) {
        return res.status(400).json({
          success: false,
          error: "Identificadores de paciente, plan o ítem inválidos.",
        });
      }

      // Derivar la identidad del profesional exclusivamente de la sesión autenticada
      const user = (req as any).user || res.locals.user;
      const performedByUserId = typeof user?.id === "number" ? user.id : null;

      // Whitelist estricta: NO se acepta organizationId, dentalRecordId, treatmentPlanId,
      // treatmentItemId, performedByUserId ni createdAt desde el body
      const { clinicalNotes, completed, performedAt, odontogramUpdate } = req.body;

      const result = await DentistryExecutionService.createExecution(
        org.id,
        patientId,
        planId,
        itemId,
        {
          clinicalNotes: typeof clinicalNotes === "string" ? clinicalNotes : null,
          completed: Boolean(completed),
          performedAt: performedAt || null,
          odontogramUpdate: odontogramUpdate || null,
        },
        performedByUserId
      );

      return res.status(201).json({
        success: true,
        message: "Ejecución clínica registrada exitosamente.",
        data: result,
      });
    } catch (error: any) {
      console.error("[DentistryExecutionController.createItemExecution] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar la ejecución clínica.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/executions
   * Historial cronológico general de ejecuciones clínicas del paciente.
   */
  public static async getPatientExecutions(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const executions = await DentistryExecutionService.getPatientExecutions(org.id, patientId);
      return res.status(200).json({ success: true, data: executions });
    } catch (error: any) {
      console.error("[DentistryExecutionController.getPatientExecutions] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al obtener historial del paciente.",
      });
    }
  }
}
