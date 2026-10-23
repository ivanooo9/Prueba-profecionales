import { Prisma } from "@prisma/client";

export type ArchitectureProjectFinancialStatus =
  | "none"
  | "draft"
  | "not_approved"
  | "approved"
  | "ambiguous";

export interface ArchitectureProjectFinancials {
  status: ArchitectureProjectFinancialStatus;
  estimatedAmount: number | null;
  approvedAmount: number | null;
  approvedBudgetsCount: number;
  draftBudgetsCount: number;
  budgetsCount: number;
}

export interface ArchitecturePortfolioFinancials {
  totalEstimated: number;
  totalApproved: number;
  estimatedProjectsCount: number;
  approvedProjectsCount: number;
  ambiguousProjectsCount: number;
  approvedBudgetsCount: number;
  draftBudgetsCount: number;
}

export function calculateArchitectureBudgetTotal(items: any[] = []): number {
  const total = items.reduce((sum, item) => {
    const quantity = new Prisma.Decimal(item.quantity ?? 1);
    const unitPrice = new Prisma.Decimal(item.unitPrice ?? 0);
    return sum.add(quantity.mul(unitPrice));
  }, new Prisma.Decimal(0));

  return Number(total.toFixed(2));
}

export function calculateArchitectureProjectFinancials(
  budgets: any[] = []
): ArchitectureProjectFinancials {
  const approvedBudgets = budgets.filter((budget) => budget.status === "Aprobado");
  const draftBudgetsCount = budgets.filter((budget) => budget.status === "Borrador").length;
  const counts = {
    approvedBudgetsCount: approvedBudgets.length,
    draftBudgetsCount,
    budgetsCount: budgets.length,
  };

  if (approvedBudgets.length > 1 || (approvedBudgets.length === 0 && budgets.length > 1)) {
    return {
      status: "ambiguous",
      estimatedAmount: null,
      approvedAmount: null,
      ...counts,
    };
  }

  if (approvedBudgets.length === 1) {
    const amount = calculateArchitectureBudgetTotal(approvedBudgets[0].items);
    return {
      status: "approved",
      estimatedAmount: amount,
      approvedAmount: amount,
      ...counts,
    };
  }

  if (budgets.length === 0) {
    return {
      status: "none",
      estimatedAmount: null,
      approvedAmount: null,
      ...counts,
    };
  }

  const [budget] = budgets;
  return {
    status: budget.status === "Borrador" ? "draft" : "not_approved",
    estimatedAmount: calculateArchitectureBudgetTotal(budget.items),
    approvedAmount: null,
    ...counts,
  };
}

export function aggregateArchitectureProjectFinancials(
  projects: Array<{ budgets?: any[] }>
): ArchitecturePortfolioFinancials {
  const result: ArchitecturePortfolioFinancials = {
    totalEstimated: 0,
    totalApproved: 0,
    estimatedProjectsCount: 0,
    approvedProjectsCount: 0,
    ambiguousProjectsCount: 0,
    approvedBudgetsCount: 0,
    draftBudgetsCount: 0,
  };

  for (const project of projects) {
    const financials = calculateArchitectureProjectFinancials(project.budgets || []);
    result.approvedBudgetsCount += financials.approvedBudgetsCount;
    result.draftBudgetsCount += financials.draftBudgetsCount;

    if (financials.status === "ambiguous") {
      result.ambiguousProjectsCount++;
      continue;
    }

    if (financials.estimatedAmount !== null) {
      result.totalEstimated += financials.estimatedAmount;
      result.estimatedProjectsCount++;
    }
    if (financials.approvedAmount !== null) {
      result.totalApproved += financials.approvedAmount;
      result.approvedProjectsCount++;
    }
  }

  result.totalEstimated = Number(result.totalEstimated.toFixed(2));
  result.totalApproved = Number(result.totalApproved.toFixed(2));
  return result;
}