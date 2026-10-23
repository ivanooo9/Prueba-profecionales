import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import {
  aggregateArchitectureProjectFinancials,
  calculateArchitectureBudgetTotal,
  calculateArchitectureProjectFinancials,
} from "./architecture-financial.service";
import { ArchitectureService } from "./architecture.service";
import { ArchitectureDashboardService } from "./architecture-dashboard.service";
import { ArchitectureReportsService } from "./architecture-reports.service";

const decimal = (value: number | string) => new Prisma.Decimal(value);

test("project without budgets has no financial amount", () => {
  assert.deepEqual(calculateArchitectureProjectFinancials([]), {
    status: "none",
    estimatedAmount: null,
    approvedAmount: null,
    approvedBudgetsCount: 0,
    draftBudgetsCount: 0,
    budgetsCount: 0,
  });
});

test("a single draft is estimated from its persisted items", () => {
  const result = calculateArchitectureProjectFinancials([{
    status: "Borrador",
    items: [{ quantity: decimal("1.5"), unitPrice: decimal("10.25") }],
  }]);

  assert.equal(result.status, "draft");
  assert.equal(result.estimatedAmount, 15.38);
  assert.equal(result.approvedAmount, null);
});

test("a single approved budget supplies both project amounts", () => {
  const result = calculateArchitectureProjectFinancials([{
    status: "Aprobado",
    items: [{ quantity: decimal(3), unitPrice: decimal("12.50") }],
  }]);

  assert.equal(result.status, "approved");
  assert.equal(result.estimatedAmount, 37.5);
  assert.equal(result.approvedAmount, 37.5);
});

test("an approved zero-value budget remains approved by status, not amount", () => {
  const result = calculateArchitectureProjectFinancials([{
    status: "Aprobado",
    items: [{ quantity: decimal(1), unitPrice: decimal(0) }],
  }]);

  assert.equal(result.status, "approved");
  assert.equal(result.approvedAmount, 0);
});

test("budget totals use decimal line multiplication and round once", () => {
  assert.equal(calculateArchitectureBudgetTotal([
    { quantity: decimal("0.3333"), unitPrice: decimal("1.00") },
    { quantity: decimal("0.3333"), unitPrice: decimal("1.00") },
    { quantity: decimal("0.3333"), unitPrice: decimal("1.00") },
  ]), 1);
});

test("multiple non-approved budgets are reported as ambiguous, not summed or ordered", () => {
  const result = calculateArchitectureProjectFinancials([
    { status: "Borrador", items: [{ quantity: 1, unitPrice: 100 }] },
    { status: "Rechazado", items: [{ quantity: 1, unitPrice: 200 }] },
  ]);

  assert.equal(result.status, "ambiguous");
  assert.equal(result.estimatedAmount, null);
  assert.equal(result.approvedAmount, null);
});

test("multiple approved budgets in legacy data are ambiguous rather than aggregated", () => {
  const result = calculateArchitectureProjectFinancials([
    { status: "Aprobado", items: [{ quantity: 1, unitPrice: 100 }] },
    { status: "Aprobado", items: [{ quantity: 1, unitPrice: 200 }] },
  ]);

  assert.equal(result.status, "ambiguous");
  assert.equal(result.estimatedAmount, null);
  assert.equal(result.approvedAmount, null);
});

test("portfolio totals exclude ambiguous projects and expose their count", () => {
  const result = aggregateArchitectureProjectFinancials([
    { budgets: [{ status: "Borrador", items: [{ quantity: 1, unitPrice: 40 }] }] },
    { budgets: [{ status: "Aprobado", items: [{ quantity: 1, unitPrice: 60 }] }] },
    { budgets: [
      { status: "Borrador", items: [{ quantity: 1, unitPrice: 500 }] },
      { status: "Borrador", items: [{ quantity: 1, unitPrice: 900 }] },
    ] },
  ]);

  assert.equal(result.totalEstimated, 100);
  assert.equal(result.totalApproved, 60);
  assert.equal(result.estimatedProjectsCount, 2);
  assert.equal(result.approvedProjectsCount, 1);
  assert.equal(result.ambiguousProjectsCount, 1);
});

test("project detail, dashboard, and reports share financial totals and tenant scope", async () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const makeBudget = (id: number, status: string, amount: number) => ({
    id,
    organizationId: 9,
    projectId: id,
    project: { name: `Proyecto ${id}`, code: `PRJ-${id}` },
    name: `Presupuesto ${id}`,
    status,
    items: [{ id: id * 10, quantity: decimal(1), unitPrice: decimal(amount) }],
    createdAt: now,
    updatedAt: now,
  });
  const projects = [
    { id: 1, code: "PRJ-1", name: "Borrador", type: "Vivienda", status: "Diseño", updatedAt: now, client: { name: "Cliente" }, stages: [], budgets: [makeBudget(1, "Borrador", 20)] },
    { id: 2, code: "PRJ-2", name: "Aprobado cero", type: "Vivienda", status: "Diseño", updatedAt: now, client: { name: "Cliente" }, stages: [], budgets: [makeBudget(2, "Aprobado", 0)] },
    { id: 3, code: "PRJ-3", name: "Ambiguo", type: "Vivienda", status: "Diseño", updatedAt: now, client: { name: "Cliente" }, stages: [], budgets: [makeBudget(3, "Borrador", 500), makeBudget(4, "Borrador", 900)] },
    { id: 5, code: "PRJ-5", name: "Sin presupuesto", type: "Vivienda", status: "Diseño", updatedAt: now, client: { name: "Cliente" }, stages: [], budgets: [] },
  ];
  const scopedQueries: Array<{ where?: { organizationId?: number } }> = [];
  const scopedResult = (args: { where?: { organizationId?: number } }, value: any[]) => {
    scopedQueries.push(args);
    return args.where?.organizationId === 9 ? value : [];
  };
  const client = {
    architectureProject: {
      findMany: async (args: any) => scopedResult(args, projects),
    },
    architectureBudget: {
      findMany: async (args: any) => scopedResult(args, projects.flatMap((project) => project.budgets)),
    },
    architectureTask: { findMany: async (args: any) => scopedResult(args, []) },
    architectureDeliverable: { findMany: async (args: any) => scopedResult(args, []) },
    architectureMeeting: { findMany: async (args: any) => scopedResult(args, []) },
  };

  const detail = projects.map((project) => ArchitectureService.mapProjectDTO({
    ...project,
    leadArchitectUser: { name: "Arquitecta" },
    tasks: [],
    deliverables: [],
    meetings: [],
    documents: [],
    createdAt: now,
  }));
  const dashboard = await ArchitectureDashboardService.getDashboardData(9, client as any);
  const reports = await ArchitectureReportsService.getReportsSummary(9, client as any);

  assert.equal(detail[0].financialStatus, "draft");
  assert.equal(detail[0].estimatedBudget, 20);
  assert.equal(detail[1].financialStatus, "approved");
  assert.equal(detail[1].approvedBudget, 0);
  assert.equal(detail[2].financialStatus, "ambiguous");
  assert.equal(detail[2].estimatedBudget, null);
  assert.equal(detail[3].financialStatus, "none");
  assert.equal(detail[3].estimatedBudget, null);
  assert.equal(dashboard.budgetSummary.totalEstimated, reports.financialOverview.totalEstimated);
  assert.equal(dashboard.budgetSummary.totalApproved, reports.financialOverview.totalApproved);
  assert.equal(dashboard.metrics.totalBudgetEstimated, 20);
  assert.equal(reports.financialOverview.ambiguousProjectsCount, 1);
  assert.ok(scopedQueries.length > 0);
  assert.ok(scopedQueries.every((query) => query.where?.organizationId === 9));
});