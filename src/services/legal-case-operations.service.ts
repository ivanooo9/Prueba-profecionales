import { db } from "../lib/db";

export interface CreateActivityInput {
  organizationId?: number;
  legalCaseId?: number;
  type: string;
  title: string;
  description?: string | null;
  occurredAt?: string | Date;
  createdByUserId?: number | null;
  performedBy?: string | null;
}

export interface CreateTaskInput {
  organizationId?: number;
  legalCaseId?: number;
  title: string;
  description?: string | null;
  dueDate: string | Date;
  priority?: "Baja" | "Media" | "Alta" | "Urgente" | string;
  status?: "Pendiente" | "En progreso" | "Completada" | "Atrasada" | "Cancelada" | string;
  assignedToUserId?: number | null;
  assignedTo?: string | null;
}

export interface UpdateTaskInput {
  organizationId?: number;
  legalCaseId?: number;
  title?: string;
  description?: string | null;
  dueDate?: string | Date;
  priority?: string;
  status?: string;
  assignedToUserId?: number | null;
  assignedTo?: string | null;
  completedAt?: string | Date | null;
}

export interface CreateDeadlineInput {
  organizationId?: number;
  legalCaseId?: number;
  title?: string;
  description?: string | null;
  deadlineAt?: string | Date;
  dueDate?: string | Date; // Permite compatibilidad con dueDate del frontend
  priority?: "Baja" | "Media" | "Alta" | "Urgente" | string;
  status?: "Pendiente" | "En progreso" | "Cumplido" | "Vencido" | string;
  isUrgent?: boolean;
  responsibleUserId?: number | null;
  responsible?: string | null;
  notes?: string | null;
}

export interface UpdateDeadlineInput {
  organizationId?: number;
  legalCaseId?: number;
  title?: string;
  description?: string | null;
  deadlineAt?: string | Date;
  dueDate?: string | Date;
  priority?: string;
  status?: string;
  isUrgent?: boolean;
  responsibleUserId?: number | null;
  responsible?: string | null;
  notes?: string | null;
  completedAt?: string | Date | null;
}

export interface CreateHearingInput {
  organizationId?: number;
  legalCaseId?: number;
  title: string;
  hearingType?: string;
  type?: string; // Compatibilidad con prop type del frontend
  scheduledAt?: string | Date;
  date?: string; // Compatibilidad YYYY-MM-DD
  time?: string; // Compatibilidad HH:mm
  location?: string | null;
  mode?: "Presencial" | "Virtual" | "Híbrida" | string;
  status?: "Programada" | "Celebrada" | "Suspendida" | "Cancelada" | string;
  responsibleUserId?: number | null;
  responsible?: string | null;
  notes?: string | null;
}

export interface UpdateHearingInput {
  organizationId?: number;
  legalCaseId?: number;
  title?: string;
  hearingType?: string;
  type?: string;
  scheduledAt?: string | Date;
  date?: string;
  time?: string;
  location?: string | null;
  mode?: string;
  status?: string;
  responsibleUserId?: number | null;
  responsible?: string | null;
  notes?: string | null;
}

export class LegalCaseOperationsService {
  // -------------------------------------------------------------
  // VALIDACIONES COMUNES DE EXPEDIENTE Y TENANT
  // -------------------------------------------------------------
  public static async getCaseInOrganization(
    organizationId: number,
    caseId: number,
    client: any = db
  ) {
    const legalCase = await client.legalCase.findFirst({
      where: {
        id: caseId,
        organizationId,
      },
      include: {
        client: true,
      },
    });

    if (!legalCase) {
      throw new Error(`Caso jurídico con ID ${caseId} no encontrado en la organización ${organizationId}.`);
    }

    return legalCase;
  }

  public static async validateAssignedMember(
    organizationId: number,
    userId: number,
    client: any = db
  ): Promise<{ id: number; name: string }> {
    const user = await client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`El usuario con ID ${userId} no existe.`);
    }

    const membership = await client.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      throw new Error(
        `El usuario con ID ${userId} no es miembro activo de la organización ${organizationId}.`
      );
    }

    return { id: user.id, name: user.name };
  }

  // -------------------------------------------------------------
  // 1. ACTUACIONES / BITÁCORA DEL EXPEDIENTE (LegalCaseActivity)
  // -------------------------------------------------------------

  public static async addCaseActivity(
    organizationId: number,
    caseId: number,
    data: CreateActivityInput,
    authUserId?: number,
    client: any = db
  ) {
    // 1. Inmutabilidad de caso y organización
    if (data.organizationId !== undefined && Number(data.organizationId) !== organizationId) {
      throw new Error("No se permite registrar una actuación fuera de la organización autorizada.");
    }
    if (data.legalCaseId !== undefined && Number(data.legalCaseId) !== caseId) {
      throw new Error("No se permite vincular la actuación a un caso distinto del especificado en la ruta.");
    }

    // 2. Verificar que el caso pertenezca a la organización
    const legalCase = await LegalCaseOperationsService.getCaseInOrganization(organizationId, caseId, client);

    // 3. Validar título
    const title = (data.title || "").trim();
    if (!title) {
      throw new Error("El título de la actuación es obligatorio.");
    }

    const type = (data.type || "Nota Interna").trim();

    // 4. Fecha de la actuación: soporta registro retrospectivo/histórico
    let occurredAt = new Date();
    if (data.occurredAt) {
      const parsed = new Date(data.occurredAt);
      if (isNaN(parsed.getTime())) {
        throw new Error("La fecha de la actuación (occurredAt) no es válida.");
      }
      occurredAt = parsed;
    }

    // 5. createdByUserId: estrictamente gobernado por authUserId (req.user)
    // No permitir atribución arbitraria desde payload externo
    const createdByUserId = authUserId || null;

    let performedBy = data.performedBy?.trim() || null;
    if (!performedBy && authUserId) {
      const user = await client.user.findUnique({ where: { id: authUserId }, select: { name: true } });
      if (user) performedBy = user.name;
    }

    const activity = await client.legalCaseActivity.create({
      data: {
        organizationId,
        legalCaseId: legalCase.id,
        type,
        title,
        description: data.description?.trim() || null,
        occurredAt,
        createdByUserId,
        performedBy,
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      id: String(activity.id),
      caseId: String(activity.legalCaseId),
      date: activity.occurredAt.toISOString().slice(0, 16).replace("T", " "),
      occurredAt: activity.occurredAt.toISOString(),
      type: activity.type,
      title: activity.title,
      description: activity.description || "",
      performedBy: activity.performedBy || activity.createdByUser?.name || "Despacho",
      createdByUserId: activity.createdByUserId,
      createdAt: activity.createdAt.toISOString(),
    };
  }

  public static async listCaseActivities(
    organizationId: number,
    caseId: number,
    client: any = db
  ) {
    // 1. Verificar caso en organización
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, caseId, client);

    // 2. Consulta estrictamente read-only
    const activities = await client.legalCaseActivity.findMany({
      where: {
        organizationId,
        legalCaseId: caseId,
      },
      orderBy: {
        occurredAt: "desc",
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return activities.map((a: any) => ({
      id: String(a.id),
      caseId: String(a.legalCaseId),
      date: a.occurredAt.toISOString().slice(0, 16).replace("T", " "),
      occurredAt: a.occurredAt.toISOString(),
      type: a.type,
      title: a.title,
      description: a.description || "",
      performedBy: a.performedBy || a.createdByUser?.name || "Despacho",
      createdByUserId: a.createdByUserId,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  // -------------------------------------------------------------
  // 2. TAREAS OPERATIVAS (LegalTask)
  // -------------------------------------------------------------

  public static async createTask(
    organizationId: number,
    caseId: number,
    data: CreateTaskInput,
    client: any = db
  ) {
    // 1. Inmutabilidad
    if (data.organizationId !== undefined && Number(data.organizationId) !== organizationId) {
      throw new Error("No se permite crear una tarea fuera de la organización autorizada.");
    }
    if (data.legalCaseId !== undefined && Number(data.legalCaseId) !== caseId) {
      throw new Error("No se permite vincular la tarea a un caso distinto del especificado en la ruta.");
    }

    const legalCase = await LegalCaseOperationsService.getCaseInOrganization(organizationId, caseId, client);

    if (legalCase.status === "Cerrado" || legalCase.status === "Archivado") {
      throw new Error(
        `No se pueden registrar nuevas tareas en un expediente con estado '${legalCase.status}'.`
      );
    }

    const title = (data.title || "").trim();
    if (!title) {
      throw new Error("El título de la tarea es obligatorio.");
    }

    if (!data.dueDate) {
      throw new Error("La fecha límite (dueDate) de la tarea es obligatoria.");
    }
    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      throw new Error("La fecha límite (dueDate) proporcionada no es válida.");
    }

    // Validación de usuario asignado: administrativo o profesional con membresía activa
    let assignedToUserId: number | null = null;
    let assignedTo = data.assignedTo?.trim() || null;

    if (data.assignedToUserId) {
      const validMember = await LegalCaseOperationsService.validateAssignedMember(
        organizationId,
        Number(data.assignedToUserId),
        client
      );
      assignedToUserId = validMember.id;
      if (!assignedTo) assignedTo = validMember.name;
    }

    const status = data.status || "Pendiente";
    const completedAt = status === "Completada" ? new Date() : null;

    const task = await client.legalTask.create({
      data: {
        organizationId,
        legalCaseId: legalCase.id,
        title,
        description: data.description?.trim() || null,
        dueDate,
        priority: data.priority || "Media",
        status,
        assignedToUserId,
        assignedTo,
        completedAt,
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
        assignedToUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      id: String(task.id),
      caseId: String(task.legalCaseId),
      caseNumber: task.legalCase?.internalCaseNumber || "",
      caseTitle: task.legalCase?.title || "",
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate.toISOString().split("T")[0],
      priority: task.priority,
      status: task.status,
      assignedTo: task.assignedTo || task.assignedToUser?.name || "Sin asignar",
      assignedToUserId: task.assignedToUserId,
      completedAt: task.completedAt ? task.completedAt.toISOString() : undefined,
      createdAt: task.createdAt.toISOString().split("T")[0],
    };
  }

  public static async listTasks(
    organizationId: number,
    filters?: {
      caseId?: number;
      status?: string;
      assignedToUserId?: number;
      priority?: string;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.caseId) {
      where.legalCaseId = filters.caseId;
    }
    if (filters?.status && filters.status !== "todos") {
      if (filters.status === "pendientes") {
        where.status = { not: "Completada" };
      } else {
        where.status = filters.status;
      }
    }
    if (filters?.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }
    if (filters?.priority && filters.priority !== "todos") {
      where.priority = filters.priority;
    }

    // Consulta estrictamente read-only
    const tasks = await client.legalTask.findMany({
      where,
      orderBy: {
        dueDate: "asc",
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
        assignedToUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return tasks.map((t: any) => ({
      id: String(t.id),
      caseId: String(t.legalCaseId),
      caseNumber: t.legalCase?.internalCaseNumber || "",
      caseTitle: t.legalCase?.title || "",
      title: t.title,
      description: t.description || "",
      dueDate: t.dueDate.toISOString().split("T")[0],
      priority: t.priority,
      status: t.status,
      assignedTo: t.assignedTo || t.assignedToUser?.name || "Sin asignar",
      assignedToUserId: t.assignedToUserId,
      completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
      createdAt: t.createdAt.toISOString().split("T")[0],
    }));
  }

  public static async updateTask(
    organizationId: number,
    caseId: number,
    taskId: number,
    data: UpdateTaskInput,
    client: any = db
  ) {
    // 1. Inmutabilidad
    if (data.organizationId !== undefined && Number(data.organizationId) !== organizationId) {
      throw new Error("No se permite transferir la tarea a otra organización.");
    }
    if (data.legalCaseId !== undefined && Number(data.legalCaseId) !== caseId) {
      throw new Error("No se permite transferir la tarea a otro caso.");
    }

    const existing = await client.legalTask.findFirst({
      where: {
        id: taskId,
        organizationId,
        legalCaseId: caseId,
      },
    });

    if (!existing) {
      throw new Error(`Tarea con ID ${taskId} no encontrada para el caso ${caseId} en esta organización.`);
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new Error("El título de la tarea no puede estar vacío.");
      updateData.title = title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.dueDate !== undefined) {
      const parsedDate = new Date(data.dueDate);
      if (isNaN(parsedDate.getTime())) throw new Error("Fecha límite no válida.");
      updateData.dueDate = parsedDate;
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "Completada") {
        if (!existing.completedAt) {
          updateData.completedAt = new Date();
        }
      } else {
        // Reapertura
        updateData.completedAt = null;
      }
    }

    if (data.assignedToUserId !== undefined) {
      if (data.assignedToUserId === null) {
        updateData.assignedToUserId = null;
      } else {
        const validMember = await LegalCaseOperationsService.validateAssignedMember(
          organizationId,
          Number(data.assignedToUserId),
          client
        );
        updateData.assignedToUserId = validMember.id;
        if (!data.assignedTo) updateData.assignedTo = validMember.name;
      }
    }

    if (data.assignedTo !== undefined) {
      updateData.assignedTo = data.assignedTo?.trim() || null;
    }

    const updated = await client.legalTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        assignedToUser: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      id: String(updated.id),
      caseId: String(updated.legalCaseId),
      caseNumber: updated.legalCase?.internalCaseNumber || "",
      caseTitle: updated.legalCase?.title || "",
      title: updated.title,
      description: updated.description || "",
      dueDate: updated.dueDate.toISOString().split("T")[0],
      priority: updated.priority,
      status: updated.status,
      assignedTo: updated.assignedTo || updated.assignedToUser?.name || "Sin asignar",
      assignedToUserId: updated.assignedToUserId,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : undefined,
      createdAt: updated.createdAt.toISOString().split("T")[0],
    };
  }

  // -------------------------------------------------------------
  // 3. PLAZOS PROCESALES (LegalDeadline)
  // -------------------------------------------------------------

  public static async createDeadline(
    organizationId: number,
    caseId: number,
    data: CreateDeadlineInput,
    client: any = db
  ) {
    // 1. Inmutabilidad
    if (data.organizationId !== undefined && Number(data.organizationId) !== organizationId) {
      throw new Error("No se permite registrar un plazo fuera de la organización autorizada.");
    }
    if (data.legalCaseId !== undefined && Number(data.legalCaseId) !== caseId) {
      throw new Error("No se permite vincular el plazo a un caso distinto del especificado en la ruta.");
    }

    const legalCase = await LegalCaseOperationsService.getCaseInOrganization(organizationId, caseId, client);

    if (legalCase.status === "Cerrado" || legalCase.status === "Archivado") {
      throw new Error(
        `No se pueden registrar nuevos plazos en un expediente con estado '${legalCase.status}'.`
      );
    }

    const title = (data.title || data.description || "").trim();
    if (!title) {
      throw new Error("El título o descripción del plazo procesal es obligatorio.");
    }

    const rawDate = data.deadlineAt || data.dueDate;
    if (!rawDate) {
      throw new Error("La fecha límite del plazo procesal (deadlineAt / dueDate) es obligatoria.");
    }
    const deadlineAt = new Date(rawDate);
    if (isNaN(deadlineAt.getTime())) {
      throw new Error("La fecha del plazo procesal no es válida.");
    }

    let responsibleUserId: number | null = null;
    let responsible = data.responsible?.trim() || null;

    if (data.responsibleUserId) {
      const validMember = await LegalCaseOperationsService.validateAssignedMember(
        organizationId,
        Number(data.responsibleUserId),
        client
      );
      responsibleUserId = validMember.id;
      if (!responsible) responsible = validMember.name;
    }

    const status = data.status || "Pendiente";
    const completedAt = status === "Cumplido" ? new Date() : null;

    const deadline = await client.legalDeadline.create({
      data: {
        organizationId,
        legalCaseId: legalCase.id,
        title,
        description: data.description?.trim() || null,
        deadlineAt,
        priority: data.priority || "Media",
        status,
        isUrgent: data.isUrgent ?? false,
        responsibleUserId,
        responsible,
        notes: data.notes?.trim() || null,
        completedAt,
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        responsibleUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const isOverdue = deadline.deadlineAt.getTime() < Date.now() && deadline.status !== "Cumplido";

    return {
      id: String(deadline.id),
      caseId: String(deadline.legalCaseId),
      caseNumber: deadline.legalCase?.internalCaseNumber || "",
      caseTitle: deadline.legalCase?.title || "",
      description: deadline.title,
      title: deadline.title,
      dueDate: deadline.deadlineAt.toISOString().split("T")[0],
      deadlineAt: deadline.deadlineAt.toISOString(),
      priority: deadline.priority,
      status: deadline.status,
      responsible: deadline.responsible || deadline.responsibleUser?.name || "Sin asignar",
      responsibleUserId: deadline.responsibleUserId,
      notes: deadline.notes || undefined,
      isUrgent: deadline.isUrgent,
      isOverdue,
      completedAt: deadline.completedAt ? deadline.completedAt.toISOString() : undefined,
      createdAt: deadline.createdAt.toISOString().split("T")[0],
    };
  }

  public static async listDeadlines(
    organizationId: number,
    filters?: {
      caseId?: number;
      status?: string;
      urgent?: boolean;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.caseId) {
      where.legalCaseId = filters.caseId;
    }
    if (filters?.status && filters.status !== "todos") {
      where.status = filters.status;
    }
    if (filters?.urgent !== undefined) {
      where.isUrgent = filters.urgent;
    }

    // Estrictamente READ-ONLY: NUNCA ejecutar UPDATE en PostgreSQL durante GET
    const deadlines = await client.legalDeadline.findMany({
      where,
      orderBy: {
        deadlineAt: "asc",
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        responsibleUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const now = Date.now();

    return deadlines.map((d: any) => {
      // Cálculo estrictamente derivado para visualización, preservando status en DB
      const isOverdue = d.deadlineAt.getTime() < now && d.status !== "Cumplido";
      const displayStatus = d.status === "Cumplido" ? "Cumplido" : isOverdue ? "Vencido" : d.status;

      return {
        id: String(d.id),
        caseId: String(d.legalCaseId),
        caseNumber: d.legalCase?.internalCaseNumber || "",
        caseTitle: d.legalCase?.title || "",
        description: d.title,
        title: d.title,
        dueDate: d.deadlineAt.toISOString().split("T")[0],
        deadlineAt: d.deadlineAt.toISOString(),
        priority: d.priority,
        status: d.status, // Estado real persistido en base de datos
        displayStatus, // Estado derivado dinámico sin mutación DB
        isOverdue,
        responsible: d.responsible || d.responsibleUser?.name || "Sin asignar",
        responsibleUserId: d.responsibleUserId,
        notes: d.notes || undefined,
        isUrgent: d.isUrgent,
        completedAt: d.completedAt ? d.completedAt.toISOString() : undefined,
        createdAt: d.createdAt.toISOString().split("T")[0],
      };
    });
  }

  public static async updateDeadline(
    organizationId: number,
    caseId: number,
    deadlineId: number,
    data: UpdateDeadlineInput,
    client: any = db
  ) {
    // 1. Inmutabilidad
    if (data.organizationId !== undefined && Number(data.organizationId) !== organizationId) {
      throw new Error("No se permite transferir el plazo procesal a otra organización.");
    }
    if (data.legalCaseId !== undefined && Number(data.legalCaseId) !== caseId) {
      throw new Error("No se permite transferir el plazo procesal a otro caso.");
    }

    const existing = await client.legalDeadline.findFirst({
      where: {
        id: deadlineId,
        organizationId,
        legalCaseId: caseId,
      },
    });

    if (!existing) {
      throw new Error(`Plazo procesal con ID ${deadlineId} no encontrado para el caso ${caseId} en esta organización.`);
    }

    const updateData: any = {};

    if (data.title !== undefined || data.description !== undefined) {
      const title = (data.title || data.description || "").trim();
      if (title) updateData.title = title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    const rawDate = data.deadlineAt || data.dueDate;
    if (rawDate !== undefined) {
      const parsed = new Date(rawDate);
      if (isNaN(parsed.getTime())) throw new Error("Fecha límite no válida.");
      updateData.deadlineAt = parsed;
    }

    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isUrgent !== undefined) updateData.isUrgent = data.isUrgent;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "Cumplido") {
        if (!existing.completedAt) {
          updateData.completedAt = new Date();
        }
      } else {
        updateData.completedAt = null;
      }
    }

    if (data.responsibleUserId !== undefined) {
      if (data.responsibleUserId === null) {
        updateData.responsibleUserId = null;
      } else {
        const validMember = await LegalCaseOperationsService.validateAssignedMember(
          organizationId,
          Number(data.responsibleUserId),
          client
        );
        updateData.responsibleUserId = validMember.id;
        if (!data.responsible) updateData.responsible = validMember.name;
      }
    }

    if (data.responsible !== undefined) {
      updateData.responsible = data.responsible?.trim() || null;
    }

    const updated = await client.legalDeadline.update({
      where: { id: deadlineId },
      data: updateData,
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        responsibleUser: {
          select: { id: true, name: true },
        },
      },
    });

    const isOverdue = updated.deadlineAt.getTime() < Date.now() && updated.status !== "Cumplido";

    return {
      id: String(updated.id),
      caseId: String(updated.legalCaseId),
      caseNumber: updated.legalCase?.internalCaseNumber || "",
      caseTitle: updated.legalCase?.title || "",
      description: updated.title,
      title: updated.title,
      dueDate: updated.deadlineAt.toISOString().split("T")[0],
      deadlineAt: updated.deadlineAt.toISOString(),
      priority: updated.priority,
      status: updated.status,
      responsible: updated.responsible || updated.responsibleUser?.name || "Sin asignar",
      responsibleUserId: updated.responsibleUserId,
      notes: updated.notes || undefined,
      isUrgent: updated.isUrgent,
      isOverdue,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : undefined,
      createdAt: updated.createdAt.toISOString().split("T")[0],
    };
  }

  // -------------------------------------------------------------
  // 4. AUDIENCIAS Y DILIGENCIAS (LegalHearing)
  // -------------------------------------------------------------

  public static async createHearing(
    organizationId: number,
    caseId: number,
    data: CreateHearingInput,
    client: any = db
  ) {
    // 1. Inmutabilidad
    if (data.organizationId !== undefined && Number(data.organizationId) !== organizationId) {
      throw new Error("No se permite programar una audiencia fuera de la organización autorizada.");
    }
    if (data.legalCaseId !== undefined && Number(data.legalCaseId) !== caseId) {
      throw new Error("No se permite vincular la audiencia a un caso distinto del especificado en la ruta.");
    }

    const legalCase = await LegalCaseOperationsService.getCaseInOrganization(organizationId, caseId, client);

    if (legalCase.status === "Cerrado" || legalCase.status === "Archivado") {
      throw new Error(
        `No se pueden programar nuevas audiencias en un expediente con estado '${legalCase.status}'.`
      );
    }

    const title = (data.title || "").trim();
    if (!title) {
      throw new Error("El título de la audiencia es obligatorio.");
    }

    // Soporte de scheduledAt directo o combinación date + time
    let scheduledAt: Date;
    if (data.scheduledAt) {
      scheduledAt = new Date(data.scheduledAt);
    } else if (data.date) {
      const timeStr = data.time || "09:00";
      scheduledAt = new Date(`${data.date}T${timeStr}:00`);
    } else {
      throw new Error("La fecha y hora de la audiencia (scheduledAt / date + time) es obligatoria.");
    }

    if (isNaN(scheduledAt.getTime())) {
      throw new Error("La fecha u hora de la audiencia no es válida.");
    }

    let responsibleUserId: number | null = null;
    let responsible = data.responsible?.trim() || null;

    if (data.responsibleUserId) {
      const validMember = await LegalCaseOperationsService.validateAssignedMember(
        organizationId,
        Number(data.responsibleUserId),
        client
      );
      responsibleUserId = validMember.id;
      if (!responsible) responsible = validMember.name;
    }

    const hearing = await client.legalHearing.create({
      data: {
        organizationId,
        legalCaseId: legalCase.id,
        title,
        hearingType: data.hearingType || data.type || "Preliminar",
        scheduledAt,
        location: data.location?.trim() || null,
        mode: data.mode || "Presencial",
        status: data.status || "Programada",
        responsibleUserId,
        responsible,
        notes: data.notes?.trim() || null,
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
        responsibleUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      id: String(hearing.id),
      caseId: String(hearing.legalCaseId),
      caseNumber: hearing.legalCase?.internalCaseNumber || "",
      caseTitle: hearing.legalCase?.title || "",
      clientId: String(hearing.legalCase?.clientId || ""),
      clientName: hearing.legalCase?.client?.name || "",
      title: hearing.title,
      type: hearing.hearingType,
      hearingType: hearing.hearingType,
      date: hearing.scheduledAt.toISOString().split("T")[0],
      time: hearing.scheduledAt.toISOString().split("T")[1]?.substring(0, 5) || "00:00",
      scheduledAt: hearing.scheduledAt.toISOString(),
      location: hearing.location || "",
      mode: hearing.mode,
      responsible: hearing.responsible || hearing.responsibleUser?.name || "Sin asignar",
      responsibleUserId: hearing.responsibleUserId,
      status: hearing.status,
      notes: hearing.notes || undefined,
      createdAt: hearing.createdAt.toISOString().split("T")[0],
    };
  }

  public static async listHearings(
    organizationId: number,
    filters?: {
      caseId?: number;
      status?: string;
      from?: Date;
      to?: Date;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.caseId) {
      where.legalCaseId = filters.caseId;
    }
    if (filters?.status && filters.status !== "todos") {
      where.status = filters.status;
    }
    if (filters?.from || filters?.to) {
      where.scheduledAt = {};
      if (filters.from) where.scheduledAt.gte = filters.from;
      if (filters.to) where.scheduledAt.lte = filters.to;
    }

    // Consulta estrictamente read-only
    const hearings = await client.legalHearing.findMany({
      where,
      orderBy: {
        scheduledAt: "asc",
      },
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
        responsibleUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return hearings.map((h: any) => ({
      id: String(h.id),
      caseId: String(h.legalCaseId),
      caseNumber: h.legalCase?.internalCaseNumber || "",
      caseTitle: h.legalCase?.title || "",
      clientId: String(h.legalCase?.clientId || ""),
      clientName: h.legalCase?.client?.name || "",
      title: h.title,
      type: h.hearingType,
      hearingType: h.hearingType,
      date: h.scheduledAt.toISOString().split("T")[0],
      time: h.scheduledAt.toISOString().split("T")[1]?.substring(0, 5) || "00:00",
      scheduledAt: h.scheduledAt.toISOString(),
      location: h.location || "",
      mode: h.mode,
      responsible: h.responsible || h.responsibleUser?.name || "Sin asignar",
      responsibleUserId: h.responsibleUserId,
      status: h.status,
      notes: h.notes || undefined,
      createdAt: h.createdAt.toISOString().split("T")[0],
    }));
  }

  public static async updateHearing(
    organizationId: number,
    caseId: number,
    hearingId: number,
    data: UpdateHearingInput,
    client: any = db
  ) {
    // 1. Inmutabilidad
    if (data.organizationId !== undefined && Number(data.organizationId) !== organizationId) {
      throw new Error("No se permite transferir la audiencia a otra organización.");
    }
    if (data.legalCaseId !== undefined && Number(data.legalCaseId) !== caseId) {
      throw new Error("No se permite transferir la audiencia a otro caso.");
    }

    const existing = await client.legalHearing.findFirst({
      where: {
        id: hearingId,
        organizationId,
        legalCaseId: caseId,
      },
    });

    if (!existing) {
      throw new Error(`Audiencia con ID ${hearingId} no encontrada para el caso ${caseId} en esta organización.`);
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new Error("El título de la audiencia no puede estar vacío.");
      updateData.title = title;
    }

    if (data.hearingType !== undefined || data.type !== undefined) {
      updateData.hearingType = data.hearingType || data.type;
    }

    if (data.scheduledAt !== undefined) {
      const parsed = new Date(data.scheduledAt);
      if (isNaN(parsed.getTime())) throw new Error("Fecha/hora de audiencia no válida.");
      updateData.scheduledAt = parsed;
    } else if (data.date !== undefined || data.time !== undefined) {
      const curDateStr = existing.scheduledAt.toISOString().split("T")[0];
      const curTimeStr = existing.scheduledAt.toISOString().split("T")[1].substring(0, 5);
      const datePart = data.date || curDateStr;
      const timePart = data.time || curTimeStr;
      const parsed = new Date(`${datePart}T${timePart}:00`);
      if (isNaN(parsed.getTime())) throw new Error("Fecha u hora de audiencia no válida.");
      updateData.scheduledAt = parsed;
    }

    if (data.location !== undefined) updateData.location = data.location?.trim() || null;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    if (data.responsibleUserId !== undefined) {
      if (data.responsibleUserId === null) {
        updateData.responsibleUserId = null;
      } else {
        const validMember = await LegalCaseOperationsService.validateAssignedMember(
          organizationId,
          Number(data.responsibleUserId),
          client
        );
        updateData.responsibleUserId = validMember.id;
        if (!data.responsible) updateData.responsible = validMember.name;
      }
    }

    if (data.responsible !== undefined) {
      updateData.responsible = data.responsible?.trim() || null;
    }

    const updated = await client.legalHearing.update({
      where: { id: hearingId },
      data: updateData,
      include: {
        legalCase: {
          select: {
            internalCaseNumber: true,
            title: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
        responsibleUser: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      id: String(updated.id),
      caseId: String(updated.legalCaseId),
      caseNumber: updated.legalCase?.internalCaseNumber || "",
      caseTitle: updated.legalCase?.title || "",
      clientId: String(updated.legalCase?.clientId || ""),
      clientName: updated.legalCase?.client?.name || "",
      title: updated.title,
      type: updated.hearingType,
      hearingType: updated.hearingType,
      date: updated.scheduledAt.toISOString().split("T")[0],
      time: updated.scheduledAt.toISOString().split("T")[1]?.substring(0, 5) || "00:00",
      scheduledAt: updated.scheduledAt.toISOString(),
      location: updated.location || "",
      mode: updated.mode,
      responsible: updated.responsible || updated.responsibleUser?.name || "Sin asignar",
      responsibleUserId: updated.responsibleUserId,
      status: updated.status,
      notes: updated.notes || undefined,
      createdAt: updated.createdAt.toISOString().split("T")[0],
    };
  }
}
