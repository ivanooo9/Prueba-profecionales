import { Request, Response } from "express";
import { LegalNotificationService } from "../services/legal-notification.service";
import { LegalReminderProcessorService } from "../services/legal-reminder-processor.service";

export class LegalNotificationController {
  /**
   * GET /api/organizations/:id/legal/notifications
   * Listar notificaciones del usuario autenticado
   */
  public static async getNotifications(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: "ID de organización no válido" });
      }

      const authUser = (req as any).user || res.locals.user;
      const userId = Number(authUser?.id);
      if (!userId || isNaN(userId)) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }

      const { status, limit, offset } = req.query;

      const filters: any = {};
      if (status) filters.status = String(status);
      if (limit) filters.limit = Number(limit);
      if (offset) filters.offset = Number(offset);

      const result = await LegalNotificationService.getNotifications(
        organizationId,
        userId,
        filters
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("[LegalNotificationController.getNotifications] Error:", error);
      return res.status(400).json({ error: error.message || "Error al obtener notificaciones" });
    }
  }

  /**
   * GET /api/organizations/:id/legal/notifications/unread-count
   * Obtener conteo exacto de no leídas para el usuario autenticado
   */
  public static async getUnreadCount(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: "ID de organización no válido" });
      }

      const authUser = (req as any).user || res.locals.user;
      const userId = Number(authUser?.id);
      if (!userId || isNaN(userId)) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }

      const count = await LegalNotificationService.getUnreadCount(
        organizationId,
        userId
      );

      return res.status(200).json({ count });
    } catch (error: any) {
      console.error("[LegalNotificationController.getUnreadCount] Error:", error);
      return res.status(400).json({ error: error.message || "Error al obtener conteo de no leídas" });
    }
  }

  /**
   * POST /api/organizations/:id/legal/notifications/:notificationId/read
   * Marcar notificación como leída
   */
  public static async markAsRead(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      const notificationId = parseInt(String(req.params.notificationId), 10);

      if (isNaN(organizationId) || isNaN(notificationId)) {
        return res.status(400).json({ error: "IDs de organización o notificación no válidos" });
      }

      const authUser = (req as any).user || res.locals.user;
      const userId = Number(authUser?.id);
      if (!userId || isNaN(userId)) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }

      const updated = await LegalNotificationService.markAsRead(
        organizationId,
        userId,
        notificationId
      );

      return res.status(200).json(updated);
    } catch (error: any) {
      console.error("[LegalNotificationController.markAsRead] Error:", error);
      const statusCode = error.message?.includes("no encontrada") ? 404 : 400;
      return res.status(statusCode).json({ error: error.message || "Error al marcar como leída" });
    }
  }

  /**
   * POST /api/organizations/:id/legal/notifications/:notificationId/dismiss
   * Descartar notificación sin borrado físico
   */
  public static async dismissNotification(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      const notificationId = parseInt(String(req.params.notificationId), 10);

      if (isNaN(organizationId) || isNaN(notificationId)) {
        return res.status(400).json({ error: "IDs de organización o notificación no válidos" });
      }

      const authUser = (req as any).user || res.locals.user;
      const userId = Number(authUser?.id);
      if (!userId || isNaN(userId)) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }

      const updated = await LegalNotificationService.dismissNotification(
        organizationId,
        userId,
        notificationId
      );

      return res.status(200).json(updated);
    } catch (error: any) {
      console.error("[LegalNotificationController.dismissNotification] Error:", error);
      const statusCode = error.message?.includes("no encontrada") ? 404 : 400;
      return res.status(statusCode).json({ error: error.message || "Error al descartar notificación" });
    }
  }

  /**
   * POST /api/organizations/:id/legal/notifications/process
   * Procesar recordatorios vencidos manualmente (útil para tests y sincronización activa)
   */
  public static async processDueReminders(req: Request, res: Response) {
    try {
      const organizationId = parseInt(String(req.params.id), 10);
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: "ID de organización no válido" });
      }

      const io = req.app.get("io");
      const { now } = req.body;
      const targetDate = now ? new Date(now) : new Date();

      const result = await LegalReminderProcessorService.processDueLegalReminders(
        targetDate,
        organizationId,
        io
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("[LegalNotificationController.processDueReminders] Error:", error);
      return res.status(500).json({ error: error.message || "Error al procesar recordatorios vencidos" });
    }
  }
}
