import { db } from "../lib/db";
import { LegalCaseOperationsService } from "./legal-case-operations.service";

export interface CreateLegalReminderInput {
  sourceType: "TASK" | "DEADLINE" | "HEARING" | string;
  sourceId: number;
  remindAt: string | Date;
  message?: string | null;
  userId?: number | null;
}

export interface UpdateLegalReminderInput {
  remindAt?: string | Date;
  message?: string | null;
  userId?: number | null;
}

export interface LegalReminderFilters {
  userId?: number;
  legalCaseId?: number;
  status?: string;
  sourceType?: string;
  sourceId?: number;
  from?: string | Date;
  to?: string | Date;
}

export class LegalReminderService {
  /**
   * Crea un recordatorio persistente asociado a una entidad válida (Task, Deadline, Hearing)
   * del expediente jurídico especificado.
   */
  public static async createReminder(
    organizationId: number,
    legalCaseId: number,
    data: CreateLegalReminderInput,
    authUserId?: number | null
  ) {
    // 1. Validar existencia del caso en la organización
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    // 2. Validar sourceType estrictamente
    const allowedSourceTypes = ["TASK", "DEADLINE", "HEARING"];
    const normalizedSourceType = String(data.sourceType || "").toUpperCase();

    if (!allowedSourceTypes.includes(normalizedSourceType)) {
      throw new Error(
        `Tipo de fuente (sourceType) no válido: '${data.sourceType}'. Permitidos únicamente: TASK, DEADLINE, HEARING.`
      );
    }

    // 3. Validar sourceId numérico positivo
    const sourceId = Number(data.sourceId);
    if (!sourceId || isNaN(sourceId) || sourceId <= 0) {
      throw new Error("El ID de la entidad de origen (sourceId) es obligatorio y debe ser mayor a 0.");
    }

    // 4. Validar existencia y pertenencia estricta de la entidad de origen al caso y organización
    if (normalizedSourceType === "TASK") {
      const task = await db.legalTask.findFirst({
        where: {
          id: sourceId,
          organizationId,
          legalCaseId,
        },
      });
      if (!task) {
        throw new Error(
          `La tarea con ID ${sourceId} no encontrada o no pertenece al expediente ${legalCaseId} en esta organización.`
        );
      }
    } else if (normalizedSourceType === "DEADLINE") {
      const deadline = await db.legalDeadline.findFirst({
        where: {
          id: sourceId,
          organizationId,
          legalCaseId,
        },
      });
      if (!deadline) {
        throw new Error(
          `El plazo con ID ${sourceId} no encontrado o no pertenece al expediente ${legalCaseId} en esta organización.`
        );
      }
    } else if (normalizedSourceType === "HEARING") {
      const hearing = await db.legalHearing.findFirst({
        where: {
          id: sourceId,
          organizationId,
          legalCaseId,
        },
      });
      if (!hearing) {
        throw new Error(
          `La audiencia con ID ${sourceId} no encontrada o no pertenece al expediente ${legalCaseId} en esta organización.`
        );
      }
    }

    // 5. Validar remindAt: fecha válida y no en el pasado para nuevos recordatorios
    if (!data.remindAt) {
      throw new Error("La fecha y hora del recordatorio (remindAt) es obligatoria.");
    }

    const parsedRemindAt = new Date(data.remindAt);
    if (isNaN(parsedRemindAt.getTime())) {
      throw new Error("La fecha y hora del recordatorio (remindAt) no es una fecha válida.");
    }

    const now = Date.now();
    if (parsedRemindAt.getTime() < now) {
      throw new Error("No se puede programar un recordatorio con fecha u hora en el pasado (remindAt debe ser una fecha futura).");
    }

    // 6. Validar usuario destinatario si se especifica
    let targetUserId: number | null = null;
    if (data.userId) {
      const user = await db.user.findUnique({
        where: { id: Number(data.userId) },
      });
      if (!user) {
        throw new Error(`El usuario destinatario con ID ${data.userId} no existe.`);
      }
      targetUserId = user.id;
    } else if (authUserId) {
      targetUserId = authUserId;
    }

    // 7. Persistir LegalReminder
    const reminder = await db.legalReminder.create({
      data: {
        organizationId,
        legalCaseId,
        userId: targetUserId,
        sourceType: normalizedSourceType,
        sourceId,
        remindAt: parsedRemindAt,
        status: "PENDING",
        message: data.message ? data.message.trim() : null,
        createdByUserId: authUserId || null,
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return reminder;
  }

  /**
   * Obtiene la lista de recordatorios filtrados. Estrictamente READ-ONLY.
   */
  public static async getReminders(
    organizationId: number,
    filters: LegalReminderFilters = {}
  ) {
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new Error("ID de organización no válido.");
    }

    const where: any = { organizationId };

    if (filters.legalCaseId) {
      where.legalCaseId = filters.legalCaseId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status && filters.status !== "todos") {
      where.status = filters.status.toUpperCase();
    }

    if (filters.sourceType) {
      where.sourceType = filters.sourceType.toUpperCase();
    }

    if (filters.sourceId) {
      where.sourceId = filters.sourceId;
    }

    if (filters.from || filters.to) {
      where.remindAt = {};
      if (filters.from) {
        const fromDate = new Date(filters.from);
        if (!isNaN(fromDate.getTime())) where.remindAt.gte = fromDate;
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        if (!isNaN(toDate.getTime())) where.remindAt.lte = toDate;
      }
    }

    return await db.legalReminder.findMany({
      where,
      orderBy: {
        remindAt: "asc",
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Actualiza los datos de un recordatorio existente.
   */
  public static async updateReminder(
    organizationId: number,
    legalCaseId: number,
    reminderId: number,
    data: UpdateLegalReminderInput,
    _authUserId?: number | null
  ) {
    const existing = await db.legalReminder.findFirst({
      where: {
        id: reminderId,
        organizationId,
        legalCaseId,
      },
    });

    if (!existing) {
      throw new Error(
        `Recordatorio con ID ${reminderId} no encontrado para este expediente u organización.`
      );
    }

    const updatePayload: any = {};

    if (data.remindAt !== undefined) {
      const parsed = new Date(data.remindAt);
      if (isNaN(parsed.getTime())) {
        throw new Error("Fecha u hora del recordatorio no válida.");
      }
      updatePayload.remindAt = parsed;
    }

    if (data.message !== undefined) {
      updatePayload.message = data.message ? data.message.trim() : null;
    }

    if (data.userId !== undefined) {
      if (data.userId === null) {
        updatePayload.userId = null;
      } else {
        const user = await db.user.findUnique({
          where: { id: Number(data.userId) },
        });
        if (!user) {
          throw new Error(`Usuario con ID ${data.userId} no existe.`);
        }
        updatePayload.userId = user.id;
      }
    }

    return await db.legalReminder.update({
      where: { id: reminderId },
      data: updatePayload,
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Marca un recordatorio como descartado (DISMISSED) sin eliminación física.
   */
  public static async dismissReminder(
    organizationId: number,
    legalCaseId: number,
    reminderId: number,
    _authUserId?: number | null
  ) {
    const existing = await db.legalReminder.findFirst({
      where: {
        id: reminderId,
        organizationId,
        legalCaseId,
      },
    });

    if (!existing) {
      throw new Error(
        `Recordatorio con ID ${reminderId} no encontrado para este expediente u organización.`
      );
    }

    return await db.legalReminder.update({
      where: { id: reminderId },
      data: {
        status: "DISMISSED",
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
