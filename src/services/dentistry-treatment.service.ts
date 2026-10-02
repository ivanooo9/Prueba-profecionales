import { db } from "../lib/db";
import { DentistryOdontogramService } from "./dentistry-odontogram.service";

export interface CreateProcedureInput {
  code?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  defaultPrice?: number | null;
}

export interface UpdateProcedureInput {
  code?: string | null;
  name?: string;
  description?: string | null;
  category?: string | null;
  defaultPrice?: number | null;
  isActive?: boolean;
}

export interface CreatePlanInput {
  title?: string | null;
  status?: string;
  notes?: string | null;
}

export interface UpdatePlanInput {
  title?: string | null;
  status?: string;
  notes?: string | null;
}

export interface AddItemInput {
  procedureId?: number | null;
  toothNumber?: number | null;
  procedureName?: string;
  unitPrice?: number;
  status?: string;
  notes?: string | null;
}

export interface UpdateItemInput {
  toothNumber?: number | null;
  procedureName?: string;
  unitPrice?: number;
  status?: string;
  notes?: string | null;
}

export class DentistryTreatmentService {
  // -------------------------------------------------------------
  // CATÁLOGO DE PROCEDIMIENTOS (DentalProcedure)
  // -------------------------------------------------------------

  public static async getProcedures(
    organizationId: number,
    activeOnly = true,
    client: any = db
  ) {
    const where: any = { organizationId };
    if (activeOnly) {
      where.isActive = true;
    }

    const procedures = await client.dentalProcedure.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return procedures.map((p: any) => ({
      id: p.id,
      organizationId: p.organizationId,
      code: p.code || undefined,
      name: p.name,
      description: p.description || undefined,
      category: p.category || undefined,
      defaultPrice: p.defaultPrice !== null ? p.defaultPrice : undefined,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  public static async createProcedure(
    organizationId: number,
    data: CreateProcedureInput,
    client: any = db
  ) {
    if (!data.name || !data.name.trim()) {
      throw new Error("El nombre del procedimiento es obligatorio.");
    }

    const price =
      typeof data.defaultPrice === "number" && !isNaN(data.defaultPrice)
        ? Math.max(0, data.defaultPrice)
        : null;

    const procedure = await client.dentalProcedure.create({
      data: {
        organizationId,
        code: data.code?.trim() || null,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category?.trim() || null,
        defaultPrice: price,
        isActive: true,
      },
    });

    return {
      id: procedure.id,
      organizationId: procedure.organizationId,
      code: procedure.code || undefined,
      name: procedure.name,
      description: procedure.description || undefined,
      category: procedure.category || undefined,
      defaultPrice: procedure.defaultPrice !== null ? procedure.defaultPrice : undefined,
      isActive: procedure.isActive,
      createdAt: procedure.createdAt.toISOString(),
      updatedAt: procedure.updatedAt.toISOString(),
    };
  }

  public static async updateProcedure(
    organizationId: number,
    procedureId: number,
    data: UpdateProcedureInput,
    client: any = db
  ) {
    const existing = await client.dentalProcedure.findFirst({
      where: { id: procedureId, organizationId },
    });

    if (!existing) {
      throw new Error("Procedimiento no encontrado en esta organización.");
    }

    const updateData: any = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error("El nombre del procedimiento no puede estar vacío.");
      }
      updateData.name = data.name.trim();
    }
    if (data.code !== undefined) updateData.code = data.code?.trim() || null;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.category !== undefined) updateData.category = data.category?.trim() || null;
    if (data.defaultPrice !== undefined) {
      updateData.defaultPrice =
        typeof data.defaultPrice === "number" && !isNaN(data.defaultPrice)
          ? Math.max(0, data.defaultPrice)
          : null;
    }
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    const updated = await client.dentalProcedure.update({
      where: { id: procedureId },
      data: updateData,
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      code: updated.code || undefined,
      name: updated.name,
      description: updated.description || undefined,
      category: updated.category || undefined,
      defaultPrice: updated.defaultPrice !== null ? updated.defaultPrice : undefined,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // -------------------------------------------------------------
  // PLANES DE TRATAMIENTO (DentalTreatmentPlan)
  // -------------------------------------------------------------

  public static async getTreatmentPlans(
    organizationId: number,
    patientId: number,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    const dentalRecord = await client.dentalRecord.findFirst({
      where: { organizationId, patientId },
    });

    if (!dentalRecord) {
      return [];
    }

    const plans = await client.dentalTreatmentPlan.findMany({
      where: {
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
      include: {
        items: {
          include: {
            executions: {
              orderBy: { performedAt: "desc" },
              include: {
                performedByUser: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return plans.map((p: any) => {
      const totalAmount = p.items.reduce(
        (sum: number, it: any) => sum + (typeof it.unitPrice === "number" ? it.unitPrice : 0),
        0
      );
      return {
        id: p.id,
        organizationId: p.organizationId,
        dentalRecordId: p.dentalRecordId,
        title: p.title || "Plan de Tratamiento",
        status: p.status,
        notes: p.notes || undefined,
        totalAmount,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        items: p.items.map((it: any) => ({
          id: it.id,
          treatmentPlanId: it.treatmentPlanId,
          procedureId: it.procedureId || undefined,
          toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
          procedureName: it.procedureName,
          unitPrice: it.unitPrice,
          status: it.status,
          notes: it.notes || undefined,
          createdAt: it.createdAt.toISOString(),
          updatedAt: it.updatedAt.toISOString(),
          executions: (it.executions || []).map((ex: any) => ({
            id: ex.id,
            treatmentPlanId: ex.treatmentPlanId,
            treatmentItemId: ex.treatmentItemId,
            toothNumber: ex.toothNumber !== null ? ex.toothNumber : undefined,
            procedureName: ex.procedureName,
            clinicalNotes: ex.clinicalNotes || undefined,
            performedAt: ex.performedAt.toISOString(),
            performedByUserId: ex.performedByUserId || undefined,
            performedByUser: ex.performedByUser || undefined,
            createdAt: ex.createdAt.toISOString(),
          })),
        })),
      };
    });
  }

  public static async getTreatmentPlanById(
    organizationId: number,
    patientId: number,
    planId: number,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    const dentalRecord = await client.dentalRecord.findFirst({
      where: { organizationId, patientId },
    });

    if (!dentalRecord) {
      throw new Error("Expediente odontológico no encontrado.");
    }

    const plan = await client.dentalTreatmentPlan.findFirst({
      where: {
        id: planId,
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
      include: {
        items: {
          include: {
            executions: {
              orderBy: { performedAt: "desc" },
              include: {
                performedByUser: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!plan) {
      throw new Error("Plan de tratamiento no encontrado.");
    }

    const totalAmount = plan.items.reduce(
      (sum: number, it: any) => sum + (typeof it.unitPrice === "number" ? it.unitPrice : 0),
      0
    );

    return {
      id: plan.id,
      organizationId: plan.organizationId,
      dentalRecordId: plan.dentalRecordId,
      title: plan.title || "Plan de Tratamiento",
      status: plan.status,
      notes: plan.notes || undefined,
      totalAmount,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      items: plan.items.map((it: any) => ({
        id: it.id,
        treatmentPlanId: it.treatmentPlanId,
        procedureId: it.procedureId || undefined,
        toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
        procedureName: it.procedureName,
        unitPrice: it.unitPrice,
        status: it.status,
        notes: it.notes || undefined,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
        executions: (it.executions || []).map((ex: any) => ({
          id: ex.id,
          treatmentPlanId: ex.treatmentPlanId,
          treatmentItemId: ex.treatmentItemId,
          toothNumber: ex.toothNumber !== null ? ex.toothNumber : undefined,
          procedureName: ex.procedureName,
          clinicalNotes: ex.clinicalNotes || undefined,
          performedAt: ex.performedAt.toISOString(),
          performedByUserId: ex.performedByUserId || undefined,
          performedByUser: ex.performedByUser || undefined,
          createdAt: ex.createdAt.toISOString(),
        })),
      })),
    };
  }

  public static async createTreatmentPlan(
    organizationId: number,
    patientId: number,
    data: CreatePlanInput,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    // Acción explícita de escritura: Si el paciente aún no tiene DentalRecord, lo crea atómicamente
    let dentalRecord = await client.dentalRecord.findFirst({
      where: { organizationId, patientId },
    });

    if (!dentalRecord) {
      dentalRecord = await client.dentalRecord.create({
        data: {
          organizationId,
          patientId,
        },
      });
    }

    const validStatuses = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
    const status = data.status && validStatuses.includes(data.status) ? data.status : "DRAFT";

    const plan = await client.dentalTreatmentPlan.create({
      data: {
        organizationId,
        dentalRecordId: dentalRecord.id,
        title: data.title?.trim() || "Plan de Tratamiento",
        status,
        notes: data.notes?.trim() || null,
      },
      include: {
        items: true,
      },
    });

    return {
      id: plan.id,
      organizationId: plan.organizationId,
      dentalRecordId: plan.dentalRecordId,
      title: plan.title,
      status: plan.status,
      notes: plan.notes || undefined,
      totalAmount: 0,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      items: [],
    };
  }

  public static async updateTreatmentPlan(
    organizationId: number,
    patientId: number,
    planId: number,
    data: UpdatePlanInput,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    const dentalRecord = await client.dentalRecord.findFirst({
      where: { organizationId, patientId },
    });

    if (!dentalRecord) {
      throw new Error("Expediente odontológico no encontrado.");
    }

    const existingPlan = await client.dentalTreatmentPlan.findFirst({
      where: {
        id: planId,
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
    });

    if (!existingPlan) {
      throw new Error("Plan de tratamiento no encontrado.");
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title?.trim() || "Plan de Tratamiento";
    if (data.status !== undefined) {
      const validStatuses = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
      if (!validStatuses.includes(data.status)) {
        throw new Error(
          `Estado de plan inválido. Valores permitidos: ${validStatuses.join(", ")}.`
        );
      }
      updateData.status = data.status;
    }
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    const updated = await client.dentalTreatmentPlan.update({
      where: { id: planId },
      data: updateData,
      include: {
        items: { orderBy: { createdAt: "asc" } },
      },
    });

    const totalAmount = updated.items.reduce(
      (sum: number, it: any) => sum + (typeof it.unitPrice === "number" ? it.unitPrice : 0),
      0
    );

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      dentalRecordId: updated.dentalRecordId,
      title: updated.title,
      status: updated.status,
      notes: updated.notes || undefined,
      totalAmount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      items: updated.items.map((it: any) => ({
        id: it.id,
        treatmentPlanId: it.treatmentPlanId,
        procedureId: it.procedureId || undefined,
        toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
        procedureName: it.procedureName,
        unitPrice: it.unitPrice,
        status: it.status,
        notes: it.notes || undefined,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
      })),
    };
  }

  // -------------------------------------------------------------
  // ITEMS DEL PLAN DE TRATAMIENTO (DentalTreatmentItem)
  // -------------------------------------------------------------

  public static async addTreatmentItem(
    organizationId: number,
    patientId: number,
    planId: number,
    data: AddItemInput,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    const dentalRecord = await client.dentalRecord.findFirst({
      where: { organizationId, patientId },
    });

    if (!dentalRecord) {
      throw new Error("Expediente odontológico no encontrado.");
    }

    const plan = await client.dentalTreatmentPlan.findFirst({
      where: {
        id: planId,
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
    });

    if (!plan) {
      throw new Error("Plan de tratamiento no encontrado.");
    }

    // Validación FDI: si toothNumber está presente, debe ser un diente FDI válido
    let toothNumber: number | null = null;
    if (data.toothNumber !== undefined && data.toothNumber !== null) {
      toothNumber = parseInt(String(data.toothNumber), 10);
      if (isNaN(toothNumber)) {
        throw new Error("Número de pieza dental inválido.");
      }
      DentistryOdontogramService.validateToothNumber(toothNumber);
    }

    let procedureName = data.procedureName?.trim() || "";
    let unitPrice =
      typeof data.unitPrice === "number" && !isNaN(data.unitPrice)
        ? Math.max(0, data.unitPrice)
        : 0;

    let procedureId: number | null = null;
    if (data.procedureId !== undefined && data.procedureId !== null) {
      procedureId = parseInt(String(data.procedureId), 10);
      if (!isNaN(procedureId)) {
        const proc = await client.dentalProcedure.findFirst({
          where: { id: procedureId, organizationId },
        });
        if (!proc) {
          throw new Error("El procedimiento seleccionado no pertenece a esta organización.");
        }
        if (!procedureName) {
          procedureName = proc.name;
        }
        if (data.unitPrice === undefined && proc.defaultPrice !== null) {
          unitPrice = proc.defaultPrice;
        }
      }
    }

    if (!procedureName) {
      throw new Error("Debe indicar el nombre del procedimiento o seleccionar uno del catálogo.");
    }

    const validItemStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    const status =
      data.status && validItemStatuses.includes(data.status) ? data.status : "PLANNED";

    // Crear el item con snapshot del nombre y precio
    const item = await client.dentalTreatmentItem.create({
      data: {
        organizationId,
        treatmentPlanId: plan.id,
        procedureId,
        toothNumber,
        procedureName,
        unitPrice,
        status,
        notes: data.notes?.trim() || null,
      },
    });

    return {
      id: item.id,
      treatmentPlanId: item.treatmentPlanId,
      procedureId: item.procedureId || undefined,
      toothNumber: item.toothNumber !== null ? item.toothNumber : undefined,
      procedureName: item.procedureName,
      unitPrice: item.unitPrice,
      status: item.status,
      notes: item.notes || undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  public static async updateTreatmentItem(
    organizationId: number,
    patientId: number,
    planId: number,
    itemId: number,
    data: UpdateItemInput,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    const dentalRecord = await client.dentalRecord.findFirst({
      where: { organizationId, patientId },
    });

    if (!dentalRecord) {
      throw new Error("Expediente odontológico no encontrado.");
    }

    const plan = await client.dentalTreatmentPlan.findFirst({
      where: {
        id: planId,
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
    });

    if (!plan) {
      throw new Error("Plan de tratamiento no encontrado.");
    }

    const existingItem = await client.dentalTreatmentItem.findFirst({
      where: {
        id: itemId,
        treatmentPlanId: plan.id,
        organizationId,
      },
    });

    if (!existingItem) {
      throw new Error("Item de tratamiento no encontrado en este plan.");
    }

    const updateData: any = {};
    if (data.toothNumber !== undefined) {
      if (data.toothNumber === null) {
        updateData.toothNumber = null;
      } else {
        const tn = parseInt(String(data.toothNumber), 10);
        if (isNaN(tn)) {
          throw new Error("Número de pieza dental inválido.");
        }
        DentistryOdontogramService.validateToothNumber(tn);
        updateData.toothNumber = tn;
      }
    }

    if (data.procedureName !== undefined) {
      if (!data.procedureName.trim()) {
        throw new Error("El nombre del procedimiento no puede estar vacío.");
      }
      updateData.procedureName = data.procedureName.trim();
    }

    if (data.unitPrice !== undefined) {
      if (typeof data.unitPrice !== "number" || isNaN(data.unitPrice) || data.unitPrice < 0) {
        throw new Error("El precio unitario debe ser un número positivo.");
      }
      updateData.unitPrice = data.unitPrice;
    }

    if (data.status !== undefined) {
      const validItemStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
      if (!validItemStatuses.includes(data.status)) {
        throw new Error(
          `Estado de item inválido. Valores permitidos: ${validItemStatuses.join(", ")}.`
        );
      }
      updateData.status = data.status;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    const updated = await client.dentalTreatmentItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return {
      id: updated.id,
      treatmentPlanId: updated.treatmentPlanId,
      procedureId: updated.procedureId || undefined,
      toothNumber: updated.toothNumber !== null ? updated.toothNumber : undefined,
      procedureName: updated.procedureName,
      unitPrice: updated.unitPrice,
      status: updated.status,
      notes: updated.notes || undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  public static async deleteTreatmentItem(
    organizationId: number,
    patientId: number,
    planId: number,
    itemId: number,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    const dentalRecord = await client.dentalRecord.findFirst({
      where: { organizationId, patientId },
    });

    if (!dentalRecord) {
      throw new Error("Expediente odontológico no encontrado.");
    }

    const plan = await client.dentalTreatmentPlan.findFirst({
      where: {
        id: planId,
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
    });

    if (!plan) {
      throw new Error("Plan de tratamiento no encontrado.");
    }

    const existingItem = await client.dentalTreatmentItem.findFirst({
      where: {
        id: itemId,
        treatmentPlanId: plan.id,
        organizationId,
      },
    });

    if (!existingItem) {
      throw new Error("Item de tratamiento no encontrado en este plan.");
    }

    const executionCount = await client.dentalTreatmentExecution.count({
      where: { treatmentItemId: itemId },
    });

    if (executionCount > 0) {
      throw new Error(
        "No se puede eliminar un procedimiento que cuenta con ejecuciones clínicas registradas. Si no continuará, márquelo como CANCELADO."
      );
    }

    await client.dentalTreatmentItem.delete({
      where: { id: itemId },
    });

    return { success: true, message: "Item eliminado del plan exitosamente." };
  }
}
