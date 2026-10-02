import { db } from "../lib/db";
import { emitToUser } from "../lib/socket";

export interface ProcessRemindersResult {
  processedCount: number;
  createdCount: number;
  notifications: any[];
}

export class LegalReminderProcessorService {
  /**
   * Procesa de forma idempotente y concurrente los recordatorios pendientes cuya
   * fecha 'remindAt' ya ha vencido (remindAt <= now).
   * Materializa a lo sumo 1 LegalNotification por cada LegalReminder (cardinalidad 1:1).
   * No altera 'remindAt' ni cambia automáticamente 'status' del LegalReminder.
   */
  public static async processDueLegalReminders(
    now: Date = new Date(),
    targetOrgId?: number,
    io?: any
  ): Promise<ProcessRemindersResult> {
    const where: any = {
      status: "PENDING",
      remindAt: { lte: now },
      userId: { not: null },
    };

    if (targetOrgId && !isNaN(targetOrgId) && targetOrgId > 0) {
      where.organizationId = targetOrgId;
    }

    // 1. Obtener recordatorios vencidos pendientes
    const dueReminders = await db.legalReminder.findMany({
      where,
      include: {
        notification: true,
        legalCase: {
          select: {
            id: true,
            internalCaseNumber: true,
            title: true,
            organizationId: true,
          },
        },
      },
      orderBy: {
        remindAt: "asc",
      },
    });

    const createdNotifications: any[] = [];
    let processedCount = 0;

    for (const reminder of dueReminders) {
      processedCount++;

      // 2. Si ya existe notificación para este recordatorio (1:1), omitir
      if (reminder.notification) {
        continue;
      }

      // 3. Validar destinatario: no asignar arbitrariamente si no hay userId
      if (!reminder.userId) {
        continue;
      }

      // 4. Validar que el usuario tenga membresía ACTIVE en la organización del caso
      const membership = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: reminder.organizationId,
            userId: reminder.userId,
          },
        },
      });

      if (!membership || membership.status !== "ACTIVE") {
        // Usuario desactivado, suspendido o cross-tenant: no generar alerta personal
        continue;
      }

      // 5. Construir snapshot textual descriptivo del aviso a partir del evento o recordatorio
      let title = "Recordatorio Procesal";
      let eventTitle: string | null = null;

      if (reminder.sourceType === "DEADLINE") {
        const d = await db.legalDeadline.findUnique({
          where: { id: reminder.sourceId },
          select: { title: true },
        });
        eventTitle = d?.title || null;
        title = eventTitle ? `Plazo: ${eventTitle}` : "Término o Plazo Procesal por Vencer";
      } else if (reminder.sourceType === "HEARING") {
        const h = await db.legalHearing.findUnique({
          where: { id: reminder.sourceId },
          select: { title: true },
        });
        eventTitle = h?.title || null;
        title = eventTitle ? `Audiencia: ${eventTitle}` : "Audiencia Judicial Próxima";
      } else if (reminder.sourceType === "TASK") {
        const t = await db.legalTask.findUnique({
          where: { id: reminder.sourceId },
          select: { title: true },
        });
        eventTitle = t?.title || null;
        title = eventTitle ? `Tarea: ${eventTitle}` : "Tarea Operativa Pendiente";
      }

      const message = reminder.message?.trim() || eventTitle || "Recordatorio procesal pendiente de atención en el expediente.";

      // 6. Materializar LegalNotification con protección de unicidad
      try {
        const created = await db.legalNotification.create({
          data: {
            organizationId: reminder.organizationId,
            userId: reminder.userId,
            legalCaseId: reminder.legalCaseId,
            reminderId: reminder.id,
            type: reminder.sourceType,
            title,
            message,
            status: "UNREAD",
          },
          include: {
            legalCase: {
              select: {
                id: true,
                internalCaseNumber: true,
                title: true,
              },
            },
          },
        });

        createdNotifications.push(created);

        // 7. Optimización UX: Notificar en tiempo real vía Socket.io si está disponible
        if (io) {
          try {
            emitToUser(io, reminder.userId, "legal_notification", {
              id: created.id,
              type: created.type,
              title: created.title,
              message: created.message,
              status: created.status,
              legalCaseId: created.legalCaseId,
              caseNumber: created.legalCase?.internalCaseNumber,
              createdAt: created.createdAt.toISOString(),
            });
          } catch (socketErr) {
            console.warn("[LegalReminderProcessor] Error emitiendo por Socket.io:", socketErr);
          }
        }
      } catch (err: any) {
        // P2002: unique constraint violation sobre reminderId (colisión controlada por concurrencia)
        if (err.code === "P2002") {
          continue;
        }
        console.error(`[LegalReminderProcessor] Error procesando reminder ${reminder.id}:`, err);
      }
    }

    return {
      processedCount,
      createdCount: createdNotifications.length,
      notifications: createdNotifications,
    };
  }
}
