import { db } from "../lib/db";
import { LegalCalendarService, LegalCalendarEntry } from "./legal-calendar.service";

export interface LegalDashboardDTO {
  cases: {
    total: number;
    open: number;
    closed: number;
    byStatus: Array<{ status: string; count: number }>;
    byLegalArea: Array<{ legalArea: string; count: number }>;
  };
  workload: {
    pendingTasks: number;
    overdueTasks: number;
    upcomingDeadlines: number;
    overdueDeadlines: number;
    upcomingHearings: number;
  };
  finances: {
    agreedFees: number;
    collected: number;
    outstanding: number;
  };
  clients: {
    total: number;
    active: number;
  };
  upcoming: Array<{
    type: "TASK" | "DEADLINE" | "HEARING";
    id: number;
    legalCaseId: number;
    caseNumber: string;
    title: string;
    date: string;
    priority?: string;
  }>;
}

export interface LegalReportsDTO {
  period: {
    from: string | null;
    to: string | null;
  };
  cases: {
    totalStock: number;
    activeStock: number;
    closedStock: number;
    createdInPeriod: number;
    byStatus: Array<{ status: string; count: number }>;
    byLegalArea: Array<{ legalArea: string; count: number }>;
  };
  workload: {
    pendingTasks: number;
    overdueTasks: number;
    completedInPeriodTasks: number;
    pendingDeadlines: number;
    overdueDeadlines: number;
    totalHearingsInPeriod: number;
  };
  finances: {
    agreedInPeriod: number;
    collectedInPeriod: number;
    totalAgreedStock: number;
    totalCollectedStock: number;
    totalOutstandingStock: number;
  };
  clients: {
    totalStock: number;
    activeStock: number;
    createdInPeriod: number;
  };
  activitiesInPeriod: number;
}

export class LegalDashboardService {
  /**
   * Obtiene las métricas agregadas del dashboard del despacho jurídico.
   * Proyección 100% READ-ONLY sobre tablas canónicas en PostgreSQL.
   */
  public static async getDashboard(
    organizationId: number,
    authUserId?: number
  ): Promise<LegalDashboardDTO> {
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new Error("ID de organización no válido.");
    }

    const now = new Date();
    const upcomingDeadlinesEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Ventana canónica: 7 días

    // Consultas concurrentes altamente optimizadas sin transacciones de bloqueo
    const [
      casesGroupStatus,
      casesGroupArea,
      pendingTasksCount,
      overdueTasksCount,
      overdueDeadlinesCount,
      upcomingDeadlinesCount,
      upcomingHearingsCount,
      feeAgreements,
      payments,
      clientsTotal,
      clientsActive,
      calendarEntries,
    ] = await Promise.all([
      // 1. Casos por estado
      db.legalCase.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true },
      }),
      // 2. Casos por área legal
      db.legalCase.groupBy({
        by: ["legalArea"],
        where: { organizationId },
        _count: { _all: true },
      }),
      // 3. Tareas pendientes (no completadas ni canceladas)
      db.legalTask.count({
        where: {
          organizationId,
          status: { notIn: ["Completada", "Cancelada"] },
        },
      }),
      // 4. Tareas vencidas (no completadas ni canceladas con fecha pasada)
      db.legalTask.count({
        where: {
          organizationId,
          status: { notIn: ["Completada", "Cancelada"] },
          dueDate: { lt: now },
        },
      }),
      // 5. Plazos perentorios vencidos (no cumplidos con fecha límite pasada o estado Vencido)
      db.legalDeadline.count({
        where: {
          organizationId,
          status: { notIn: ["Cumplido"] },
          OR: [{ deadlineAt: { lt: now } }, { status: "Vencido" }],
        },
      }),
      // 6. Plazos próximos dentro de la ventana de 7 días
      db.legalDeadline.count({
        where: {
          organizationId,
          status: { notIn: ["Cumplido", "Vencido"] },
          deadlineAt: {
            gte: now,
            lte: upcomingDeadlinesEnd,
          },
        },
      }),
      // 7. Audiencias próximas activas (Programadas a futuro)
      db.legalHearing.count({
        where: {
          organizationId,
          status: "Programada",
          scheduledAt: { gte: now },
        },
      }),
      // 8. Acuerdos de honorarios válidos (no cancelados)
      db.legalFeeAgreement.findMany({
        where: {
          organizationId,
          status: { not: "CANCELLED" },
        },
        select: { total: true },
      }),
      // 9. Pagos cobrados válidos
      db.legalPayment.findMany({
        where: {
          organizationId,
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
        select: { amount: true },
      }),
      // 10. Clientes totales
      db.legalClient.count({
        where: { organizationId },
      }),
      // 11. Clientes activos
      db.legalClient.count({
        where: {
          organizationId,
          status: "activo",
        },
      }),
      // 12. Próximos eventos (Reutilizando la proyección canónica unificada de F5)
      LegalCalendarService.getCalendar(organizationId, { from: now }).catch(() => [] as LegalCalendarEntry[]),
    ]);

    // Cálculo y normalización de Casos
    const byStatus = casesGroupStatus.map((g) => ({
      status: g.status,
      count: g._count._all,
    }));

    const totalCases = casesGroupStatus.reduce((sum, g) => sum + g._count._all, 0);
    const closedCases = casesGroupStatus
      .filter((g) => g.status === "Cerrado" || g.status === "Archivado")
      .reduce((sum, g) => sum + g._count._all, 0);
    const openCases = Math.max(0, totalCases - closedCases);

    const byLegalArea = casesGroupArea.map((g) => ({
      legalArea: g.legalArea,
      count: g._count._all,
    }));

    // Cálculo de Finanzas canónico de F4
    const agreedFees = Math.round(
      feeAgreements.reduce((sum, a) => sum + (typeof a.total === "number" ? a.total : 0), 0) * 100
    ) / 100;

    const collected = Math.round(
      payments.reduce((sum, p) => sum + (typeof p.amount === "number" ? p.amount : 0), 0) * 100
    ) / 100;

    const outstanding = Math.round(Math.max(0, agreedFees - collected) * 100) / 100;

    // Próximos eventos (Upcoming): eventos activos futuros ordenados cronológicamente
    const upcomingFiltered = (calendarEntries || [])
      .filter((e) => {
        if (e.sourceType === "TASK") return e.status !== "Completada" && e.status !== "Cancelada";
        if (e.sourceType === "DEADLINE") return e.status !== "Cumplido";
        if (e.sourceType === "HEARING") return e.status === "Programada";
        return true;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 10)
      .map((entry) => ({
        type: entry.sourceType,
        id: entry.sourceId,
        legalCaseId: entry.legalCaseId,
        caseNumber: entry.caseNumber || `CAS-${entry.legalCaseId}`,
        title: entry.title,
        date: entry.startAt,
        priority: entry.priority || undefined,
      }));

    return {
      cases: {
        total: totalCases,
        open: openCases,
        closed: closedCases,
        byStatus,
        byLegalArea,
      },
      workload: {
        pendingTasks: pendingTasksCount,
        overdueTasks: overdueTasksCount,
        upcomingDeadlines: upcomingDeadlinesCount,
        overdueDeadlines: overdueDeadlinesCount,
        upcomingHearings: upcomingHearingsCount,
      },
      finances: {
        agreedFees,
        collected,
        outstanding,
      },
      clients: {
        total: clientsTotal,
        active: clientsActive,
      },
      upcoming: upcomingFiltered,
    };
  }

  /**
   * Obtiene los reportes operacionales y ejecutivos del despacho.
   * Diferencia con precisión métricas de Stock (acumuladas) vs Flow (ocurridas en el período).
   */
  public static async getReports(
    organizationId: number,
    filters: { from?: string | Date; to?: string | Date } = {}
  ): Promise<LegalReportsDTO> {
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new Error("ID de organización no válido.");
    }

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (filters.from) {
      const parsed = new Date(filters.from);
      if (!isNaN(parsed.getTime())) {
        fromDate = parsed;
      }
    }

    if (filters.to) {
      const parsed = new Date(filters.to);
      if (!isNaN(parsed.getTime())) {
        toDate = parsed;
      }
    }

    const now = new Date();

    // Rango temporal para métricas de Flow
    const flowRangeFilter: any = {};
    if (fromDate || toDate) {
      if (fromDate) flowRangeFilter.gte = fromDate;
      if (toDate) flowRangeFilter.lte = toDate;
    }

    const hasFlowFilter = Boolean(fromDate || toDate);

    const [
      // Stock Casos
      casesGroupStatus,
      casesGroupArea,
      casesCreatedInPeriod,
      // Workload
      pendingTasks,
      overdueTasks,
      completedInPeriodTasks,
      pendingDeadlines,
      overdueDeadlines,
      hearingsInPeriod,
      // Finanzas Stock
      allFeeAgreements,
      allPayments,
      // Finanzas Flow
      feeAgreementsInPeriod,
      paymentsInPeriod,
      // Clientes
      clientsTotal,
      clientsActive,
      clientsCreatedInPeriod,
      // Actividades
      activitiesInPeriod,
    ] = await Promise.all([
      // 1. Stock Casos por estado
      db.legalCase.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true },
      }),
      // 2. Stock Casos por área
      db.legalCase.groupBy({
        by: ["legalArea"],
        where: { organizationId },
        _count: { _all: true },
      }),
      // 3. Casos creados en el período (Flow)
      db.legalCase.count({
        where: {
          organizationId,
          ...(hasFlowFilter ? { createdAt: flowRangeFilter } : {}),
        },
      }),
      // 4. Tareas pendientes actuales (Stock)
      db.legalTask.count({
        where: {
          organizationId,
          status: { notIn: ["Completada", "Cancelada"] },
        },
      }),
      // 5. Tareas vencidas actuales (Stock derivado)
      db.legalTask.count({
        where: {
          organizationId,
          status: { notIn: ["Completada", "Cancelada"] },
          dueDate: { lt: now },
        },
      }),
      // 6. Tareas completadas en el período (Flow)
      db.legalTask.count({
        where: {
          organizationId,
          status: "Completada",
          ...(hasFlowFilter ? { updatedAt: flowRangeFilter } : {}),
        },
      }),
      // 7. Plazos pendientes actuales (Stock)
      db.legalDeadline.count({
        where: {
          organizationId,
          status: { notIn: ["Cumplido", "Vencido"] },
        },
      }),
      // 8. Plazos vencidos actuales (Stock derivado)
      db.legalDeadline.count({
        where: {
          organizationId,
          status: { notIn: ["Cumplido"] },
          OR: [{ deadlineAt: { lt: now } }, { status: "Vencido" }],
        },
      }),
      // 9. Audiencias celebradas o programadas en el período (Flow)
      db.legalHearing.count({
        where: {
          organizationId,
          ...(hasFlowFilter ? { scheduledAt: flowRangeFilter } : {}),
        },
      }),
      // 10. Total acuerdos stock
      db.legalFeeAgreement.findMany({
        where: {
          organizationId,
          status: { not: "CANCELLED" },
        },
        select: { total: true },
      }),
      // 11. Total cobros stock
      db.legalPayment.findMany({
        where: {
          organizationId,
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
        select: { amount: true },
      }),
      // 12. Honorarios acordados en período (Flow)
      db.legalFeeAgreement.findMany({
        where: {
          organizationId,
          status: { not: "CANCELLED" },
          ...(hasFlowFilter ? { createdAt: flowRangeFilter } : {}),
        },
        select: { total: true },
      }),
      // 13. Cobros recibidos en período (Flow usando paidAt canónico)
      db.legalPayment.findMany({
        where: {
          organizationId,
          status: { notIn: ["CANCELLED", "REJECTED"] },
          ...(hasFlowFilter ? { paidAt: flowRangeFilter } : {}),
        },
        select: { amount: true },
      }),
      // 14. Clientes totales (Stock)
      db.legalClient.count({
        where: { organizationId },
      }),
      // 15. Clientes activos (Stock)
      db.legalClient.count({
        where: {
          organizationId,
          status: "activo",
        },
      }),
      // 16. Clientes creados en período (Flow)
      db.legalClient.count({
        where: {
          organizationId,
          ...(hasFlowFilter ? { createdAt: flowRangeFilter } : {}),
        },
      }),
      // 17. Actuaciones registradas en período (Flow usando occurredAt)
      db.legalCaseActivity.count({
        where: {
          organizationId,
          ...(hasFlowFilter ? { occurredAt: flowRangeFilter } : {}),
        },
      }),
    ]);

    // Casos por estado
    const byStatus = casesGroupStatus.map((g) => ({
      status: g.status,
      count: g._count._all,
    }));

    const totalStock = casesGroupStatus.reduce((sum, g) => sum + g._count._all, 0);
    const closedStock = casesGroupStatus
      .filter((g) => g.status === "Cerrado" || g.status === "Archivado")
      .reduce((sum, g) => sum + g._count._all, 0);
    const activeStock = Math.max(0, totalStock - closedStock);

    // Casos por área
    const byLegalArea = casesGroupArea.map((g) => ({
      legalArea: g.legalArea,
      count: g._count._all,
    }));

    // Finanzas
    const totalAgreedStock = Math.round(
      allFeeAgreements.reduce((sum, a) => sum + (typeof a.total === "number" ? a.total : 0), 0) * 100
    ) / 100;
    const totalCollectedStock = Math.round(
      allPayments.reduce((sum, p) => sum + (typeof p.amount === "number" ? p.amount : 0), 0) * 100
    ) / 100;
    const totalOutstandingStock = Math.round(Math.max(0, totalAgreedStock - totalCollectedStock) * 100) / 100;

    const agreedInPeriod = Math.round(
      feeAgreementsInPeriod.reduce((sum, a) => sum + (typeof a.total === "number" ? a.total : 0), 0) * 100
    ) / 100;
    const collectedInPeriod = Math.round(
      paymentsInPeriod.reduce((sum, p) => sum + (typeof p.amount === "number" ? p.amount : 0), 0) * 100
    ) / 100;

    return {
      period: {
        from: fromDate ? fromDate.toISOString() : null,
        to: toDate ? toDate.toISOString() : null,
      },
      cases: {
        totalStock,
        activeStock,
        closedStock,
        createdInPeriod: casesCreatedInPeriod,
        byStatus,
        byLegalArea,
      },
      workload: {
        pendingTasks,
        overdueTasks,
        completedInPeriodTasks,
        pendingDeadlines,
        overdueDeadlines,
        totalHearingsInPeriod: hearingsInPeriod,
      },
      finances: {
        agreedInPeriod,
        collectedInPeriod,
        totalAgreedStock,
        totalCollectedStock,
        totalOutstandingStock,
      },
      clients: {
        totalStock: clientsTotal,
        activeStock: clientsActive,
        createdInPeriod: clientsCreatedInPeriod,
      },
      activitiesInPeriod,
    };
  }
}
