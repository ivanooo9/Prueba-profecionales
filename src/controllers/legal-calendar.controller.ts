import { Request, Response } from "express";
import { LegalCalendarService } from "../services/legal-calendar.service";

export class LegalCalendarController {
  /**
   * GET /api/organizations/:id/legal/calendar
   * Proyección unificada del calendario jurídico de la organización
   */
  public static async getCalendar(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: "ID de organización no válido" });
      }

      const {
        from,
        to,
        type,
        legalCaseId,
        responsibleUserId,
        status,
      } = req.query;

      const filters: any = {};
      if (from) filters.from = String(from);
      if (to) filters.to = String(to);
      if (type) filters.type = String(type);
      if (legalCaseId && !isNaN(Number(legalCaseId))) filters.legalCaseId = Number(legalCaseId);
      if (responsibleUserId && !isNaN(Number(responsibleUserId))) filters.responsibleUserId = Number(responsibleUserId);
      if (status) filters.status = String(status);

      const entries = await LegalCalendarService.getCalendar(organizationId, filters);
      return res.status(200).json(entries);
    } catch (error: any) {
      console.error("[LegalCalendarController.getCalendar] Error:", error);
      return res.status(400).json({ error: error.message || "Error al obtener calendario jurídico" });
    }
  }
}
