import assert from "node:assert/strict";
import test from "node:test";
import { ArchitectureService } from "./architecture.service";

test("valid organization member can be assigned and is returned by name and ID", async () => {
  const now = new Date("2026-10-02T10:00:00.000Z");
  const taskRecord: any = {
    id: 40,
    organizationId: 9,
    projectId: 12,
    title: "Revisar planos",
    assignedToUserId: 3,
    assignedToUser: { id: 3, name: "Ana Arquitecta", email: "ana@example.com" },
    project: { id: 12, name: "Casa Norte" },
    stage: null,
    status: "Pendiente",
    priority: "Media",
    dueDate: null,
    createdAt: now,
  };
  let assignedMemberChecks = 0;
  const client = {
    architectureProject: { findUnique: async () => ({ id: 12, organizationId: 9, status: "Diseño" }) },
    architectureTask: {
      create: async ({ data }: any) => {
        Object.assign(taskRecord, data);
        return { id: 40 };
      },
      findUnique: async () => taskRecord,
    },
    user: { findUnique: async () => ({ id: 3, name: "Ana Arquitecta", status: "ACTIVE" }) },
    organizationMember: {
      findUnique: async () => {
        assignedMemberChecks++;
        return { status: "ACTIVE", role: "PROFESSIONAL" };
      },
    },
  };

  const result = await ArchitectureService.createTask(9, 2, {
    projectId: 12,
    title: "Revisar planos",
    assignedToUserId: 3,
  }, client as any);

  assert.equal(assignedMemberChecks, 1);
  assert.equal(taskRecord.assignedToUserId, 3);
  assert.equal(result.assignedToUserId, 3);
  assert.equal(result.assignedTo, "Ana Arquitecta");
});

test("assignment rejects a user who is not a member of the organization", async () => {
  const client = {
    user: { findUnique: async () => ({ id: 4, name: "Externo", status: "ACTIVE" }) },
    organizationMember: { findUnique: async () => null },
  };

  await assert.rejects(
    () => ArchitectureService.validateAssignedMember(9, 4, client as any),
    /miembro activo/i
  );
});

test("assignment rejects a user ID that does not exist", async () => {
  const client = {
    user: { findUnique: async () => null },
    organizationMember: { findUnique: async () => { throw new Error("membership lookup must not run"); } },
  };

  await assert.rejects(
    () => ArchitectureService.validateAssignedMember(9, 404, client as any),
    /no existe/i
  );
});

test("assignment rejects an inactive membership", async () => {
  const client = {
    user: { findUnique: async () => ({ id: 4, name: "Externo", status: "ACTIVE" }) },
    organizationMember: { findUnique: async () => ({ status: "INACTIVE", role: "PROFESSIONAL" }) },
  };

  await assert.rejects(
    () => ArchitectureService.validateAssignedMember(9, 4, client as any),
    /miembro activo/i
  );
});

test("assignment rejects a globally inactive user", async () => {
  const client = {
    user: { findUnique: async () => ({ id: 4, name: "Inactivo", status: "INACTIVE" }) },
    organizationMember: { findUnique: async () => ({ status: "ACTIVE", role: "PROFESSIONAL" }) },
  };

  await assert.rejects(
    () => ArchitectureService.validateAssignedMember(9, 4, client as any),
    /no es un miembro activo autorizado/i
  );
});

test("responsible architect validation preserves the existing forbidden-role policy", async () => {
  const client = {
    user: { findUnique: async () => ({ id: 4, name: "Asistente", status: "ACTIVE" }) },
    organizationMember: { findUnique: async () => ({ status: "ACTIVE", role: "ASSISTANT" }) },
  };

  await assert.rejects(
    () => ArchitectureService.validateResponsibleArchitect(9, 4, client as any),
    /no está autorizado/i
  );
});

test("assignable user catalog is limited to active members of the requested organization", async () => {
  let query: any;
  const client = {
    organizationMember: {
      findMany: async (args: any) => {
        query = args;
        return [{ role: "PROFESSIONAL", user: { id: 4, name: "Ana", email: "ana@example.com" } }];
      },
    },
  };

  const members = await ArchitectureService.listAssignableOrganizationMembers(15, client as any);

  assert.deepEqual(query.where, {
    organizationId: 15,
    status: "ACTIVE",
    user: { status: "ACTIVE" },
  });
  assert.deepEqual(members, [{
    id: 4,
    name: "Ana",
    email: "ana@example.com",
    role: "PROFESSIONAL",
    canBeResponsible: true,
  }]);
});

test("task assignment remains optional", async () => {
  const now = new Date("2026-10-02T10:00:00.000Z");
  let createdData: any;
  const taskRecord = {
    id: 41,
    organizationId: 9,
    projectId: 12,
    title: "Tarea sin asignar",
    assignedToUserId: null,
    assignedToUser: null,
    project: { id: 12, name: "Casa Norte" },
    stage: null,
    status: "Pendiente",
    priority: "Media",
    dueDate: null,
    createdAt: now,
  };
  const client = {
    architectureProject: { findUnique: async () => ({ id: 12, organizationId: 9, status: "Diseño" }) },
    architectureTask: {
      create: async ({ data }: any) => {
        createdData = data;
        return { id: 41 };
      },
      findUnique: async () => taskRecord,
    },
  };

  const result = await ArchitectureService.createTask(9, 2, {
    projectId: 12,
    title: "Tarea sin asignar",
  }, client as any);

  assert.equal(createdData.assignedToUserId, null);
  assert.equal(result.assignedTo, "Sin asignar");
  assert.equal(result.assignedToUserId, undefined);
});

test("editing assignment updates the user reference and returns its current name", async () => {
  const now = new Date("2026-10-02T10:00:00.000Z");
  const taskRecord: any = {
    id: 42,
    organizationId: 9,
    projectId: 12,
    title: "Tarea existente",
    assignedToUserId: 5,
    assignedToUser: { id: 5, name: "Luis Diseñador", email: "luis@example.com" },
    project: { id: 12, name: "Casa Norte", status: "Diseño" },
    stage: null,
    status: "Pendiente",
    priority: "Media",
    dueDate: null,
    createdAt: now,
  };
  let updateData: any;
  const client = {
    architectureTask: {
      findUnique: async () => taskRecord,
      update: async ({ data }: any) => {
        updateData = data;
        taskRecord.assignedToUserId = data.assignedToUserId;
        taskRecord.assignedToUser = { id: 5, name: "Luis Diseñador", email: "luis@example.com" };
        return taskRecord;
      },
    },
    user: { findUnique: async () => ({ id: 5, name: "Luis Diseñador", status: "ACTIVE" }) },
    organizationMember: { findUnique: async () => ({ status: "ACTIVE", role: "PROFESSIONAL" }) },
  };

  const result = await ArchitectureService.updateTask(9, 42, { assignedToUserId: 5 }, client as any);

  assert.equal(updateData.assignedToUserId, 5);
  assert.equal(result.assignedToUserId, 5);
  assert.equal(result.assignedTo, "Luis Diseñador");
});

test("historical assignment DTOs retain their referenced user presentation", () => {
  const task = ArchitectureService.mapTaskDTO({
    id: 90,
    assignedToUserId: 7,
    assignedToUser: { id: 7, name: "Responsable histórico" },
    project: { name: "Proyecto anterior" },
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
  });

  assert.equal(task.assignedToUserId, 7);
  assert.equal(task.assignedTo, "Responsable histórico");
});

test("project creation requires an explicit lead instead of substituting the creator", async () => {
  await assert.rejects(
    () => ArchitectureService.createProject(9, 2, { clientId: 1, name: "Proyecto sin responsable" } as any),
    /selección de un arquitecto responsable válido es obligatoria/i
  );
});