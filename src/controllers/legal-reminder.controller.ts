import { Request, Response } from "express";
import { LegalReminderService } from "../services/legal-reminder.service";

export class LegalReminderController {
  /**
   * GET /api/organizations/:id/legal/reminders
   * Listar recordatorios de la organización
   */
  public static async getReminders(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: "ID de organización no válido" });
      }

      const {
        userId,
        legalCaseId,
        status,
        sourceType,
        sourceId,
        from,
        to,
      } = req.query;

      const filters: any = {};
      if (userId && !isNaN(Number(userId))) filters.userId = Number(userId);
      if (legalCaseId && !isNaN(Number(legalCaseId))) filters.legalCaseId = Number(legalCaseId);
      if (status) filters.status = String(status);
      if (sourceType) filters.sourceType = String(sourceType);
      if (sourceId && !isNaN(Number(sourceId))) filters.sourceId = Number(sourceId);
      if (from) filters.from = String(from);
      if (to) filters.to = String(to);

      const reminders = await LegalReminderService.getReminders(organizationId, filters);
      return res.status(200).json(reminders);
    } catch (error: any) {
      console.error("[LegalReminderController.getReminders] Error:", error);
      return res.status(400).json({ error: error.message || "Error al obtener recordatorios" });
    }
  }

  /**
   * POST /api/organizations/:id/legal/cases/:caseId/reminders
   * Crear recordatorio para un caso y evento específico
   */
  public static async createReminder(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      const legalCaseId = parseInt(String(req.params.caseId), 10);

      if (isNaN(organizationId) || isNaN(legalCaseId)) {
        return res.status(400).json({ error: "IDs de organización o caso no válidos" });
      }

      const authUserId = (req as any).user?.id ? Number((req as any).user.id) : null;
      const created = await LegalReminderService.createReminder(
        organizationId,
        legalCaseId,
        req.body,
        authUserId
      );

      return res.status(201).json(created);
    } catch (error: any) {
      console.error("[LegalReminderController.createReminder] Error:", error);
      return res.status(400).json({ error: error.message || "Error al crear recordatorio" });
    }
  }

  /**
   * PUT /api/organizations/:id/legal/cases/:caseId/reminders/:reminderId
   * Actualizar recordatorio existente
   */
  public static async updateReminder(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      const legalCaseId = parseInt(String(req.params.caseId), 10);
      const reminderId = parseInt(String(req.params.reminderId), 10);

      if (isNaN(organizationId) || isNaN(legalCaseId) || isNaN(reminderId)) {
        return res.status(400).json({ error: "Parámetros de ruta no válidos" });
      }

      const authUserId = (req as any).user?.id ? Number((req as any).user.id) : null;
      const updated = await LegalReminderService.updateReminder(
        organizationId,
        legalCaseId,
        reminderId,
        req.body,
        authUserId
      );

      return res.status(200).json(updated);
    } catch (error: any) {
      console.error("[LegalReminderController.updateReminder] Error:", error);
      return res.status(400).json({ error: error.message || "Error al actualizar recordatorio" });
    }
  }

  /**
   * POST /api/organizations/:id/legal/cases/:caseId/reminders/:reminderId/dismiss
   * Descartar recordatorio sin eliminación física
   */
  public static async dismissReminder(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      const legalCaseId = parseInt(String(req.params.caseId), 10);
      const reminderId = parseInt(String(req.params.reminderId), 10);

      if (isNaN(organizationId) || isNaN(legalCaseId) || isNaN(reminderId)) {
        return res.status(400).json({ error: "Parámetros de ruta no válidos" });
      }

      const authUserId = (req as any).user?.id ? Number((req as any).user.id) : null;
      const dismissed = await LegalReminderService.dismissReminder(
        organizationId,
        legalCaseId,
        reminderId,
        authUserId
      );

      return res.status(200).json(dismissed);
    } catch (error: any) {
      console.error("[LegalReminderController.dismissReminder] Error:", error);
      return res.status(400).json({ error: error.message || "Error al descartar recordatorio" });
    }
  }
}
