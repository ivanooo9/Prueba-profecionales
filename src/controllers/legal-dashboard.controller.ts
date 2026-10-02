import { Request, Response } from "express";
import { LegalDashboardService } from "../services/legal-dashboard.service";

export class LegalDashboardController {
  /**
   * GET /api/organizations/:id/legal/dashboard
   * Obtiene métricas agregadas del dashboard para el despacho jurídico.
   */
  public static async getDashboard(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: "ID de organización no válido" });
      }

      const authUser = (req as any).user || res.locals.user;
      const userId = authUser?.id ? Number(authUser.id) : undefined;

      const dashboard = await LegalDashboardService.getDashboard(organizationId, userId);
      return res.status(200).json(dashboard);
    } catch (error: any) {
      console.error("[LegalDashboardController.getDashboard] Error:", error);
      return res.status(400).json({ error: error.message || "Error al obtener dashboard jurídico" });
    }
  }

  /**
   * GET /api/organizations/:id/legal/reports
   * Obtiene reporte operacional consolidado con soporte de filtros temporales (from / to).
   */
  public static async getReports(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: "ID de organización no válido" });
      }

      const { from, to } = req.query;

      const filters: { from?: string; to?: string } = {};
      if (from) filters.from = String(from);
      if (to) filters.to = String(to);

      const reports = await LegalDashboardService.getReports(organizationId, filters);
      return res.status(200).json(reports);
    } catch (error: any) {
      console.error("[LegalDashboardController.getReports] Error:", error);
      return res.status(400).json({ error: error.message || "Error al obtener reportes jurídicos" });
    }
  }
}
