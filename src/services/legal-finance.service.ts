import { db } from "../lib/db";
import { LegalCaseOperationsService } from "./legal-case-operations.service";

export type LegalPaymentFinancialStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

/**
 * Función centralizada y autoritativa para derivar el estado financiero de un acuerdo de honorarios.
 * paidAmount <= 0 -> UNPAID
 * 0 < paidAmount < total -> PARTIALLY_PAID
 * paidAmount >= total -> PAID
 */
export function deriveLegalPaymentStatus(total: number, paidAmount: number): LegalPaymentFinancialStatus {
  const roundTotal = Math.round(Number(total) * 100) / 100;
  const roundPaid = Math.round(Number(paidAmount) * 100) / 100;
  if (roundPaid <= 0) return "UNPAID";
  if (roundPaid >= roundTotal && roundTotal > 0) return "PAID";
  return "PARTIALLY_PAID";
}

export interface CreateFeeItemInput {
  description: string;
  quantity?: number;
  unitPrice: number;
  totalPrice?: number;
}

export interface CreateFeeAgreementInput {
  title: string;
  description?: string | null;
  status?: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED" | string;
  agreedAt?: string | Date | null;
  discount?: number;
  items?: CreateFeeItemInput[];
  subtotal?: number;
  total?: number;
}

export interface UpdateFeeAgreementInput {
  title?: string;
  description?: string | null;
  status?: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED" | string;
  agreedAt?: string | Date | null;
  discount?: number;
  items?: CreateFeeItemInput[];
  subtotal?: number;
  total?: number;
}

export interface RecordLegalPaymentInput {
  amount: number;
  paymentMethod?: string;
  reference?: string | null;
  notes?: string | null;
  paidAt?: string | Date | null;
}

export class LegalFinanceService {
  /**
   * Helper para formatear un acuerdo con sus valores financieros derivados
   */
  public static formatAgreementDto(agreement: any) {
    const payments = agreement.payments || [];
    const validPayments = payments.filter((p: any) => p.status !== "CANCELLED" && p.status !== "REJECTED");
    const paidAmount = Math.round(
      validPayments.reduce((sum: number, p: any) => sum + (typeof p.amount === "number" ? p.amount : 0), 0) * 100
    ) / 100;

    const roundTotal = Math.round(Number(agreement.total) * 100) / 100;
    const balance = Math.round(Math.max(0, roundTotal - paidAmount) * 100) / 100;
    const paymentStatus = deriveLegalPaymentStatus(roundTotal, paidAmount);

    return {
      ...agreement,
      paidAmount,
      balance,
      paymentStatus,
    };
  }

  // -------------------------------------------------------------
  // CREACIÓN DE ACUERDO DE HONORARIOS (LegalFeeAgreement)
  // -------------------------------------------------------------
  public static async createFeeAgreement(
    organizationId: number,
    legalCaseId: number,
    data: CreateFeeAgreementInput,
    authUserId?: number | null
  ) {
    if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
      throw new Error("El título o concepto del acuerdo de honorarios es obligatorio.");
    }

    // 1. Validar existencia del caso en la organización
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    // 2. Procesar y validar conceptos / items
    const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];
    let itemsToCreate: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }> = [];

    if (rawItems.length > 0) {
      itemsToCreate = rawItems.map((item, idx) => {
        if (!item.description || !item.description.trim()) {
          throw new Error(`El concepto del ítem #${idx + 1} es obligatorio.`);
        }
        if (typeof item.unitPrice !== "number" || !Number.isFinite(item.unitPrice) || isNaN(item.unitPrice) || item.unitPrice < 0) {
          throw new Error(`El precio unitario del ítem #${idx + 1} debe ser un número finito mayor o igual a 0.`);
        }
        const qty = item.quantity && Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
        const unit = Math.round(item.unitPrice * 100) / 100;
        const total = Math.round(qty * unit * 100) / 100;
        return {
          description: item.description.trim(),
          quantity: qty,
          unitPrice: unit,
          totalPrice: total,
        };
      });
    } else {
      // Si no se detallan ítems pero se provee un total global directo
      const globalAmount = typeof data.total === "number" && Number.isFinite(data.total) && data.total >= 0
        ? Math.round(data.total * 100) / 100
        : typeof data.subtotal === "number" && Number.isFinite(data.subtotal) && data.subtotal >= 0
        ? Math.round(data.subtotal * 100) / 100
        : 0;

      itemsToCreate = [
        {
          description: data.title.trim(),
          quantity: 1,
          unitPrice: globalAmount,
          totalPrice: globalAmount,
        },
      ];
    }

    // 3. Cálculo autoritativo de subtotal, descuento y total en Backend
    const subtotal = Math.round(itemsToCreate.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100;

    let discount = 0;
    if (data.discount !== undefined && data.discount !== null) {
      if (typeof data.discount !== "number" || !Number.isFinite(data.discount) || isNaN(data.discount) || data.discount < 0) {
        throw new Error("El descuento debe ser un número finito mayor o igual a 0.");
      }
      discount = Math.round(data.discount * 100) / 100;
      if (discount > subtotal) {
        throw new Error(`El descuento ($${discount.toFixed(2)}) no puede exceder el subtotal ($${subtotal.toFixed(2)}).`);
      }
    }

    const total = Math.round(Math.max(0, subtotal - discount) * 100) / 100;

    const status = data.status && ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"].includes(data.status.toUpperCase())
      ? data.status.toUpperCase()
      : "DRAFT";

    let agreedAt: Date | null = null;
    if (data.agreedAt) {
      const parsedDate = new Date(data.agreedAt);
      if (!isNaN(parsedDate.getTime())) {
        agreedAt = parsedDate;
      }
    }

    // 4. Transacción atómica en base de datos
    const created = await db.$transaction(async (tx) => {
      const agreement = await tx.legalFeeAgreement.create({
        data: {
          organizationId,
          legalCaseId,
          title: data.title.trim(),
          description: data.description ? data.description.trim() : null,
          status,
          subtotal,
          discount,
          total,
          agreedAt,
          createdByUserId: authUserId || null,
          items: {
            create: itemsToCreate.map((item) => ({
              organizationId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          items: true,
          payments: true,
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return agreement;
    });

    return LegalFinanceService.formatAgreementDto(created);
  }

  // -------------------------------------------------------------
  // LISTAR ACUERDOS DE UN CASO (Strictly Read-Only)
  // -------------------------------------------------------------
  public static async getFeeAgreements(
    organizationId: number,
    legalCaseId: number
  ) {
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    const agreements = await db.legalFeeAgreement.findMany({
      where: {
        organizationId,
        legalCaseId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { id: "asc" },
        },
        payments: {
          orderBy: { paidAt: "desc" },
          include: {
            registeredByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return agreements.map((a) => LegalFinanceService.formatAgreementDto(a));
  }

  // -------------------------------------------------------------
  // OBTENER DETALLE DE UN ACUERDO DE HONORARIOS (Strictly Read-Only)
  // -------------------------------------------------------------
  public static async getFeeAgreementById(
    organizationId: number,
    legalCaseId: number,
    agreementId: number
  ) {
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    const agreement = await db.legalFeeAgreement.findFirst({
      where: {
        id: agreementId,
        legalCaseId,
        organizationId,
      },
      include: {
        items: {
          orderBy: { id: "asc" },
        },
        payments: {
          orderBy: { paidAt: "desc" },
          include: {
            registeredByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!agreement) {
      throw new Error(`Acuerdo de honorarios con ID ${agreementId} no encontrado en el expediente ${legalCaseId}.`);
    }

    return LegalFinanceService.formatAgreementDto(agreement);
  }

  // -------------------------------------------------------------
  // ACTUALIZAR ACUERDO DE HONORARIOS (Con bloqueo económico)
  // -------------------------------------------------------------
  public static async updateFeeAgreement(
    organizationId: number,
    legalCaseId: number,
    agreementId: number,
    data: UpdateFeeAgreementInput
  ) {
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    const existing = await db.legalFeeAgreement.findFirst({
      where: {
        id: agreementId,
        legalCaseId,
        organizationId,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!existing) {
      throw new Error(`Acuerdo de honorarios con ID ${agreementId} no encontrado.`);
    }

    const hasPayments = existing.payments.length > 0;
    const isLockedState = existing.status === "ACTIVE" || existing.status === "COMPLETED" || existing.status === "CANCELLED";

    // Intentos de alterar estructura económica cuando ya hay pagos o no es DRAFT
    const attemptsEconomicChange =
      data.items !== undefined ||
      data.discount !== undefined ||
      data.subtotal !== undefined ||
      data.total !== undefined;

    if (attemptsEconomicChange && (hasPayments || isLockedState)) {
      throw new Error(
        "No se pueden modificar los conceptos económicos ni el total de un acuerdo que ya posee pagos registrados o no se encuentra en estado borrador (DRAFT)."
      );
    }

    const updatePayload: any = {};

    if (data.title !== undefined) {
      if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
        throw new Error("El título del acuerdo no puede estar vacío.");
      }
      updatePayload.title = data.title.trim();
    }

    if (data.description !== undefined) {
      updatePayload.description = data.description ? data.description.trim() : null;
    }

    if (data.status !== undefined) {
      const targetStatus = data.status.toUpperCase();
      if (!["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"].includes(targetStatus)) {
        throw new Error(`Estado '${data.status}' no válido para el acuerdo de honorarios.`);
      }
      updatePayload.status = targetStatus;
    }

    if (data.agreedAt !== undefined) {
      if (data.agreedAt) {
        const parsedDate = new Date(data.agreedAt);
        if (!isNaN(parsedDate.getTime())) {
          updatePayload.agreedAt = parsedDate;
        }
      } else {
        updatePayload.agreedAt = null;
      }
    }

    // Si aún está en DRAFT y sin pagos, se puede recalcular la estructura
    if (!hasPayments && existing.status === "DRAFT" && data.items !== undefined) {
      const rawItems = Array.isArray(data.items) ? data.items : [];
      const itemsToSet = rawItems.map((item, idx) => {
        if (!item.description || !item.description.trim()) {
          throw new Error(`El concepto del ítem #${idx + 1} es obligatorio.`);
        }
        if (typeof item.unitPrice !== "number" || !Number.isFinite(item.unitPrice) || isNaN(item.unitPrice) || item.unitPrice < 0) {
          throw new Error(`El precio unitario del ítem #${idx + 1} debe ser un número finito mayor o igual a 0.`);
        }
        const qty = item.quantity && Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
        const unit = Math.round(item.unitPrice * 100) / 100;
        const total = Math.round(qty * unit * 100) / 100;
        return {
          description: item.description.trim(),
          quantity: qty,
          unitPrice: unit,
          totalPrice: total,
        };
      });

      const newSubtotal = Math.round(itemsToSet.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100;

      let newDiscount = existing.discount;
      if (data.discount !== undefined) {
        if (typeof data.discount !== "number" || !Number.isFinite(data.discount) || isNaN(data.discount) || data.discount < 0) {
          throw new Error("El descuento debe ser un número finito mayor o igual a 0.");
        }
        newDiscount = Math.round(data.discount * 100) / 100;
      }

      if (newDiscount > newSubtotal) {
        throw new Error(`El descuento ($${newDiscount.toFixed(2)}) no puede exceder el subtotal ($${newSubtotal.toFixed(2)}).`);
      }

      const newTotal = Math.round(Math.max(0, newSubtotal - newDiscount) * 100) / 100;

      updatePayload.subtotal = newSubtotal;
      updatePayload.discount = newDiscount;
      updatePayload.total = newTotal;

      return await db.$transaction(async (tx) => {
        // Eliminar ítems previos y recrear los nuevos
        await tx.legalFeeItem.deleteMany({
          where: { feeAgreementId: agreementId },
        });

        if (itemsToSet.length > 0) {
          await tx.legalFeeItem.createMany({
            data: itemsToSet.map((item) => ({
              organizationId,
              feeAgreementId: agreementId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          });
        }

        const updated = await tx.legalFeeAgreement.update({
          where: { id: agreementId },
          data: updatePayload,
          include: {
            items: true,
            payments: true,
            createdByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        return LegalFinanceService.formatAgreementDto(updated);
      });
    }

    const updated = await db.legalFeeAgreement.update({
      where: { id: agreementId },
      data: updatePayload,
      include: {
        items: true,
        payments: true,
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return LegalFinanceService.formatAgreementDto(updated);
  }

  // -------------------------------------------------------------
  // REGISTRO DE PAGOS / ABONOS (Con Bloqueo Pesimista FOR UPDATE)
  // -------------------------------------------------------------
  public static async recordPayment(
    organizationId: number,
    legalCaseId: number,
    agreementId: number,
    data: RecordLegalPaymentInput,
    authUserId?: number | null
  ) {
    // 1. Validación numérica estricta en runtime
    if (
      typeof data.amount !== "number" ||
      !Number.isFinite(data.amount) ||
      isNaN(data.amount) ||
      data.amount <= 0
    ) {
      throw new Error("El monto del pago debe ser un número finito mayor a 0.");
    }

    const paymentAmount = Math.round(data.amount * 100) / 100;
    if (paymentAmount <= 0) {
      throw new Error("El monto del pago debe ser mayor a 0.");
    }

    // 2. Validar caso en la organización
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    // 3. Transacción con Bloqueo Pesimista (FOR UPDATE)
    return await db.$transaction(async (tx) => {
      // Bloqueo pesimista a nivel de fila en PostgreSQL para evitar sobrepagos concurrentes
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, total, "organizationId", "legalCaseId", status 
        FROM "LegalFeeAgreement" 
        WHERE id = ${agreementId} AND "organizationId" = ${organizationId} AND "legalCaseId" = ${legalCaseId}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new Error(`Acuerdo de honorarios con ID ${agreementId} no encontrado en esta causa u organización.`);
      }

      const agreementRow = lockedRows[0];

      // Un acuerdo cancelado no admite nuevos pagos
      if (agreementRow.status === "CANCELLED") {
        throw new Error("No se pueden registrar pagos en un acuerdo de honorarios cancelado.");
      }

      // Sumar pagos previos confirmados dentro del contexto del bloqueo
      const existingPayments = await tx.legalPayment.findMany({
        where: {
          feeAgreementId: agreementRow.id,
          organizationId,
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
        select: { amount: true },
      });

      const currentPaid = Math.round(
        existingPayments.reduce((sum: number, p: any) => sum + (typeof p.amount === "number" ? p.amount : 0), 0) * 100
      ) / 100;

      const currentBalance = Math.round(Math.max(0, agreementRow.total - currentPaid) * 100) / 100;

      // Invariante financiero: Prohibido sobreabono (overpayment)
      if (paymentAmount > currentBalance) {
        throw new Error(
          `El monto a pagar ($${paymentAmount.toFixed(2)}) supera el saldo pendiente actual ($${currentBalance.toFixed(2)}).`
        );
      }

      // Método de pago válido
      const validMethods = ["Efectivo", "Transferencia", "Depósito", "Tarjeta", "Otro"];
      let paymentMethod = "Transferencia";
      if (data.paymentMethod && typeof data.paymentMethod === "string" && data.paymentMethod.trim()) {
        const found = validMethods.find((m) => m.toLowerCase() === data.paymentMethod!.trim().toLowerCase());
        paymentMethod = found || data.paymentMethod.trim();
      }

      let paidAt = new Date();
      if (data.paidAt) {
        const parsedPaidAt = new Date(data.paidAt);
        if (!isNaN(parsedPaidAt.getTime())) {
          paidAt = parsedPaidAt;
        }
      }

      // Creación del registro inmutable LegalPayment
      const newPayment = await tx.legalPayment.create({
        data: {
          organizationId,
          feeAgreementId: agreementRow.id,
          amount: paymentAmount,
          paymentMethod,
          reference: data.reference ? data.reference.trim() : null,
          notes: data.notes ? data.notes.trim() : null,
          status: "COMPLETED",
          paidAt,
          registeredByUserId: authUserId || null,
        },
        include: {
          registeredByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Recalcular saldo fidedigno derivado (sin alterar agreement.status ni legalCase.status)
      const updatedPaidAmount = Math.round((currentPaid + paymentAmount) * 100) / 100;
      const updatedBalance = Math.round(Math.max(0, agreementRow.total - updatedPaidAmount) * 100) / 100;
      const paymentStatus = deriveLegalPaymentStatus(agreementRow.total, updatedPaidAmount);

      return {
        payment: newPayment,
        financialSummary: {
          agreementId: agreementRow.id,
          total: agreementRow.total,
          paidAmount: updatedPaidAmount,
          balance: updatedBalance,
          paymentStatus,
        },
      };
    });
  }

  // -------------------------------------------------------------
  // LISTAR PAGOS DE UN ACUERDO (Strictly Read-Only)
  // -------------------------------------------------------------
  public static async getPayments(
    organizationId: number,
    legalCaseId: number,
    agreementId: number
  ) {
    await LegalCaseOperationsService.getCaseInOrganization(organizationId, legalCaseId);

    const agreement = await db.legalFeeAgreement.findFirst({
      where: { id: agreementId, legalCaseId, organizationId },
    });

    if (!agreement) {
      throw new Error(`Acuerdo de honorarios con ID ${agreementId} no encontrado.`);
    }

    const payments = await db.legalPayment.findMany({
      where: {
        feeAgreementId: agreementId,
        organizationId,
      },
      orderBy: { paidAt: "desc" },
      include: {
        registeredByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return payments;
  }
}
