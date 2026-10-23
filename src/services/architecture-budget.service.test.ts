import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { ArchitectureBudgetService } from "./architecture-budget.service";

function decimal(value: number | string) {
  return new Prisma.Decimal(value);
}

test("createBudget persists items and computes totals from lines", async () => {
  const existingProject = {
    id: 10,
    organizationId: 9,
    status: "Planificación",
    archivedAt: null,
  };

  const createdBudget = {
    id: 77,
    organizationId: 9,
    projectId: 10,
    project: { id: 10, name: "Proyecto", code: "PRJ-2026-001", status: "Planificación", archivedAt: null },
    name: "Presupuesto inicial",
    description: "",
    status: "Borrador",
    notes: null,
    approvedAt: null,
    approvedByUserId: null,
    approvedByUser: null,
    createdByUserId: 2,
    createdByUser: { id: 2, name: "Ana", email: "ana@example.com" },
    items: [
      { id: 1, organizationId: 9, budgetId: 77, description: "Rubro A", category: "Diseño", quantity: decimal(2), unitPrice: decimal(50), order: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, organizationId: 9, budgetId: 77, description: "Rubro B", category: "Construcción", quantity: decimal(1), unitPrice: decimal(100), order: 1, createdAt: new Date(), updatedAt: new Date() },
    ],
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const client = {
    architectureProject: {
      findUnique: async () => existingProject,
    },
    architectureBudget: {
      create: async () => createdBudget,
    },
  };

  const result = await ArchitectureBudgetService.createBudget(9, 2, {
    projectId: 10,
    name: "Presupuesto inicial",
    items: [
      { description: "Rubro A", quantity: 2, unitPrice: 50 },
      { description: "Rubro B", quantity: 1, unitPrice: 100 },
    ],
  }, client as any);

  assert.equal(result.status, "Borrador");
  assert.equal(result.total, 200);
  assert.equal(result.items.length, 2);
});

test("updateBudget rejects any modification when the budget is already approved", async () => {
  const budget = {
    id: 5,
    organizationId: 9,
    projectId: 10,
    status: "Aprobado",
    project: { id: 10, status: "Planificación", archivedAt: null },
  };

  const client = {
    architectureBudget: {
      findUnique: async () => budget,
    },
    architectureProject: {
      findUnique: async () => ({ id: 10, organizationId: 9, status: "Planificación", archivedAt: null }),
    },
  };

  await assert.rejects(
    () => ArchitectureBudgetService.updateBudget(9, 2, 5, { name: "Intento cambiarlo" }, client as any),
    /aprobado|no se puede modificar/i
  );
});

test("addBudgetItem rejects when the budget is approved", async () => {
  const budget = {
    id: 5,
    organizationId: 9,
    projectId: 10,
    status: "Aprobado",
    project: { id: 10, status: "Planificación", archivedAt: null },
  };

  const client = {
    architectureBudget: {
      findUnique: async () => budget,
    },
    architectureProject: {
      findUnique: async () => ({ id: 10, organizationId: 9, status: "Planificación", archivedAt: null }),
    },
  };

  await assert.rejects(
    () => ArchitectureBudgetService.addBudgetItem(9, 2, 5, { description: "Nuevo rubro", quantity: 1, unitPrice: 10 }, client as any),
    /aprobado|no se puede modificar/i
  );
});

test("updateBudgetItem rejects when the budget is approved", async () => {
  const item = {
    id: 12,
    organizationId: 9,
    budgetId: 5,
    budget: { id: 5, organizationId: 9, projectId: 10, status: "Aprobado", project: { id: 10, status: "Planificación", archivedAt: null } },
    description: "Rubro viejo",
    quantity: decimal(1),
    unitPrice: decimal(10),
  };

  const client = {
    architectureBudgetItem: {
      findUnique: async () => item,
    },
    architectureProject: {
      findUnique: async () => ({ id: 10, organizationId: 9, status: "Planificación", archivedAt: null }),
    },
  };

  await assert.rejects(
    () => ArchitectureBudgetService.updateBudgetItem(9, 2, 5, 12, { description: "Rubro modificado" }, client as any),
    /aprobado|no se puede modificar/i
  );
});

test("updateBudgetItem persists existing budget items for active budgets", async () => {
  const item = {
    id: 12,
    organizationId: 9,
    budgetId: 5,
    budget: { id: 5, organizationId: 9, projectId: 10, status: "Borrador", project: { id: 10, status: "Planificación", archivedAt: null } },
    description: "Rubro viejo",
    quantity: decimal(1),
    unitPrice: decimal(10),
    category: "Diseño",
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const client = {
    architectureBudgetItem: {
      findUnique: async () => item,
      update: async (_args: any) => ({
        ...item,
        description: "Rubro modificado",
        quantity: decimal(3),
        unitPrice: decimal(40),
      }),
    },
    architectureProject: {
      findUnique: async () => ({ id: 10, organizationId: 9, status: "Planificación", archivedAt: null }),
    },
  };

  const result = await ArchitectureBudgetService.updateBudgetItem(9, 2, 5, 12, { description: "Rubro modificado", quantity: 3, unitPrice: 40 }, client as any);
  assert.equal(result.description, "Rubro modificado");
  assert.equal(result.quantity, 3);
  assert.equal(result.unitPrice, 40);
});

test("updateBudgetWithItems persists metadata and multiple items together in one transaction", async () => {
  const budget = {
    id: 5,
    organizationId: 9,
    projectId: 10,
    status: "Borrador",
    name: "Presupuesto viejo",
    description: "Viejo",
    notes: null,
    project: { id: 10, name: "Proyecto", code: "PRJ", status: "Planificación", archivedAt: null },
    items: [
      { id: 1, organizationId: 9, budgetId: 5, description: "Rubro A", category: "Diseño", quantity: decimal(1), unitPrice: decimal(50), order: 0, createdAt: new Date(), updatedAt: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByUser: { id: 2, name: "Ana", email: "ana@example.com" },
    approvedByUser: null,
  };

  let currentBudget = { ...budget };

  const client = {
    $transaction: async (callback: (tx: any) => Promise<any>) => callback({
      $executeRawUnsafe: async () => undefined,
      architectureBudget: {
        findUnique: async () => currentBudget,
        update: async ({ data }: any) => {
          currentBudget = { ...currentBudget, ...data, updatedAt: new Date() };
          return currentBudget;
        },
        findFirst: async () => null,
      },
      architectureProject: {
        findUnique: async () => ({ id: 10, organizationId: 9, status: "Planificación", archivedAt: null }),
      },
      architectureBudgetItem: {
        findUnique: async ({ where }: any) => {
          const item = currentBudget.items.find((it: any) => it.id === where.id) || {
            id: where.id,
            organizationId: 9,
            budgetId: 5,
            description: "Rubro A",
            category: "Diseño",
            quantity: decimal(1),
            unitPrice: decimal(50),
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return item;
        },
        update: async ({ where, data }: any) => {
          const list = [...currentBudget.items];
          const idx = list.findIndex((it: any) => it.id === where.id);
          const nextItem = {
            ...list[idx],
            ...data,
            quantity: data.quantity ?? list[idx].quantity,
            unitPrice: data.unitPrice ?? list[idx].unitPrice,
            updatedAt: new Date(),
          };
          list[idx] = nextItem;
          currentBudget = { ...currentBudget, items: list, updatedAt: new Date() };
          return nextItem;
        },
        aggregate: async () => ({ _max: { order: 1 } }),
        create: async ({ data }: any) => {
          const created = { id: 99, organizationId: 9, budgetId: 5, ...data, createdAt: new Date(), updatedAt: new Date() };
          currentBudget = { ...currentBudget, items: [...currentBudget.items, created], updatedAt: new Date() };
          return created;
        },
      },
    }),
  };

  const result = await ArchitectureBudgetService.updateBudgetWithItems(
    9,
    2,
    5,
    {
      name: "Presupuesto actualizado",
      description: "Actualizado",
      items: [
        { id: 1, description: "Rubro A", quantity: 2, unitPrice: 75 },
        { description: "Rubro B", quantity: 1, unitPrice: 20 },
      ],
    },
    client as any
  );

  assert.equal(result.name, "Presupuesto actualizado");
  assert.equal(result.items.length, 2);
  assert.equal(result.total, 170);
});

test("updateBudgetWithItems rejects the whole batch when one item operation fails", async () => {
  const budget = {
    id: 5,
    organizationId: 9,
    projectId: 10,
    status: "Borrador",
    name: "Presupuesto",
    project: { id: 10, name: "Proyecto", code: "PRJ", status: "Planificación", archivedAt: null },
    items: [
      { id: 1, organizationId: 9, budgetId: 5, description: "Rubro A", category: "Diseño", quantity: decimal(1), unitPrice: decimal(50), order: 0, createdAt: new Date(), updatedAt: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const client = {
    $transaction: async (callback: (tx: any) => Promise<any>) => callback({
      $executeRawUnsafe: async () => undefined,
      architectureBudget: {
        findUnique: async () => budget,
        update: async () => budget,
        findFirst: async () => null,
      },
      architectureProject: {
        findUnique: async () => ({ id: 10, organizationId: 9, status: "Planificación", archivedAt: null }),
      },
      architectureBudgetItem: {
        findUnique: async () => ({
          id: 1,
          organizationId: 9,
          budgetId: 5,
          description: "Rubro A",
          category: "Diseño",
          quantity: decimal(1),
          unitPrice: decimal(50),
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: async () => {
          throw new Error("Fallo en la segunda modificación");
        },
        aggregate: async () => ({ _max: { order: 0 } }),
        create: async () => ({ id: 99, organizationId: 9, budgetId: 5, description: "Nuevo", category: "General", quantity: decimal(1), unitPrice: decimal(10), order: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    }),
  };

  await assert.rejects(
    () => ArchitectureBudgetService.updateBudgetWithItems(9, 2, 5, {
      name: "Intento guardar todo",
      items: [
        { id: 1, description: "Rubro A", quantity: 2, unitPrice: 60 },
        { description: "Rubro B", quantity: 1, unitPrice: 10 },
      ],
    }, client as any),
    /Fallo en la segunda modificación|no se puede|vacía|obligatoria/i
  );
});

test("other-organization budgets are blocked before any write is attempted", async () => {
  const client = {
    architectureBudget: {
      findUnique: async () => ({ id: 21, organizationId: 99, projectId: 12, status: "Borrador", project: { id: 12, status: "Planificación", archivedAt: null } }),
    },
    architectureProject: {
      findUnique: async () => ({ id: 12, organizationId: 9, status: "Planificación", archivedAt: null }),
    },
  };

  await assert.rejects(
    () => ArchitectureBudgetService.updateBudget(9, 2, 21, { name: "Cambio ajeno" }, client as any),
    /no encontrado en la organización/i
  );
});
