import assert from "node:assert/strict";
import test from "node:test";
import { ArchitectureCalendarService } from "./architecture-calendar.service";
import { ArchitectureService } from "./architecture.service";
import {
  isValidDateOnlyString,
  getNextDayStartUTC,
  getStartOfDayUTC,
  parseMeetingDateTime,
  formatDateOnly,
  formatTimeOnly,
} from "./architecture-date.utils";

// =============================================================================
// BLOQUE 1: UTILIDADES CENTRALIZADAS DE FECHAS (BACKEND)
// =============================================================================

test("isValidDateOnlyString strictly validates YYYY-MM-DD calendar dates", () => {
  assert.equal(isValidDateOnlyString("2026-10-03"), true);
  assert.equal(isValidDateOnlyString("2024-02-29"), true, "2024-02-29 es válido en año bisiesto");
  assert.equal(isValidDateOnlyString("2026-02-29"), false, "2026-02-29 es inválido en año común");
  assert.equal(isValidDateOnlyString("2026-04-31"), false, "Abril no tiene 31 días");
  assert.equal(isValidDateOnlyString("2026-13-01"), false, "Mes 13 inválido");
  assert.equal(isValidDateOnlyString("03-10-2026"), false, "Formato DD-MM-YYYY no permitido");
  assert.equal(isValidDateOnlyString("not-a-date"), false);
});

test("getStartOfDayUTC and getNextDayStartUTC construct exact semi-open intervals [gte, lt)", () => {
  const start = getStartOfDayUTC("2026-10-01");
  assert.equal(start.toISOString(), "2026-10-01T00:00:00.000Z");

  const nextDay = getNextDayStartUTC("2026-10-31");
  assert.equal(nextDay.toISOString(), "2026-11-01T00:00:00.000Z", "Fin de mes avanza al día 1 del siguiente mes");

  const leapNextDay = getNextDayStartUTC("2024-02-29");
  assert.equal(leapNextDay.toISOString(), "2024-03-01T00:00:00.000Z", "29 de febrero bisiesto avanza a 1 de marzo");

  const yearEndNextDay = getNextDayStartUTC("2026-12-31");
  assert.equal(yearEndNextDay.toISOString(), "2027-01-01T00:00:00.000Z", "31 de diciembre avanza a 1 de enero del siguiente año");
});

test("parseMeetingDateTime handles midnight, evening, and leap days without day drift", () => {
  // Caso 1: Cerca de medianoche (23:55)
  const dtLate = parseMeetingDateTime("2026-10-03", "23:55");
  assert.equal(formatDateOnly(dtLate), "2026-10-03");
  assert.equal(formatTimeOnly(dtLate), "23:55");

  // Caso 2: Medianoche en punto (00:00)
  const dtMidnight = parseMeetingDateTime("2026-10-03", "00:00");
  assert.equal(formatDateOnly(dtMidnight), "2026-10-03");
  assert.equal(formatTimeOnly(dtMidnight), "00:00");

  // Caso 3: Fin de año (31 de Diciembre a las 23:59)
  const dtYearEnd = parseMeetingDateTime("2026-12-31", "23:59");
  assert.equal(formatDateOnly(dtYearEnd), "2026-12-31");
  assert.equal(formatTimeOnly(dtYearEnd), "23:59");

  // Caso 4: 29 de febrero bisiesto
  const dtLeap = parseMeetingDateTime("2024-02-29", "14:30");
  assert.equal(formatDateOnly(dtLeap), "2024-02-29");
  assert.equal(formatTimeOnly(dtLeap), "14:30");

  // Caso 5: Rechazo de fecha inválida
  assert.throws(
    () => parseMeetingDateTime("2026-02-29", "10:00"),
    /inválido/i
  );
});

// =============================================================================
// BLOQUE 2: CALENDARIO READ MODEL (ArchitectureCalendarService)
// =============================================================================

test("getCalendarEvents projects Tasks, Deliverables, and Meetings with semi-open range without losing end-of-day events", async () => {
  const orgId = 15;
  const projectId = 101;

  const mockTasks = [
    {
      id: 1,
      organizationId: orgId,
      projectId,
      title: "Revisión estructural",
      status: "Pendiente",
      priority: "Alta",
      dueDate: new Date("2026-10-15T00:00:00.000Z"),
      project: { id: projectId, name: "Torre Olivos", code: "TO-01" },
      assignedToUserId: 5,
      assignedToUser: { id: 5, name: "Arq. Carlos", email: "carlos@estudio.ec" },
    },
  ];

  const mockDeliverables = [
    {
      id: 10,
      organizationId: orgId,
      projectId,
      name: "Memoria de Cálculo",
      type: "Memorias",
      status: "En revisión",
      dueDate: new Date("2026-10-20T00:00:00.000Z"),
      project: { id: projectId, name: "Torre Olivos", code: "TO-01" },
      assignedToUserId: null,
      assignedToUser: null,
    },
  ];

  const mockMeetings = [
    {
      id: 100,
      organizationId: orgId,
      projectId,
      title: "Reunión de Cierre de Mes",
      status: "Programada",
      scheduledAt: new Date("2026-10-31T23:45:00.000Z"), // Evento a las 23:45 del último día
      project: { id: projectId, name: "Torre Olivos", code: "TO-01" },
      leadArchitectUserId: 5,
      leadArchitectUser: { id: 5, name: "Arq. Carlos", email: "carlos@estudio.ec" },
      location: "Sala de Juntas",
      notes: "Cierre mensual",
    },
  ];

  let taskWhereCaptured: any = null;
  let meetingWhereCaptured: any = null;

  const mockClient = {
    architectureTask: {
      findMany: async (args: any) => {
        taskWhereCaptured = args.where;
        return mockTasks;
      },
    },
    architectureDeliverable: {
      findMany: async () => mockDeliverables,
    },
    architectureMeeting: {
      findMany: async (args: any) => {
        meetingWhereCaptured = args.where;
        return mockMeetings;
      },
    },
  };

  const events = await ArchitectureCalendarService.getCalendarEvents(
    orgId,
    {
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      projectId,
    },
    mockClient as any
  );

  // Verificaciones del filtro semiabierto [gte: 2026-10-01, lt: 2026-11-01)
  assert.equal(taskWhereCaptured.dueDate.gte.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(taskWhereCaptured.dueDate.lt.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(meetingWhereCaptured.scheduledAt.lt.toISOString(), "2026-11-01T00:00:00.000Z");

  // El evento de las 23:45 del 31 de octubre fue incluido
  assert.equal(events.length, 3, "Debe incluir los 3 eventos sin duplicados ni exclusiones");
  assert.equal(events[0].sourceType, "task");
  assert.equal(events[1].sourceType, "deliverable");
  assert.equal(events[2].sourceType, "meeting");
  assert.equal(events[2].date, "2026-10-31");
  assert.equal(events[2].time, "23:45");
});

test("getCalendarEvents supports sourceType filtering (meeting, task, deliverable)", async () => {
  const orgId = 15;
  let taskCalled = false;
  let delivCalled = false;
  let meetingCalled = false;

  const mockClient = {
    architectureTask: {
      findMany: async () => {
        taskCalled = true;
        return [];
      },
    },
    architectureDeliverable: {
      findMany: async () => {
        delivCalled = true;
        return [];
      },
    },
    architectureMeeting: {
      findMany: async () => {
        meetingCalled = true;
        return [];
      },
    },
  };

  await ArchitectureCalendarService.getCalendarEvents(orgId, { sourceType: "meeting" }, mockClient as any);
  assert.equal(meetingCalled, true);
  assert.equal(taskCalled, false);
  assert.equal(delivCalled, false);
});

// =============================================================================
// BLOQUE 3: GESTIÓN Y COHERENCIA DE REUNIONES (ArchitectureService.createMeeting)
// =============================================================================

test("createMeeting creates a meeting with valid project and matching client", async () => {
  const orgId = 20;
  const userId = 7;
  const projectId = 50;
  const clientId = 30;

  const validProject = {
    id: projectId,
    organizationId: orgId,
    name: "Edificio Panorama",
    code: "EP-2026",
    status: "Diseño",
    clientId: clientId,
    client: { id: clientId, name: "Inmobiliaria Panorama" },
  };

  let createdData: any = null;

  const mockClient = {
    user: {
      findUnique: async () => ({ id: 7, name: "Arq. Diana", status: "ACTIVE", professionalProfile: null }),
    },
    architectureProject: {
      findUnique: async (args: any) => (args.where.id === projectId ? validProject : null),
    },
    organizationMember: {
      findUnique: async () => ({ id: 1, userId: 7, organizationId: orgId, status: "ACTIVE", role: "PROFESSIONAL", user: { id: 7, name: "Arq. Diana" } }),
      findFirst: async () => ({ id: 1, userId: 7, organizationId: orgId, status: "ACTIVE", role: "PROFESSIONAL", user: { id: 7, name: "Arq. Diana" } }),
    },
    architectureMeeting: {
      create: async (args: any) => {
        createdData = args.data;
        return { id: 99, ...args.data };
      },
      findUnique: async () => ({
        id: 99,
        organizationId: orgId,
        projectId,
        title: "Revisión de Fachada",
        scheduledAt: new Date("2026-10-10T11:00:00.000Z"),
        location: "Estudio Principal",
        modality: "Presencial",
        meetingType: "Reunión",
        leadArchitectUserId: 7,
        leadArchitectUser: { id: 7, name: "Arq. Diana", email: "diana@estudio.ec" },
        status: "Programada",
        notes: "Llevar muestras",
        createdByUserId: userId,
        project: validProject,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
  };

  const meeting = await ArchitectureService.createMeeting(
    orgId,
    userId,
    {
      projectId,
      clientId,
      title: "Revisión de Fachada",
      date: "2026-10-10",
      time: "11:00",
      location: "Estudio Principal",
      leadArchitectUserId: 7,
      notes: "Llevar muestras",
    },
    mockClient as any
  );

  assert.equal(meeting.id, 99);
  assert.equal(meeting.date, "2026-10-10");
  assert.equal(meeting.time, "11:00");
  assert.equal(meeting.clientName, "Inmobiliaria Panorama");
  assert.equal(createdData.completedAt, null);
  assert.equal(createdData.cancelledAt, null);
});

test("createMeeting rejects project belonging to another organization (multi-tenant isolation)", async () => {
  const orgId = 20;
  const otherOrgId = 99;

  const otherOrgProject = {
    id: 80,
    organizationId: otherOrgId,
    name: "Proyecto Ajeno",
    status: "Diseño",
  };

  const mockClient = {
    architectureProject: {
      findUnique: async () => otherOrgProject,
    },
  };

  await assert.rejects(
    () =>
      ArchitectureService.createMeeting(
        orgId,
        1,
        { projectId: 80, title: "Intento cross-tenant", date: "2026-10-10" },
        mockClient as any
      ),
    /no encontrado en la organización/i
  );
});

test("createMeeting rejects scheduling meetings on archived projects", async () => {
  const orgId = 20;
  const archivedProject = {
    id: 85,
    organizationId: orgId,
    name: "Proyecto Terminado",
    status: "Archivado",
  };

  const mockClient = {
    architectureProject: {
      findUnique: async () => archivedProject,
    },
  };

  await assert.rejects(
    () =>
      ArchitectureService.createMeeting(
        orgId,
        1,
        { projectId: 85, title: "Reunión en archivado", date: "2026-10-10" },
        mockClient as any
      ),
    /archivado/i
  );
});

test("createMeeting rejects incompatible clientId that does not match project.clientId", async () => {
  const orgId = 20;
  const project = {
    id: 50,
    organizationId: orgId,
    name: "Edificio Centro",
    status: "Diseño",
    clientId: 10,
    client: { id: 10, name: "Cliente Original" },
  };

  const mockClient = {
    architectureProject: {
      findUnique: async () => project,
    },
  };

  await assert.rejects(
    () =>
      ArchitectureService.createMeeting(
        orgId,
        1,
        { projectId: 50, clientId: 999, title: "Reunión Cliente Incompatible", date: "2026-10-10" },
        mockClient as any
      ),
    /no coincide con el cliente del proyecto/i
  );
});

// =============================================================================
// BLOQUE 4: ACTUALIZACIÓN Y TRANSICIÓN DE ESTADOS (ArchitectureService.updateMeeting)
// =============================================================================

test("updateMeeting updates fields, maintains project compatibility, and validates destination project if changed", async () => {
  const orgId = 20;
  const existingMeeting = {
    id: 100,
    organizationId: orgId,
    projectId: 50,
    title: "Reunión Vieja",
    scheduledAt: new Date("2026-10-10T10:00:00.000Z"),
    status: "Programada",
    completedAt: null,
    cancelledAt: null,
    project: {
      id: 50,
      organizationId: orgId,
      status: "Diseño",
      clientId: 10,
      client: { id: 10, name: "Cliente A" },
    },
  };

  const destinationProject = {
    id: 60,
    organizationId: orgId,
    status: "Construcción",
    clientId: 20,
    client: { id: 20, name: "Cliente B" },
  };

  let updatePayload: any = null;

  const mockClient = {
    architectureMeeting: {
      findUnique: async () => existingMeeting,
      update: async (args: any) => {
        updatePayload = args.data;
        return { ...existingMeeting, ...args.data };
      },
    },
    architectureProject: {
      findUnique: async (args: any) => (args.where.id === 60 ? destinationProject : null),
    },
  };

  // 1. Cambio de proyecto exitoso con cliente coincidente
  await ArchitectureService.updateMeeting(
    orgId,
    100,
    {
      projectId: 60,
      clientId: 20,
      title: "Reunión Reasignada a Proyecto B",
      date: "2026-10-25",
      time: "16:00",
    },
    mockClient as any
  );

  assert.equal(updatePayload.projectId, 60);
  assert.equal(updatePayload.title, "Reunión Reasignada a Proyecto B");
  assert.equal(updatePayload.scheduledAt.toISOString(), "2026-10-25T16:00:00.000Z");

  // 2. Cambio de proyecto rechazado si el cliente no coincide con el nuevo proyecto
  await assert.rejects(
    () =>
      ArchitectureService.updateMeeting(
        orgId,
        100,
        {
          projectId: 60,
          clientId: 999, // Incompatible con Cliente B (id: 20)
        },
        mockClient as any
      ),
    /no coincide con el cliente del proyecto/i
  );
});

test("updateMeeting manages status transitions and coherent timestamp lifecycles (Realizada, Cancelada, Programada)", async () => {
  const orgId = 20;
  const existingMeeting = {
    id: 100,
    organizationId: orgId,
    projectId: 50,
    title: "Reunión de Obra",
    scheduledAt: new Date("2026-10-10T10:00:00.000Z"),
    status: "Programada",
    completedAt: null,
    cancelledAt: null,
    project: { id: 50, organizationId: orgId, status: "Diseño" },
  };

  let updatedData: any = null;

  const mockClient = {
    architectureMeeting: {
      findUnique: async () => existingMeeting,
      update: async (args: any) => {
        updatedData = args.data;
        return { ...existingMeeting, ...args.data };
      },
    },
  };

  // Transición 1: Programada -> Realizada (debe fijar completedAt y anular cancelledAt)
  await ArchitectureService.updateMeeting(orgId, 100, { status: "Realizada" }, mockClient as any);
  assert.equal(updatedData.status, "Realizada");
  assert.ok(updatedData.completedAt instanceof Date, "completedAt debe ser un Date");
  assert.equal(updatedData.cancelledAt, null);

  // Transición 2: Realizada -> Cancelada (debe fijar cancelledAt y anular completedAt)
  existingMeeting.status = "Realizada";
  existingMeeting.completedAt = new Date() as any;
  await ArchitectureService.updateMeeting(orgId, 100, { status: "Cancelada" }, mockClient as any);
  assert.equal(updatedData.status, "Cancelada");
  assert.ok(updatedData.cancelledAt instanceof Date, "cancelledAt debe ser un Date");
  assert.equal(updatedData.completedAt, null);

  // Transición 3: Cancelada -> Programada (debe resetear ambos a null)
  existingMeeting.status = "Cancelada";
  existingMeeting.cancelledAt = new Date() as any;
  await ArchitectureService.updateMeeting(orgId, 100, { status: "Programada" }, mockClient as any);
  assert.equal(updatedData.status, "Programada");
  assert.equal(updatedData.completedAt, null);
  assert.equal(updatedData.cancelledAt, null);
});

test("updateMeeting blocks mutations on archived projects", async () => {
  const orgId = 20;
  const archivedMeeting = {
    id: 105,
    organizationId: orgId,
    projectId: 90,
    title: "Reunión Archivada",
    scheduledAt: new Date("2026-05-10T10:00:00.000Z"),
    project: { id: 90, organizationId: orgId, status: "Archivado" },
  };

  const mockClient = {
    architectureMeeting: {
      findUnique: async () => archivedMeeting,
    },
  };

  await assert.rejects(
    () =>
      ArchitectureService.updateMeeting(
        orgId,
        105,
        { title: "Intento modificar reunión en proyecto archivado" },
        mockClient as any
      ),
    /archivado/i
  );
});
