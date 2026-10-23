import { db } from "../lib/db";
import { Prisma } from "@prisma/client";
import {
  aggregateArchitectureProjectFinancials,
  calculateArchitectureProjectFinancials,
} from "./architecture-financial.service";

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
    estimatedProjectsCount: number;
    ambiguousProjectsCount: number;
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

    const financials = aggregateArchitectureProjectFinancials(projects);

    const projectBudgetRankings: Array<{
      id: number;
      code: string;
      name: string;
      status: string;
      approvedBudget: number;
      estimatedBudget: number;
      hasApprovedBudget: boolean;
    }> = [];

    for (const p of projects) {
      // Por estado
      projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;

      // Por tipo
      const pType = p.type || "General";
      projectsByType[pType] = (projectsByType[pType] || 0) + 1;

      // Presupuestos del proyecto
      const projectFinancials = calculateArchitectureProjectFinancials(p.budgets || []);
      if (projectFinancials.status !== "ambiguous" && projectFinancials.status !== "none") {
        projectBudgetRankings.push({
          id: p.id,
          code: p.code,
          name: p.name,
          status: p.status,
          approvedBudget: projectFinancials.approvedAmount ?? 0,
          estimatedBudget: projectFinancials.estimatedAmount ?? 0,
          hasApprovedBudget: projectFinancials.approvedAmount !== null,
        });
      }
    }

    // Ordenar proyectos por presupuesto aprobado (o estimado si no hay aprobado) desc
    projectBudgetRankings.sort((a, b) => {
      const valA = a.hasApprovedBudget ? a.approvedBudget : a.estimatedBudget;
      const valB = b.hasApprovedBudget ? b.approvedBudget : b.estimatedBudget;
      return valB - valA;
    });

    const topProjectsByBudget = projectBudgetRankings
      .slice(0, 5)
      .map(({ hasApprovedBudget, ...project }) => project);

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

    const totalApproved = financials.totalApproved;
    const totalEstimated = financials.totalEstimated;
    const averageBudgetPerProject =
      financials.estimatedProjectsCount > 0
        ? Number((totalEstimated / financials.estimatedProjectsCount).toFixed(2))
        : 0;

    return {
      projectsByStatus,
      projectsByType,
      budgetsByStatus,
      tasksByStatus,
      deliverablesByStatus,
      financialOverview: {
        totalEstimated,
        totalApproved,
        approvedProjectsCount: financials.approvedProjectsCount,
        estimatedProjectsCount: financials.estimatedProjectsCount,
        ambiguousProjectsCount: financials.ambiguousProjectsCount,
        averageBudgetPerProject,
      },
      topProjectsByBudget,
    };
  }
}
