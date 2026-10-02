import { db } from "../lib/db";
import { Prisma } from "@prisma/client";

export interface CreateArchitectureBudgetItemInput {
  description: string;
  category?: string | null;
  quantity?: number | string | Prisma.Decimal;
  unitPrice?: number | string | Prisma.Decimal;
  order?: number;
}

export interface UpdateArchitectureBudgetItemInput {
  description?: string;
  category?: string | null;
  quantity?: number | string | Prisma.Decimal;
  unitPrice?: number | string | Prisma.Decimal;
  order?: number;
}

export interface CreateArchitectureBudgetInput {
  projectId: number;
  name: string;
  description?: string | null;
  status?: string;
  notes?: string | null;
  items?: CreateArchitectureBudgetItemInput[];
}

export interface UpdateArchitectureBudgetInput {
  name?: string;
  description?: string | null;
  status?: string;
  notes?: string | null;
}

export class ArchitectureBudgetService {
  /**
   * Mapea un item de presupuesto a DTO con subtotal calculado dinámicamente.
   */
  public static mapBudgetItemDTO(item: any) {
    const qty = new Prisma.Decimal(item.quantity ?? 1);
    const price = new Prisma.Decimal(item.unitPrice ?? 0);
    const subtotal = qty.mul(price);

    return {
      id: item.id,
      organizationId: item.organizationId,
      budgetId: item.budgetId,
      description: item.description,
      category: item.category || "General",
      quantity: Number(qty.toFixed(4)),
      unitPrice: Number(price.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      order: item.order ?? 0,
      createdAt: item.createdAt ? item.createdAt.toISOString() : "",
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : "",
    };
  }

  /**
   * Mapea un presupuesto a DTO con totales y montos calculados.
   */
  public static mapBudgetDTO(budget: any) {
    const rawItems = budget.items || [];
    const items = rawItems.map((it: any) => ArchitectureBudgetService.mapBudgetItemDTO(it));

    let totalDecimal = new Prisma.Decimal(0);
    for (const rawItem of rawItems) {
      const q = new Prisma.Decimal(rawItem.quantity ?? 1);
      const p = new Prisma.Decimal(rawItem.unitPrice ?? 0);
      totalDecimal = totalDecimal.add(q.mul(p));
    }

    const total = Number(totalDecimal.toFixed(2));
    const isApproved = budget.status === "Aprobado";

    return {
      id: budget.id,
      organizationId: budget.organizationId,
      projectId: budget.projectId,
      projectName: budget.project?.name || "",
      projectCode: budget.project?.code || "",
      name: budget.name,
      description: budget.description || "",
      status: budget.status,
      notes: budget.notes || undefined,
      total,
      estimatedAmount: total,
      approvedAmount: isApproved ? total : 0,
      approvedAt: budget.approvedAt ? budget.approvedAt.toISOString() : undefined,
      approvedByUserId: budget.approvedByUserId ?? undefined,
      approvedByName: budget.approvedByUser?.name || undefined,
      createdByUserId: budget.createdByUserId,
      createdByName: budget.createdByUser?.name || undefined,
      lastUpdated: budget.updatedAt ? budget.updatedAt.toISOString().slice(0, 10) : "",
      createdAt: budget.createdAt ? budget.createdAt.toISOString() : "",
      updatedAt: budget.updatedAt ? budget.updatedAt.toISOString() : "",
      items,
    };
  }

  /**
   * Valida que el proyecto pertenezca a la organización y no esté archivado.
   */
  private static async assertProjectActive(
    organizationId: number,
    projectId: number,
    client: any = db
  ) {
    const project = await client.architectureProject.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true, status: true, archivedAt: true },
    });

    if (!project || project.organizationId !== organizationId) {
      const err: any = new Error(`Proyecto con ID ${projectId} no encontrado en la organización.`);
      err.statusCode = 404;
      throw err;
    }

    if (project.archivedAt || project.status === "Archivado") {
      const err: any = new Error("No se pueden realizar modificaciones en un proyecto archivado.");
      err.statusCode = 400;
      throw err;
    }

    return project;
  }

  /**
   * Lista presupuestos de la organización con filtros.
   */
  public static async listBudgets(
    organizationId: number,
    filters?: {
      projectId?: number;
      status?: string;
      search?: string;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.status && filters.status !== "todos") {
      where.status = filters.status;
    }

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { description: { contains: s, mode: "insensitive" } },
        { project: { name: { contains: s, mode: "insensitive" } } },
      ];
    }

    const budgets = await client.architectureBudget.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: { orderBy: { order: "asc" } },
        project: { select: { id: true, name: true, code: true, status: true, archivedAt: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        approvedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    return budgets.map((b: any) => ArchitectureBudgetService.mapBudgetDTO(b));
  }

  /**
   * Obtiene un presupuesto por ID.
   */
  public static async getBudgetById(
    organizationId: number,
    budgetId: number,
    client: any = db
  ) {
    const budget = await client.architectureBudget.findUnique({
      where: { id: budgetId },
      include: {
        items: { orderBy: { order: "asc" } },
        project: { select: { id: true, name: true, code: true, status: true, archivedAt: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        approvedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!budget || budget.organizationId !== organizationId) {
      const err: any = new Error(`Presupuesto con ID ${budgetId} no encontrado en la organización.`);
      err.statusCode = 404;
      throw err;
    }

    return ArchitectureBudgetService.mapBudgetDTO(budget);
  }

  /**
   * Crea un nuevo presupuesto (opcionalmente con items iniciales).
   */
  public static async createBudget(
    organizationId: number,
    userId: number,
    data: CreateArchitectureBudgetInput,
    client: any = db
  ) {
    if (!data.projectId) {
      const err: any = new Error("El ID del proyecto es obligatorio.");
      err.statusCode = 400;
      throw err;
    }

    if (!data.name?.trim()) {
      const err: any = new Error("El nombre del presupuesto es obligatorio.");
      err.statusCode = 400;
      throw err;
    }

    await ArchitectureBudgetService.assertProjectActive(organizationId, data.projectId, client);

    const initialStatus = data.status && data.status !== "Aprobado" ? data.status : "Borrador";

    const created = await client.architectureBudget.create({
      data: {
        organizationId,
        projectId: data.projectId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        status: initialStatus,
        notes: data.notes?.trim() || null,
        createdByUserId: userId,
        approvedAt: null,
        approvedByUserId: null,
        items: data.items && data.items.length > 0
          ? {
              create: data.items.map((it, idx) => ({
                organizationId,
                description: it.description.trim(),
                category: it.category?.trim() || "General",
                quantity: new Prisma.Decimal(it.quantity ?? 1),
                unitPrice: new Prisma.Decimal(it.unitPrice ?? 0),
                order: it.order ?? idx,
              })),
            }
          : undefined,
      },
      include: {
        items: { orderBy: { order: "asc" } },
        project: { select: { id: true, name: true, code: true, status: true, archivedAt: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        approvedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    return ArchitectureBudgetService.mapBudgetDTO(created);
  }

  /**
   * Actualiza los datos de un presupuesto.
   */
  public static async updateBudget(
    organizationId: number,
    userId: number,
    budgetId: number,
    data: UpdateArchitectureBudgetInput,
    client: any = db
  ) {
    const existing = await client.architectureBudget.findUnique({
      where: { id: budgetId },
      include: { project: true },
    });

    if (!existing || existing.organizationId !== organizationId) {
      const err: any = new Error(`Presupuesto con ID ${budgetId} no encontrado en la organización.`);
      err.statusCode = 404;
      throw err;
    }

    await ArchitectureBudgetService.assertProjectActive(organizationId, existing.projectId, client);

    if (data.status === "Aprobado" && existing.status !== "Aprobado") {
      return ArchitectureBudgetService.approveBudget(organizationId, userId, budgetId, client);
    }

    const updateData: any = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        const err: any = new Error("El nombre del presupuesto no puede estar vacío.");
        err.statusCode = 400;
        throw err;
      }
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.status !== undefined && data.status !== "Aprobado") {
      updateData.status = data.status;
      if (existing.status === "Aprobado") {
        updateData.approvedAt = null;
        updateData.approvedByUserId = null;
      }
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    const updated = await client.architectureBudget.update({
      where: { id: budgetId },
      data: updateData,
      include: {
        items: { orderBy: { order: "asc" } },
        project: { select: { id: true, name: true, code: true, status: true, archivedAt: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        approvedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    return ArchitectureBudgetService.mapBudgetDTO(updated);
  }

  /**
   * Aprueba un presupuesto serializando la concurrencia mediante advisory lock de PostgreSQL.
   * Regla de negocio: Máximo 1 presupuesto aprobado por proyecto.
   */
  public static async approveBudget(
    organizationId: number,
    userId: number,
    budgetId: number,
    client: any = db
  ) {
    const existing = await client.architectureBudget.findUnique({
      where: { id: budgetId },
      include: { project: true },
    });

    if (!existing || existing.organizationId !== organizationId) {
      const err: any = new Error(`Presupuesto con ID ${budgetId} no encontrado en la organización.`);
      err.statusCode = 404;
      throw err;
    }

    await ArchitectureBudgetService.assertProjectActive(organizationId, existing.projectId, client);

    return client.$transaction(async (tx: any) => {
      // Advisory transaction lock exclusivo por (organizationId, projectId)
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('arch_proj_budget_appr_' || $1::text || '_' || $2::text))`,
        organizationId,
        existing.projectId
      );

      // Verificar si ya existe otro presupuesto aprobado para el proyecto
      const alreadyApproved = await tx.architectureBudget.findFirst({
        where: {
          organizationId,
          projectId: existing.projectId,
          status: "Aprobado",
          id: { not: budgetId },
        },
      });

      if (alreadyApproved) {
        const err: any = new Error("Ya existe un presupuesto aprobado para este proyecto.");
        err.statusCode = 409;
        throw err;
      }

      const approved = await tx.architectureBudget.update({
        where: { id: budgetId },
        data: {
          status: "Aprobado",
          approvedAt: new Date(),
          approvedByUserId: userId,
        },
        include: {
          items: { orderBy: { order: "asc" } },
          project: { select: { id: true, name: true, code: true, status: true, archivedAt: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
          approvedByUser: { select: { id: true, name: true, email: true } },
        },
      });

      return ArchitectureBudgetService.mapBudgetDTO(approved);
    });
  }

  /**
   * Añade un item a un presupuesto existente.
   */
  public static async addBudgetItem(
    organizationId: number,
    userId: number,
    budgetId: number,
    data: CreateArchitectureBudgetItemInput,
    client: any = db
  ) {
    const budget = await client.architectureBudget.findUnique({
      where: { id: budgetId },
      include: { project: true },
    });

    if (!budget || budget.organizationId !== organizationId) {
      const err: any = new Error(`Presupuesto con ID ${budgetId} no encontrado en la organización.`);
      err.statusCode = 404;
      throw err;
    }

    await ArchitectureBudgetService.assertProjectActive(organizationId, budget.projectId, client);

    if (!data.description?.trim()) {
      const err: any = new Error("La descripción del rubro es obligatoria.");
      err.statusCode = 400;
      throw err;
    }

    const qty = new Prisma.Decimal(data.quantity ?? 1);
    const unitPrice = new Prisma.Decimal(data.unitPrice ?? 0);

    if (qty.lt(0)) {
      const err: any = new Error("La cantidad no puede ser negativa.");
      err.statusCode = 400;
      throw err;
    }

    if (unitPrice.lt(0)) {
      const err: any = new Error("El precio unitario no puede ser negativo.");
      err.statusCode = 400;
      throw err;
    }

    const maxOrderResult = await client.architectureBudgetItem.aggregate({
      where: { budgetId },
      _max: { order: true },
    });
    const nextOrder = data.order !== undefined ? data.order : ((maxOrderResult._max.order ?? -1) + 1);

    const item = await client.architectureBudgetItem.create({
      data: {
        organizationId,
        budgetId,
        description: data.description.trim(),
        category: data.category?.trim() || "General",
        quantity: qty,
        unitPrice: unitPrice,
        order: nextOrder,
      },
    });

    return ArchitectureBudgetService.mapBudgetItemDTO(item);
  }

  /**
   * Actualiza un item de presupuesto.
   */
  public static async updateBudgetItem(
    organizationId: number,
    userId: number,
    budgetId: number,
    itemId: number,
    data: UpdateArchitectureBudgetItemInput,
    client: any = db
  ) {
    const item = await client.architectureBudgetItem.findUnique({
      where: { id: itemId },
      include: { budget: { include: { project: true } } },
    });

    if (!item || item.organizationId !== organizationId || item.budgetId !== budgetId) {
      const err: any = new Error(`Rubro con ID ${itemId} no encontrado en el presupuesto especificado.`);
      err.statusCode = 404;
      throw err;
    }

    await ArchitectureBudgetService.assertProjectActive(organizationId, item.budget.projectId, client);

    const updateData: any = {};
    if (data.description !== undefined) {
      if (!data.description.trim()) {
        const err: any = new Error("La descripción del rubro no puede estar vacía.");
        err.statusCode = 400;
        throw err;
      }
      updateData.description = data.description.trim();
    }
    if (data.category !== undefined) {
      updateData.category = data.category?.trim() || "General";
    }
    if (data.quantity !== undefined) {
      const q = new Prisma.Decimal(data.quantity);
      if (q.lt(0)) {
        const err: any = new Error("La cantidad no puede ser negativa.");
        err.statusCode = 400;
        throw err;
      }
      updateData.quantity = q;
    }
    if (data.unitPrice !== undefined) {
      const p = new Prisma.Decimal(data.unitPrice);
      if (p.lt(0)) {
        const err: any = new Error("El precio unitario no puede ser negativo.");
        err.statusCode = 400;
        throw err;
      }
      updateData.unitPrice = p;
    }
    if (data.order !== undefined) {
      updateData.order = data.order;
    }

    const updated = await client.architectureBudgetItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return ArchitectureBudgetService.mapBudgetItemDTO(updated);
  }
}
