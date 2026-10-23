import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ArchitectureService } from "./architecture.service";

describe("ARQ PRO STUDIO — Etapas Dinámicas por Proyecto", () => {
  const orgA = 100;
  const orgB = 200;
  const projectIdA = 501;
  const projectIdB = 502;

  const createMockDb = (initialStages: any[] = [], relatedCounts = { tasks: 0, deliverables: 0, documents: 0 }) => {
    let stages = [...initialStages];

    return {
      architectureProject: {
        findUnique: async ({ where }: any) => {
          if (where.id === projectIdA) {
            return {
              id: projectIdA,
              organizationId: orgA,
              clientId: 10,
              code: "PRJ-2026-001",
              name: "Edificio Panorama",
              type: "Edificio",
              status: "Planificación",
              stages: stages.filter((s) => s.projectId === projectIdA).sort((a, b) => a.order - b.order),
              budgets: [],
              client: { id: 10, name: "Inmobiliaria del Sur" },
              leadArchitectUser: { id: 1, name: "Arq. Principal", email: "arq@test.ec" },
            };
          }
          if (where.id === projectIdB) {
            return {
              id: projectIdB,
              organizationId: orgB,
              clientId: 20,
              code: "PRJ-2026-002",
              name: "Casa de Playa",
              type: "Vivienda",
              status: "Planificación",
              stages: stages.filter((s) => s.projectId === projectIdB).sort((a, b) => a.order - b.order),
              budgets: [],
              client: { id: 20, name: "Cliente B" },
              leadArchitectUser: { id: 2, name: "Arq. B", email: "arqb@test.ec" },
            };
          }
          return null;
        },
      },
      architectureProjectStage: {
        findUnique: async ({ where }: any) => {
          return stages.find((s) => s.id === where.id) || null;
        },
        create: async ({ data }: any) => {
          const newStage = {
            id: Math.max(0, ...stages.map((s) => s.id)) + 1,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          stages.push(newStage);
          return newStage;
        },
        update: async ({ where, data }: any) => {
          const idx = stages.findIndex((s) => s.id === where.id);
          if (idx === -1) throw new Error("Stage not found");
          stages[idx] = { ...stages[idx], ...data, updatedAt: new Date() };
          return stages[idx];
        },
        delete: async ({ where }: any) => {
          const idx = stages.findIndex((s) => s.id === where.id);
          if (idx === -1) throw new Error("Stage not found");
          const deleted = stages[idx];
          stages = stages.filter((s) => s.id !== where.id);
          return deleted;
        },
      },
      architectureTask: {
        count: async ({ where }: any) => {
          return relatedCounts.tasks;
        },
      },
      architectureDeliverable: {
        count: async ({ where }: any) => {
          return relatedCounts.deliverables;
        },
      },
      architectureDocument: {
        count: async ({ where }: any) => {
          return relatedCounts.documents;
        },
      },
    };
  };

  test("1. Crear etapa asigna el número de orden al final y pertenece al proyecto correcto", async () => {
    const initialStages = [
      { id: 1, organizationId: orgA, projectId: projectIdA, name: "Conceptualización", order: 1, status: "Completada", progress: 100 },
      { id: 2, organizationId: orgA, projectId: projectIdA, name: "Anteproyecto", order: 2, status: "En progreso", progress: 50 },
    ];
    const mockDb = createMockDb(initialStages);

    const updatedProject = await ArchitectureService.createStage(
      orgA,
      projectIdA,
      { name: "Permisos Municipales" },
      mockDb as any
    );

    assert.equal(updatedProject.stages.length, 3);
    const lastStage = updatedProject.stages[2];
    assert.equal(lastStage.name, "Permisos Municipales");
    assert.equal(lastStage.order, 3);
    assert.equal(lastStage.projectId, projectIdA);
    assert.equal(lastStage.progress, 0);
    assert.equal(lastStage.status, "Pendiente");

    // Progreso global: (100 + 50 + 0) / 3 = 50%
    assert.equal(updatedProject.progress, 50);
  });

  test("2. Organización A no puede crear etapas en proyecto de Organización B (aislamiento multi-tenant)", async () => {
    const mockDb = createMockDb([]);

    await assert.rejects(
      async () => {
        await ArchitectureService.createStage(
          orgA, // Intenta Org A
          projectIdB, // Proyecto de Org B
          { name: "Etapa No Autorizada" },
          mockDb as any
        );
      },
      (err: any) => {
        assert.match(err.message, /no encontrado en la organización/i);
        return true;
      }
    );
  });

  test("3. Rechazar creación de etapa si el nombre está vacío", async () => {
    const mockDb = createMockDb([]);

    await assert.rejects(
      async () => {
        await ArchitectureService.createStage(
          orgA,
          projectIdA,
          { name: "   " },
          mockDb as any
        );
      },
      (err: any) => {
        assert.match(err.message, /nombre de la etapa es obligatorio/i);
        return true;
      }
    );
  });

  test("4. Eliminar etapa sin dependencias exitosamente y actualizar progreso", async () => {
    const initialStages = [
      { id: 1, organizationId: orgA, projectId: projectIdA, name: "Conceptualización", order: 1, status: "Completada", progress: 100 },
      { id: 2, organizationId: orgA, projectId: projectIdA, name: "Anteproyecto", order: 2, status: "Pendiente", progress: 0 },
    ];
    const mockDb = createMockDb(initialStages, { tasks: 0, deliverables: 0, documents: 0 });

    const updatedProject = await ArchitectureService.deleteStage(
      orgA,
      projectIdA,
      2, // Eliminar etapa 2
      mockDb as any
    );

    assert.equal(updatedProject.stages.length, 1);
    assert.equal(updatedProject.stages[0].id, 1);
    // Progreso global pasa a 100% (100 / 1)
    assert.equal(updatedProject.progress, 100);
  });

  test("5. Bloquear eliminación de etapa con tareas asociadas con conflicto 409", async () => {
    const initialStages = [
      { id: 1, organizationId: orgA, projectId: projectIdA, name: "Diseño", order: 1, status: "En progreso", progress: 40 },
    ];
    const mockDb = createMockDb(initialStages, { tasks: 2, deliverables: 0, documents: 0 });

    await assert.rejects(
      async () => {
        await ArchitectureService.deleteStage(orgA, projectIdA, 1, mockDb as any);
      },
      (err: any) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /contiene tareas o entregables asociados/i);
        return true;
      }
    );
  });

  test("6. Bloquear eliminación de etapa con entregables asociados con conflicto 409", async () => {
    const initialStages = [
      { id: 1, organizationId: orgA, projectId: projectIdA, name: "Planos", order: 1, status: "En progreso", progress: 20 },
    ];
    const mockDb = createMockDb(initialStages, { tasks: 0, deliverables: 1, documents: 0 });

    await assert.rejects(
      async () => {
        await ArchitectureService.deleteStage(orgA, projectIdA, 1, mockDb as any);
      },
      (err: any) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /contiene tareas o entregables asociados/i);
        return true;
      }
    );
  });

  test("7. Bloquear eliminación de etapa con documentos asociados con conflicto 409", async () => {
    const initialStages = [
      { id: 1, organizationId: orgA, projectId: projectIdA, name: "Revisión", order: 1, status: "Pendiente", progress: 0 },
    ];
    const mockDb = createMockDb(initialStages, { tasks: 0, deliverables: 0, documents: 1 });

    await assert.rejects(
      async () => {
        await ArchitectureService.deleteStage(orgA, projectIdA, 1, mockDb as any);
      },
      (err: any) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /contiene tareas o entregables asociados/i);
        return true;
      }
    );
  });

  test("8. Organización A no puede eliminar etapas de Organización B", async () => {
    const initialStages = [
      { id: 99, organizationId: orgB, projectId: projectIdB, name: "Etapa B", order: 1, status: "Pendiente", progress: 0 },
    ];
    const mockDb = createMockDb(initialStages);

    await assert.rejects(
      async () => {
        await ArchitectureService.deleteStage(orgA, projectIdB, 99, mockDb as any);
      },
      (err: any) => {
        assert.match(err.message, /no encontrada/i);
        return true;
      }
    );
  });

  test("9. Proyecto sin etapas calcula progreso global en 0% sin división por cero ni errores", async () => {
    const initialStages = [
      { id: 1, organizationId: orgA, projectId: projectIdA, name: "Única etapa", order: 1, status: "Pendiente", progress: 0 },
    ];
    const mockDb = createMockDb(initialStages, { tasks: 0, deliverables: 0, documents: 0 });

    const updatedProject = await ArchitectureService.deleteStage(
      orgA,
      projectIdA,
      1,
      mockDb as any
    );

    assert.equal(updatedProject.stages.length, 0);
    assert.equal(updatedProject.progress, 0);
    assert.ok(!isNaN(updatedProject.progress));
  });
});
