import { db } from "../lib/db";

export interface DentalPrescriptionItemInput {
  medicationName: string;
  genericName?: string | null;
  concentration?: string | null;
  pharmaceuticalForm?: string | null;
  dose: string;
  route?: string | null;
  frequency: string;
  duration?: string | null;
  quantity?: string | null;
  instructions?: string | null;
}

export interface CreateDentalPrescriptionInput {
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  executionId?: number | null;
  diagnosis?: string | null;
  procedure?: string | null;
  generalInstructions?: string | null;
  status?: "DRAFT" | "ISSUED" | string;
  signedBy?: string | null;
  items: DentalPrescriptionItemInput[];
}

export interface UpdateDentalPrescriptionInput {
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  diagnosis?: string | null;
  procedure?: string | null;
  generalInstructions?: string | null;
  status?: "DRAFT" | "ISSUED" | string;
  signedBy?: string | null;
  items?: DentalPrescriptionItemInput[];
}

export class DentistryPrescriptionService {
  /**
   * Crea una nueva receta odontológica en estado DRAFT o ISSUED.
   * Valida aislamiento multi-tenant y pertenencia de registros.
   */
  public static async createPrescription(
    organizationId: number,
    patientId: number,
    data: CreateDentalPrescriptionInput,
    userId?: number,
    client: any = db
  ) {
    // 1. Validar paciente perteneciente a la organización
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    // 2. Validar expediente odontológico
    const dentalRecord = await client.dentalRecord.findFirst({
      where: { patientId, organizationId },
    });

    if (!dentalRecord) {
      throw new Error("Expediente odontológico no encontrado para el paciente.");
    }

    // 3. Validar plan opcional
    if (data.treatmentPlanId) {
      const plan = await client.dentalTreatmentPlan.findFirst({
        where: {
          id: data.treatmentPlanId,
          organizationId,
          dentalRecordId: dentalRecord.id,
        },
      });
      if (!plan) {
        throw new Error("Plan de tratamiento no encontrado o no pertenece al expediente.");
      }
    }

    // 4. Validar ítem de tratamiento opcional
    if (data.treatmentItemId) {
      const item = await client.dentalTreatmentItem.findFirst({
        where: {
          id: data.treatmentItemId,
          organizationId,
          ...(data.treatmentPlanId ? { treatmentPlanId: data.treatmentPlanId } : {}),
        },
      });
      if (!item) {
        throw new Error("Procedimiento / ítem de tratamiento no encontrado.");
      }
    }

    // 5. Validar sesión clínica ejecutada opcional
    if (data.executionId) {
      const exec = await client.dentalTreatmentExecution.findFirst({
        where: {
          id: data.executionId,
          organizationId,
          dentalRecordId: dentalRecord.id,
        },
      });
      if (!exec) {
        throw new Error("Ejecución clínica no encontrada para este expediente.");
      }
    }

    // 6. Validar estado inicial
    const normalizedStatus = (data.status || "DRAFT").toUpperCase();
    if (normalizedStatus !== "DRAFT" && normalizedStatus !== "ISSUED") {
      throw new Error("El estado inicial de la receta debe ser DRAFT o ISSUED.");
    }

    if (normalizedStatus === "ISSUED" && (!data.items || data.items.length === 0)) {
      throw new Error("Una receta emitida debe contener al menos un medicamento.");
    }

    // Validar ítems
    if (data.items && data.items.length > 0) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const medName = item.medicationName?.trim() || item.genericName?.trim();
        if (!medName) {
          throw new Error(`El medicamento en la posición #${i + 1} requiere un nombre o principio activo.`);
        }
        if (!item.dose?.trim()) {
          throw new Error(`El medicamento '${medName}' requiere una dosis especificada.`);
        }
        if (!item.frequency?.trim()) {
          throw new Error(`El medicamento '${medName}' requiere una frecuencia especificada.`);
        }
      }
    }

    const now = new Date();
    const isIssued = normalizedStatus === "ISSUED";

    return client.$transaction(async (tx: any) => {
      const prescription = await tx.dentalPrescription.create({
        data: {
          organizationId,
          dentalRecordId: dentalRecord.id,
          patientId,
          treatmentPlanId: data.treatmentPlanId || null,
          treatmentItemId: data.treatmentItemId || null,
          executionId: data.executionId || null,
          diagnosis: data.diagnosis?.trim() || null,
          procedure: data.procedure?.trim() || null,
          generalInstructions: data.generalInstructions?.trim() || null,
          status: normalizedStatus,
          issuedByUserId: isIssued ? (userId || null) : null,
          signedBy: isIssued ? (data.signedBy?.trim() || "Odontólogo Tratante") : null,
          issuedAt: isIssued ? now : null,
          items: {
            create: (data.items || []).map((item) => ({
              medicationName: item.medicationName?.trim() || item.genericName?.trim() || "Medicamento",
              genericName: item.genericName?.trim() || null,
              concentration: item.concentration?.trim() || null,
              pharmaceuticalForm: item.pharmaceuticalForm?.trim() || null,
              dose: item.dose.trim(),
              route: item.route?.trim() || "Vía oral",
              frequency: item.frequency.trim(),
              duration: item.duration?.trim() || null,
              quantity: item.quantity?.trim() || null,
              instructions: item.instructions?.trim() || null,
            })),
          },
        },
        include: {
          items: true,
          patient: true,
          treatmentPlan: true,
          treatmentItem: true,
          execution: true,
        },
      });

      return prescription;
    });
  }

  /**
   * Obtiene la lista de recetas del paciente en la organización.
   * REGLA ESTRICTA READ-ONLY: Idempotente y sin side effects.
   */
  public static async getPrescriptions(
    organizationId: number,
    patientId: number,
    options?: { status?: string },
    client: any = db
  ) {
    const where: any = {
      organizationId,
      patientId,
    };

    if (options?.status) {
      where.status = options.status.toUpperCase();
    }

    return client.dentalPrescription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        treatmentPlan: {
          select: { id: true, title: true, status: true },
        },
        treatmentItem: {
          select: { id: true, procedureName: true, toothNumber: true, status: true },
        },
        execution: {
          select: { id: true, procedureName: true, performedAt: true },
        },
      },
    });
  }

  /**
   * Obtiene el detalle de una receta específica con todos sus datos e ítems.
   */
  public static async getPrescriptionById(
    organizationId: number,
    patientId: number,
    prescriptionId: number,
    client: any = db
  ) {
    const prescription = await client.dentalPrescription.findFirst({
      where: {
        id: prescriptionId,
        organizationId,
        patientId,
      },
      include: {
        items: true,
        patient: true,
        treatmentPlan: true,
        treatmentItem: true,
        execution: true,
        issuedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!prescription) {
      throw new Error("Receta odontológica no encontrada en esta organización.");
    }

    return prescription;
  }

  /**
   * Actualiza una receta en estado DRAFT.
   * INMUTABILIDAD ESTRICTA: Si la receta está ISSUED o CANCELLED, rechaza la edición con error.
   */
  public static async updatePrescription(
    organizationId: number,
    patientId: number,
    prescriptionId: number,
    data: UpdateDentalPrescriptionInput,
    userId?: number,
    client: any = db
  ) {
    const existing = await client.dentalPrescription.findFirst({
      where: {
        id: prescriptionId,
        organizationId,
        patientId,
      },
      include: { items: true },
    });

    if (!existing) {
      throw new Error("Receta odontológica no encontrada.");
    }

    // Regla de inmutabilidad
    if (existing.status === "ISSUED" || existing.status === "CANCELLED") {
      throw new Error(`No se puede modificar una receta con estado ${existing.status}. El documento clínico es inmutable.`);
    }

    const targetStatus = (data.status || existing.status).toUpperCase();
    if (targetStatus !== "DRAFT" && targetStatus !== "ISSUED") {
      throw new Error("El estado solo puede mantenerse en DRAFT o cambiar a ISSUED.");
    }

    const willBeIssued = targetStatus === "ISSUED";
    const now = new Date();

    return client.$transaction(async (tx: any) => {
      // Si se proveen ítems para actualizar
      if (data.items) {
        if (willBeIssued && data.items.length === 0) {
          throw new Error("Una receta emitida debe contener al menos un medicamento.");
        }

        // Validar ítems
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const medName = item.medicationName?.trim() || item.genericName?.trim();
          if (!medName) {
            throw new Error(`El medicamento en la posición #${i + 1} requiere un nombre o principio activo.`);
          }
          if (!item.dose?.trim()) {
            throw new Error(`El medicamento '${medName}' requiere una dosis especificada.`);
          }
          if (!item.frequency?.trim()) {
            throw new Error(`El medicamento '${medName}' requiere una frecuencia especificada.`);
          }
        }

        // Eliminar ítems existentes y recrear
        await tx.dentalPrescriptionItem.deleteMany({
          where: { prescriptionId },
        });

        await tx.dentalPrescriptionItem.createMany({
          data: data.items.map((item) => ({
            prescriptionId,
            medicationName: item.medicationName?.trim() || item.genericName?.trim() || "Medicamento",
            genericName: item.genericName?.trim() || null,
            concentration: item.concentration?.trim() || null,
            pharmaceuticalForm: item.pharmaceuticalForm?.trim() || null,
            dose: item.dose.trim(),
            route: item.route?.trim() || "Vía oral",
            frequency: item.frequency.trim(),
            duration: item.duration?.trim() || null,
            quantity: item.quantity?.trim() || null,
            instructions: item.instructions?.trim() || null,
          })),
        });
      } else if (willBeIssued && existing.items.length === 0) {
        throw new Error("Una receta emitida debe contener al menos un medicamento.");
      }

      const updated = await tx.dentalPrescription.update({
        where: { id: prescriptionId },
        data: {
          diagnosis: data.diagnosis !== undefined ? (data.diagnosis?.trim() || null) : existing.diagnosis,
          procedure: data.procedure !== undefined ? (data.procedure?.trim() || null) : existing.procedure,
          generalInstructions: data.generalInstructions !== undefined ? (data.generalInstructions?.trim() || null) : existing.generalInstructions,
          treatmentPlanId: data.treatmentPlanId !== undefined ? data.treatmentPlanId : existing.treatmentPlanId,
          treatmentItemId: data.treatmentItemId !== undefined ? data.treatmentItemId : existing.treatmentItemId,
          status: targetStatus,
          issuedByUserId: willBeIssued ? (userId || existing.issuedByUserId) : existing.issuedByUserId,
          signedBy: willBeIssued ? (data.signedBy?.trim() || existing.signedBy || "Odontólogo Tratante") : existing.signedBy,
          issuedAt: willBeIssued ? (existing.issuedAt || now) : existing.issuedAt,
        },
        include: {
          items: true,
          patient: true,
          treatmentPlan: true,
          treatmentItem: true,
        },
      });

      return updated;
    });
  }

  /**
   * Emite y sella una receta DRAFT (transición irreversible a ISSUED).
   */
  public static async issuePrescription(
    organizationId: number,
    patientId: number,
    prescriptionId: number,
    userId?: number,
    signedBy?: string,
    client: any = db
  ) {
    const existing = await client.dentalPrescription.findFirst({
      where: { id: prescriptionId, organizationId, patientId },
      include: { items: true },
    });

    if (!existing) {
      throw new Error("Receta odontológica no encontrada.");
    }

    if (existing.status === "ISSUED") {
      throw new Error("La receta ya fue emitida previamente.");
    }

    if (existing.status === "CANCELLED") {
      throw new Error("No se puede emitir una receta que ha sido cancelada.");
    }

    if (existing.items.length === 0) {
      throw new Error("No se puede emitir una receta sin medicamentos agregados.");
    }

    const now = new Date();
    return client.dentalPrescription.update({
      where: { id: prescriptionId },
      data: {
        status: "ISSUED",
        issuedByUserId: userId || null,
        signedBy: signedBy?.trim() || "Odontólogo Tratante",
        issuedAt: now,
      },
      include: {
        items: true,
        patient: true,
      },
    });
  }

  /**
   * Anula una receta emitida con registro obligatorio de motivo.
   */
  public static async cancelPrescription(
    organizationId: number,
    patientId: number,
    prescriptionId: number,
    reason: string,
    client: any = db
  ) {
    if (!reason || !reason.trim()) {
      throw new Error("Debe especificar un motivo para cancelar la receta.");
    }

    const existing = await client.dentalPrescription.findFirst({
      where: { id: prescriptionId, organizationId, patientId },
    });

    if (!existing) {
      throw new Error("Receta odontológica no encontrada.");
    }

    if (existing.status === "CANCELLED") {
      throw new Error("La receta ya se encuentra cancelada.");
    }

    const now = new Date();
    return client.dentalPrescription.update({
      where: { id: prescriptionId },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancellationReason: reason.trim(),
      },
      include: {
        items: true,
      },
    });
  }
}
