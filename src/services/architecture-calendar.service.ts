import { db } from "../lib/db";
import {
  getStartOfDayUTC,
  getNextDayStartUTC,
  formatDateOnly,
  formatTimeOnly,
} from "./architecture-date.utils";

export interface ArchitectureCalendarFilter {
  startDate?: string | Date;
  endDate?: string | Date;
  projectId?: number;
  sourceType?: "task" | "deliverable" | "meeting" | "all";
}

export interface ArchitectureCalendarEvent {
  id: string;
  sourceId: number;
  sourceType: "task" | "deliverable" | "meeting";
  title: string;
  date: string;
  time?: string;
  status: string;
  priority?: string;
  projectId: number;
  projectName: string;
  projectCode: string;
  assignedToUserId?: number;
  assignedToName?: string;
  location?: string;
  notes?: string;
}

export class ArchitectureCalendarService {
  /**
   * Proyecta un Read Model de calendario unificado a partir de Tareas, Entregables y Reuniones.
   * 100% de solo lectura: 0 escrituras, 0 tablas adicionales.
   * Aplica intervalos semiabiertos [gte: start, lt: nextDayStart) para evitar exclusión de eventos
   * al final del día.
   */
  public static async getCalendarEvents(
    organizationId: number,
    filters?: ArchitectureCalendarFilter,
    client: any = db
  ): Promise<ArchitectureCalendarEvent[]> {
    let start: Date | undefined;
    let nextDayEnd: Date | undefined;

    if (filters?.startDate) {
      start = getStartOfDayUTC(filters.startDate);
    }
    if (filters?.endDate) {
      nextDayEnd = getNextDayStartUTC(filters.endDate);
    }

    const requestedType = filters?.sourceType || "all";
    const includeTasks = requestedType === "all" || requestedType === "task";
    const includeDeliverables = requestedType === "all" || requestedType === "deliverable";
    const includeMeetings = requestedType === "all" || requestedType === "meeting";

    const events: ArchitectureCalendarEvent[] = [];

    // 1. Tareas con dueDate
    if (includeTasks) {
      const taskWhere: any = {
        organizationId,
        dueDate: { not: null },
      };
      if (filters?.projectId) {
        taskWhere.projectId = filters.projectId;
      }
      if (start || nextDayEnd) {
        taskWhere.dueDate = { not: null };
        if (start) taskWhere.dueDate.gte = start;
        if (nextDayEnd) taskWhere.dueDate.lt = nextDayEnd;
      }

      const tasks = await client.architectureTask.findMany({
        where: taskWhere,
        include: {
          project: { select: { id: true, name: true, code: true } },
          assignedToUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { dueDate: "asc" },
      });

      for (const t of tasks) {
        if (t.dueDate) {
          events.push({
            id: `task-${t.id}`,
            sourceId: t.id,
            sourceType: "task",
            title: t.title,
            date: formatDateOnly(t.dueDate),
            status: t.status,
            priority: t.priority,
            projectId: t.projectId,
            projectName: t.project?.name || "",
            projectCode: t.project?.code || "",
            assignedToUserId: t.assignedToUserId ?? undefined,
            assignedToName: t.assignedToUser?.name || undefined,
            notes: t.description || undefined,
          });
        }
      }
    }

    // 2. Entregables con dueDate
    if (includeDeliverables) {
      const deliverableWhere: any = {
        organizationId,
        dueDate: { not: null },
      };
      if (filters?.projectId) {
        deliverableWhere.projectId = filters.projectId;
      }
      if (start || nextDayEnd) {
        deliverableWhere.dueDate = { not: null };
        if (start) deliverableWhere.dueDate.gte = start;
        if (nextDayEnd) deliverableWhere.dueDate.lt = nextDayEnd;
      }

      const deliverables = await client.architectureDeliverable.findMany({
        where: deliverableWhere,
        include: {
          project: { select: { id: true, name: true, code: true } },
          assignedToUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { dueDate: "asc" },
      });

      for (const d of deliverables) {
        if (d.dueDate) {
          events.push({
            id: `deliverable-${d.id}`,
            sourceId: d.id,
            sourceType: "deliverable",
            title: d.name,
            date: formatDateOnly(d.dueDate),
            status: d.status,
            priority: d.type || "Documento",
            projectId: d.projectId,
            projectName: d.project?.name || "",
            projectCode: d.project?.code || "",
            assignedToUserId: d.assignedToUserId ?? undefined,
            assignedToName: d.assignedToUser?.name || undefined,
            notes: d.description || undefined,
          });
        }
      }
    }

    // 3. Reuniones con scheduledAt
    if (includeMeetings) {
      const meetingWhere: any = {
        organizationId,
      };
      if (filters?.projectId) {
        meetingWhere.projectId = filters.projectId;
      }
      if (start || nextDayEnd) {
        meetingWhere.scheduledAt = {};
        if (start) meetingWhere.scheduledAt.gte = start;
        if (nextDayEnd) meetingWhere.scheduledAt.lt = nextDayEnd;
      }

      const meetings = await client.architectureMeeting.findMany({
        where: meetingWhere,
        include: {
          project: { select: { id: true, name: true, code: true } },
          leadArchitectUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: "asc" },
      });

      for (const m of meetings) {
        events.push({
          id: `meeting-${m.id}`,
          sourceId: m.id,
          sourceType: "meeting",
          title: m.title,
          date: formatDateOnly(m.scheduledAt),
          time: formatTimeOnly(m.scheduledAt),
          status: m.status,
          priority: "Reunión",
          projectId: m.projectId,
          projectName: m.project?.name || "",
          projectCode: m.project?.code || "",
          assignedToUserId: m.leadArchitectUserId ?? undefined,
          assignedToName: m.leadArchitectUser?.name || undefined,
          location: m.location || undefined,
          notes: m.notes || undefined,
        });
      }
    }

    // Orden cronológico determinista: por fecha y hora
    events.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "00:00").localeCompare(b.time || "00:00");
    });

    return events;
  }
}
