import { db } from "../lib/db";
import { ORGANIZATION_MEMBER_ROLE } from "../constants/organization.constants";
import { ArchitectureStorageService } from "./architecture-storage.service";
import {
  ArchitectureBudgetService,
  CreateArchitectureBudgetInput,
  UpdateArchitectureBudgetInput,
  CreateArchitectureBudgetItemInput,
  UpdateArchitectureBudgetItemInput,
} from "./architecture-budget.service";
import { ArchitectureCalendarService, ArchitectureCalendarFilter } from "./architecture-calendar.service";
import { ArchitectureDashboardService } from "./architecture-dashboard.service";
import { ArchitectureReportsService } from "./architecture-reports.service";

export interface CreateArchitectureClientInput {
  name: string;
  contactPerson?: string | null;
  taxId?: string | null;
  taxIdType?: string | null;
  clientType?: "Persona" | "Empresa" | string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  status?: "Activo" | "Inactivo" | string;
  notes?: string | null;
}

export interface UpdateArchitectureClientInput {
  name?: string;
  contactPerson?: string | null;
  taxId?: string | null;
  taxIdType?: string | null;
  clientType?: "Persona" | "Empresa" | string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  status?: "Activo" | "Inactivo" | string;
  notes?: string | null;
}

export interface CreateArchitectureProjectInput {
  clientId: number;
  name: string;
  type?: string;
  location?: string | null;
  approxAreaM2?: number | null;
  levelsCount?: number | null;
  leadArchitectUserId: number;
  startDate?: string | Date | null;
  targetDeliveryDate?: string | Date | null;
  status?: string;
  priority?: string;
  description?: string | null;
  clientRequirements?: string | null;
  notes?: string | null;
}

export interface UpdateArchitectureProjectInput {
  name?: string;
  type?: string;
  location?: string | null;
  approxAreaM2?: number | null;
  levelsCount?: number | null;
  leadArchitectUserId?: number;
  startDate?: string | Date | null;
  targetDeliveryDate?: string | Date | null;
  actualEndDate?: string | Date | null;
  status?: string;
  priority?: string;
  description?: string | null;
  clientRequirements?: string | null;
  notes?: string | null;
}

export interface UpdateArchitectureStageInput {
  status?: string;
  progress?: number;
  startDate?: string | Date | null;
  dueDate?: string | Date | null;
  notes?: string | null;
}

export interface CreateArchitectureTaskInput {
  projectId: number;
  stageId?: number | null;
  title: string;
  description?: string | null;
  assignedToUserId?: number | null;
  priority?: string;
  status?: string;
  dueDate?: string | Date | null;
}

export interface UpdateArchitectureTaskInput {
  stageId?: number | null;
  title?: string;
  description?: string | null;
  assignedToUserId?: number | null;
  priority?: string;
  status?: string;
  dueDate?: string | Date | null;
}

export interface CreateArchitectureDeliverableInput {
  projectId: number;
  stageId?: number | null;
  name: string;
  type?: string;
  assignedToUserId?: number | null;
  dueDate?: string | Date | null;
  status?: string;
  notes?: string | null;
}

export interface UpdateArchitectureDeliverableInput {
  stageId?: number | null;
  name?: string;
  type?: string;
  assignedToUserId?: number | null;
  dueDate?: string | Date | null;
  status?: string;
  notes?: string | null;
}

export interface CreateArchitectureMeetingInput {
  projectId: number;
  title: string;
  scheduledAt?: string | Date;
  date?: string;
  time?: string;
  location?: string | null;
  meetingUrl?: string | null;
  modality?: string;
  meetingType?: string;
  leadArchitectUserId?: number | null;
  status?: string;
  notes?: string | null;
}

export interface UpdateArchitectureMeetingInput {
  title?: string;
  scheduledAt?: string | Date;
  date?: string;
  time?: string;
  location?: string | null;
  meetingUrl?: string | null;
  modality?: string;
  meetingType?: string;
  leadArchitectUserId?: number | null;
  status?: string;
  notes?: string | null;
}

export interface CreateArchitectureDocumentInput {
  projectId: number;
  stageId?: number | null;
  name: string;
  documentType?: string;
  description?: string | null;
  status?: string;
}

export interface UpdateArchitectureDocumentInput {
  stageId?: number | null;
  name?: string;
  documentType?: string;
  description?: string | null;
  status?: string;
}

export const DEFAULT_ARCHITECTURE_STAGES: { name: string; order: number }[] = [
  { name: "Conceptualización", order: 1 },
  { name: "Anteproyecto", order: 2 },
  { name: "Diseño", order: 3 },
  { name: "Planos", order: 4 },
  { name: "Revisión", order: 5 },
  { name: "Entrega", order: 6 },
];

export class ArchitectureService {
  // -------------------------------------------------------------
  // VALIDACIÓN DE MIEMBRO ASIGNADO (MEMBRESÍA ACTIVA EN ORGANIZACIÓN)
  // -------------------------------------------------------------
  public static async validateAssignedMember(
    organizationId: number,
    userId: number,
    client: any = db
  ): Promise<{ id: number; name: string }> {
    const user = await client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`El usuario asignado con ID ${userId} no existe.`);
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
        `El usuario asignado no es un miembro activo de la organización (Org ID: ${organizationId}).`
      );
    }

    return { id: user.id, name: user.name };
  }

  // -------------------------------------------------------------
  // VALIDACIÓN DE ARQUITECTO RESPONSABLE (RBAC & MEMBRESÍA)
  // -------------------------------------------------------------
  public static async validateResponsibleArchitect(
    organizationId: number,
    leadArchitectUserId: number,
    client: any = db
  ): Promise<{ id: number; name: string }> {
    const user = await client.user.findUnique({
      where: { id: leadArchitectUserId },
      include: {
        professionalProfile: {
          include: {
            specialties: {
              include: {
                specialty: {
                  include: {
                    profession: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error(`El usuario responsable con ID ${leadArchitectUserId} no existe.`);
    }

    const membership = await client.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: leadArchitectUserId,
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      throw new Error(
        `El usuario responsable no es un miembro activo de la organización (Org ID: ${organizationId}).`
      );
    }

    const forbiddenRoles = ["ASSISTANT", "SECRETARY", "CLIENT", "STUDENT"];
    if (forbiddenRoles.includes(membership.role)) {
      throw new Error(
        `El rol '${membership.role}' no está autorizado para asumir la dirección de un proyecto arquitectónico.`
      );
    }

    return { id: user.id, name: user.name };
  }

  // -------------------------------------------------------------
  // GENERACIÓN DE CÓDIGO CONCURRENT-SAFE (PRJ-YYYY-NNN)
  // -------------------------------------------------------------
  public static async generateNextProjectCode(
    organizationId: number,
    targetYear?: number,
    client: any = db
  ): Promise<string> {
    const year = targetYear || new Date().getFullYear();

    await client.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext('architecture_project_seq_' || ${organizationId}::text || '_' || ${year}::text))`
    );

    const projectsThisYear = await client.architectureProject.findMany({
      where: {
        organizationId,
        code: { startsWith: `PRJ-${year}-` },
      },
      select: { code: true },
    });

    let highestSeq = 0;
    const pattern = new RegExp(`^PRJ-${year}-(\\d+)$`, "i");

    for (const item of projectsThisYear) {
      const match = item.code.trim().match(pattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > highestSeq) {
          highestSeq = seq;
        }
      }
    }

    return `PRJ-${year}-${String(highestSeq + 1).padStart(3, "0")}`;
  }

  // -------------------------------------------------------------
  // CLIENTES (ArchitectureClient)
  // -------------------------------------------------------------
  public static async listClients(
    organizationId: number,
    filters?: {
      search?: string;
      status?: string;
      clientType?: string;
      limit?: number;
      offset?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.status && filters.status !== "todos") {
      where.status = filters.status;
    }

    if (filters?.clientType && filters.clientType !== "todos") {
      where.clientType = filters.clientType;
    }

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { contactPerson: { contains: s, mode: "insensitive" } },
        { taxId: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        { phone: { contains: s, mode: "insensitive" } },
      ];
    }

    const items = await client.architectureClient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit ? Math.min(filters.limit, 100) : 50,
      skip: filters?.offset || 0,
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    return items.map((c: any) => ({
      id: c.id,
      organizationId: c.organizationId,
      name: c.name,
      contactPerson: c.contactPerson || undefined,
      taxId: c.taxId || "",
      taxIdType: c.taxIdType || undefined,
      type: c.clientType,
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      city: c.city || undefined,
      status: c.status,
      notes: c.notes || undefined,
      projectsCount: c._count.projects,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  public static async getClientById(
    organizationId: number,
    clientId: number,
    client: any = db
  ) {
    const found = await client.architectureClient.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          orderBy: { createdAt: "desc" },
          include: {
            leadArchitectUser: { select: { id: true, name: true, email: true } },
            stages: { orderBy: { order: "asc" } },
            budgets: { include: { items: true } },
          },
        },
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!found || found.organizationId !== organizationId) {
      throw new Error(`Cliente con ID ${clientId} no encontrado en la organización.`);
    }

    return {
      id: found.id,
      organizationId: found.organizationId,
      name: found.name,
      contactPerson: found.contactPerson || undefined,
      taxId: found.taxId || "",
      taxIdType: found.taxIdType || undefined,
      type: found.clientType,
      email: found.email || "",
      phone: found.phone || "",
      address: found.address || "",
      city: found.city || undefined,
      status: found.status,
      notes: found.notes || undefined,
      projectsCount: found._count.projects,
      projects: found.projects.map((p: any) => ArchitectureService.mapProjectDTO(p)),
      createdAt: found.createdAt.toISOString(),
      updatedAt: found.updatedAt.toISOString(),
    };
  }

  public static async createClient(
    organizationId: number,
    userId: number,
    data: CreateArchitectureClientInput,
    client: any = db
  ) {
    if (!data.name?.trim()) {
      throw new Error("El nombre o razón social del cliente es obligatorio.");
    }

    const taxId = data.taxId?.trim() || null;
    if (taxId) {
      const existing = await client.architectureClient.findUnique({
        where: {
          organizationId_taxId: {
            organizationId,
            taxId,
          },
        },
      });

      if (existing) {
        throw new Error(
          `Ya existe un cliente con la identificación '${taxId}' en esta organización.`
        );
      }
    }

    const created = await client.architectureClient.create({
      data: {
        organizationId,
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        taxId,
        taxIdType: data.taxIdType?.trim() || null,
        clientType: data.clientType || "Persona",
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        status: data.status || "Activo",
        notes: data.notes?.trim() || null,
        createdByUserId: userId,
      },
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      contactPerson: created.contactPerson || undefined,
      taxId: created.taxId || "",
      taxIdType: created.taxIdType || undefined,
      type: created.clientType,
      email: created.email || "",
      phone: created.phone || "",
      address: created.address || "",
      city: created.city || undefined,
      status: created.status,
      notes: created.notes || undefined,
      projectsCount: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  public static async updateClient(
    organizationId: number,
    clientId: number,
    data: UpdateArchitectureClientInput,
    client: any = db
  ) {
    const existing = await client.architectureClient.findUnique({
      where: { id: clientId },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Cliente con ID ${clientId} no encontrado en la organización.`);
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error("El nombre o razón social no puede estar vacío.");
      }
      updateData.name = data.name.trim();
    }

    if (data.taxId !== undefined) {
      const taxId = data.taxId?.trim() || null;
      if (taxId && taxId !== existing.taxId) {
        const duplicate = await client.architectureClient.findUnique({
          where: {
            organizationId_taxId: {
              organizationId,
              taxId,
            },
          },
        });
        if (duplicate && duplicate.id !== clientId) {
          throw new Error(
            `Ya existe otro cliente con la identificación '${taxId}' en esta organización.`
          );
        }
      }
      updateData.taxId = taxId;
    }

    if (data.taxIdType !== undefined) updateData.taxIdType = data.taxIdType?.trim() || null;
    if (data.clientType !== undefined) updateData.clientType = data.clientType;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson?.trim() || null;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.city !== undefined) updateData.city = data.city?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    const updated = await client.architectureClient.update({
      where: { id: clientId },
      data: updateData,
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      contactPerson: updated.contactPerson || undefined,
      taxId: updated.taxId || "",
      taxIdType: updated.taxIdType || undefined,
      type: updated.clientType,
      email: updated.email || "",
      phone: updated.phone || "",
      address: updated.address || "",
      city: updated.city || undefined,
      status: updated.status,
      notes: updated.notes || undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  public static async inactivateClient(
    organizationId: number,
    clientId: number,
    client: any = db
  ) {
    const existing = await client.architectureClient.findUnique({
      where: { id: clientId },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Cliente con ID ${clientId} no encontrado en la organización.`);
    }

    const updated = await client.architectureClient.update({
      where: { id: clientId },
      data: { status: "Inactivo" },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // -------------------------------------------------------------
  // PROYECTOS (ArchitectureProject)
  // -------------------------------------------------------------
  public static mapProjectDTO(p: any) {
    const stages = (p.stages || []).map((s: any) => ({
      id: s.id,
      projectId: s.projectId,
      name: s.name,
      order: s.order,
      status: s.status,
      startDate: s.startDate ? s.startDate.toISOString().slice(0, 10) : "",
      dueDate: s.dueDate ? s.dueDate.toISOString().slice(0, 10) : "",
      progress: s.progress,
      notes: s.notes || undefined,
    }));

    const derivedProgress =
      stages.length > 0
        ? Math.round(stages.reduce((acc: number, s: any) => acc + (s.progress || 0), 0) / stages.length)
        : 0;

    let estimatedBudget = 0;
    let approvedBudget = 0;

    if (Array.isArray(p.budgets) && p.budgets.length > 0) {
      const approvedB = p.budgets.find((b: any) => b.status === "Aprobado");
      if (approvedB && Array.isArray(approvedB.items)) {
        const approvedSum = approvedB.items.reduce(
          (sum: number, it: any) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0),
          0
        );
        approvedBudget = Number(approvedSum.toFixed(2));
      }

      if (approvedBudget > 0) {
        estimatedBudget = approvedBudget;
      } else {
        const latestB = p.budgets[p.budgets.length - 1];
        if (latestB && Array.isArray(latestB.items)) {
          const latestSum = latestB.items.reduce(
            (sum: number, it: any) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0),
            0
          );
          estimatedBudget = Number(latestSum.toFixed(2));
        }
      }
    }

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      organizationId: p.organizationId,
      clientId: p.clientId,
      clientName: p.client?.name || "",
      type: p.type,
      location: p.location || "",
      approxAreaM2: p.approxAreaM2 ?? undefined,
      levelsCount: p.levelsCount ?? undefined,
      leadArchitect: p.leadArchitectUser?.name || "",
      leadArchitectUserId: p.leadArchitectUserId,
      startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : "",
      targetDeliveryDate: p.targetDeliveryDate ? p.targetDeliveryDate.toISOString().slice(0, 10) : "",
      actualEndDate: p.actualEndDate ? p.actualEndDate.toISOString().slice(0, 10) : undefined,
      status: p.status,
      priority: p.priority,
      progress: derivedProgress,
      estimatedBudget,
      approvedBudget,
      clientRequirements: p.clientRequirements || undefined,
      description: p.description || "",
      notes: p.notes || undefined,
      archivedAt: p.archivedAt ? p.archivedAt.toISOString() : undefined,
      archivedByUserId: p.archivedByUserId ?? undefined,
      archiveReason: p.archiveReason || undefined,
      stages,
      tasks: (p.tasks || []).map((t: any) => ArchitectureService.mapTaskDTO(t)),
      deliverables: (p.deliverables || []).map((d: any) => ArchitectureService.mapDeliverableDTO(d)),
      meetings: (p.meetings || []).map((m: any) => ArchitectureService.mapMeetingDTO(m)),
      documents: (p.documents || []).map((doc: any) => ArchitectureService.mapDocumentDTO(doc)),
      budgets: (p.budgets || []).map((b: any) => ArchitectureBudgetService.mapBudgetDTO(b)),
      createdAt: p.createdAt ? p.createdAt.toISOString() : "",
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : "",
    };
  }

  public static async listProjects(
    organizationId: number,
    filters?: {
      search?: string;
      status?: string;
      clientId?: number;
      type?: string;
      leadArchitectUserId?: number;
      includeArchived?: boolean;
      limit?: number;
      offset?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.status && filters.status !== "todos") {
      where.status = filters.status;
    } else if (!filters?.includeArchived && filters?.status !== "todos" && filters?.status !== "Archivado") {
      where.status = { not: "Archivado" };
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.type && filters.type !== "todos") {
      where.type = filters.type;
    }

    if (filters?.leadArchitectUserId) {
      where.leadArchitectUserId = filters.leadArchitectUserId;
    }

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      where.OR = [
        { code: { contains: s, mode: "insensitive" } },
        { name: { contains: s, mode: "insensitive" } },
        { location: { contains: s, mode: "insensitive" } },
        { description: { contains: s, mode: "insensitive" } },
      ];
    }

    const items = await client.architectureProject.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit ? Math.min(filters.limit, 100) : 50,
      skip: filters?.offset || 0,
      include: {
        client: { select: { id: true, name: true, taxId: true, status: true } },
        leadArchitectUser: { select: { id: true, name: true, email: true } },
        stages: { orderBy: { order: "asc" } },
        budgets: { include: { items: true } },
      },
    });

    return items.map((p: any) => ArchitectureService.mapProjectDTO(p));
  }

  public static async getProjectById(
    organizationId: number,
    projectId: number,
    client: any = db
  ) {
    const found = await client.architectureProject.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        leadArchitectUser: { select: { id: true, name: true, email: true } },
        stages: { orderBy: { order: "asc" } },
        tasks: {
          include: {
            project: { select: { id: true, name: true } },
            stage: { select: { id: true, name: true } },
            assignedToUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        },
        deliverables: {
          include: {
            project: { select: { id: true, name: true } },
            stage: { select: { id: true, name: true } },
            assignedToUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        },
        meetings: {
          include: {
            project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
            leadArchitectUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { scheduledAt: "asc" },
        },
        documents: {
          include: {
            project: { select: { id: true, name: true } },
            stage: { select: { id: true, name: true } },
            createdByUser: { select: { id: true, name: true, email: true } },
            versions: {
              include: { uploadedByUser: { select: { id: true, name: true, email: true } } },
              orderBy: { versionNumber: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        budgets: {
          include: {
            items: { orderBy: { order: "asc" } },
            createdByUser: { select: { id: true, name: true, email: true } },
            approvedByUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        createdByUser: { select: { id: true, name: true, email: true } },
        archivedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!found || found.organizationId !== organizationId) {
      throw new Error(`Proyecto con ID ${projectId} no encontrado en la organización.`);
    }

    return ArchitectureService.mapProjectDTO(found);
  }

  // -------------------------------------------------------------
  // CREACIÓN ATÓMICA DE PROYECTO + 6 ETAPAS EN TRANSACCIÓN DB
  // -------------------------------------------------------------
  public static async createProject(
    organizationId: number,
    userId: number,
    data: CreateArchitectureProjectInput
  ) {
    if (!data.name?.trim()) {
      throw new Error("El nombre del proyecto es obligatorio.");
    }

    if (!data.clientId) {
      throw new Error("El cliente asociado es obligatorio.");
    }

    if (!data.leadArchitectUserId) {
      throw new Error("El arquitecto líder responsable es obligatorio.");
    }

    return await db.$transaction(async (tx) => {
      // 1. Validar cliente en la misma organización
      const clientRecord = await tx.architectureClient.findUnique({
        where: { id: data.clientId },
      });

      if (!clientRecord || clientRecord.organizationId !== organizationId) {
        throw new Error(
          `El cliente con ID ${data.clientId} no existe en esta organización.`
        );
      }

      // 2. Validar arquitecto responsable
      await ArchitectureService.validateResponsibleArchitect(
        organizationId,
        data.leadArchitectUserId,
        tx
      );

      // 3. Generar código con cerrojo de concurrencia
      const code = await ArchitectureService.generateNextProjectCode(
        organizationId,
        undefined,
        tx
      );

      // 4. Crear el proyecto
      const createdProject = await tx.architectureProject.create({
        data: {
          organizationId,
          clientId: data.clientId,
          code,
          name: data.name.trim(),
          type: data.type || "Vivienda",
          location: data.location?.trim() || null,
          approxAreaM2: data.approxAreaM2 !== undefined && data.approxAreaM2 !== null ? Number(data.approxAreaM2) : null,
          levelsCount: data.levelsCount !== undefined && data.levelsCount !== null ? Number(data.levelsCount) : null,
          leadArchitectUserId: data.leadArchitectUserId,
          startDate: data.startDate ? new Date(data.startDate) : null,
          targetDeliveryDate: data.targetDeliveryDate ? new Date(data.targetDeliveryDate) : null,
          status: data.status || "Planificación",
          priority: data.priority || "Media",
          description: data.description?.trim() || null,
          clientRequirements: data.clientRequirements?.trim() || null,
          notes: data.notes?.trim() || null,
          createdByUserId: userId,
        },
      });

      // 5. Crear exactamente las 6 etapas por defecto de forma atómica
      for (const stageDef of DEFAULT_ARCHITECTURE_STAGES) {
        await tx.architectureProjectStage.create({
          data: {
            organizationId,
            projectId: createdProject.id,
            name: stageDef.name,
            order: stageDef.order,
            status: "Pendiente",
            progress: 0,
          },
        });
      }

      // 6. Consultar proyecto completo con etapas y relaciones para el retorno
      const fullProject = await tx.architectureProject.findUnique({
        where: { id: createdProject.id },
        include: {
          client: true,
          leadArchitectUser: { select: { id: true, name: true, email: true } },
          stages: { orderBy: { order: "asc" } },
          budgets: { include: { items: true } },
        },
      });

      return ArchitectureService.mapProjectDTO(fullProject);
    });
  }

  public static async updateProject(
    organizationId: number,
    projectId: number,
    data: UpdateArchitectureProjectInput,
    client: any = db
  ) {
    const existing = await client.architectureProject.findUnique({
      where: { id: projectId },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Proyecto con ID ${projectId} no encontrado en la organización.`);
    }

    if (existing.status === "Archivado") {
      throw new Error("No se puede modificar un proyecto que se encuentra archivado.");
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error("El nombre no puede estar vacío.");
      updateData.name = data.name.trim();
    }

    if (data.type !== undefined) updateData.type = data.type;
    if (data.location !== undefined) updateData.location = data.location?.trim() || null;
    if (data.approxAreaM2 !== undefined) {
      updateData.approxAreaM2 = data.approxAreaM2 !== null ? Number(data.approxAreaM2) : null;
    }
    if (data.levelsCount !== undefined) {
      updateData.levelsCount = data.levelsCount !== null ? Number(data.levelsCount) : null;
    }

    if (data.leadArchitectUserId !== undefined) {
      await ArchitectureService.validateResponsibleArchitect(
        organizationId,
        data.leadArchitectUserId,
        client
      );
      updateData.leadArchitectUserId = data.leadArchitectUserId;
    }

    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.targetDeliveryDate !== undefined) {
      updateData.targetDeliveryDate = data.targetDeliveryDate ? new Date(data.targetDeliveryDate) : null;
    }
    if (data.actualEndDate !== undefined) {
      updateData.actualEndDate = data.actualEndDate ? new Date(data.actualEndDate) : null;
    }
    if (data.status !== undefined) {
      if (data.status === "Archivado") {
        throw new Error("Para archivar un proyecto utilice la operación formal de archivado.");
      }
      updateData.status = data.status;
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.clientRequirements !== undefined) {
      updateData.clientRequirements = data.clientRequirements?.trim() || null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    await client.architectureProject.update({
      where: { id: projectId },
      data: updateData,
    });

    return ArchitectureService.getProjectById(organizationId, projectId, client);
  }

  // -------------------------------------------------------------
  // ARCHIVADO LÓGICO DE PROYECTO
  // -------------------------------------------------------------
  public static async archiveProject(
    organizationId: number,
    projectId: number,
    userId: number,
    reason?: string,
    client: any = db
  ) {
    const existing = await client.architectureProject.findUnique({
      where: { id: projectId },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Proyecto con ID ${projectId} no encontrado en la organización.`);
    }

    const updated = await client.architectureProject.update({
      where: { id: projectId },
      data: {
        status: "Archivado",
        archivedAt: new Date(),
        archivedByUserId: userId,
        archiveReason: reason?.trim() || null,
      },
    });

    return ArchitectureService.getProjectById(organizationId, projectId, client);
  }

  public static async unarchiveProject(
    organizationId: number,
    projectId: number,
    client: any = db
  ) {
    const existing = await client.architectureProject.findUnique({
      where: { id: projectId },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Proyecto con ID ${projectId} no encontrado en la organización.`);
    }

    await client.architectureProject.update({
      where: { id: projectId },
      data: {
        status: "Planificación",
        archivedAt: null,
        archivedByUserId: null,
        archiveReason: null,
      },
    });

    return ArchitectureService.getProjectById(organizationId, projectId, client);
  }

  // -------------------------------------------------------------
  // ETAPAS (ArchitectureProjectStage)
  // -------------------------------------------------------------
  public static async updateStage(
    organizationId: number,
    projectId: number,
    stageId: number,
    data: UpdateArchitectureStageInput,
    client: any = db
  ) {
    const stage = await client.architectureProjectStage.findUnique({
      where: { id: stageId },
    });

    if (!stage || stage.projectId !== projectId || stage.organizationId !== organizationId) {
      throw new Error(`Etapa con ID ${stageId} no encontrada para este proyecto.`);
    }

    const updateData: any = {};

    if (data.progress !== undefined) {
      const progressNum = Number(data.progress);
      if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
        throw new Error("El porcentaje de avance debe ser un número entero entre 0 y 100.");
      }
      updateData.progress = Math.round(progressNum);
      if (updateData.progress === 100 && (!data.status || data.status === "En progreso" || data.status === "Pendiente")) {
        updateData.status = "Completada";
      }
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    await client.architectureProjectStage.update({
      where: { id: stageId },
      data: updateData,
    });

    // Recalcular y retornar proyecto con su nuevo avance dinámico derivado
    return ArchitectureService.getProjectById(organizationId, projectId, client);
  }

  // -------------------------------------------------------------
  // TAREAS (ArchitectureTask)
  // -------------------------------------------------------------
  public static mapTaskDTO(t: any) {
    const isOverdue = Boolean(
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completada"
    );

    return {
      id: t.id,
      organizationId: t.organizationId,
      projectId: t.projectId,
      projectName: t.project?.name || "",
      stageId: t.stageId ?? undefined,
      stageName: t.stage?.name || undefined,
      title: t.title,
      description: t.description || "",
      assignedTo: t.assignedToUser?.name || "Sin asignar",
      assignedToUserId: t.assignedToUserId ?? undefined,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
      isOverdue,
      completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
      createdByUserId: t.createdByUserId,
      createdAt: t.createdAt ? t.createdAt.toISOString() : "",
      updatedAt: t.updatedAt ? t.updatedAt.toISOString() : "",
    };
  }

  public static async listTasks(
    organizationId: number,
    filters?: {
      projectId?: number;
      stageId?: number;
      status?: string;
      assignedToUserId?: number;
      search?: string;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters?.stageId) {
      where.stageId = filters.stageId;
    }
    if (filters?.status && filters.status !== "todos" && filters.status !== "all") {
      where.status = filters.status;
    }
    if (filters?.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }
    if (filters?.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { project: { name: { contains: term, mode: "insensitive" } } },
        { assignedToUser: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const tasks = await client.architectureTask.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    return tasks.map((t: any) => ArchitectureService.mapTaskDTO(t));
  }

  public static async getTaskById(
    organizationId: number,
    taskId: number,
    client: any = db
  ) {
    const task = await client.architectureTask.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!task || task.organizationId !== organizationId) {
      throw new Error(`Tarea con ID ${taskId} no encontrada en la organización.`);
    }

    return ArchitectureService.mapTaskDTO(task);
  }

  public static async createTask(
    organizationId: number,
    userId: number,
    data: CreateArchitectureTaskInput,
    client: any = db
  ) {
    if (!data.title?.trim()) {
      throw new Error("El título de la tarea es obligatorio.");
    }
    if (!data.projectId) {
      throw new Error("El ID de proyecto es obligatorio para crear una tarea.");
    }

    // 1. Validar proyecto: existencia, pertenencia y no archivado
    const project = await client.architectureProject.findUnique({
      where: { id: data.projectId },
    });
    if (!project || project.organizationId !== organizationId) {
      throw new Error(`Proyecto con ID ${data.projectId} no encontrado en la organización.`);
    }
    if (project.status === "Archivado") {
      throw new Error("No se pueden crear tareas en un proyecto archivado.");
    }

    // 2. Validar etapa si se especificó
    if (data.stageId) {
      const stage = await client.architectureProjectStage.findUnique({
        where: { id: data.stageId },
      });
      if (!stage || stage.organizationId !== organizationId || stage.projectId !== data.projectId) {
        throw new Error(`La etapa con ID ${data.stageId} no pertenece al proyecto especificado.`);
      }
    }

    // 3. Validar asignación de usuario si se especificó
    if (data.assignedToUserId) {
      await ArchitectureService.validateAssignedMember(organizationId, data.assignedToUserId, client);
    }

    // 4. Normalizar estado
    let status = data.status || "Pendiente";
    if (status === "Atrasada") {
      status = "Pendiente";
    }
    const validStatuses = ["Pendiente", "En progreso", "Completada"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Estado de tarea inválido: ${status}`);
    }

    const completedAt = status === "Completada" ? new Date() : null;
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;

    const created = await client.architectureTask.create({
      data: {
        organizationId,
        projectId: data.projectId,
        stageId: data.stageId || null,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        assignedToUserId: data.assignedToUserId || null,
        priority: data.priority || "Media",
        status,
        dueDate,
        completedAt,
        createdByUserId: userId,
      },
    });

    return ArchitectureService.getTaskById(organizationId, created.id, client);
  }

  public static async updateTask(
    organizationId: number,
    taskId: number,
    data: UpdateArchitectureTaskInput,
    client: any = db
  ) {
    const existing = await client.architectureTask.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Tarea con ID ${taskId} no encontrada en la organización.`);
    }

    if (existing.project.status === "Archivado") {
      throw new Error("No se pueden modificar tareas en un proyecto archivado.");
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      if (!data.title?.trim()) {
        throw new Error("El título de la tarea no puede estar vacío.");
      }
      updateData.title = data.title.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if (data.stageId !== undefined) {
      if (data.stageId === null) {
        updateData.stageId = null;
      } else {
        const stage = await client.architectureProjectStage.findUnique({
          where: { id: data.stageId },
        });
        if (!stage || stage.organizationId !== organizationId || stage.projectId !== existing.projectId) {
          throw new Error(`La etapa con ID ${data.stageId} no pertenece al proyecto especificado.`);
        }
        updateData.stageId = data.stageId;
      }
    }

    if (data.assignedToUserId !== undefined) {
      if (data.assignedToUserId === null) {
        updateData.assignedToUserId = null;
      } else {
        await ArchitectureService.validateAssignedMember(organizationId, data.assignedToUserId, client);
        updateData.assignedToUserId = data.assignedToUserId;
      }
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if (data.status !== undefined) {
      let status = data.status;
      if (status === "Atrasada") status = "Pendiente";
      const validStatuses = ["Pendiente", "En progreso", "Completada"];
      if (!validStatuses.includes(status)) {
        throw new Error(`Estado de tarea inválido: ${status}`);
      }
      updateData.status = status;
      if (status === "Completada" && existing.status !== "Completada") {
        updateData.completedAt = new Date();
      } else if (status !== "Completada" && existing.status === "Completada") {
        updateData.completedAt = null;
      }
    }

    await client.architectureTask.update({
      where: { id: taskId },
      data: updateData,
    });

    return ArchitectureService.getTaskById(organizationId, taskId, client);
  }

  public static async toggleTaskStatus(
    organizationId: number,
    taskId: number,
    client: any = db
  ) {
    const existing = await client.architectureTask.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Tarea con ID ${taskId} no encontrada en la organización.`);
    }

    if (existing.project.status === "Archivado") {
      throw new Error("No se pueden modificar tareas en un proyecto archivado.");
    }

    const isCompleting = existing.status !== "Completada";
    const newStatus = isCompleting ? "Completada" : "Pendiente";
    const completedAt = isCompleting ? new Date() : null;

    await client.architectureTask.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completedAt,
      },
    });

    return ArchitectureService.getTaskById(organizationId, taskId, client);
  }

  // -------------------------------------------------------------
  // ENTREGABLES (ArchitectureDeliverable)
  // -------------------------------------------------------------
  public static mapDeliverableDTO(d: any) {
    return {
      id: d.id,
      organizationId: d.organizationId,
      projectId: d.projectId,
      projectName: d.project?.name || "",
      stageId: d.stageId ?? undefined,
      stageName: d.stage?.name || undefined,
      name: d.name,
      type: d.type,
      assignedTo: d.assignedToUser?.name || "Sin asignar",
      assignedToUserId: d.assignedToUserId ?? undefined,
      dueDate: d.dueDate ? d.dueDate.toISOString().slice(0, 10) : "",
      status: d.status,
      deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : undefined,
      notes: d.notes || undefined,
      createdByUserId: d.createdByUserId,
      createdAt: d.createdAt ? d.createdAt.toISOString() : "",
      updatedAt: d.updatedAt ? d.updatedAt.toISOString() : "",
    };
  }

  public static async listDeliverables(
    organizationId: number,
    filters?: {
      projectId?: number;
      stageId?: number;
      status?: string;
      assignedToUserId?: number;
      type?: string;
      search?: string;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters?.stageId) {
      where.stageId = filters.stageId;
    }
    if (filters?.status && filters.status !== "todos" && filters.status !== "all") {
      where.status = filters.status;
    }
    if (filters?.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }
    if (filters?.type && filters.type !== "todos" && filters.type !== "all") {
      where.type = filters.type;
    }
    if (filters?.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
        { project: { name: { contains: term, mode: "insensitive" } } },
        { assignedToUser: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const deliverables = await client.architectureDeliverable.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    return deliverables.map((d: any) => ArchitectureService.mapDeliverableDTO(d));
  }

  public static async getDeliverableById(
    organizationId: number,
    deliverableId: number,
    client: any = db
  ) {
    const deliverable = await client.architectureDeliverable.findUnique({
      where: { id: deliverableId },
      include: {
        project: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!deliverable || deliverable.organizationId !== organizationId) {
      throw new Error(`Entregable con ID ${deliverableId} no encontrado en la organización.`);
    }

    return ArchitectureService.mapDeliverableDTO(deliverable);
  }

  public static async createDeliverable(
    organizationId: number,
    userId: number,
    data: CreateArchitectureDeliverableInput,
    client: any = db
  ) {
    if (!data.name?.trim()) {
      throw new Error("El nombre del entregable es obligatorio.");
    }
    if (!data.projectId) {
      throw new Error("El ID de proyecto es obligatorio para registrar un entregable.");
    }

    // 1. Validar proyecto: pertenencia y no archivado
    const project = await client.architectureProject.findUnique({
      where: { id: data.projectId },
    });
    if (!project || project.organizationId !== organizationId) {
      throw new Error(`Proyecto con ID ${data.projectId} no encontrado en la organización.`);
    }
    if (project.status === "Archivado") {
      throw new Error("No se pueden registrar entregables en un proyecto archivado.");
    }

    // 2. Validar etapa si se especificó
    if (data.stageId) {
      const stage = await client.architectureProjectStage.findUnique({
        where: { id: data.stageId },
      });
      if (!stage || stage.organizationId !== organizationId || stage.projectId !== data.projectId) {
        throw new Error(`La etapa con ID ${data.stageId} no pertenece al proyecto especificado.`);
      }
    }

    // 3. Validar asignación de usuario si se especificó
    if (data.assignedToUserId) {
      await ArchitectureService.validateAssignedMember(organizationId, data.assignedToUserId, client);
    }

    const status = data.status || "Pendiente";
    const deliveredAt = status === "Entregado" ? new Date() : null;
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;

    const created = await client.architectureDeliverable.create({
      data: {
        organizationId,
        projectId: data.projectId,
        stageId: data.stageId || null,
        name: data.name.trim(),
        type: data.type || "Planos",
        assignedToUserId: data.assignedToUserId || null,
        dueDate,
        status,
        deliveredAt,
        notes: data.notes?.trim() || null,
        createdByUserId: userId,
      },
    });

    return ArchitectureService.getDeliverableById(organizationId, created.id, client);
  }

  public static async updateDeliverable(
    organizationId: number,
    deliverableId: number,
    data: UpdateArchitectureDeliverableInput,
    client: any = db
  ) {
    const existing = await client.architectureDeliverable.findUnique({
      where: { id: deliverableId },
      include: { project: true },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Entregable con ID ${deliverableId} no encontrado en la organización.`);
    }

    if (existing.project.status === "Archivado") {
      throw new Error("No se pueden modificar entregables en un proyecto archivado.");
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw new Error("El nombre del entregable no puede estar vacío.");
      }
      updateData.name = data.name.trim();
    }

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    if (data.stageId !== undefined) {
      if (data.stageId === null) {
        updateData.stageId = null;
      } else {
        const stage = await client.architectureProjectStage.findUnique({
          where: { id: data.stageId },
        });
        if (!stage || stage.organizationId !== organizationId || stage.projectId !== existing.projectId) {
          throw new Error(`La etapa con ID ${data.stageId} no pertenece al proyecto especificado.`);
        }
        updateData.stageId = data.stageId;
      }
    }

    if (data.assignedToUserId !== undefined) {
      if (data.assignedToUserId === null) {
        updateData.assignedToUserId = null;
      } else {
        await ArchitectureService.validateAssignedMember(organizationId, data.assignedToUserId, client);
        updateData.assignedToUserId = data.assignedToUserId;
      }
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "Entregado" && existing.status !== "Entregado") {
        updateData.deliveredAt = new Date();
      } else if (data.status !== "Entregado" && existing.status === "Entregado") {
        updateData.deliveredAt = null;
      }
    }

    await client.architectureDeliverable.update({
      where: { id: deliverableId },
      data: updateData,
    });

    return ArchitectureService.getDeliverableById(organizationId, deliverableId, client);
  }

  // -------------------------------------------------------------
  // REUNIONES E INSPECCIONES (ArchitectureMeeting)
  // -------------------------------------------------------------
  public static mapMeetingDTO(m: any) {
    const scheduledAt = m.scheduledAt ? new Date(m.scheduledAt) : null;
    return {
      id: m.id,
      organizationId: m.organizationId,
      projectId: m.projectId,
      projectName: m.project?.name || "",
      clientId: m.project?.clientId ?? undefined,
      clientName: m.project?.client?.name || "",
      title: m.title,
      scheduledAt: scheduledAt ? scheduledAt.toISOString() : "",
      date: scheduledAt ? scheduledAt.toISOString().slice(0, 10) : "",
      time: scheduledAt ? scheduledAt.toISOString().slice(11, 16) : "",
      location: m.location || "",
      meetingUrl: m.meetingUrl || undefined,
      modality: m.modality,
      meetingType: m.meetingType || "Reunión",
      leadArchitect: m.leadArchitectUser?.name || "Sin asignar",
      leadArchitectUserId: m.leadArchitectUserId ?? undefined,
      status: m.status,
      notes: m.notes || undefined,
      completedAt: m.completedAt ? m.completedAt.toISOString() : undefined,
      cancelledAt: m.cancelledAt ? m.cancelledAt.toISOString() : undefined,
      createdByUserId: m.createdByUserId,
      createdAt: m.createdAt ? m.createdAt.toISOString() : "",
      updatedAt: m.updatedAt ? m.updatedAt.toISOString() : "",
    };
  }

  public static async listMeetings(
    organizationId: number,
    filters?: {
      projectId?: number;
      status?: string;
      leadArchitectUserId?: number;
      modality?: string;
      meetingType?: string;
      search?: string;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters?.status && filters.status !== "todos" && filters.status !== "all") {
      where.status = filters.status;
    }
    if (filters?.leadArchitectUserId) {
      where.leadArchitectUserId = filters.leadArchitectUserId;
    }
    if (filters?.modality && filters.modality !== "todos" && filters.modality !== "all") {
      where.modality = filters.modality;
    }
    if (filters?.meetingType && filters.meetingType !== "todos" && filters.meetingType !== "all") {
      where.meetingType = filters.meetingType;
    }
    if (filters?.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { location: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
        { project: { name: { contains: term, mode: "insensitive" } } },
        { project: { client: { name: { contains: term, mode: "insensitive" } } } },
      ];
    }

    const meetings = await client.architectureMeeting.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
        leadArchitectUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return meetings.map((m: any) => ArchitectureService.mapMeetingDTO(m));
  }

  public static async getMeetingById(
    organizationId: number,
    meetingId: number,
    client: any = db
  ) {
    const meeting = await client.architectureMeeting.findUnique({
      where: { id: meetingId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
        leadArchitectUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!meeting || meeting.organizationId !== organizationId) {
      throw new Error(`Reunión con ID ${meetingId} no encontrada en la organización.`);
    }

    return ArchitectureService.mapMeetingDTO(meeting);
  }

  public static async createMeeting(
    organizationId: number,
    userId: number,
    data: CreateArchitectureMeetingInput,
    client: any = db
  ) {
    if (!data.title?.trim()) {
      throw new Error("El título de la reunión es obligatorio.");
    }
    if (!data.projectId) {
      throw new Error("El ID de proyecto es obligatorio para agendar una reunión.");
    }

    // 1. Validar proyecto: existencia, pertenencia y no archivado
    const project = await client.architectureProject.findUnique({
      where: { id: data.projectId },
    });
    if (!project || project.organizationId !== organizationId) {
      throw new Error(`Proyecto con ID ${data.projectId} no encontrado en la organización.`);
    }
    if (project.status === "Archivado") {
      throw new Error("No se pueden agendar reuniones en un proyecto archivado.");
    }

    // 2. Validar arquitecto responsable si se especificó
    if (data.leadArchitectUserId) {
      await ArchitectureService.validateResponsibleArchitect(
        organizationId,
        data.leadArchitectUserId,
        client
      );
    }

    // 3. Resolver scheduledAt
    let scheduledAt: Date;
    if (data.scheduledAt) {
      scheduledAt = new Date(data.scheduledAt);
    } else if (data.date) {
      const timeStr = data.time || "10:00";
      scheduledAt = new Date(`${data.date}T${timeStr}:00.000Z`);
    } else {
      throw new Error("La fecha y hora de la reunión son obligatorias.");
    }

    if (isNaN(scheduledAt.getTime())) {
      throw new Error("Formato de fecha u hora de reunión inválido.");
    }

    const status = data.status || "Programada";
    const completedAt = status === "Realizada" ? new Date() : null;
    const cancelledAt = status === "Cancelada" ? new Date() : null;

    const created = await client.architectureMeeting.create({
      data: {
        organizationId,
        projectId: data.projectId,
        title: data.title.trim(),
        scheduledAt,
        location: data.location?.trim() || null,
        meetingUrl: data.meetingUrl?.trim() || null,
        modality: data.modality || "Presencial",
        meetingType: data.meetingType || "Reunión",
        leadArchitectUserId: data.leadArchitectUserId || null,
        status,
        notes: data.notes?.trim() || null,
        completedAt,
        cancelledAt,
        createdByUserId: userId,
      },
    });

    return ArchitectureService.getMeetingById(organizationId, created.id, client);
  }

  public static async updateMeeting(
    organizationId: number,
    meetingId: number,
    data: UpdateArchitectureMeetingInput,
    client: any = db
  ) {
    const existing = await client.architectureMeeting.findUnique({
      where: { id: meetingId },
      include: { project: true },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Reunión con ID ${meetingId} no encontrada en la organización.`);
    }

    if (existing.project.status === "Archivado") {
      throw new Error("No se pueden modificar reuniones en un proyecto archivado.");
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      if (!data.title?.trim()) {
        throw new Error("El título de la reunión no puede estar vacío.");
      }
      updateData.title = data.title.trim();
    }

    if (data.location !== undefined) {
      updateData.location = data.location?.trim() || null;
    }

    if (data.meetingUrl !== undefined) {
      updateData.meetingUrl = data.meetingUrl?.trim() || null;
    }

    if (data.modality !== undefined) {
      updateData.modality = data.modality;
    }

    if (data.meetingType !== undefined) {
      updateData.meetingType = data.meetingType;
    }

    if (data.leadArchitectUserId !== undefined) {
      if (data.leadArchitectUserId === null) {
        updateData.leadArchitectUserId = null;
      } else {
        await ArchitectureService.validateResponsibleArchitect(
          organizationId,
          data.leadArchitectUserId,
          client
        );
        updateData.leadArchitectUserId = data.leadArchitectUserId;
      }
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    // Resolver fecha y hora
    if (data.scheduledAt !== undefined) {
      const d = new Date(data.scheduledAt);
      if (isNaN(d.getTime())) throw new Error("Formato de fecha inválido.");
      updateData.scheduledAt = d;
    } else if (data.date !== undefined) {
      const timeStr = data.time || (existing.scheduledAt ? existing.scheduledAt.toISOString().slice(11, 16) : "10:00");
      const d = new Date(`${data.date}T${timeStr}:00.000Z`);
      if (isNaN(d.getTime())) throw new Error("Formato de fecha u hora inválido.");
      updateData.scheduledAt = d;
    } else if (data.time !== undefined && existing.scheduledAt) {
      const dateStr = existing.scheduledAt.toISOString().slice(0, 10);
      const d = new Date(`${dateStr}T${data.time}:00.000Z`);
      if (isNaN(d.getTime())) throw new Error("Formato de hora inválido.");
      updateData.scheduledAt = d;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "Realizada" && existing.status !== "Realizada") {
        updateData.completedAt = new Date();
        updateData.cancelledAt = null;
      } else if (data.status === "Cancelada" && existing.status !== "Cancelada") {
        updateData.cancelledAt = new Date();
        updateData.completedAt = null;
      } else if (data.status === "Programada") {
        updateData.completedAt = null;
        updateData.cancelledAt = null;
      }
    }

    await client.architectureMeeting.update({
      where: { id: meetingId },
      data: updateData,
    });

    return ArchitectureService.getMeetingById(organizationId, meetingId, client);
  }

  // -------------------------------------------------------------
  // GESTIÓN DOCUMENTAL (ArchitectureDocument & ArchitectureDocumentVersion)
  // -------------------------------------------------------------
  public static mapDocumentVersionDTO(v: any) {
    return {
      id: v.id,
      organizationId: v.organizationId,
      documentId: v.documentId,
      versionNumber: v.versionNumber,
      originalFilename: v.originalFilename,
      storageKey: v.storageKey,
      mimeType: v.mimeType,
      fileSize: v.fileSize,
      checksumSha256: v.checksumSha256,
      notes: v.notes || undefined,
      uploadedByUserId: v.uploadedByUserId,
      uploadedByName: v.uploadedByUser?.name || "",
      createdAt: v.createdAt ? v.createdAt.toISOString() : "",
    };
  }

  public static mapDocumentDTO(d: any) {
    const versions = (d.versions || []).map((v: any) =>
      ArchitectureService.mapDocumentVersionDTO(v)
    );
    const currentVersion = versions.length > 0 ? versions[0] : null;

    return {
      id: d.id,
      organizationId: d.organizationId,
      projectId: d.projectId,
      projectName: d.project?.name || "",
      stageId: d.stageId ?? undefined,
      stageName: d.stage?.name || undefined,
      name: d.name,
      documentType: d.documentType,
      description: d.description || "",
      status: d.status,
      createdByUserId: d.createdByUserId,
      createdByName: d.createdByUser?.name || "",
      versionsCount: d._count?.versions ?? versions.length,
      currentVersion,
      versions,
      createdAt: d.createdAt ? d.createdAt.toISOString() : "",
      updatedAt: d.updatedAt ? d.updatedAt.toISOString() : "",
    };
  }

  public static async listDocuments(
    organizationId: number,
    filters?: {
      projectId?: number;
      stageId?: number;
      status?: string;
      documentType?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.stageId) {
      where.stageId = filters.stageId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.documentType) {
      where.documentType = filters.documentType;
    }

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { description: { contains: s, mode: "insensitive" } },
      ];
    }

    const docs = await client.architectureDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit ? Math.min(filters.limit, 100) : 100,
      skip: filters?.offset || 0,
      include: {
        project: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        versions: {
          include: { uploadedByUser: { select: { id: true, name: true, email: true } } },
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    return docs.map((d: any) => ArchitectureService.mapDocumentDTO(d));
  }

  public static async getDocumentById(
    organizationId: number,
    documentId: number,
    client: any = db
  ) {
    const doc = await client.architectureDocument.findUnique({
      where: { id: documentId },
      include: {
        project: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        versions: {
          include: { uploadedByUser: { select: { id: true, name: true, email: true } } },
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new Error(`Documento con ID ${documentId} no encontrado en la organización.`);
    }

    return ArchitectureService.mapDocumentDTO(doc);
  }

  public static async createDocument(
    organizationId: number,
    userId: number,
    data: CreateArchitectureDocumentInput,
    initialFile?: {
      originalname?: string;
      originalName?: string;
      fileName?: string;
      mimetype?: string;
      mimeType?: string;
      buffer: Buffer;
    },
    initialNotes?: string | null,
    client: any = db
  ) {
    // 1. Validar proyecto y verificar que no esté archivado
    const project = await client.architectureProject.findUnique({
      where: { id: data.projectId },
    });

    if (!project || project.organizationId !== organizationId) {
      throw new Error(`Proyecto con ID ${data.projectId} no encontrado en la organización.`);
    }

    if (project.archivedAt) {
      throw new Error("No se pueden crear documentos en un proyecto archivado.");
    }

    // 2. Validar etapa si se proporciona
    if (data.stageId) {
      const stage = await client.architectureProjectStage.findUnique({
        where: { id: data.stageId },
      });

      if (
        !stage ||
        stage.organizationId !== organizationId ||
        stage.projectId !== data.projectId
      ) {
        throw new Error(`Etapa con ID ${data.stageId} no pertenece al proyecto.`);
      }
    }

    // 3. Validar nombre
    if (!data.name || !data.name.trim()) {
      throw new Error("El nombre del documento es obligatorio.");
    }

    // 4. Crear documento lógico
    const doc = await client.architectureDocument.create({
      data: {
        organizationId,
        projectId: data.projectId,
        stageId: data.stageId || null,
        name: data.name.trim(),
        documentType: data.documentType?.trim() || "Plano",
        description: data.description?.trim() || null,
        status: data.status?.trim() || "Borrador",
        createdByUserId: userId,
      },
    });

    // 5. Si se proporciona archivo inicial, generar versión 1 automáticamente
    if (initialFile && initialFile.buffer && initialFile.buffer.length > 0) {
      try {
        await ArchitectureService.addDocumentVersion(
          organizationId,
          userId,
          doc.projectId,
          doc.id,
          initialFile,
          initialNotes
        );
      } catch (err) {
        // Compensación: eliminar documento lógico si falla la subida inicial
        await client.architectureDocument.delete({ where: { id: doc.id } });
        throw err;
      }
    }

    return ArchitectureService.getDocumentById(organizationId, doc.id, client);
  }

  public static async updateDocument(
    organizationId: number,
    documentId: number,
    data: UpdateArchitectureDocumentInput,
    client: any = db
  ) {
    const existing = await client.architectureDocument.findUnique({
      where: { id: documentId },
      include: { project: true },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error(`Documento con ID ${documentId} no encontrado en la organización.`);
    }

    if (existing.project.archivedAt) {
      throw new Error("No se pueden modificar documentos de un proyecto archivado.");
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw new Error("El nombre del documento no puede estar vacío.");
      }
      updateData.name = data.name.trim();
    }

    if (data.stageId !== undefined) {
      if (data.stageId === null) {
        updateData.stageId = null;
      } else {
        const stage = await client.architectureProjectStage.findUnique({
          where: { id: data.stageId },
        });
        if (
          !stage ||
          stage.organizationId !== organizationId ||
          stage.projectId !== existing.projectId
        ) {
          throw new Error(`Etapa con ID ${data.stageId} no pertenece al proyecto.`);
        }
        updateData.stageId = data.stageId;
      }
    }

    if (data.documentType !== undefined) {
      updateData.documentType = data.documentType.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.status !== undefined) {
      updateData.status = data.status.trim();
    }

    await client.architectureDocument.update({
      where: { id: documentId },
      data: updateData,
    });

    return ArchitectureService.getDocumentById(organizationId, documentId, client);
  }

  public static async addDocumentVersion(
    organizationId: number,
    userId: number,
    projectId: number,
    documentId: number,
    file: {
      originalname?: string;
      originalName?: string;
      fileName?: string;
      mimetype?: string;
      mimeType?: string;
      buffer: Buffer;
    },
    notes?: string | null
  ) {
    const rawFileName =
      file.originalname || file.originalName || file.fileName || `documento_${Date.now()}.pdf`;
    const rawMimeType = file.mimetype || file.mimeType || "application/pdf";

    // 1. Validar proyecto y verificar que no esté archivado
    const project = await db.architectureProject.findUnique({
      where: { id: projectId },
    });

    if (!project || project.organizationId !== organizationId) {
      throw new Error(`Proyecto con ID ${projectId} no encontrado en la organización.`);
    }

    if (project.archivedAt) {
      throw new Error("No se pueden modificar documentos ni subir versiones a un proyecto archivado.");
    }

    // 2. Validar documento
    const document = await db.architectureDocument.findUnique({
      where: { id: documentId },
    });

    if (
      !document ||
      document.organizationId !== organizationId ||
      document.projectId !== projectId
    ) {
      throw new Error(`Documento con ID ${documentId} no encontrado en el proyecto.`);
    }

    // 3. Guardar archivo físico en almacenamiento privado seguro
    const storedFile = await ArchitectureStorageService.saveFile(
      organizationId,
      projectId,
      documentId,
      rawFileName,
      rawMimeType,
      file.buffer
    );

    // 4. Transacción DB serializada con bloqueo consultivo advisory lock
    try {
      const newVersion = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('arch_doc_v_' || ${organizationId}::text || '_' || ${documentId}::text))`;

        const maxVersion = await tx.architectureDocumentVersion.aggregate({
          where: { documentId },
          _max: { versionNumber: true },
        });

        const nextVersionNumber = (maxVersion._max.versionNumber || 0) + 1;

        const version = await tx.architectureDocumentVersion.create({
          data: {
            organizationId,
            documentId,
            versionNumber: nextVersionNumber,
            originalFilename: storedFile.sanitizedFileName,
            storageKey: storedFile.storageKey,
            mimeType: storedFile.mimeType,
            fileSize: storedFile.fileSize,
            checksumSha256: storedFile.checksumSha256,
            notes: notes ? notes.trim() : null,
            uploadedByUserId: userId,
          },
          include: {
            uploadedByUser: { select: { id: true, name: true, email: true } },
          },
        });

        await tx.architectureDocument.update({
          where: { id: documentId },
          data: { updatedAt: new Date() },
        });

        return version;
      });

      return ArchitectureService.mapDocumentVersionDTO(newVersion);
    } catch (dbError) {
      // Compensación atómica: eliminar únicamente este archivo físico si la transacción falla
      await ArchitectureStorageService.deleteFile(
        organizationId,
        projectId,
        documentId,
        storedFile.storageKey
      );
      throw dbError;
    }
  }

  public static async listDocumentVersions(
    organizationId: number,
    documentId: number,
    client: any = db
  ) {
    const doc = await client.architectureDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new Error(`Documento con ID ${documentId} no encontrado en la organización.`);
    }

    const versions = await client.architectureDocumentVersion.findMany({
      where: { documentId, organizationId },
      orderBy: { versionNumber: "desc" },
      include: {
        uploadedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    return versions.map((v: any) => ArchitectureService.mapDocumentVersionDTO(v));
  }

  public static async getDocumentVersion(
    organizationId: number,
    documentId: number,
    versionId: number,
    client: any = db
  ) {
    const version = await client.architectureDocumentVersion.findUnique({
      where: { id: versionId },
      include: {
        document: true,
        uploadedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (
      !version ||
      version.organizationId !== organizationId ||
      version.documentId !== documentId
    ) {
      throw new Error(`Versión con ID ${versionId} no encontrada para el documento.`);
    }

    return ArchitectureService.mapDocumentVersionDTO(version);
  }

  public static async getDocumentVersionFile(
    organizationId: number,
    documentId: number,
    versionId?: number,
    client: any = db
  ) {
    const doc = await client.architectureDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new Error(`Documento con ID ${documentId} no encontrado en la organización.`);
    }

    let version: any = null;
    if (versionId) {
      version = await client.architectureDocumentVersion.findUnique({
        where: { id: versionId },
      });
      if (
        !version ||
        version.organizationId !== organizationId ||
        version.documentId !== documentId
      ) {
        throw new Error(`Versión con ID ${versionId} no encontrada para el documento.`);
      }
    } else {
      version = await client.architectureDocumentVersion.findFirst({
        where: { documentId, organizationId },
        orderBy: { versionNumber: "desc" },
      });
      if (!version) {
        throw new Error(`El documento no tiene ninguna versión registrada.`);
      }
    }

    const file = await ArchitectureStorageService.getFile(
      organizationId,
      doc.projectId,
      documentId,
      version.storageKey
    );

    return {
      buffer: file.buffer,
      absolutePath: file.absolutePath,
      originalFilename: version.originalFilename,
      mimeType: version.mimeType,
      fileSize: version.fileSize,
      checksumSha256: version.checksumSha256,
      versionNumber: version.versionNumber,
      versionId: version.id,
    };
  }

  // -------------------------------------------------------------
  // PRESUPUESTOS (ArchitectureBudget & ArchitectureBudgetItem)
  // -------------------------------------------------------------
  public static async createBudget(
    organizationId: number,
    userId: number,
    data: CreateArchitectureBudgetInput,
    client: any = db
  ) {
    return ArchitectureBudgetService.createBudget(organizationId, userId, data, client);
  }

  public static async listBudgets(
    organizationId: number,
    filters?: { projectId?: number; status?: string; search?: string },
    client: any = db
  ) {
    return ArchitectureBudgetService.listBudgets(organizationId, filters, client);
  }

  public static async getBudgetById(
    organizationId: number,
    budgetId: number,
    client: any = db
  ) {
    return ArchitectureBudgetService.getBudgetById(organizationId, budgetId, client);
  }

  public static async updateBudget(
    organizationId: number,
    userId: number,
    budgetId: number,
    data: UpdateArchitectureBudgetInput,
    client: any = db
  ) {
    return ArchitectureBudgetService.updateBudget(organizationId, userId, budgetId, data, client);
  }

  public static async approveBudget(
    organizationId: number,
    userId: number,
    budgetId: number,
    client: any = db
  ) {
    return ArchitectureBudgetService.approveBudget(organizationId, userId, budgetId, client);
  }

  public static async addBudgetItem(
    organizationId: number,
    userId: number,
    budgetId: number,
    data: CreateArchitectureBudgetItemInput,
    client: any = db
  ) {
    return ArchitectureBudgetService.addBudgetItem(organizationId, userId, budgetId, data, client);
  }

  public static async updateBudgetItem(
    organizationId: number,
    userId: number,
    budgetId: number,
    itemId: number,
    data: UpdateArchitectureBudgetItemInput,
    client: any = db
  ) {
    return ArchitectureBudgetService.updateBudgetItem(organizationId, userId, budgetId, itemId, data, client);
  }

  // -------------------------------------------------------------
  // READ MODELS DERIVADOS (Dashboard, Calendario, Reportes)
  // -------------------------------------------------------------
  public static async getCalendarEvents(
    organizationId: number,
    filters?: ArchitectureCalendarFilter,
    client: any = db
  ) {
    return ArchitectureCalendarService.getCalendarEvents(organizationId, filters, client);
  }

  public static async getDashboardData(
    organizationId: number,
    client: any = db
  ) {
    return ArchitectureDashboardService.getDashboardData(organizationId, client);
  }

  public static async getReportsSummary(
    organizationId: number,
    client: any = db
  ) {
    return ArchitectureReportsService.getReportsSummary(organizationId, client);
  }
}

