import { db } from "../lib/db";
import { Prisma } from "@prisma/client";

export interface ClosureCheckSummary {
  pendingTasksCount: number;
  pendingDeadlinesCount: number;
  upcomingHearingsCount: number;
  totalAgreedFees: number;
  totalPaidFees: number;
  outstandingBalance: number;
  hasPendingItems: boolean;
  hasFinancialBalance: boolean;
}

export interface ClosureCheckDTO {
  legalCaseId: number;
  caseNumber: string;
  title: string;
  currentStatus: string;
  canClose: boolean;
  canArchive: boolean;
  isClosed: boolean;
  isArchived: boolean;
  closedAt: string | null;
  closedByUserId: number | null;
  closureReason: string | null;
  closureNotes: string | null;
  archivedAt: string | null;
  archivedByUserId: number | null;
  archiveReason: string | null;
  summary: ClosureCheckSummary;
  warnings: string[];
  pendingTasks: Array<{
    id: number;
    title: string;
    status: string;
    dueDate: string;
    priority: string;
  }>;
  pendingDeadlines: Array<{
    id: number;
    title: string;
    status: string;
    deadlineAt: string;
    priority: string;
  }>;
  upcomingHearings: Array<{
    id: number;
    title: string;
    scheduledAt: string;
    hearingType: string;
    status: string;
  }>;
}

export interface CloseCaseInput {
  reason?: string;
  notes?: string;
}

export interface ArchiveCaseInput {
  reason?: string;
  notes?: string;
}

export class LegalCaseClosureService {
  /**
   * Realiza la auditoría previa al cierre (Closure Check) de un expediente jurídico.
   * Proyección 100% READ-ONLY que computa advertencias sin mutar la base de datos.
   */
  public static async getClosureCheck(
    organizationId: number,
    caseId: number,
    authUserId?: number
  ): Promise<ClosureCheckDTO> {
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new Error("ID de organización no válido.");
    }
    if (!caseId || isNaN(caseId) || caseId <= 0) {
      throw new Error("ID de expediente no válido.");
    }

    const legalCase = await db.legalCase.findFirst({
      where: {
        id: caseId,
        organizationId,
      },
      include: {
        tasks: {
          where: {
            organizationId,
            status: { notIn: ["Completada", "Cancelada"] },
          },
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            priority: true,
          },
          orderBy: { dueDate: "asc" },
        },
        deadlines: {
          where: {
            organizationId,
            status: { notIn: ["Cumplido"] },
          },
          select: {
            id: true,
            title: true,
            status: true,
            deadlineAt: true,
            priority: true,
          },
          orderBy: { deadlineAt: "asc" },
        },
        hearings: {
          where: {
            organizationId,
            status: "Programada",
          },
          select: {
            id: true,
            title: true,
            hearingType: true,
            status: true,
            scheduledAt: true,
          },
          orderBy: { scheduledAt: "asc" },
        },
        feeAgreements: {
          where: {
            organizationId,
            status: { not: "CANCELLED" },
          },
          select: {
            id: true,
            title: true,
            total: true,
            payments: {
              where: {
                organizationId,
                status: { notIn: ["CANCELLED", "REJECTED"] },
              },
              select: {
                amount: true,
              },
            },
          },
        },
      },
    });

    if (!legalCase) {
      throw new Error("Caso jurídico no encontrado en la organización.");
    }

    // Cálculo financiero del expediente
    let totalAgreedFees = 0;
    let totalPaidFees = 0;

    for (const agreement of legalCase.feeAgreements) {
      totalAgreedFees += typeof agreement.total === "number" ? agreement.total : 0;
      for (const payment of agreement.payments) {
        totalPaidFees += typeof payment.amount === "number" ? payment.amount : 0;
      }
    }

    totalAgreedFees = Math.round(totalAgreedFees * 100) / 100;
    totalPaidFees = Math.round(totalPaidFees * 100) / 100;
    const outstandingBalance = Math.round(Math.max(0, totalAgreedFees - totalPaidFees) * 100) / 100;

    // Advertencias operativas (No bloquean el cierre; son informativas)
    const warnings: string[] = [];

    if (legalCase.tasks.length > 0) {
      warnings.push(`Existen ${legalCase.tasks.length} tarea(s) pendiente(s) en el expediente.`);
    }

    if (legalCase.deadlines.length > 0) {
      warnings.push(`Existen ${legalCase.deadlines.length} término(s) o plazo(s) procesal(es) no cumplido(s).`);
    }

    if (legalCase.hearings.length > 0) {
      warnings.push(`Existen ${legalCase.hearings.length} audiencia(s) judicial(es) programada(s).`);
    }

    if (outstandingBalance > 0) {
      warnings.push(
        `El expediente registra un saldo pendiente de $${outstandingBalance.toFixed(
          2
        )} por honorarios acordados. La cobranza posterior continuará habilitada.`
      );
    }

    const isClosed = legalCase.status === "Cerrado";
    const isArchived = legalCase.status === "Archivado";
    const canClose = !isClosed && !isArchived;
    const canArchive = isClosed; // Regla canónica: Solo un caso CERRADO puede pasar a ARCHIVADO

    return {
      legalCaseId: legalCase.id,
      caseNumber: legalCase.internalCaseNumber,
      title: legalCase.title,
      currentStatus: legalCase.status,
      canClose,
      canArchive,
      isClosed,
      isArchived,
      closedAt: legalCase.closedAt ? legalCase.closedAt.toISOString() : null,
      closedByUserId: legalCase.closedByUserId,
      closureReason: legalCase.closureReason,
      closureNotes: legalCase.closureNotes,
      archivedAt: legalCase.archivedAt ? legalCase.archivedAt.toISOString() : null,
      archivedByUserId: legalCase.archivedByUserId,
      archiveReason: legalCase.archiveReason,
      summary: {
        pendingTasksCount: legalCase.tasks.length,
        pendingDeadlinesCount: legalCase.deadlines.length,
        upcomingHearingsCount: legalCase.hearings.length,
        totalAgreedFees,
        totalPaidFees,
        outstandingBalance,
        hasPendingItems:
          legalCase.tasks.length > 0 || legalCase.deadlines.length > 0 || legalCase.hearings.length > 0,
        hasFinancialBalance: outstandingBalance > 0,
      },
      warnings,
      pendingTasks: legalCase.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate.toISOString(),
        priority: t.priority,
      })),
      pendingDeadlines: legalCase.deadlines.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        deadlineAt: d.deadlineAt.toISOString(),
        priority: d.priority,
      })),
      upcomingHearings: legalCase.hearings.map((h) => ({
        id: h.id,
        title: h.title,
        scheduledAt: h.scheduledAt.toISOString(),
        hearingType: h.hearingType,
        status: h.status,
      })),
    };
  }

  /**
   * Cierra formalmente un expediente jurídico de manera explícita y transaccional.
   * Concurrency-safe mediante advisory locks. Idempotente ante re-ejecución.
   */
  public static async closeCase(
    organizationId: number,
    caseId: number,
    input: CloseCaseInput,
    authUserId: number
  ) {
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new Error("ID de organización no válido.");
    }
    if (!caseId || isNaN(caseId) || caseId <= 0) {
      throw new Error("ID de expediente no válido.");
    }
    if (!authUserId || isNaN(authUserId) || authUserId <= 0) {
      throw new Error("Usuario no autenticado o no válido.");
    }

    // Validación RBAC: el usuario debe ser miembro activo de la organización
    const member = await db.organizationMember.findFirst({
      where: {
        organizationId,
        userId: authUserId,
        status: "ACTIVE",
      },
    });

    if (!member) {
      throw new Error("No tienes permisos suficientes o membresía activa en esta organización.");
    }

    return await db.$transaction(async (tx) => {
      // Advisory Lock por caso para serializar cierres concurrentes
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('legal_case_close_' || ${caseId}::text))`
      );

      const existing = await tx.legalCase.findFirst({
        where: {
          id: caseId,
          organizationId,
        },
      });

      if (!existing) {
        throw new Error("Caso jurídico no encontrado en la organización.");
      }

      if (existing.status === "Archivado") {
        throw new Error("Un expediente archivado no puede ser cerrado directamente.");
      }

      // Idempotencia: si ya está cerrado, retornar de forma segura sin duplicar actividades
      if (existing.status === "Cerrado") {
        return {
          success: true,
          alreadyClosed: true,
          case: existing,
        };
      }

      const now = new Date();
      const closureReason = input.reason?.trim() || "Cierre ordinario de causa";
      const closureNotes = input.notes?.trim() || null;

      // Actualizar estado del caso
      const updatedCase = await tx.legalCase.update({
        where: { id: caseId },
        data: {
          status: "Cerrado",
          closedAt: now,
          closedByUserId: authUserId,
          closureReason,
          closureNotes,
        },
      });

      // Asentar actividad formal de cierre en la bitácora del expediente
      await tx.legalCaseActivity.create({
        data: {
          organizationId,
          legalCaseId: caseId,
          type: "CIERRE",
          title: "Cierre formal del expediente",
          description: `Expediente cerrado formalmente. Motivo: ${closureReason}${
            closureNotes ? `. Notas: ${closureNotes}` : ""
          }`,
          occurredAt: now,
          createdByUserId: authUserId,
        },
      });

      return {
        success: true,
        alreadyClosed: false,
        case: updatedCase,
      };
    });
  }

  /**
   * Archiva un expediente jurídico formalmente cerrado.
   * Regla de transición estricta: CLOSED -> ARCHIVED únicamente.
   * Concurrency-safe e idempotente. Cero borrado físico.
   */
  public static async archiveCase(
    organizationId: number,
    caseId: number,
    input: ArchiveCaseInput,
    authUserId: number
  ) {
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new Error("ID de organización no válido.");
    }
    if (!caseId || isNaN(caseId) || caseId <= 0) {
      throw new Error("ID de expediente no válido.");
    }
    if (!authUserId || isNaN(authUserId) || authUserId <= 0) {
      throw new Error("Usuario no autenticado o no válido.");
    }

    const member = await db.organizationMember.findFirst({
      where: {
        organizationId,
        userId: authUserId,
        status: "ACTIVE",
      },
    });

    if (!member) {
      throw new Error("No tienes permisos suficientes o membresía activa en esta organización.");
    }

    return await db.$transaction(async (tx) => {
      // Advisory Lock por caso para serializar archivados concurrentes
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('legal_case_archive_' || ${caseId}::text))`
      );

      const existing = await tx.legalCase.findFirst({
        where: {
          id: caseId,
          organizationId,
        },
      });

      if (!existing) {
        throw new Error("Caso jurídico no encontrado en la organización.");
      }

      // Regla de transición obligatoria: ACTIVE -> ARCHIVED = REJECT
      if (existing.status !== "Cerrado" && existing.status !== "Archivado") {
        throw new Error(
          `El expediente debe estar formalmente cerrado antes de poder ser archivado (Estado actual: '${existing.status}').`
        );
      }

      // Idempotencia: si ya está archivado, retornar de forma segura
      if (existing.status === "Archivado") {
        return {
          success: true,
          alreadyArchived: true,
          case: existing,
        };
      }

      const now = new Date();
      const archiveReason = input.reason?.trim() || "Archivado definitivo de causa";

      const updatedCase = await tx.legalCase.update({
        where: { id: caseId },
        data: {
          status: "Archivado",
          archivedAt: now,
          archivedByUserId: authUserId,
          archiveReason,
        },
      });

      // Asentar actividad formal de archivado en la bitácora
      await tx.legalCaseActivity.create({
        data: {
          organizationId,
          legalCaseId: caseId,
          type: "ARCHIVADO",
          title: "Archivado formal del expediente",
          description: `Expediente archivado en archivo definitivo. Motivo: ${archiveReason}`,
          occurredAt: now,
          createdByUserId: authUserId,
        },
      });

      return {
        success: true,
        alreadyArchived: false,
        case: updatedCase,
      };
    });
  }
}
