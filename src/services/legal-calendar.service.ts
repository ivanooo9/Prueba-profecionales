import { db } from "../lib/db";
import { LegalCaseOperationsService } from "./legal-case-operations.service";

export type LegalCalendarSourceType = "TASK" | "DEADLINE" | "HEARING";

export interface LegalCalendarEntry {
  id: string; // "TASK-123", "DEADLINE-123", "HEARING-123"
  sourceId: number;
  sourceType: LegalCalendarSourceType;
  type: LegalCalendarSourceType;
  title: string;
  description?: string | null;
  startAt: string; // ISO String
  endAt?: string | null;
  allDay: boolean;
  status: string;
  priority?: string | null;
  legalCaseId: number;
  legalCaseTitle: string;
  caseNumber: string;
  caseTitle: string;
  clientId?: number;
  clientName?: string;
  responsibleUserId?: number | null;
  responsibleUserName?: string | null;
  responsibleName?: string | null;
  location?: string | null;
  isOverdue?: boolean;
  source: "LegalTask" | "LegalDeadline" | "LegalHearing";
}

export interface LegalCalendarFilters {
  from?: string | Date;
  to?: string | Date;
  type?: LegalCalendarSourceType | string;
  legalCaseId?: number;
  responsibleUserId?: number;
  status?: string;
}

export class LegalCalendarService {
  /**
   * Obtiene la proyección unificada del calendario jurídico combinando LegalTask,
   * LegalDeadline y LegalHearing en un DTO normalizado sin tablas redundantes.
   * Estrictamente READ-ONLY (no muta jamás la base de datos).
   */
  public static async getCalendar(
    organizationId: number,
    filters: LegalCalendarFilters = {}
  ): Promise<LegalCalendarEntry[]> {
    // 1. Validar que la organización sea válida
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new Error("ID de organización no válido.");
    }

    // 2. Si se especifica legalCaseId, validar que pertenezca a la organización
    if (filters.legalCaseId) {
      await LegalCaseOperationsService.getCaseInOrganization(organizationId, filters.legalCaseId);
    }

    // 3. Procesar filtros de fecha obligatorios / sugeridos
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (filters.from) {
      const parsedFrom = new Date(filters.from);
      if (!isNaN(parsedFrom.getTime())) {
        fromDate = parsedFrom;
      }
    }

    if (filters.to) {
      const parsedTo = new Date(filters.to);
      if (!isNaN(parsedTo.getTime())) {
        toDate = parsedTo;
      }
    }

    const requestedType = filters.type ? String(filters.type).toUpperCase() : undefined;
    const entries: LegalCalendarEntry[] = [];
    const now = Date.now();

    // ------------------------------------------------------------------
    // A) PROYECCIÓN DE TAREAS OPERATIVAS (LegalTask)
    // ------------------------------------------------------------------
    if (!requestedType || requestedType === "TASK" || requestedType === "LEGAL_TASK") {
      const taskWhere: any = { organizationId };

      if (filters.legalCaseId) {
        taskWhere.legalCaseId = filters.legalCaseId;
      }
      if (filters.responsibleUserId) {
        taskWhere.assignedToUserId = filters.responsibleUserId;
      }
      if (filters.status && filters.status !== "todos") {
        taskWhere.status = filters.status;
      }
      if (fromDate || toDate) {
        taskWhere.dueDate = {};
        if (fromDate) taskWhere.dueDate.gte = fromDate;
        if (toDate) taskWhere.dueDate.lte = toDate;
      }

      const tasks = await db.legalTask.findMany({
        where: taskWhere,
        include: {
          legalCase: {
            select: {
              id: true,
              internalCaseNumber: true,
              title: true,
              clientId: true,
              client: { select: { id: true, name: true } },
            },
          },
          assignedToUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      for (const t of tasks) {
        const isOverdue = t.status !== "Completada" && t.dueDate.getTime() < now;
        entries.push({
          id: `TASK-${t.id}`,
          sourceId: t.id,
          sourceType: "TASK",
          type: "TASK",
          title: t.title,
          description: t.description || null,
          startAt: t.dueDate.toISOString(),
          endAt: null,
          allDay: true,
          status: t.status,
          priority: t.priority,
          legalCaseId: t.legalCaseId,
          legalCaseTitle: t.legalCase?.title || "",
          caseNumber: t.legalCase?.internalCaseNumber || "",
          caseTitle: t.legalCase?.title || "",
          clientId: t.legalCase?.clientId,
          clientName: t.legalCase?.client?.name,
          responsibleUserId: t.assignedToUserId,
          responsibleUserName: t.assignedToUser?.name || t.assignedTo || null,
          responsibleName: t.assignedToUser?.name || t.assignedTo || null,
          location: null,
          isOverdue,
          source: "LegalTask",
        });
      }
    }

    // ------------------------------------------------------------------
    // B) PROYECCIÓN DE PLAZOS PROCESALES (LegalDeadline)
    // ------------------------------------------------------------------
    if (!requestedType || requestedType === "DEADLINE" || requestedType === "LEGAL_DEADLINE") {
      const deadlineWhere: any = { organizationId };

      if (filters.legalCaseId) {
        deadlineWhere.legalCaseId = filters.legalCaseId;
      }
      if (filters.responsibleUserId) {
        deadlineWhere.responsibleUserId = filters.responsibleUserId;
      }
      if (filters.status && filters.status !== "todos") {
        deadlineWhere.status = filters.status;
      }
      if (fromDate || toDate) {
        deadlineWhere.deadlineAt = {};
        if (fromDate) deadlineWhere.deadlineAt.gte = fromDate;
        if (toDate) deadlineWhere.deadlineAt.lte = toDate;
      }

      const deadlines = await db.legalDeadline.findMany({
        where: deadlineWhere,
        include: {
          legalCase: {
            select: {
              id: true,
              internalCaseNumber: true,
              title: true,
              clientId: true,
              client: { select: { id: true, name: true } },
            },
          },
          responsibleUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      for (const d of deadlines) {
        // Reutilización estricta de la regla canónica de F2:
        // isOverdue derivado en tiempo de lectura, sin mutar status en BD
        const isOverdue = d.status !== "Cumplido" && d.deadlineAt.getTime() < now;
        entries.push({
          id: `DEADLINE-${d.id}`,
          sourceId: d.id,
          sourceType: "DEADLINE",
          type: "DEADLINE",
          title: d.title,
          description: d.description || d.notes || null,
          startAt: d.deadlineAt.toISOString(),
          endAt: null,
          allDay: false,
          status: d.status,
          priority: d.priority,
          legalCaseId: d.legalCaseId,
          legalCaseTitle: d.legalCase?.title || "",
          caseNumber: d.legalCase?.internalCaseNumber || "",
          caseTitle: d.legalCase?.title || "",
          clientId: d.legalCase?.clientId,
          clientName: d.legalCase?.client?.name,
          responsibleUserId: d.responsibleUserId,
          responsibleUserName: d.responsibleUser?.name || d.responsible || null,
          responsibleName: d.responsibleUser?.name || d.responsible || null,
          location: null,
          isOverdue,
          source: "LegalDeadline",
        });
      }
    }

    // ------------------------------------------------------------------
    // C) PROYECCIÓN DE AUDIENCIAS JUDICIALES (LegalHearing)
    // ------------------------------------------------------------------
    if (!requestedType || requestedType === "HEARING" || requestedType === "LEGAL_HEARING") {
      const hearingWhere: any = { organizationId };

      if (filters.legalCaseId) {
        hearingWhere.legalCaseId = filters.legalCaseId;
      }
      if (filters.responsibleUserId) {
        hearingWhere.responsibleUserId = filters.responsibleUserId;
      }
      if (filters.status && filters.status !== "todos") {
        hearingWhere.status = filters.status;
      }
      if (fromDate || toDate) {
        hearingWhere.scheduledAt = {};
        if (fromDate) hearingWhere.scheduledAt.gte = fromDate;
        if (toDate) hearingWhere.scheduledAt.lte = toDate;
      }

      const hearings = await db.legalHearing.findMany({
        where: hearingWhere,
        include: {
          legalCase: {
            select: {
              id: true,
              internalCaseNumber: true,
              title: true,
              clientId: true,
              client: { select: { id: true, name: true } },
            },
          },
          responsibleUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      for (const h of hearings) {
        entries.push({
          id: `HEARING-${h.id}`,
          sourceId: h.id,
          sourceType: "HEARING",
          type: "HEARING",
          title: h.title,
          description: h.notes || null,
          startAt: h.scheduledAt.toISOString(),
          endAt: null,
          allDay: false,
          status: h.status,
          priority: "Alta",
          legalCaseId: h.legalCaseId,
          legalCaseTitle: h.legalCase?.title || "",
          caseNumber: h.legalCase?.internalCaseNumber || "",
          caseTitle: h.legalCase?.title || "",
          clientId: h.legalCase?.clientId,
          clientName: h.legalCase?.client?.name,
          responsibleUserId: h.responsibleUserId,
          responsibleUserName: h.responsibleUser?.name || null,
          responsibleName: h.responsibleUser?.name || null,
          location: h.location || null,
          isOverdue: false,
          source: "LegalHearing",
        });
      }
    }

    // ------------------------------------------------------------------
    // D) ORDENAMIENTO CRONOLÓGICO DETERMINISTA (startAt ASC, tipo, sourceId)
    // ------------------------------------------------------------------
    entries.sort((a, b) => {
      const timeDiff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      const typeA = a.sourceType || a.type;
      const typeB = b.sourceType || b.type;
      if (typeA !== typeB) return typeA.localeCompare(typeB);
      return a.sourceId - b.sourceId;
    });

    return entries;
  }
}
