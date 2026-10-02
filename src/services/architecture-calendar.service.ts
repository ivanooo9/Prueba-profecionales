import { db } from "../lib/db";

export interface ArchitectureCalendarFilter {
  startDate?: string | Date;
  endDate?: string | Date;
  projectId?: number;
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
   */
  public static async getCalendarEvents(
    organizationId: number,
    filters?: ArchitectureCalendarFilter,
    client: any = db
  ): Promise<ArchitectureCalendarEvent[]> {
    let start: Date | undefined;
    let end: Date | undefined;

    if (filters?.startDate) {
      start = typeof filters.startDate === "string" ? new Date(filters.startDate) : filters.startDate;
    }
    if (filters?.endDate) {
      end = typeof filters.endDate === "string" ? new Date(filters.endDate) : filters.endDate;
    }

    // 1. Tareas con dueDate
    const taskWhere: any = {
      organizationId,
      dueDate: { not: null },
    };
    if (filters?.projectId) {
      taskWhere.projectId = filters.projectId;
    }
    if (start || end) {
      taskWhere.dueDate = { not: null };
      if (start) taskWhere.dueDate.gte = start;
      if (end) taskWhere.dueDate.lte = end;
    }

    const tasks = await client.architectureTask.findMany({
      where: taskWhere,
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    // 2. Entregables con dueDate
    const deliverableWhere: any = {
      organizationId,
      dueDate: { not: null },
    };
    if (filters?.projectId) {
      deliverableWhere.projectId = filters.projectId;
    }
    if (start || end) {
      deliverableWhere.dueDate = { not: null };
      if (start) deliverableWhere.dueDate.gte = start;
      if (end) deliverableWhere.dueDate.lte = end;
    }

    const deliverables = await client.architectureDeliverable.findMany({
      where: deliverableWhere,
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    // 3. Reuniones con scheduledAt
    const meetingWhere: any = {
      organizationId,
    };
    if (filters?.projectId) {
      meetingWhere.projectId = filters.projectId;
    }
    if (start || end) {
      meetingWhere.scheduledAt = {};
      if (start) meetingWhere.scheduledAt.gte = start;
      if (end) meetingWhere.scheduledAt.lte = end;
    }

    const meetings = await client.architectureMeeting.findMany({
      where: meetingWhere,
      include: {
        project: { select: { id: true, name: true, code: true } },
        leadArchitectUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const events: ArchitectureCalendarEvent[] = [];

    // Mapeo de Tareas
    for (const t of tasks) {
      if (t.dueDate) {
        events.push({
          id: `task-${t.id}`,
          sourceId: t.id,
          sourceType: "task",
          title: t.title,
          date: t.dueDate.toISOString().slice(0, 10),
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

    // Mapeo de Entregables
    for (const d of deliverables) {
      if (d.dueDate) {
        events.push({
          id: `deliverable-${d.id}`,
          sourceId: d.id,
          sourceType: "deliverable",
          title: d.name,
          date: d.dueDate.toISOString().slice(0, 10),
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

    // Mapeo de Reuniones
    for (const m of meetings) {
      events.push({
        id: `meeting-${m.id}`,
        sourceId: m.id,
        sourceType: "meeting",
        title: m.title,
        date: m.scheduledAt.toISOString().slice(0, 10),
        time: m.scheduledAt.toISOString().slice(11, 16),
        status: m.status,
        priority: "Reunión",
        projectId: m.projectId,
        projectName: m.project?.name || "",
        projectCode: m.project?.code || "",
        assignedToUserId: m.leadArchitectUserId,
        assignedToName: m.leadArchitectUser?.name || undefined,
        location: m.location || undefined,
        notes: m.agenda || undefined,
      });
    }

    // Orden cronológico
    events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return events;
  }
}
