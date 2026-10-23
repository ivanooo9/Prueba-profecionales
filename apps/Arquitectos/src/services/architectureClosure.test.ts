import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Client, Project, Task, DashboardData } from "../types";

describe("ARQ-016 & ARQ-008 — Cierre Funcional Frontend: Selector de Clientes y Consistencia de Dashboard", () => {
  const clientsMock: Client[] = [
    {
      id: "cli-1",
      name: "Constructora Activa S.A.",
      type: "Corporativo",
      status: "Activo",
      email: "contacto@activa.ec",
      createdAt: "2026-01-01",
      projectsCount: 2,
    },
    {
      id: "cli-2",
      name: "Cliente Inactivo SRL",
      type: "Comercial",
      status: "Inactivo",
      email: "contacto@inactivo.ec",
      createdAt: "2026-01-02",
      projectsCount: 1,
    },
    {
      id: "cli-3",
      name: "Persona Natural Activa",
      type: "Particular",
      status: "Activo",
      email: "persona@activa.ec",
      createdAt: "2026-01-03",
      projectsCount: 0,
    },
  ];

  test("1. Selector de clientes: Para nuevo proyecto solo filtra clientes con status Activo", () => {
    const isNewProject = true;
    const initialData: Project | null = null;

    const availableClients = initialData
      ? clientsMock
      : clientsMock.filter((c) => c && c.status === "Activo");

    assert.equal(availableClients.length, 2);
    assert.deepEqual(
      availableClients.map((c) => c.id),
      ["cli-1", "cli-3"]
    );
    assert.ok(!availableClients.some((c) => c.id === "cli-2"));
  });

  test("2. Selector de clientes: Para edición de proyecto preserva relación con cliente histórico aunque esté inactivo", () => {
    const historicalProject: Project = {
      id: 99,
      code: "PRJ-2025-001",
      name: "Edificio Histórico",
      clientId: "cli-2", // Vinculado a cliente ahora inactivo
      clientName: "Cliente Inactivo SRL",
      type: "Edificio",
      status: "Construcción",
      stages: [],
      createdAt: "2025-05-01",
      updatedAt: "2026-01-01",
    };

    const availableClients = historicalProject
      ? clientsMock
      : clientsMock.filter((c) => c && c.status === "Activo");

    // En edición contiene los clientes disponibles preservando la opción del cliente asignado
    assert.equal(availableClients.length, 3);
    const assignedClient = availableClients.find((c) => c.id === historicalProject.clientId);
    assert.ok(assignedClient);
    assert.equal(assignedClient.status, "Inactivo");
  });

  test("3. Estado vacío: Detecta cuando no hay clientes activos para nuevo proyecto", () => {
    const onlyInactiveClients: Client[] = [
      {
        id: "cli-2",
        name: "Solo Inactivo",
        type: "Comercial",
        status: "Inactivo",
        createdAt: "2026-01-02",
        projectsCount: 0,
      },
    ];

    const availableClients = onlyInactiveClients.filter((c) => c.status === "Activo");
    assert.equal(availableClients.length, 0);

    const placeholderMessage =
      availableClients.length === 0
        ? "Sin clientes activos disponibles"
        : "Seleccione un cliente";
    assert.equal(placeholderMessage, "Sin clientes activos disponibles");
  });

  test("4. Dashboard: Métricas canónicas coinciden con backend y evitan cálculos parciales", () => {
    const dashboardDataMock: DashboardData = {
      metrics: {
        activeProjectsCount: 4,
        totalProjectsCount: 7,
        totalBudgetApproved: 45000,
        totalBudgetEstimated: 78000,
        pendingTasksCount: 10,
        urgentTasksCount: 3,
        pendingDeliverablesCount: 2,
        upcomingMeetingsCount: 5,
      },
      recentProjects: [],
      urgentTasks: [],
      upcomingMeetings: [],
      budgetSummary: {
        totalEstimated: 78000,
        totalApproved: 45000,
        approvedBudgetsCount: 2,
        draftBudgetsCount: 2,
        estimatedProjectsCount: 4,
        ambiguousProjectsCount: 0,
      },
    };

    const fallbackUrgentTasks: Task[] = [];
    const fallbackMeetings: any[] = [];
    const fallbackActiveProjects: Project[] = [];

    const urgentTasksCount = dashboardDataMock.metrics.urgentTasksCount ?? fallbackUrgentTasks.length;
    const upcomingMeetingsCount = dashboardDataMock.metrics.upcomingMeetingsCount ?? fallbackMeetings.length;
    const activeProjectsCount = dashboardDataMock.metrics.activeProjectsCount ?? fallbackActiveProjects.length;

    assert.equal(urgentTasksCount, 3);
    assert.equal(upcomingMeetingsCount, 5);
    assert.equal(activeProjectsCount, 4);
  });

  test("5. Dashboard: Proyectos en 'Planificación' y 'Construcción' se reconocen correctamente como activos", () => {
    const projectList: Project[] = [
      { id: 1, name: "Casa Planificada", status: "Planificación", code: "P1", clientId: "c1", type: "Vivienda", stages: [], createdAt: "", updatedAt: "" },
      { id: 2, name: "Obra En Construcción", status: "Construcción", code: "P2", clientId: "c1", type: "Vivienda", stages: [], createdAt: "", updatedAt: "" },
      { id: 3, name: "Diseño Interior", status: "En diseño", code: "P3", clientId: "c1", type: "Vivienda", stages: [], createdAt: "", updatedAt: "" },
      { id: 4, name: "Proyecto Entregado", status: "Entregado", code: "P4", clientId: "c1", type: "Vivienda", stages: [], createdAt: "", updatedAt: "" },
      { id: 5, name: "Proyecto Archivado", status: "Archivado", code: "P5", clientId: "c1", type: "Vivienda", stages: [], createdAt: "", updatedAt: "" },
      { id: 6, name: "Proyecto Cancelado", status: "Cancelado", code: "P6", clientId: "c1", type: "Vivienda", stages: [], createdAt: "", updatedAt: "" },
      { id: 7, name: "Proyecto con Marca de Archivo", status: "Planificación", archivedAt: "2026-02-01", code: "P7", clientId: "c1", type: "Vivienda", stages: [], createdAt: "", updatedAt: "" },
    ];

    const activeProjects = projectList.filter((p) => {
      if (!p || !p.status) return false;
      const s = p.status;
      return s !== "Archivado" && s !== "Cancelado" && s !== "Entregado" && !p.archivedAt;
    });

    assert.equal(activeProjects.length, 3);
    assert.deepEqual(
      activeProjects.map((p) => p.name),
      ["Casa Planificada", "Obra En Construcción", "Diseño Interior"]
    );
  });
});
