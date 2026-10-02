import { db } from "../lib/db";
import { Prisma } from "@prisma/client";

export interface ArchitectureReportsSummary {
  projectsByStatus: Record<string, number>;
  projectsByType: Record<string, number>;
  budgetsByStatus: Record<string, { count: number; totalAmount: number }>;
  tasksByStatus: Record<string, number>;
  deliverablesByStatus: Record<string, number>;
  financialOverview: {
    totalEstimated: number;
    totalApproved: number;
    approvedProjectsCount: number;
    averageBudgetPerProject: number;
  };
  topProjectsByBudget: Array<{
    id: number;
    code: string;
    name: string;
    status: string;
    approvedBudget: number;
    estimatedBudget: number;
  }>;
}

export class ArchitectureReportsService {
  /**
   * Proyecta un Read Model estadístico y financiero para reportes gerenciales.
   * 100% de solo lectura: 0 escrituras, 0 tablas adicionales.
   */
  public static async getReportsSummary(
    organizationId: number,
    client: any = db
  ): Promise<ArchitectureReportsSummary> {
    // 1. Proyectos con presupuestos y etapas
    const projects = await client.architectureProject.findMany({
      where: { organizationId },
      include: {
        budgets: {
          include: {
            items: { select: { quantity: true, unitPrice: true } },
          },
        },
      },
    });

    const projectsByStatus: Record<string, number> = {};
    const projectsByType: Record<string, number> = {};

    let totalEstimatedDecimal = new Prisma.Decimal(0);
    let totalApprovedDecimal = new Prisma.Decimal(0);
    let approvedProjectsCount = 0;

    const projectBudgetRankings: Array<{
      id: number;
      code: string;
      name: string;
      status: string;
      approvedBudget: number;
      estimatedBudget: number;
    }> = [];

    for (const p of projects) {
      // Por estado
      projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;

      // Por tipo
      const pType = p.type || "General";
      projectsByType[pType] = (projectsByType[pType] || 0) + 1;

      // Presupuestos del proyecto
      let projApprovedDec = new Prisma.Decimal(0);
      let projEstimatedDec = new Prisma.Decimal(0);

      for (const b of p.budgets || []) {
        let bTotal = new Prisma.Decimal(0);
        for (const item of b.items || []) {
          const q = new Prisma.Decimal(item.quantity ?? 1);
          const pr = new Prisma.Decimal(item.unitPrice ?? 0);
          bTotal = bTotal.add(q.mul(pr));
        }

        if (b.status === "Aprobado") {
          projApprovedDec = projApprovedDec.add(bTotal);
        }
      }

      if (projApprovedDec.gt(0)) {
        approvedProjectsCount++;
        projEstimatedDec = projApprovedDec;
      } else if (p.budgets && p.budgets.length > 0) {
        // Tomar último presupuesto como estimado
        const lastB = p.budgets[p.budgets.length - 1];
        let lastTotal = new Prisma.Decimal(0);
        for (const item of lastB.items || []) {
          const q = new Prisma.Decimal(item.quantity ?? 1);
          const pr = new Prisma.Decimal(item.unitPrice ?? 0);
          lastTotal = lastTotal.add(q.mul(pr));
        }
        projEstimatedDec = lastTotal;
      }

      totalApprovedDecimal = totalApprovedDecimal.add(projApprovedDec);
      totalEstimatedDecimal = totalEstimatedDecimal.add(projEstimatedDec);

      projectBudgetRankings.push({
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        approvedBudget: Number(projApprovedDec.toFixed(2)),
        estimatedBudget: Number(projEstimatedDec.toFixed(2)),
      });
    }

    // Ordenar proyectos por presupuesto aprobado (o estimado si no hay aprobado) desc
    projectBudgetRankings.sort((a, b) => {
      const valA = a.approvedBudget > 0 ? a.approvedBudget : a.estimatedBudget;
      const valB = b.approvedBudget > 0 ? b.approvedBudget : b.estimatedBudget;
      return valB - valA;
    });

    const topProjectsByBudget = projectBudgetRankings.slice(0, 5);

    // 2. Presupuestos por estado
    const allBudgets = await client.architectureBudget.findMany({
      where: { organizationId },
      include: {
        items: { select: { quantity: true, unitPrice: true } },
      },
    });

    const budgetsByStatus: Record<string, { count: number; totalAmount: number }> = {
      Borrador: { count: 0, totalAmount: 0 },
      Presentado: { count: 0, totalAmount: 0 },
      Aprobado: { count: 0, totalAmount: 0 },
      Rechazado: { count: 0, totalAmount: 0 },
    };

    for (const b of allBudgets) {
      let bTotal = new Prisma.Decimal(0);
      for (const item of b.items || []) {
        const q = new Prisma.Decimal(item.quantity ?? 1);
        const pr = new Prisma.Decimal(item.unitPrice ?? 0);
        bTotal = bTotal.add(q.mul(pr));
      }

      if (!budgetsByStatus[b.status]) {
        budgetsByStatus[b.status] = { count: 0, totalAmount: 0 };
      }
      budgetsByStatus[b.status].count++;
      budgetsByStatus[b.status].totalAmount = Number(
        (budgetsByStatus[b.status].totalAmount + Number(bTotal.toFixed(2))).toFixed(2)
      );
    }

    // 3. Tareas por estado
    const tasks = await client.architectureTask.findMany({
      where: { organizationId },
      select: { status: true },
    });
    const tasksByStatus: Record<string, number> = {};
    for (const t of tasks) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    }

    // 4. Entregables por estado
    const deliverables = await client.architectureDeliverable.findMany({
      where: { organizationId },
      select: { status: true },
    });
    const deliverablesByStatus: Record<string, number> = {};
    for (const d of deliverables) {
      deliverablesByStatus[d.status] = (deliverablesByStatus[d.status] || 0) + 1;
    }

    const totalApproved = Number(totalApprovedDecimal.toFixed(2));
    const totalEstimated = Number(totalEstimatedDecimal.toFixed(2));
    const averageBudgetPerProject =
      projects.length > 0 ? Number((totalEstimated / projects.length).toFixed(2)) : 0;

    return {
      projectsByStatus,
      projectsByType,
      budgetsByStatus,
      tasksByStatus,
      deliverablesByStatus,
      financialOverview: {
        totalEstimated,
        totalApproved,
        approvedProjectsCount,
        averageBudgetPerProject,
      },
      topProjectsByBudget,
    };
  }
}
