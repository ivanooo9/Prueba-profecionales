import { db } from "../lib/db";

export interface CreateBudgetInput {
  title?: string | null;
  discount?: number;
  notes?: string | null;
}

export interface UpdateBudgetInput {
  status?: string;
  notes?: string | null;
  discount?: number;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod?: string;
  reference?: string | null;
  notes?: string | null;
}

export type DentalPaymentFinancialStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

/**
 * Función centralizada y autoritativa para derivar el estado financiero de un presupuesto.
 * paidAmount == 0 -> UNPAID
 * 0 < paidAmount < total -> PARTIALLY_PAID
 * paidAmount >= total -> PAID
 */
export function derivePaymentStatus(total: number, paidAmount: number): DentalPaymentFinancialStatus {
  const roundTotal = Math.round(Number(total) * 100) / 100;
  const roundPaid = Math.round(Number(paidAmount) * 100) / 100;
  if (roundPaid <= 0) return "UNPAID";
  if (roundPaid >= roundTotal && roundTotal > 0) return "PAID";
  return "PARTIALLY_PAID";
}

export class DentistryBudgetService {
  /**
   * Obtiene la lista de presupuestos formales del paciente (estrictamente READ-ONLY, sin efectos secundarios).
   */
  public static async getBudgets(
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

    const budgets = await client.dentalBudget.findMany({
      where: {
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
        payments: {
          orderBy: { paidAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return budgets.map((b: any) => {
      const paidAmount = Math.round(
        b.payments.reduce((sum: number, p: any) => sum + (typeof p.amount === "number" ? p.amount : 0), 0) * 100
      ) / 100;
      const balance = Math.round(Math.max(0, b.total - paidAmount) * 100) / 100;

      const paymentStatus = derivePaymentStatus(b.total, paidAmount);

      return {
        id: b.id,
        organizationId: b.organizationId,
        dentalRecordId: b.dentalRecordId,
        treatmentPlanId: b.treatmentPlanId,
        title: b.title || "Presupuesto Odontológico",
        status: b.status,
        subtotal: b.subtotal,
        discount: b.discount,
        total: b.total,
        paidAmount,
        balance,
        paymentStatus,
        notes: b.notes || undefined,
        issuedAt: b.issuedAt.toISOString(),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        items: b.items.map((it: any) => ({
          id: it.id,
          procedureName: it.procedureName,
          toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
          unitPrice: it.unitPrice,
          treatmentItemId: it.treatmentItemId || undefined,
          createdAt: it.createdAt.toISOString(),
        })),
        payments: b.payments.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod || undefined,
          reference: p.reference || undefined,
          notes: p.notes || undefined,
          paidAt: p.paidAt.toISOString(),
          createdAt: p.createdAt.toISOString(),
        })),
      };
    });
  }

  /**
   * Obtiene el detalle de un presupuesto específico incluyendo items, pagos y saldo calculado.
   */
  public static async getBudgetById(
    organizationId: number,
    patientId: number,
    budgetId: number,
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

    const budget = await client.dentalBudget.findFirst({
      where: {
        id: budgetId,
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
        payments: {
          orderBy: { paidAt: "asc" },
        },
      },
    });

    if (!budget) {
      throw new Error("Presupuesto no encontrado.");
    }

    const paidAmount = Math.round(
      budget.payments.reduce((sum: number, p: any) => sum + (typeof p.amount === "number" ? p.amount : 0), 0) * 100
    ) / 100;
    const balance = Math.round(Math.max(0, budget.total - paidAmount) * 100) / 100;

      const paymentStatus = derivePaymentStatus(budget.total, paidAmount);

    return {
      id: budget.id,
      organizationId: budget.organizationId,
      dentalRecordId: budget.dentalRecordId,
      treatmentPlanId: budget.treatmentPlanId,
      title: budget.title || "Presupuesto Odontológico",
      status: budget.status,
      subtotal: budget.subtotal,
      discount: budget.discount,
      total: budget.total,
      paidAmount,
      balance,
      paymentStatus,
      notes: budget.notes || undefined,
      issuedAt: budget.issuedAt.toISOString(),
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
      items: budget.items.map((it: any) => ({
        id: it.id,
        procedureName: it.procedureName,
        toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
        unitPrice: it.unitPrice,
        treatmentItemId: it.treatmentItemId || undefined,
        createdAt: it.createdAt.toISOString(),
      })),
      payments: budget.payments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        paymentMethod: p.paymentMethod || undefined,
        reference: p.reference || undefined,
        notes: p.notes || undefined,
        paidAt: p.paidAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Genera un presupuesto formal a partir de un plan de tratamiento en una transacción atómica.
   * Crea un snapshot inmutable de los items y precios del plan en ese instante.
   */
  public static async createBudgetFromPlan(
    organizationId: number,
    patientId: number,
    planId: number,
    data: CreateBudgetInput,
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
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!plan) {
      throw new Error("Plan de tratamiento no encontrado.");
    }

    if (!plan.items || plan.items.length === 0) {
      throw new Error("El plan de tratamiento seleccionado no contiene procedimientos para presupuestar.");
    }

    // Fórmulas financieras centralizadas
    const subtotal = Math.round(
      plan.items.reduce((sum: number, it: any) => sum + (typeof it.unitPrice === "number" ? it.unitPrice : 0), 0) * 100
    ) / 100;

    const rawDiscount = typeof data.discount === "number" && !isNaN(data.discount) ? data.discount : 0;
    if (rawDiscount < 0) {
      throw new Error("El descuento no puede ser negativo.");
    }
    if (rawDiscount > subtotal) {
      throw new Error("El descuento no puede ser mayor al subtotal del presupuesto.");
    }

    const discount = Math.round(rawDiscount * 100) / 100;
    const total = Math.round(Math.max(0, subtotal - discount) * 100) / 100;

    // Transacción atómica en PostgreSQL
    return await client.$transaction(async (tx: any) => {
      const budget = await tx.dentalBudget.create({
        data: {
          organizationId,
          dentalRecordId: dentalRecord.id,
          treatmentPlanId: plan.id,
          title: data.title?.trim() || plan.title || "Presupuesto Odontológico",
          status: "DRAFT",
          subtotal,
          discount,
          total,
          notes: data.notes?.trim() || null,
        },
      });

      // Crear snapshot inmutable de cada ítem del plan
      const budgetItemPromises = plan.items.map((it: any) =>
        tx.dentalBudgetItem.create({
          data: {
            organizationId,
            budgetId: budget.id,
            treatmentItemId: it.id,
            procedureName: it.procedureName,
            toothNumber: it.toothNumber !== null ? it.toothNumber : null,
            unitPrice: it.unitPrice,
          },
        })
      );

      const createdItems = await Promise.all(budgetItemPromises);

      return {
        id: budget.id,
        organizationId: budget.organizationId,
        dentalRecordId: budget.dentalRecordId,
        treatmentPlanId: budget.treatmentPlanId,
        title: budget.title,
        status: budget.status,
        subtotal: budget.subtotal,
        discount: budget.discount,
        total: budget.total,
        paidAmount: 0,
        balance: budget.total,
        paymentStatus: "UNPAID",
        notes: budget.notes || undefined,
        issuedAt: budget.issuedAt.toISOString(),
        createdAt: budget.createdAt.toISOString(),
        updatedAt: budget.updatedAt.toISOString(),
        items: createdItems.map((it: any) => ({
          id: it.id,
          procedureName: it.procedureName,
          toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
          unitPrice: it.unitPrice,
          treatmentItemId: it.treatmentItemId || undefined,
          createdAt: it.createdAt.toISOString(),
        })),
        payments: [],
      };
    });
  }

  /**
   * Actualización controlada de estado o notas de un presupuesto.
   * Si ya existen pagos o el presupuesto fue emitido/aceptado, se prohíbe alterar importes o descuentos.
   */
  public static async updateBudget(
    organizationId: number,
    patientId: number,
    budgetId: number,
    data: UpdateBudgetInput,
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

    const existingBudget = await client.dentalBudget.findFirst({
      where: {
        id: budgetId,
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
      include: {
        payments: true,
      },
    });

    if (!existingBudget) {
      throw new Error("Presupuesto no encontrado.");
    }

    const hasPayments = existingBudget.payments.length > 0;
    const isLocked = hasPayments || existingBudget.status === "ISSUED" || existingBudget.status === "ACCEPTED";

    const updateData: any = {};

    // Inmutabilidad de importes si está emitido o tiene pagos
    if (data.discount !== undefined) {
      if (isLocked && Math.abs(data.discount - existingBudget.discount) > 0.001) {
        throw new Error(
          "No se puede modificar el descuento ni los importes de un presupuesto emitido o con pagos registrados."
        );
      }
      const rawDiscount = typeof data.discount === "number" && !isNaN(data.discount) ? data.discount : 0;
      if (rawDiscount < 0 || rawDiscount > existingBudget.subtotal) {
        throw new Error("El descuento debe ser mayor o igual a 0 y no superar el subtotal.");
      }
      updateData.discount = Math.round(rawDiscount * 100) / 100;
      updateData.total = Math.round(Math.max(0, existingBudget.subtotal - updateData.discount) * 100) / 100;
    }

    if (data.status !== undefined) {
      const validStatuses = ["DRAFT", "ISSUED", "ACCEPTED", "REJECTED", "CANCELLED"];
      if (!validStatuses.includes(data.status)) {
        throw new Error(`Estado de presupuesto inválido. Valores permitidos: ${validStatuses.join(", ")}.`);
      }
      updateData.status = data.status;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    const updated = await client.dentalBudget.update({
      where: { id: budgetId },
      data: updateData,
      include: {
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } },
      },
    });

    const paidAmount = Math.round(
      updated.payments.reduce((sum: number, p: any) => sum + (typeof p.amount === "number" ? p.amount : 0), 0) * 100
    ) / 100;
    const balance = Math.round(Math.max(0, updated.total - paidAmount) * 100) / 100;

    const paymentStatus = derivePaymentStatus(updated.total, paidAmount);

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      dentalRecordId: updated.dentalRecordId,
      treatmentPlanId: updated.treatmentPlanId,
      title: updated.title,
      status: updated.status,
      subtotal: updated.subtotal,
      discount: updated.discount,
      total: updated.total,
      paidAmount,
      balance,
      paymentStatus,
      notes: updated.notes || undefined,
      issuedAt: updated.issuedAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      items: updated.items.map((it: any) => ({
        id: it.id,
        procedureName: it.procedureName,
        toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
        unitPrice: it.unitPrice,
        treatmentItemId: it.treatmentItemId || undefined,
        createdAt: it.createdAt.toISOString(),
      })),
      payments: updated.payments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        paymentMethod: p.paymentMethod || undefined,
        reference: p.reference || undefined,
        notes: p.notes || undefined,
        paidAt: p.paidAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Registra un pago/abono para un presupuesto de forma ATÓMICA y CONCURRENTE-SEGURA.
   * Utiliza bloqueo pesimista en PostgreSQL (`SELECT ... FOR UPDATE`) sobre la fila del presupuesto
   * para eliminar condiciones de carrera ante múltiples pagos simultáneos.
   */
  public static async recordPayment(
    organizationId: number,
    patientId: number,
    budgetId: number,
    data: RecordPaymentInput,
    client: any = db
  ) {
    // 1. Validación numérica estricta previa a base de datos
    if (
      typeof data.amount !== "number" ||
      !Number.isFinite(data.amount) ||
      isNaN(data.amount) ||
      data.amount <= 0
    ) {
      throw new Error("El monto del abono debe ser un número finito mayor a 0.");
    }

    const paymentAmount = Math.round(data.amount * 100) / 100;
    if (paymentAmount <= 0) {
      throw new Error("El monto del abono debe ser mayor a 0.");
    }

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

    // Transacción interactiva con bloqueo pesimista
    return await client.$transaction(async (tx: any) => {
      // 2. Bloqueo pesimista a nivel de fila en PostgreSQL
      const lockedRows = await tx.$queryRaw`
        SELECT id, total, "organizationId", status 
        FROM "DentalBudget" 
        WHERE id = ${budgetId} AND "organizationId" = ${organizationId} AND "dentalRecordId" = ${dentalRecord.id}
        FOR UPDATE
      `;

      if (!lockedRows || (lockedRows as any[]).length === 0) {
        throw new Error("Presupuesto no encontrado en esta organización o paciente.");
      }

      const budgetRow = (lockedRows as any[])[0];

      // 3. Sumar pagos confirmados en base de datos dentro del bloqueo
      const existingPayments = await tx.dentalPayment.findMany({
        where: { budgetId: budgetRow.id, organizationId },
        select: { amount: true },
      });

      const currentPaid = Math.round(
        existingPayments.reduce((sum: number, p: any) => sum + (typeof p.amount === "number" ? p.amount : 0), 0) * 100
      ) / 100;

      const currentBalance = Math.round(Math.max(0, budgetRow.total - currentPaid) * 100) / 100;

      // 4. Verificación del invariante financiero: Prohibido sobreabono
      if (paymentAmount > currentBalance) {
        throw new Error(
          `El monto a abonar ($${paymentAmount.toFixed(2)}) supera el saldo pendiente actual ($${currentBalance.toFixed(2)}).`
        );
      }

      // 5. Método de pago
      const allowedMethods = ["CASH", "CARD", "TRANSFER", "OTHER"];
      const rawMethod = data.paymentMethod?.toUpperCase();
      const paymentMethod = rawMethod && allowedMethods.includes(rawMethod) ? rawMethod : "CASH";

      // 6. Creación del registro inmutable DentalPayment
      const newPayment = await tx.dentalPayment.create({
        data: {
          organizationId,
          budgetId: budgetRow.id,
          amount: paymentAmount,
          paymentMethod,
          reference: data.reference?.trim() || null,
          notes: data.notes?.trim() || null,
          paidAt: new Date(),
        },
      });

      // 7. Recálculo fidedigno del saldo
      const updatedPaidAmount = Math.round((currentPaid + paymentAmount) * 100) / 100;
      const updatedBalance = Math.round(Math.max(0, budgetRow.total - updatedPaidAmount) * 100) / 100;

      // Derivación del estado financiero (el estado documental permanece inalterado)
      const paymentStatus = derivePaymentStatus(budgetRow.total, updatedPaidAmount);

      return {
        payment: {
          id: newPayment.id,
          budgetId: newPayment.budgetId,
          amount: newPayment.amount,
          paymentMethod: newPayment.paymentMethod,
          reference: newPayment.reference,
          notes: newPayment.notes,
          paidAt: newPayment.paidAt.toISOString(),
          createdAt: newPayment.createdAt.toISOString(),
        },
        budgetSummary: {
          budgetId: budgetRow.id,
          status: budgetRow.status,
          total: budgetRow.total,
          paidAmount: updatedPaidAmount,
          balance: updatedBalance,
          paymentStatus,
        },
      };
    });
  }

  /**
   * Obtiene el historial de pagos de un presupuesto.
   */
  public static async getPayments(
    organizationId: number,
    patientId: number,
    budgetId: number,
    client: any = db
  ) {
    const budget = await this.getBudgetById(organizationId, patientId, budgetId, client);
    return budget.payments;
  }
}
