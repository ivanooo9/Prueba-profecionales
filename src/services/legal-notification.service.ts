import { db } from "../lib/db";

export interface LegalNotificationFilters {
  status?: "UNREAD" | "READ" | "DISMISSED" | string;
  limit?: number;
  offset?: number;
}

export class LegalNotificationService {
  /**
   * Obtiene las notificaciones del usuario autenticado en la organización especificada.
   * Privacidad estricta: sólo retorna notificaciones asignadas a 'userId'.
   * 100% de sólo lectura (sin efectos secundarios ni mutaciones).
   */
  public static async getNotifications(
    organizationId: number,
    userId: number,
    filters: LegalNotificationFilters = {}
  ) {
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new Error("ID de organización no válido.");
    }
    if (!userId || isNaN(userId) || userId <= 0) {
      throw new Error("ID de usuario no válido.");
    }

    const where: any = {
      organizationId,
      userId,
    };

    if (filters.status && filters.status !== "todos" && filters.status !== "ALL") {
      const allowed = ["UNREAD", "READ", "DISMISSED"];
      const upperStatus = filters.status.toUpperCase();
      if (allowed.includes(upperStatus)) {
        where.status = upperStatus;
      }
    }

    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const offset = Math.max(Number(filters.offset) || 0, 0);

    const [items, total] = await Promise.all([
      db.legalNotification.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
        include: {
          legalCase: {
            select: {
              id: true,
              internalCaseNumber: true,
              title: true,
              client: { select: { id: true, name: true } },
            },
          },
          reminder: {
            select: {
              id: true,
              sourceType: true,
              sourceId: true,
              remindAt: true,
              status: true,
            },
          },
        },
      }),
      db.legalNotification.count({ where }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        organizationId: n.organizationId,
        userId: n.userId,
        legalCaseId: n.legalCaseId,
        caseNumber: n.legalCase?.internalCaseNumber || "",
        caseTitle: n.legalCase?.title || "",
        clientName: n.legalCase?.client?.name || "",
        reminderId: n.reminderId,
        type: n.type,
        title: n.title,
        message: n.message,
        status: n.status,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt ? n.readAt.toISOString() : null,
        dismissedAt: n.dismissedAt ? n.dismissedAt.toISOString() : null,
        sourceType: n.reminder?.sourceType || n.type,
        sourceId: n.reminder?.sourceId || null,
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Obtiene el conteo exacto de notificaciones no leídas (UNREAD) del usuario en la organización.
   * Ejecuta query COUNT real en base de datos. 100% de sólo lectura.
   */
  public static async getUnreadCount(
    organizationId: number,
    userId: number
  ): Promise<number> {
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new Error("ID de organización no válido.");
    }
    if (!userId || isNaN(userId) || userId <= 0) {
      throw new Error("ID de usuario no válido.");
    }

    return await db.legalNotification.count({
      where: {
        organizationId,
        userId,
        status: "UNREAD",
      },
    });
  }

  /**
   * Marca una notificación como leída (READ).
   * Asigna readAt una sola vez. Ejecuciones repetidas son 100% idempotentes y
   * preservan el readAt original.
   * Rechaza accesos cross-tenant y cross-user.
   */
  public static async markAsRead(
    organizationId: number,
    userId: number,
    notificationId: number
  ) {
    if (!notificationId || isNaN(notificationId) || notificationId <= 0) {
      throw new Error("ID de notificación no válido.");
    }

    const existing = await db.legalNotification.findFirst({
      where: {
        id: notificationId,
        organizationId,
        userId,
      },
    });

    if (!existing) {
      throw new Error("Notificación no encontrada o no pertenece al usuario autenticado.");
    }

    // Idempotencia: si ya estaba leída, retornar sin alterar readAt original
    if (existing.status === "READ") {
      return existing;
    }

    return await db.legalNotification.update({
      where: { id: notificationId },
      data: {
        status: "READ",
        readAt: existing.readAt || new Date(),
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Descarta una notificación (DISMISSED).
   * Asigna dismissedAt. Cero eliminación física en base de datos.
   * Ejecuciones repetidas son 100% idempotentes.
   * Rechaza accesos cross-tenant y cross-user.
   */
  public static async dismissNotification(
    organizationId: number,
    userId: number,
    notificationId: number
  ) {
    if (!notificationId || isNaN(notificationId) || notificationId <= 0) {
      throw new Error("ID de notificación no válido.");
    }

    const existing = await db.legalNotification.findFirst({
      where: {
        id: notificationId,
        organizationId,
        userId,
      },
    });

    if (!existing) {
      throw new Error("Notificación no encontrada o no pertenece al usuario autenticado.");
    }

    // Idempotencia: si ya estaba descartada, retornar sin alterar dismissedAt
    if (existing.status === "DISMISSED") {
      return existing;
    }

    return await db.legalNotification.update({
      where: { id: notificationId },
      data: {
        status: "DISMISSED",
        dismissedAt: existing.dismissedAt || new Date(),
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
          },
        },
      },
    });
  }
}
