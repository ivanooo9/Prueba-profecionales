import { db } from "../lib/db";
import { Prisma } from "@prisma/client";

export interface ArchitectureDashboardData {
  metrics: {
    activeProjectsCount: number;
    totalProjectsCount: number;
    totalBudgetApproved: number;
    totalBudgetEstimated: number;
    pendingTasksCount: number;
    urgentTasksCount: number;
    pendingDeliverablesCount: number;
    upcomingMeetingsCount: number;
  };
  recentProjects: Array<{
    id: number;
    code: string;
    name: string;
    clientName: string;
    status: string;
    progress: number;
    updatedAt: string;
  }>;
  urgentTasks: Array<{
    id: number;
    title: string;
    projectId: number;
    projectName: string;
    priority: string;
    status: string;
    dueDate?: string;
  }>;
  upcomingMeetings: Array<{
    id: number;
    title: string;
    projectId: number;
    projectName: string;
    date: string;
    time?: string;
    location?: string;
    status: string;
  }>;
  budgetSummary: {
    totalEstimated: number;
    totalApproved: number;
    approvedBudgetsCount: number;
    draftBudgetsCount: number;
  };
  nextAction?: {
    type: "urgent_task" | "upcoming_meeting" | "pending_deliverable" | "info";
    title: string;
    description: string;
    link?: string;
  };
}

export class ArchitectureDashboardService {
  /**
   * Proyecta un Read Model del dashboard agregando métricas en tiempo real.
   * 100% de solo lectura: 0 escrituras, 0 tablas adicionales.
   */
  public static async getDashboardData(
    organizationId: number,
    client: any = db
  ): Promise<ArchitectureDashboardData> {
    const now = new Date();

    // 1. Proyectos
    const projects = await client.architectureProject.findMany({
      where: { organizationId },
      include: {
        client: { select: { id: true, name: true } },
        stages: { select: { progress: true } },
        budgets: {
          include: {
            items: { select: { quantity: true, unitPrice: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const totalProjectsCount = projects.length;
    const activeProjects = projects.filter(
      (p: any) =>
        p.status !== "Archivado" &&
        p.status !== "Cancelado" &&
        p.status !== "Entregado" &&
        !p.archivedAt
    );
    const activeProjectsCount = activeProjects.length;

    // Calcular montos de presupuestos con Decimal
    let totalApprovedDecimal = new Prisma.Decimal(0);
    let totalEstimatedDecimal = new Prisma.Decimal(0);
    let approvedBudgetsCount = 0;
    let draftBudgetsCount = 0;

    for (const project of projects) {
      const budgets = project.budgets || [];
      let projectApprovedBudget = new Prisma.Decimal(0);
      let projectLatestBudget = new Prisma.Decimal(0);

      for (const b of budgets) {
        if (b.status === "Aprobado") {
          approvedBudgetsCount++;
          let bTotal = new Prisma.Decimal(0);
          for (const item of b.items || []) {
            const q = new Prisma.Decimal(item.quantity ?? 1);
            const p = new Prisma.Decimal(item.unitPrice ?? 0);
            bTotal = bTotal.add(q.mul(p));
          }
          projectApprovedBudget = projectApprovedBudget.add(bTotal);
        } else if (b.status === "Borrador") {
          draftBudgetsCount++;
        }
      }

      // Si no hay aprobado, tomar el último presupuesto para estimated
      if (projectApprovedBudget.gt(0)) {
        totalApprovedDecimal = totalApprovedDecimal.add(projectApprovedBudget);
        totalEstimatedDecimal = totalEstimatedDecimal.add(projectApprovedBudget);
      } else if (budgets.length > 0) {
        const lastB = budgets[budgets.length - 1];
        let lastTotal = new Prisma.Decimal(0);
        for (const item of lastB.items || []) {
          const q = new Prisma.Decimal(item.quantity ?? 1);
          const p = new Prisma.Decimal(item.unitPrice ?? 0);
          lastTotal = lastTotal.add(q.mul(p));
        }
        totalEstimatedDecimal = totalEstimatedDecimal.add(lastTotal);
      }
    }

    // 2. Tareas
    const tasks = await client.architectureTask.findMany({
      where: {
        organizationId,
        status: { notIn: ["Completada", "Cancelada"] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });

    const pendingTasksCount = tasks.length;
    const urgentTasksList = tasks.filter(
      (t: any) => t.priority === "Alta" || t.priority === "Urgente"
    );
    const urgentTasksCount = urgentTasksList.length;

    // 3. Entregables
    const pendingDeliverables = await client.architectureDeliverable.findMany({
      where: {
        organizationId,
        status: { notIn: ["Aprobado", "Entregado"] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    });
    const pendingDeliverablesCount = pendingDeliverables.length;

    // 4. Reuniones
    const upcomingMeetings = await client.architectureMeeting.findMany({
      where: {
        organizationId,
        scheduledAt: { gte: now },
        status: { not: "Cancelada" },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    });
    const upcomingMeetingsCount = upcomingMeetings.length;

    // 5. Recent projects mapping
    const recentProjects = projects.slice(0, 5).map((p: any) => {
      const stages = p.stages || [];
      const progress =
        stages.length > 0
          ? Math.round(stages.reduce((acc: number, s: any) => acc + (s.progress || 0), 0) / stages.length)
          : 0;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        clientName: p.client?.name || "",
        status: p.status,
        progress,
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    // 6. Urgent tasks mapping
    const urgentTasks = urgentTasksList.slice(0, 5).map((t: any) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      projectName: t.project?.name || "",
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
    }));

    // 7. Upcoming meetings mapping
    const mappedUpcomingMeetings = upcomingMeetings.map((m: any) => ({
      id: m.id,
      title: m.title,
      projectId: m.projectId,
      projectName: m.project?.name || "",
      date: m.scheduledAt.toISOString().slice(0, 10),
      time: m.scheduledAt.toISOString().slice(11, 16),
      location: m.location || undefined,
      status: m.status,
    }));

    // 8. Next action inteligente
    let nextAction: ArchitectureDashboardData["nextAction"];
    if (urgentTasksList.length > 0) {
      const firstUrgent = urgentTasksList[0];
      nextAction = {
        type: "urgent_task",
        title: `Tarea Prioritaria: ${firstUrgent.title}`,
        description: `Asignada al proyecto ${firstUrgent.project?.name || ""}. Vence: ${
          firstUrgent.dueDate ? firstUrgent.dueDate.toISOString().slice(0, 10) : "Sin fecha"
        }`,
      };
    } else if (upcomingMeetings.length > 0) {
      const firstMeeting = upcomingMeetings[0];
      nextAction = {
        type: "upcoming_meeting",
        title: `Próxima Reunión: ${firstMeeting.title}`,
        description: `Proyecto ${firstMeeting.project?.name || ""} el ${firstMeeting.scheduledAt.toISOString().slice(0, 10)} a las ${firstMeeting.scheduledAt.toISOString().slice(11, 16)}`,
      };
    } else if (pendingDeliverables.length > 0) {
      const firstDeliv = pendingDeliverables[0];
      nextAction = {
        type: "pending_deliverable",
        title: `Entregable Pendiente: ${firstDeliv.name}`,
        description: `Proyecto ${firstDeliv.project?.name || ""}. Fecha compromiso: ${
          firstDeliv.dueDate ? firstDeliv.dueDate.toISOString().slice(0, 10) : "Sin fecha"
        }`,
      };
    } else {
      nextAction = {
        type: "info",
        title: "Todos los proyectos al día",
        description: "No se registran tareas urgentes ni reuniones inmediatas pendientes.",
      };
    }

    return {
      metrics: {
        activeProjectsCount,
        totalProjectsCount,
        totalBudgetApproved: Number(totalApprovedDecimal.toFixed(2)),
        totalBudgetEstimated: Number(totalEstimatedDecimal.toFixed(2)),
        pendingTasksCount,
        urgentTasksCount,
        pendingDeliverablesCount,
        upcomingMeetingsCount,
      },
      recentProjects,
      urgentTasks,
      upcomingMeetings: mappedUpcomingMeetings,
      budgetSummary: {
        totalEstimated: Number(totalEstimatedDecimal.toFixed(2)),
        totalApproved: Number(totalApprovedDecimal.toFixed(2)),
        approvedBudgetsCount,
        draftBudgetsCount,
      },
      nextAction,
    };
  }
}
