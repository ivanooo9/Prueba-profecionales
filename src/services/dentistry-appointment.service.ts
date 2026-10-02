import { PrismaClient } from "@prisma/client";
import { ORGANIZATION_MEMBER_STATUS } from "../constants/organization.constants";

const prisma = new PrismaClient();

export interface AppointmentFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  patientId?: number;
  professionalUserId?: number;
  status?: string;
}

export interface CreateAppointmentInput {
  patientId: number;
  dentalRecordId?: number;
  professionalUserId: number;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  title?: string | null;
  reason?: string | null;
  type?: string;
  notes?: string | null;
  scheduledAt: string | Date;
  durationMinutes?: number;
  status?: string;
}

export interface UpdateAppointmentInput {
  scheduledAt?: string | Date;
  durationMinutes?: number;
  professionalUserId?: number;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  title?: string | null;
  reason?: string | null;
  type?: string;
  notes?: string | null;
  // Intentionally restricted fields: patientId, dentalRecordId, organizationId are immutable!
  patientId?: any;
  organizationId?: any;
  dentalRecordId?: any;
}

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["CONFIRMED", "IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const ALLOWED_PROFESSIONAL_ROLES = ["OWNER", "ADMIN", "PROFESSIONAL"];

export class DentistryAppointmentService {
  /**
   * Valida que el profesional pertenezca activamente a la organización y tenga un rol clínico autorizado.
   */
  public static async validateProfessional(
    organizationId: number,
    professionalUserId: number
  ): Promise<{ id: number; name: string; email: string }> {
    if (!professionalUserId || typeof professionalUserId !== "number" || professionalUserId <= 0) {
      const err = new Error("El profesional tratante (professionalUserId) es obligatorio para agendar una cita.");
      (err as any).statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { id: professionalUserId },
      include: {
        role: true,
        organizationMemberships: {
          where: { organizationId },
        },
      },
    });

    if (!user) {
      const err = new Error("El usuario profesional especificado no existe.");
      (err as any).statusCode = 404;
      throw err;
    }

    const membership = user.organizationMemberships[0];
    const isGlobalAdmin = user.role?.name === "ADMIN";

    if (!membership && !isGlobalAdmin) {
      const err = new Error("El usuario especificado no pertenece a esta organización.");
      (err as any).statusCode = 403;
      throw err;
    }

    if (membership) {
      if (membership.status !== ORGANIZATION_MEMBER_STATUS.ACTIVE) {
        const err = new Error("El profesional se encuentra inactivo o suspendido en la organización.");
        (err as any).statusCode = 403;
        throw err;
      }

      if (!ALLOWED_PROFESSIONAL_ROLES.includes(membership.role) && !isGlobalAdmin) {
        const err = new Error(
          `El usuario no tiene un rol autorizado para actuar como profesional clínico (Rol actual: ${membership.role}).`
        );
        (err as any).statusCode = 403;
        throw err;
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  /**
   * Obtiene la lista de profesionales autorizados de la organización para el selector de citas.
   */
  public static async listOrganizationDentists(organizationId: number) {
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
        role: { in: ALLOWED_PROFESSIONAL_ROLES },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    return members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }));
  }

  /**
   * Lista citas con filtros por fecha, rango, paciente, profesional y estado.
   */
  public static async listAppointments(
    organizationId: number,
    filters: AppointmentFilters = {}
  ) {
    const where: any = { organizationId };

    if (filters.patientId) {
      where.patientId = Number(filters.patientId);
    }

    if (filters.professionalUserId) {
      where.professionalUserId = Number(filters.professionalUserId);
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.date) {
      const startOfDay = new Date(`${filters.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${filters.date}T23:59:59.999Z`);
      where.scheduledAt = { gte: startOfDay, lte: endOfDay };
    } else if (filters.startDate || filters.endDate) {
      where.scheduledAt = {};
      if (filters.startDate) {
        where.scheduledAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.scheduledAt.lte = new Date(filters.endDate);
      }
    }

    return prisma.dentalAppointment.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true, idNumber: true, phone: true },
        },
        professionalUser: {
          select: { id: true, name: true, email: true },
        },
        treatmentPlan: {
          select: { id: true, title: true, status: true },
        },
        treatmentItem: {
          select: { id: true, procedureName: true, toothNumber: true, status: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }

  /**
   * Obtiene una cita por ID validando tenant.
   */
  public static async getAppointmentById(organizationId: number, appointmentId: number) {
    const appointment = await prisma.dentalAppointment.findFirst({
      where: { id: appointmentId, organizationId },
      include: {
        patient: {
          select: { id: true, name: true, idNumber: true, phone: true, email: true },
        },
        professionalUser: {
          select: { id: true, name: true, email: true },
        },
        treatmentPlan: {
          select: { id: true, title: true, status: true },
        },
        treatmentItem: {
          select: { id: true, procedureName: true, toothNumber: true, status: true },
        },
        treatmentExecutions: {
          select: { id: true, toothNumber: true, procedureName: true, performedAt: true },
        },
      },
    });

    if (!appointment) {
      const err = new Error("Cita odontológica no encontrada.");
      (err as any).statusCode = 404;
      throw err;
    }

    return appointment;
  }

  /**
   * Crea una nueva cita odontológica con protección contra solapamiento y concurrencia.
   */
  public static async createAppointment(
    organizationId: number,
    data: CreateAppointmentInput
  ) {
    // 1. Validar profesional obligatorio y autorizado
    const professional = await this.validateProfessional(organizationId, data.professionalUserId);

    // 2. Validar paciente perteneciente a la organización
    const patient = await prisma.patient.findFirst({
      where: { id: data.patientId, organizationId },
      include: { dentalRecord: true },
    });

    if (!patient) {
      const err = new Error("El paciente no existe o no pertenece a esta organización.");
      (err as any).statusCode = 404;
      throw err;
    }

    let dentalRecordId = data.dentalRecordId;
    if (!dentalRecordId) {
      if (patient.dentalRecord) {
        dentalRecordId = patient.dentalRecord.id;
      } else {
        // Auto-crear DentalRecord si no existe
        const newRecord = await prisma.dentalRecord.create({
          data: { organizationId, patientId: patient.id },
        });
        dentalRecordId = newRecord.id;
      }
    } else {
      // Validar que el dentalRecordId coincida con el paciente
      const record = await prisma.dentalRecord.findFirst({
        where: { id: dentalRecordId, patientId: patient.id, organizationId },
      });
      if (!record) {
        const err = new Error("El expediente dental no coincide con el paciente u organización.");
        (err as any).statusCode = 400;
        throw err;
      }
    }

    // 3. Validar consistencia de Plan e Item de tratamiento
    if (data.treatmentItemId && !data.treatmentPlanId) {
      const err = new Error("Debe especificar el plan de tratamiento al que pertenece el procedimiento.");
      (err as any).statusCode = 400;
      throw err;
    }

    if (data.treatmentPlanId) {
      const plan = await prisma.dentalTreatmentPlan.findFirst({
        where: {
          id: data.treatmentPlanId,
          dentalRecordId,
          organizationId,
        },
      });
      if (!plan) {
        const err = new Error("El plan de tratamiento no pertenece al expediente de este paciente.");
        (err as any).statusCode = 400;
        throw err;
      }

      if (data.treatmentItemId) {
        const item = await prisma.dentalTreatmentItem.findFirst({
          where: {
            id: data.treatmentItemId,
            treatmentPlanId: data.treatmentPlanId,
          },
        });
        if (!item) {
          const err = new Error("El procedimiento especificado no pertenece al plan de tratamiento seleccionado.");
          (err as any).statusCode = 400;
          throw err;
        }
      }
    }

    // 4. Validar duración (5 a 480 minutos)
    const durationMinutes = data.durationMinutes ?? 45;
    if (
      typeof durationMinutes !== "number" ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 480
    ) {
      const err = new Error("La duración de la cita debe ser un número entero entre 5 y 480 minutos.");
      (err as any).statusCode = 400;
      throw err;
    }

    // 5. Validar fecha (no en el pasado; tolerancia de 5 minutos)
    const scheduledAt = new Date(data.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      const err = new Error("Fecha y hora de cita inválida.");
      (err as any).statusCode = 400;
      throw err;
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (scheduledAt < fiveMinutesAgo) {
      const err = new Error("No se pueden agendar citas en fechas u horas pasadas.");
      (err as any).statusCode = 400;
      throw err;
    }

    const newStart = scheduledAt;
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

    // 6. Transacción interactiva con Advisory Lock a nivel de (organizationId, professionalUserId)
    return prisma.$transaction(async (tx) => {
      // Bloquear agenda del profesional ANTES de consultar solapamientos
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext('dental_schedule_' || ${organizationId}::text || '_' || ${data.professionalUserId}::text))
      `;

      // Comprobar solapamiento exacto: newStart < existingEnd AND newEnd > existingStart
      const overlaps: any[] = await tx.$queryRaw`
        SELECT id, "scheduledAt", "durationMinutes", status
        FROM "DentalAppointment"
        WHERE "organizationId" = ${organizationId}
          AND "professionalUserId" = ${data.professionalUserId}
          AND status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
          AND timezone('UTC', "scheduledAt") < ${newEnd}
          AND (timezone('UTC', "scheduledAt") + ("durationMinutes" || ' minutes')::interval) > ${newStart}
        LIMIT 1
      `;

      if (overlaps.length > 0) {
        const conflictErr = new Error("El profesional ya tiene una cita programada o en atención en ese horario.");
        (conflictErr as any).statusCode = 409;
        throw conflictErr;
      }

      // Crear registro de la cita
      return tx.dentalAppointment.create({
        data: {
          organizationId,
          dentalRecordId,
          patientId: data.patientId,
          professionalUserId: data.professionalUserId,
          dentistName: professional.name,
          treatmentPlanId: data.treatmentPlanId || null,
          treatmentItemId: data.treatmentItemId || null,
          title: data.title || null,
          reason: data.reason || null,
          type: data.type || "CONSULTATION",
          notes: data.notes || null,
          scheduledAt: newStart,
          durationMinutes,
          status: data.status || "SCHEDULED",
        },
        include: {
          patient: {
            select: { id: true, name: true, idNumber: true, phone: true },
          },
          professionalUser: {
            select: { id: true, name: true, email: true },
          },
          treatmentPlan: {
            select: { id: true, title: true, status: true },
          },
          treatmentItem: {
            select: { id: true, procedureName: true, toothNumber: true, status: true },
          },
        },
      });
    });
  }

  /**
   * Actualiza una cita odontológica con whitelist estricta y protección contra colisiones.
   */
  public static async updateAppointment(
    organizationId: number,
    appointmentId: number,
    updates: UpdateAppointmentInput
  ) {
    const existing = await prisma.dentalAppointment.findFirst({
      where: { id: appointmentId, organizationId },
    });

    if (!existing) {
      const err = new Error("Cita odontológica no encontrada.");
      (err as any).statusCode = 404;
      throw err;
    }

    // 1. Inmutabilidad estricta: patientId, organizationId, dentalRecordId
    if (updates.patientId !== undefined && Number(updates.patientId) !== existing.patientId) {
      const err = new Error("No se permite transferir una cita a otro paciente. Cancele la cita y programe una nueva.");
      (err as any).statusCode = 400;
      throw err;
    }

    if (updates.organizationId !== undefined && Number(updates.organizationId) !== existing.organizationId) {
      const err = new Error("No se permite alterar la organización de una cita.");
      (err as any).statusCode = 400;
      throw err;
    }

    if (updates.dentalRecordId !== undefined && Number(updates.dentalRecordId) !== existing.dentalRecordId) {
      const err = new Error("No se permite alterar el expediente de una cita.");
      (err as any).statusCode = 400;
      throw err;
    }

    // 2. Estados terminales: no admiten actualización
    if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(existing.status)) {
      const err = new Error(`No se puede modificar una cita con estado '${existing.status}'.`);
      (err as any).statusCode = 400;
      throw err;
    }

    // 3. Protección de cita en atención: IN_PROGRESS no puede reprogramarse ni reasignarse
    const attemptsReschedule =
      (updates.scheduledAt !== undefined && new Date(updates.scheduledAt).getTime() !== existing.scheduledAt.getTime()) ||
      (updates.durationMinutes !== undefined && updates.durationMinutes !== existing.durationMinutes) ||
      (updates.professionalUserId !== undefined && updates.professionalUserId !== existing.professionalUserId);

    if (existing.status === "IN_PROGRESS" && attemptsReschedule) {
      const err = new Error("No se puede reprogramar ni reasignar una cita que ya se encuentra en atención.");
      (err as any).statusCode = 400;
      throw err;
    }

    // 4. Validar profesional si cambia
    let targetProfessionalId = existing.professionalUserId;
    let dentistName = existing.dentistName;

    if (updates.professionalUserId !== undefined && updates.professionalUserId !== existing.professionalUserId) {
      const prof = await this.validateProfessional(organizationId, updates.professionalUserId);
      targetProfessionalId = prof.id;
      dentistName = prof.name;
    }

    // 5. Validar consistencia de Plan e Item si se actualizan
    const targetPlanId = updates.treatmentPlanId !== undefined ? updates.treatmentPlanId : existing.treatmentPlanId;
    const targetItemId = updates.treatmentItemId !== undefined ? updates.treatmentItemId : existing.treatmentItemId;

    if (targetItemId && !targetPlanId) {
      const err = new Error("Debe especificar el plan de tratamiento al que pertenece el procedimiento.");
      (err as any).statusCode = 400;
      throw err;
    }

    if (updates.treatmentPlanId !== undefined && updates.treatmentPlanId !== null) {
      const plan = await prisma.dentalTreatmentPlan.findFirst({
        where: { id: updates.treatmentPlanId, dentalRecordId: existing.dentalRecordId, organizationId },
      });
      if (!plan) {
        const err = new Error("El plan de tratamiento no pertenece al expediente de este paciente.");
        (err as any).statusCode = 400;
        throw err;
      }
    }

    if (updates.treatmentItemId !== undefined && updates.treatmentItemId !== null && targetPlanId) {
      const item = await prisma.dentalTreatmentItem.findFirst({
        where: { id: updates.treatmentItemId, treatmentPlanId: targetPlanId },
      });
      if (!item) {
        const err = new Error("El procedimiento especificado no pertenece al plan de tratamiento seleccionado.");
        (err as any).statusCode = 400;
        throw err;
      }
    }

    // 6. Validar duración si se actualiza
    let durationMinutes = existing.durationMinutes;
    if (updates.durationMinutes !== undefined) {
      if (
        typeof updates.durationMinutes !== "number" ||
        !Number.isInteger(updates.durationMinutes) ||
        updates.durationMinutes < 5 ||
        updates.durationMinutes > 480
      ) {
        const err = new Error("La duración de la cita debe ser un número entero entre 5 y 480 minutos.");
        (err as any).statusCode = 400;
        throw err;
      }
      durationMinutes = updates.durationMinutes;
    }

    // 7. Validar fecha si se actualiza
    let scheduledAt = existing.scheduledAt;
    if (updates.scheduledAt !== undefined) {
      const parsedDate = new Date(updates.scheduledAt);
      if (isNaN(parsedDate.getTime())) {
        const err = new Error("Fecha y hora de cita inválida.");
        (err as any).statusCode = 400;
        throw err;
      }

      // Solo si la fecha fue cambiada comprobamos que no sea pasada
      if (parsedDate.getTime() !== existing.scheduledAt.getTime()) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (parsedDate < fiveMinutesAgo) {
          const err = new Error("No se puede reprogramar una cita a una fecha u hora pasada.");
          (err as any).statusCode = 400;
          throw err;
        }
      }
      scheduledAt = parsedDate;
    }

    const newStart = scheduledAt;
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

    // 8. Si hubo cambios de horario o profesional, transaccionar con Advisory Lock y comprobar solapamientos
    if (attemptsReschedule) {
      return prisma.$transaction(async (tx) => {
        // Lock al profesional actual y al nuevo (si difieren)
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtext('dental_schedule_' || ${organizationId}::text || '_' || ${existing.professionalUserId}::text))
        `;
        if (targetProfessionalId !== existing.professionalUserId) {
          await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(hashtext('dental_schedule_' || ${organizationId}::text || '_' || ${targetProfessionalId}::text))
          `;
        }

        // Comprobar colisiones excluyendo la cita actual
        const overlaps: any[] = await tx.$queryRaw`
          SELECT id, "scheduledAt", "durationMinutes", status
          FROM "DentalAppointment"
          WHERE "organizationId" = ${organizationId}
            AND "professionalUserId" = ${targetProfessionalId}
            AND id != ${appointmentId}
            AND status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
            AND timezone('UTC', "scheduledAt") < ${newEnd}
            AND (timezone('UTC', "scheduledAt") + ("durationMinutes" || ' minutes')::interval) > ${newStart}
          LIMIT 1
        `;

        if (overlaps.length > 0) {
          const conflictErr = new Error("El profesional ya tiene una cita programada o en atención en ese horario.");
          (conflictErr as any).statusCode = 409;
          throw conflictErr;
        }

        return tx.dentalAppointment.update({
          where: { id: appointmentId },
          data: {
            scheduledAt: newStart,
            durationMinutes,
            professionalUserId: targetProfessionalId,
            dentistName,
            treatmentPlanId: targetPlanId,
            treatmentItemId: targetItemId,
            title: updates.title !== undefined ? updates.title : existing.title,
            reason: updates.reason !== undefined ? updates.reason : existing.reason,
            type: updates.type !== undefined ? updates.type : existing.type,
            notes: updates.notes !== undefined ? updates.notes : existing.notes,
          },
          include: {
            patient: { select: { id: true, name: true, idNumber: true, phone: true } },
            professionalUser: { select: { id: true, name: true, email: true } },
            treatmentPlan: { select: { id: true, title: true, status: true } },
            treatmentItem: { select: { id: true, procedureName: true, toothNumber: true, status: true } },
          },
        });
      });
    }

    // Si no hubo cambios de horario ni profesional, actualizar directamente los campos informativos
    return prisma.dentalAppointment.update({
      where: { id: appointmentId },
      data: {
        treatmentPlanId: targetPlanId,
        treatmentItemId: targetItemId,
        title: updates.title !== undefined ? updates.title : existing.title,
        reason: updates.reason !== undefined ? updates.reason : existing.reason,
        type: updates.type !== undefined ? updates.type : existing.type,
        notes: updates.notes !== undefined ? updates.notes : existing.notes,
      },
      include: {
        patient: { select: { id: true, name: true, idNumber: true, phone: true } },
        professionalUser: { select: { id: true, name: true, email: true } },
        treatmentPlan: { select: { id: true, title: true, status: true } },
        treatmentItem: { select: { id: true, procedureName: true, toothNumber: true, status: true } },
      },
    });
  }

  /**
   * Actualiza el estado de atención de una cita con máquina de estados estricta.
   * Regla de oro: Atender una cita (COMPLETED) NO crea DentalTreatmentExecution ni altera pagos/odontograma.
   */
  public static async updateAppointmentStatus(
    organizationId: number,
    appointmentId: number,
    newStatus: string,
    cancellationReason?: string
  ) {
    const existing = await prisma.dentalAppointment.findFirst({
      where: { id: appointmentId, organizationId },
    });

    if (!existing) {
      const err = new Error("Cita odontológica no encontrada.");
      (err as any).statusCode = 404;
      throw err;
    }

    if (existing.status === newStatus) {
      return existing;
    }

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      const err = new Error(
        `Transición de estado no permitida de '${existing.status}' a '${newStatus}'.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    if (newStatus === "CANCELLED") {
      if (!cancellationReason || !cancellationReason.trim()) {
        const err = new Error("El motivo de cancelación es obligatorio para cancelar una cita.");
        (err as any).statusCode = 400;
        throw err;
      }

      return prisma.dentalAppointment.update({
        where: { id: appointmentId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: cancellationReason.trim(),
        },
        include: {
          patient: { select: { id: true, name: true, idNumber: true, phone: true } },
          professionalUser: { select: { id: true, name: true, email: true } },
          treatmentPlan: { select: { id: true, title: true, status: true } },
          treatmentItem: { select: { id: true, procedureName: true, toothNumber: true, status: true } },
        },
      });
    }

    return prisma.dentalAppointment.update({
      where: { id: appointmentId },
      data: {
        status: newStatus,
      },
      include: {
        patient: { select: { id: true, name: true, idNumber: true, phone: true } },
        professionalUser: { select: { id: true, name: true, email: true } },
        treatmentPlan: { select: { id: true, title: true, status: true } },
        treatmentItem: { select: { id: true, procedureName: true, toothNumber: true, status: true } },
      },
    });
  }

  /**
   * Cancelación formal con motivo obligatorio.
   */
  public static async cancelAppointment(
    organizationId: number,
    appointmentId: number,
    cancellationReason: string
  ) {
    return this.updateAppointmentStatus(organizationId, appointmentId, "CANCELLED", cancellationReason);
  }
}
