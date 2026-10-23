import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ArchitectureService } from "./architecture.service";

describe("ARQ-016 & ARQ-009 — Validación de Clientes en Proyectos y Preservación Histórica", () => {
  const orgId = 100;
  const otherOrgId = 999;
  const architectUserId = 55;

  const mockDbFactory = (overrides: {
    clientRecord?: any;
    responsibleArchitect?: any;
    createdProject?: any;
  }) => {
    return {
      $transaction: async (fn: any) => {
        const tx = {
          architectureClient: {
            findUnique: async ({ where }: any) => {
              if (where.id === overrides.clientRecord?.id) {
                return overrides.clientRecord;
              }
              return null;
            },
          },
          user: {
            findUnique: async () => overrides.responsibleArchitect || { id: architectUserId, status: "ACTIVE" },
          },
          organizationMember: {
            findUnique: async () => ({
              organizationId: orgId,
              userId: architectUserId,
              status: "ACTIVE",
              role: "MEMBER",
            }),
          },
          architectureProject: {
            findFirst: async () => null,
            findMany: async () => [],
            create: async ({ data }: any) => ({
              id: 501,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
            findUnique: async ({ where }: any) => ({
              id: where.id || 501,
              organizationId: orgId,
              clientId: overrides.clientRecord?.id || 10,
              code: "PRJ-ARQ-2026-0001",
              name: "Residencia Test",
              type: "Vivienda",
              status: "Planificación",
              stages: [],
              budgets: [],
              client: overrides.clientRecord,
              leadArchitectUser: { id: architectUserId, name: "Arq. Responsable", email: "arq@test.ec" },
            }),
          },
          $executeRawUnsafe: async () => 1,
          architectureProjectStage: {
            create: async ({ data }: any) => ({ id: Math.floor(Math.random() * 1000), ...data }),
          },
        };
        return await fn(tx);
      },
    };
  };

  test("1. Cliente activo de la misma organización: creación de proyecto permitida", async () => {
    const activeClient = {
      id: 10,
      organizationId: orgId,
      name: "Juan Pérez Activo",
      status: "Activo",
    };

    // Sobrescribir temporalmente db
    const origDb = (ArchitectureService as any).db;
    const mockDb = mockDbFactory({ clientRecord: activeClient });

    // Instanciar / invocar con mock transaction
    const project = await ArchitectureService.createProject(
      orgId,
      architectUserId,
      {
        name: "Proyecto Los Álamos",
        clientId: 10,
        leadArchitectUserId: architectUserId,
        type: "Vivienda",
      },
      mockDb as any
    );

    assert.ok(project);
    assert.equal(project.name, "Residencia Test");
    assert.equal(project.clientId, 10);
  });

  test("2. Cliente inactivo de la misma organización: creación de proyecto rechazada con error de validación", async () => {
    const inactiveClient = {
      id: 20,
      organizationId: orgId,
      name: "Constructora Inactiva",
      status: "Inactivo",
    };

    const mockDb = mockDbFactory({ clientRecord: inactiveClient });

    await assert.rejects(
      async () => {
        await ArchitectureService.createProject(
          orgId,
          architectUserId,
          {
            name: "Proyecto Rechazado",
            clientId: 20,
            leadArchitectUserId: architectUserId,
          },
          mockDb as any
        );
      },
      (err: Error) => {
        assert.match(err.message, /inactivo/i);
        return true;
      }
    );
  });

  test("3. Cliente de otra organización: creación de proyecto rechazada por aislamiento multi-tenant", async () => {
    const otherOrgClient = {
      id: 30,
      organizationId: otherOrgId, // Otra organización
      name: "Cliente Invasor",
      status: "Activo",
    };

    const mockDb = mockDbFactory({ clientRecord: otherOrgClient });

    await assert.rejects(
      async () => {
        await ArchitectureService.createProject(
          orgId,
          architectUserId,
          {
            name: "Proyecto Multi-tenant Invalido",
            clientId: 30,
            leadArchitectUserId: architectUserId,
          },
          mockDb as any
        );
      },
      (err: Error) => {
        assert.match(err.message, /no existe en esta organización/i);
        return true;
      }
    );
  });

  test("4. Proyecto histórico con cliente posteriormente inactivo: relación y edición no destructiva preservadas", async () => {
    const historicalProject = {
      id: 777,
      organizationId: orgId,
      clientId: 20, // Cliente que ahora está inactivo
      code: "PRJ-ARQ-2025-0010",
      name: "Proyecto Histórico Antiguo",
      type: "Comercial",
      status: "Construcción",
      approxAreaM2: 500,
    };

    let updatedDataCapture: any = null;
    const mockClient = {
      architectureProject: {
        findUnique: async () => historicalProject,
        update: async ({ data }: any) => {
          updatedDataCapture = data;
          return { ...historicalProject, ...data };
        },
      },
    };

    // Actualizar nombre o notas sin alterar la vinculación con el cliente histórico
    const updated = await ArchitectureService.updateProject(
      orgId,
      777,
      {
        name: "Proyecto Histórico Nombre Actualizado",
        notes: "Edición preservando cliente histórico inactivo",
      },
      mockClient as any
    );

    assert.ok(updated);
    assert.equal(updatedDataCapture.name, "Proyecto Histórico Nombre Actualizado");
    assert.equal(updatedDataCapture.notes, "Edición preservando cliente histórico inactivo");
    // El clientId no se borró ni se modificó
    assert.equal(updatedDataCapture.clientId, undefined);
  });
});
