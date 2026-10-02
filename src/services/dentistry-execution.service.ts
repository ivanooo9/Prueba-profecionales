import { db } from "../lib/db";
import { DentistryOdontogramService, VALID_TOOTH_STATES } from "./dentistry-odontogram.service";

export interface CreateExecutionInput {
  clinicalNotes?: string | null;
  completed?: boolean;
  performedAt?: string | Date | null;
  odontogramUpdate?: {
    toothNumber?: number;
    state: string;
    surfaces?: Record<string, boolean>;
    notes?: string | null;
  } | null;
}

export class DentistryExecutionService {
  /**
   * GET Ejecuciones clínicas de un ítem de tratamiento.
   * REGLA ESTRICTA READ-ONLY: Idempotente y sin efectos secundarios.
   * Orden cronológico explícito: performedAt DESC.
   */
  public static async getExecutions(
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

    const item = await client.dentalTreatmentItem.findFirst({
      where: {
        id: itemId,
        treatmentPlanId: plan.id,
        organizationId,
      },
    });

    if (!item) {
      throw new Error("Procedimiento no encontrado en este plan de tratamiento.");
    }

    const executions = await client.dentalTreatmentExecution.findMany({
      where: {
        organizationId,
        dentalRecordId: dentalRecord.id,
        treatmentPlanId: plan.id,
        treatmentItemId: item.id,
      },
      include: {
        performedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { performedAt: "desc" },
    });

    return executions.map((ex: any) => ({
      id: ex.id,
      organizationId: ex.organizationId,
      dentalRecordId: ex.dentalRecordId,
      treatmentPlanId: ex.treatmentPlanId,
      treatmentItemId: ex.treatmentItemId,
      toothNumber: ex.toothNumber !== null ? ex.toothNumber : undefined,
      procedureName: ex.procedureName,
      clinicalNotes: ex.clinicalNotes || undefined,
      performedAt: ex.performedAt.toISOString(),
      performedByUserId: ex.performedByUserId || undefined,
      performedByUser: ex.performedByUser || undefined,
      createdAt: ex.createdAt.toISOString(),
    }));
  }

  /**
   * POST Registrar ejecución clínica de un ítem de tratamiento.
   * Transacción atómica e inmutable con bloqueo pesimista SELECT ... FOR UPDATE sobre el DentalTreatmentItem.
   * 
   * Flujo atómico:
   * 1. Bloqueo FOR UPDATE del DentalTreatmentItem.
   * 2. Validación de paciente, plan, tenant y pertenencia relacional.
   * 3. Validación de estado: CANCELLED o COMPLETED rechazan nuevas ejecuciones.
   * 4. Validación de fecha: performedAt no puede ser futura (> ahora + 5 min tolerancia reloj).
   * 5. Validación de consistencia: si el ítem es general, prohíbe odontogramUpdate.
   *    Si tiene pieza, deriva la pieza del ítem y rechaza si el payload indica una pieza distinta.
   * 6. Creación de DentalTreatmentExecution (asociando performedByUserId derivado de sesión).
   * 7. Actualización de estado del DentalTreatmentItem (COMPLETED si completed=true, IN_PROGRESS si estaba PLANNED).
   * 8. Actualización opcional de DentalToothSnapshot y creación de DentalToothEvent si hay cambio clínico efectivo.
   * 9. Si cualquier paso falla -> ROLLBACK TOTAL de PostgreSQL.
   */
  public static async createExecution(
    organizationId: number,
    patientId: number,
    planId: number,
    itemId: number,
    data: CreateExecutionInput,
    userId?: number | null,
    client: any = db
  ) {
    // -------------------------------------------------------------
    // VALIDACIÓN PRELIMINAR DE FECHA (performedAt)
    // -------------------------------------------------------------
    let performedAtDate: Date;
    if (data.performedAt !== undefined && data.performedAt !== null && data.performedAt !== "") {
      const parsed = new Date(data.performedAt);
      if (isNaN(parsed.getTime())) {
        throw new Error("Fecha de ejecución inválida (performedAt).");
      }
      const now = new Date();
      const maxFutureTolerance = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos de tolerancia reloj
      if (parsed > maxFutureTolerance) {
        throw new Error("La fecha de ejecución clínica no puede ser futura.");
      }
      performedAtDate = parsed;
    } else {
      performedAtDate = new Date();
    }

    // -------------------------------------------------------------
    // TRANSACCIÓN INTERACTIVA CON BLOQUEO PESIMISTA
    // -------------------------------------------------------------
    const executeInTx = async (tx: any) => {
      // 1. Bloqueo a nivel de fila (FOR UPDATE) del DentalTreatmentItem
      const rows: any[] = await tx.$queryRaw`
        SELECT id, "organizationId", "treatmentPlanId", "toothNumber", "procedureName", status
        FROM "DentalTreatmentItem"
        WHERE id = ${itemId} AND "organizationId" = ${organizationId}
        FOR UPDATE;
      `;

      if (!rows || rows.length === 0) {
        throw new Error("Procedimiento no encontrado en esta organización.");
      }

      const item = rows[0];

      // 2. Validación de jerarquía relacional completa: Patient -> DentalRecord -> TreatmentPlan
      if (item.treatmentPlanId !== planId) {
        throw new Error("El procedimiento no pertenece al plan de tratamiento especificado.");
      }

      const plan = await tx.dentalTreatmentPlan.findFirst({
        where: {
          id: planId,
          organizationId,
        },
        include: {
          dentalRecord: true,
        },
      });

      if (!plan || plan.dentalRecord.patientId !== patientId) {
        throw new Error("El procedimiento no pertenece al paciente o plan de tratamiento especificado.");
      }

      // 3. Validación de estado clínico del procedimiento
      if (item.status === "CANCELLED") {
        throw new Error("No se puede registrar ejecución sobre un procedimiento CANCELADO.");
      }

      if (item.status === "COMPLETED") {
        throw new Error("No se puede registrar una nueva ejecución ordinaria sobre un procedimiento COMPLETADO.");
      }

      // 4. Validación de consistencia TreatmentItem ↔ Pieza Dental
      if (item.toothNumber === null) {
        if (data.odontogramUpdate) {
          throw new Error("No se puede actualizar el odontograma desde un procedimiento general sin pieza dental asociada.");
        }
      } else {
        if (data.odontogramUpdate) {
          if (
            data.odontogramUpdate.toothNumber !== undefined &&
            data.odontogramUpdate.toothNumber !== null &&
            Number(data.odontogramUpdate.toothNumber) !== item.toothNumber
          ) {
            throw new Error(
              `La pieza indicada en la actualización del odontograma (#${data.odontogramUpdate.toothNumber}) no coincide con la pieza del tratamiento (#${item.toothNumber}).`
            );
          }
        }
      }

      // 5. Crear DentalTreatmentExecution inmutable (snapshot del procedimiento y responsable)
      const execution = await tx.dentalTreatmentExecution.create({
        data: {
          organizationId,
          dentalRecordId: plan.dentalRecordId,
          treatmentPlanId: plan.id,
          treatmentItemId: item.id,
          performedByUserId: userId || null,
          toothNumber: item.toothNumber,
          procedureName: item.procedureName,
          clinicalNotes: data.clinicalNotes?.trim() || null,
          performedAt: performedAtDate,
        },
        include: {
          performedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // 6. Actualización controlada del estado de DentalTreatmentItem
      let nextItemStatus = item.status;
      if (data.completed === true) {
        nextItemStatus = "COMPLETED";
      } else if (item.status === "PLANNED") {
        nextItemStatus = "IN_PROGRESS";
      }

      if (nextItemStatus !== item.status) {
        await tx.dentalTreatmentItem.update({
          where: { id: item.id },
          data: { status: nextItemStatus },
        });
      }

      // 7. Actualización del estado del Plan si corresponde
      let updatedPlanStatus = plan.status;
      if (plan.status === "DRAFT") {
        updatedPlanStatus = "ACTIVE";
        await tx.dentalTreatmentPlan.update({
          where: { id: plan.id },
          data: { status: "ACTIVE" },
        });
      } else if (data.completed === true) {
        // Verificar si todos los ítems activos del plan están COMPLETADOS
        const allItems = await tx.dentalTreatmentItem.findMany({
          where: { treatmentPlanId: plan.id },
        });
        const nonCancelled = allItems.map((it: any) =>
          it.id === item.id ? { ...it, status: "COMPLETED" } : it
        ).filter((it: any) => it.status !== "CANCELLED");

        if (nonCancelled.length > 0 && nonCancelled.every((it: any) => it.status === "COMPLETED")) {
          updatedPlanStatus = "COMPLETED";
          await tx.dentalTreatmentPlan.update({
            where: { id: plan.id },
            data: { status: "COMPLETED" },
          });
        }
      }

      // 8. Integración opcional y atómica con Odontograma (F4/F5)
      let odontogramResult: any = null;
      if (data.odontogramUpdate && item.toothNumber !== null) {
        // Validación estricta de ToothState: los únicos válidos son F4/F5
        DentistryOdontogramService.validateToothState(data.odontogramUpdate.state);

        // Delegar en el servicio validado pasando el cliente transaccional interactivo 'tx'
        odontogramResult = await DentistryOdontogramService.saveToothSnapshot(
          organizationId,
          patientId,
          item.toothNumber,
          {
            state: data.odontogramUpdate.state,
            surfaces: data.odontogramUpdate.surfaces,
            notes: data.odontogramUpdate.notes,
          },
          tx
        );
      }

      return {
        execution: {
          id: execution.id,
          organizationId: execution.organizationId,
          dentalRecordId: execution.dentalRecordId,
          treatmentPlanId: execution.treatmentPlanId,
          treatmentItemId: execution.treatmentItemId,
          toothNumber: execution.toothNumber !== null ? execution.toothNumber : undefined,
          procedureName: execution.procedureName,
          clinicalNotes: execution.clinicalNotes || undefined,
          performedAt: execution.performedAt.toISOString(),
          performedByUserId: execution.performedByUserId || undefined,
          performedByUser: execution.performedByUser || undefined,
          createdAt: execution.createdAt.toISOString(),
        },
        itemStatus: nextItemStatus,
        planStatus: updatedPlanStatus,
        odontogram: odontogramResult,
      };
    };

    if (client.$transaction) {
      return await client.$transaction(executeInTx);
    } else {
      return await executeInTx(client);
    }
  }

  /**
   * GET Historial evolutivo general de un paciente.
   * Retorna todas las ejecuciones clínicas del paciente ordenadas cronológicamente por performedAt DESC.
   */
  public static async getPatientExecutions(
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

    const executions = await client.dentalTreatmentExecution.findMany({
      where: {
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
      include: {
        performedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { performedAt: "desc" },
    });

    return executions.map((ex: any) => ({
      id: ex.id,
      organizationId: ex.organizationId,
      dentalRecordId: ex.dentalRecordId,
      treatmentPlanId: ex.treatmentPlanId,
      treatmentItemId: ex.treatmentItemId,
      toothNumber: ex.toothNumber !== null ? ex.toothNumber : undefined,
      procedureName: ex.procedureName,
      clinicalNotes: ex.clinicalNotes || undefined,
      performedAt: ex.performedAt.toISOString(),
      performedByUserId: ex.performedByUserId || undefined,
      performedByUser: ex.performedByUser || undefined,
      createdAt: ex.createdAt.toISOString(),
    }));
  }
}
