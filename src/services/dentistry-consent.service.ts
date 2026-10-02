import { db } from "../lib/db";

export interface CreateConsentTemplateInput {
  name: string;
  description?: string | null;
  content: string;
  category?: string | null;
  procedureCode?: string | null;
  isActive?: boolean;
}

export interface UpdateConsentTemplateInput {
  name?: string;
  description?: string | null;
  content?: string;
  category?: string | null;
  procedureCode?: string | null;
  isActive?: boolean;
}

export interface CreateConsentInput {
  patientId: number;
  dentalRecordId?: number;
  templateId?: number | null;
  title?: string | null;
  content?: string | null;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  executionId?: number | null;
  appointmentId?: number | null;
}

export interface UpdateConsentDraftInput {
  title?: string | null;
  content?: string | null;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  executionId?: number | null;
  appointmentId?: number | null;
}

export interface SignConsentInput {
  signedByPatientName: string;
  signedByProfessionalName: string;
  patientSignatureData?: string | null;
  professionalSignatureData?: string | null;
  patientSignedAt?: string | Date;
  professionalSignedAt?: string | Date;
}

export class DentistryConsentService {
  // =========================================================================
  // 1. PLANTILLAS DE CONSENTIMIENTO (DentalConsentTemplate)
  // =========================================================================

  /**
   * Lista las plantillas de consentimiento de la organización.
   */
  public static async listTemplates(
    organizationId: number,
    options?: { category?: string; isActive?: boolean }
  ) {
    const where: any = { organizationId };

    if (options?.category) {
      where.category = options.category;
    }

    if (typeof options?.isActive === "boolean") {
      where.isActive = options.isActive;
    }

    return db.dentalConsentTemplate.findMany({
      where,
      orderBy: [{ name: "asc" }, { version: "desc" }],
    });
  }

  /**
   * Obtiene una plantilla por ID con aislamiento organizacional.
   */
  public static async getTemplateById(organizationId: number, id: number) {
    const template = await db.dentalConsentTemplate.findUnique({
      where: { id },
    });

    if (!template || template.organizationId !== organizationId) {
      const err = new Error("Plantilla de consentimiento no encontrada o no pertenece a la organización.");
      (err as any).statusCode = 404;
      throw err;
    }

    return template;
  }

  /**
   * Crea una nueva plantilla de consentimiento.
   */
  public static async createTemplate(
    organizationId: number,
    data: CreateConsentTemplateInput
  ) {
    if (!data.name || !data.name.trim()) {
      const err = new Error("El nombre de la plantilla es obligatorio.");
      (err as any).statusCode = 400;
      throw err;
    }

    if (!data.content || !data.content.trim()) {
      const err = new Error("El contenido de la plantilla es obligatorio.");
      (err as any).statusCode = 400;
      throw err;
    }

    const trimmedName = data.name.trim();

    // Determinar la versión inicial para este nombre en la organización
    const latestVersion = await db.dentalConsentTemplate.findFirst({
      where: {
        organizationId,
        name: trimmedName,
      },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const version = latestVersion ? latestVersion.version + 1 : 1;

    return db.dentalConsentTemplate.create({
      data: {
        organizationId,
        name: trimmedName,
        description: data.description?.trim() || null,
        content: data.content.trim(),
        category: data.category?.trim() || "GENERAL",
        procedureCode: data.procedureCode?.trim() || null,
        version,
        isActive: typeof data.isActive === "boolean" ? data.isActive : true,
      },
    });
  }

  /**
   * Modifica una plantilla. Si ya fue usada en consentimientos, genera una nueva versión inmutable (v_n+1).
   */
  public static async updateTemplate(
    organizationId: number,
    id: number,
    data: UpdateConsentTemplateInput
  ) {
    const template = await this.getTemplateById(organizationId, id);

    // Contar si ya fue utilizada en algún consentimiento generado
    const usageCount = await db.dentalConsent.count({
      where: {
        organizationId,
        templateId: id,
      },
    });

    if (usageCount > 0) {
      // Versionado real: la plantilla histórica ya fue utilizada y NO se puede mutar in-place.
      // Se crea una nueva versión (v_n+1).
      const newName = data.name ? data.name.trim() : template.name;

      const latestVersion = await db.dentalConsentTemplate.findFirst({
        where: {
          organizationId,
          name: newName,
        },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const nextVersion = (latestVersion?.version ?? template.version) + 1;

      // Desactivamos la versión anterior para que nuevos consentimientos usen la última versión
      await db.dentalConsentTemplate.update({
        where: { id },
        data: { isActive: false },
      });

      return db.dentalConsentTemplate.create({
        data: {
          organizationId,
          name: newName,
          description: data.description !== undefined ? data.description?.trim() || null : template.description,
          content: data.content !== undefined ? data.content.trim() : template.content,
          category: data.category !== undefined ? data.category?.trim() || null : template.category,
          procedureCode: data.procedureCode !== undefined ? data.procedureCode?.trim() || null : template.procedureCode,
          version: nextVersion,
          isActive: typeof data.isActive === "boolean" ? data.isActive : true,
        },
      });
    }

    // Si nunca ha sido utilizada, se permite actualización in situ
    const updatePayload: any = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        const err = new Error("El nombre de la plantilla no puede estar vacío.");
        (err as any).statusCode = 400;
        throw err;
      }
      updatePayload.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updatePayload.description = data.description ? data.description.trim() : null;
    }
    if (data.content !== undefined) {
      if (!data.content.trim()) {
        const err = new Error("El contenido de la plantilla no puede estar vacío.");
        (err as any).statusCode = 400;
        throw err;
      }
      updatePayload.content = data.content.trim();
    }
    if (data.category !== undefined) {
      updatePayload.category = data.category ? data.category.trim() : null;
    }
    if (data.procedureCode !== undefined) {
      updatePayload.procedureCode = data.procedureCode ? data.procedureCode.trim() : null;
    }
    if (typeof data.isActive === "boolean") {
      updatePayload.isActive = data.isActive;
    }

    return db.dentalConsentTemplate.update({
      where: { id },
      data: updatePayload,
    });
  }

  /**
   * Desactiva una plantilla (soft deactivation).
   */
  public static async deactivateTemplate(organizationId: number, id: number) {
    await this.getTemplateById(organizationId, id);

    return db.dentalConsentTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // =========================================================================
  // 2. CONSENTIMIENTOS INFORMADOS CLÍNICOS (DentalConsent)
  // =========================================================================

  /**
   * Lista los consentimientos informados de un paciente o de la organización.
   */
  public static async listConsents(
    organizationId: number,
    patientId?: number,
    options?: {
      status?: string;
      treatmentPlanId?: number;
      appointmentId?: number;
    }
  ) {
    const where: any = { organizationId };

    if (patientId) {
      where.patientId = patientId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.treatmentPlanId) {
      where.treatmentPlanId = options.treatmentPlanId;
    }

    if (options?.appointmentId) {
      where.appointmentId = options.appointmentId;
    }

    return db.dentalConsent.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            version: true,
            category: true,
          },
        },
        treatmentPlan: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        treatmentItem: {
          select: {
            id: true,
            procedureName: true,
            toothNumber: true,
            status: true,
          },
        },
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            dentistName: true,
          },
        },
        issuedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Obtiene un consentimiento específico por ID con validación multi-tenant.
   */
  public static async getConsentById(organizationId: number, id: number) {
    const consent = await db.dentalConsent.findUnique({
      where: { id },
      include: {
        template: true,
        treatmentPlan: true,
        treatmentItem: true,
        execution: true,
        appointment: true,
        issuedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!consent || consent.organizationId !== organizationId) {
      const err = new Error("Consentimiento informado no encontrado o no pertenece a la organización.");
      (err as any).statusCode = 404;
      throw err;
    }

    return consent;
  }

  /**
   * Crea un consentimiento clínico estructurado en estado DRAFT.
   * Genera snapshots inmutables de paciente y plantilla.
   */
  public static async createConsent(
    organizationId: number,
    data: CreateConsentInput,
    userId?: number
  ) {
    if (!data.patientId || typeof data.patientId !== "number") {
      const err = new Error("El ID del paciente (patientId) es obligatorio.");
      (err as any).statusCode = 400;
      throw err;
    }

    // 1. Validar paciente y expediente odontológico
    const patient = await db.patient.findUnique({
      where: { id: data.patientId },
      include: { dentalRecord: true },
    });

    if (!patient || patient.organizationId !== organizationId) {
      const err = new Error("Paciente no encontrado o no pertenece a la organización.");
      (err as any).statusCode = 404;
      throw err;
    }

    if (!patient.dentalRecord) {
      const err = new Error("El paciente no tiene un expediente odontológico (DentalRecord) activo.");
      (err as any).statusCode = 400;
      throw err;
    }

    const dentalRecordId = patient.dentalRecord.id;

    // 2. Resolver plantilla y contenido snapshot
    let templateRecord = null;
    let title = data.title?.trim() || "";
    let contentSnapshot = data.content?.trim() || "";
    let templateVersion: number | null = null;

    if (data.templateId) {
      templateRecord = await db.dentalConsentTemplate.findUnique({
        where: { id: data.templateId },
      });

      if (!templateRecord || templateRecord.organizationId !== organizationId) {
        const err = new Error("La plantilla seleccionada no existe o no pertenece a la organización.");
        (err as any).statusCode = 404;
        throw err;
      }

      if (!templateRecord.isActive) {
        const err = new Error("La plantilla seleccionada no está activa.");
        (err as any).statusCode = 400;
        throw err;
      }

      if (!title) {
        title = templateRecord.name;
      }

      if (!contentSnapshot) {
        contentSnapshot = templateRecord.content;
      }

      templateVersion = templateRecord.version;
    }

    if (!title) {
      const err = new Error("El título del consentimiento es obligatorio.");
      (err as any).statusCode = 400;
      throw err;
    }

    if (!contentSnapshot) {
      const err = new Error("El contenido del consentimiento (contentSnapshot) es obligatorio.");
      (err as any).statusCode = 400;
      throw err;
    }

    // 3. Validar vinculaciones clínicas opcionales
    if (data.treatmentPlanId) {
      const plan = await db.dentalTreatmentPlan.findUnique({
        where: { id: data.treatmentPlanId },
      });
      if (!plan || plan.organizationId !== organizationId || plan.dentalRecordId !== dentalRecordId) {
        const err = new Error("El plan de tratamiento no pertenece al paciente o a la organización.");
        (err as any).statusCode = 400;
        throw err;
      }
    }

    if (data.treatmentItemId) {
      if (!data.treatmentPlanId) {
        const err = new Error("Para vincular un procedimiento (treatmentItemId) debe especificar el plan de tratamiento.");
        (err as any).statusCode = 400;
        throw err;
      }
      const item = await db.dentalTreatmentItem.findUnique({
        where: { id: data.treatmentItemId },
      });
      if (!item || item.organizationId !== organizationId || item.treatmentPlanId !== data.treatmentPlanId) {
        const err = new Error("El ítem de tratamiento no pertenece al plan indicado.");
        (err as any).statusCode = 400;
        throw err;
      }
    }

    if (data.executionId) {
      const execution = await db.dentalTreatmentExecution.findUnique({
        where: { id: data.executionId },
      });
      if (!execution || execution.organizationId !== organizationId || execution.dentalRecordId !== dentalRecordId) {
        const err = new Error("La ejecución clínica no pertenece al paciente o a la organización.");
        (err as any).statusCode = 400;
        throw err;
      }
    }

    if (data.appointmentId) {
      const appt = await db.dentalAppointment.findUnique({
        where: { id: data.appointmentId },
      });
      if (!appt || appt.organizationId !== organizationId || appt.patientId !== patient.id) {
        const err = new Error("La cita no pertenece al paciente o a la organización.");
        (err as any).statusCode = 400;
        throw err;
      }
    }

    // 4. Resolver profesional emisor inicial (opcional en borrador)
    let professionalNameSnapshot: string | null = null;
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (user) {
        professionalNameSnapshot = user.name;
      }
    }

    // 5. Crear el consentimiento estructurado en DRAFT
    return db.dentalConsent.create({
      data: {
        organizationId,
        dentalRecordId,
        patientId: patient.id,
        templateId: data.templateId || null,
        treatmentPlanId: data.treatmentPlanId || null,
        treatmentItemId: data.treatmentItemId || null,
        executionId: data.executionId || null,
        appointmentId: data.appointmentId || null,

        title,
        templateVersion,
        contentSnapshot,
        status: "DRAFT",

        patientNameSnapshot: patient.name,
        patientIdNumberSnapshot: patient.idNumber || null,
        professionalNameSnapshot,
        issuedByUserId: userId || null,
      },
      include: {
        template: true,
        treatmentPlan: true,
        treatmentItem: true,
        appointment: true,
      },
    });
  }

  /**
   * Modifica un consentimiento en estado DRAFT.
   * Prohíbe terminantemente modificar consentimientos en estado ISSUED, SIGNED o CANCELLED.
   */
  public static async updateConsentDraft(
    organizationId: number,
    id: number,
    data: UpdateConsentDraftInput
  ) {
    const consent = await this.getConsentById(organizationId, id);

    if (consent.status !== "DRAFT") {
      const err = new Error(
        `Solo se pueden editar consentimientos en estado DRAFT (el estado actual es ${consent.status}).`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    const updatePayload: any = {};

    if (data.title !== undefined) {
      if (!data.title || !data.title.trim()) {
        const err = new Error("El título no puede estar vacío.");
        (err as any).statusCode = 400;
        throw err;
      }
      updatePayload.title = data.title.trim();
    }

    if (data.content !== undefined) {
      if (!data.content || !data.content.trim()) {
        const err = new Error("El contenido del consentimiento no puede estar vacío.");
        (err as any).statusCode = 400;
        throw err;
      }
      updatePayload.contentSnapshot = data.content.trim();
    }

    // Validar posibles actualizaciones a vinculaciones clínicas
    const newPlanId = data.treatmentPlanId !== undefined ? data.treatmentPlanId : consent.treatmentPlanId;
    const newItemId = data.treatmentItemId !== undefined ? data.treatmentItemId : consent.treatmentItemId;

    if (data.treatmentPlanId !== undefined) {
      if (data.treatmentPlanId) {
        const plan = await db.dentalTreatmentPlan.findUnique({
          where: { id: data.treatmentPlanId },
        });
        if (!plan || plan.organizationId !== organizationId || plan.dentalRecordId !== consent.dentalRecordId) {
          const err = new Error("El plan de tratamiento no pertenece al paciente o a la organización.");
          (err as any).statusCode = 400;
          throw err;
        }
      }
      updatePayload.treatmentPlanId = data.treatmentPlanId || null;
    }

    if (data.treatmentItemId !== undefined) {
      if (data.treatmentItemId) {
        if (!newPlanId) {
          const err = new Error("Para vincular un procedimiento (treatmentItemId) debe especificar el plan de tratamiento.");
          (err as any).statusCode = 400;
          throw err;
        }
        const item = await db.dentalTreatmentItem.findUnique({
          where: { id: data.treatmentItemId },
        });
        if (!item || item.organizationId !== organizationId || item.treatmentPlanId !== newPlanId) {
          const err = new Error("El ítem de tratamiento no pertenece al plan indicado.");
          (err as any).statusCode = 400;
          throw err;
        }
      }
      updatePayload.treatmentItemId = data.treatmentItemId || null;
    }

    if (data.executionId !== undefined) {
      if (data.executionId) {
        const execution = await db.dentalTreatmentExecution.findUnique({
          where: { id: data.executionId },
        });
        if (!execution || execution.organizationId !== organizationId || execution.dentalRecordId !== consent.dentalRecordId) {
          const err = new Error("La ejecución clínica no pertenece al paciente o a la organización.");
          (err as any).statusCode = 400;
          throw err;
        }
      }
      updatePayload.executionId = data.executionId || null;
    }

    if (data.appointmentId !== undefined) {
      if (data.appointmentId) {
        const appt = await db.dentalAppointment.findUnique({
          where: { id: data.appointmentId },
        });
        if (!appt || appt.organizationId !== organizationId || appt.patientId !== consent.patientId) {
          const err = new Error("La cita no pertenece al paciente o a la organización.");
          (err as any).statusCode = 400;
          throw err;
        }
      }
      updatePayload.appointmentId = data.appointmentId || null;
    }

    return db.dentalConsent.update({
      where: { id },
      data: updatePayload,
      include: {
        template: true,
        treatmentPlan: true,
        treatmentItem: true,
        appointment: true,
      },
    });
  }

  /**
   * Emite formalmente el consentimiento (DRAFT -> ISSUED).
   * Protegido contra concurrencia con pg_advisory_xact_lock.
   * A partir de este momento el contenido, paciente y vinculaciones quedan congelados.
   */
  public static async issueConsent(
    organizationId: number,
    id: number,
    userId?: number,
    professionalName?: string
  ) {
    return db.$transaction(async (tx) => {
      // 1. Cerrojo de concurrencia a nivel de transacción
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('dental_consent_' || ${organizationId}::text || '_' || ${id}::text))`
      );

      // 2. Consultar el consentimiento bajo el cerrojo
      const consent = await tx.dentalConsent.findUnique({
        where: { id },
      });

      if (!consent || consent.organizationId !== organizationId) {
        const err = new Error("Consentimiento informado no encontrado o no pertenece a la organización.");
        (err as any).statusCode = 404;
        throw err;
      }

      if (consent.status !== "DRAFT") {
        const err = new Error(
          `Solo se pueden emitir consentimientos en estado DRAFT (estado actual: ${consent.status}).`
        );
        (err as any).statusCode = 400;
        throw err;
      }

      // 3. Resolver nombre del profesional emisor
      let profName = professionalName?.trim() || consent.professionalNameSnapshot;
      if (userId && !profName) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        if (user) {
          profName = user.name;
        }
      }

      // 4. Transicionar a ISSUED
      return tx.dentalConsent.update({
        where: { id },
        data: {
          status: "ISSUED",
          issuedAt: new Date(),
          issuedByUserId: userId || consent.issuedByUserId,
          professionalNameSnapshot: profName || "Profesional Tratante",
        },
        include: {
          template: true,
          treatmentPlan: true,
          treatmentItem: true,
          appointment: true,
          issuedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });
  }

  /**
   * Registra la firma del consentimiento (ISSUED -> SIGNED).
   * Protegido contra concurrencia con pg_advisory_xact_lock.
   * SIGNED es un estado terminal e inmutable.
   */
  public static async signConsent(
    organizationId: number,
    id: number,
    data: SignConsentInput
  ) {
    if (!data.signedByPatientName || !data.signedByPatientName.trim()) {
      const err = new Error("El nombre de la persona que firma como paciente es obligatorio.");
      (err as any).statusCode = 400;
      throw err;
    }

    if (!data.signedByProfessionalName || !data.signedByProfessionalName.trim()) {
      const err = new Error("El nombre del profesional que suscribe el consentimiento es obligatorio.");
      (err as any).statusCode = 400;
      throw err;
    }

    return db.$transaction(async (tx) => {
      // 1. Cerrojo de concurrencia
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('dental_consent_' || ${organizationId}::text || '_' || ${id}::text))`
      );

      // 2. Consultar el consentimiento bajo cerrojo
      const consent = await tx.dentalConsent.findUnique({
        where: { id },
      });

      if (!consent || consent.organizationId !== organizationId) {
        const err = new Error("Consentimiento informado no encontrado o no pertenece a la organización.");
        (err as any).statusCode = 404;
        throw err;
      }

      if (consent.status === "SIGNED") {
        const err = new Error("El consentimiento ya se encuentra formalmente firmado y es inmutable.");
        (err as any).statusCode = 400;
        throw err;
      }

      if (consent.status !== "ISSUED") {
        const err = new Error(
          `Solo se pueden firmar consentimientos previamente emitidos (estado ISSUED, estado actual: ${consent.status}).`
        );
        (err as any).statusCode = 400;
        throw err;
      }

      const patientSignedAt = data.patientSignedAt ? new Date(data.patientSignedAt) : new Date();
      const professionalSignedAt = data.professionalSignedAt ? new Date(data.professionalSignedAt) : new Date();

      return tx.dentalConsent.update({
        where: { id },
        data: {
          status: "SIGNED",
          patientSignedAt,
          professionalSignedAt,
          signedByPatientName: data.signedByPatientName.trim(),
          signedByProfessionalName: data.signedByProfessionalName.trim(),
          patientSignatureData: data.patientSignatureData || null,
          professionalSignatureData: data.professionalSignatureData || null,
        },
        include: {
          template: true,
          treatmentPlan: true,
          treatmentItem: true,
          appointment: true,
          issuedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });
  }

  /**
   * Cancela lógicamente un consentimiento (DRAFT o ISSUED -> CANCELLED).
   * Requiere motivo obligatorio.
   * Prohíbe cancelar consentimientos SIGNED.
   */
  public static async cancelConsent(
    organizationId: number,
    id: number,
    reason: string
  ) {
    if (!reason || !reason.trim()) {
      const err = new Error("El motivo de cancelación (reason) es obligatorio.");
      (err as any).statusCode = 400;
      throw err;
    }

    const consent = await this.getConsentById(organizationId, id);

    if (consent.status === "SIGNED") {
      const err = new Error(
        "Un consentimiento firmado (SIGNED) es legal y clínicamente inmutable y no puede ser cancelado."
      );
      (err as any).statusCode = 400;
      throw err;
    }

    if (consent.status === "CANCELLED") {
      const err = new Error("El consentimiento ya está cancelado.");
      (err as any).statusCode = 400;
      throw err;
    }

    return db.dentalConsent.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason.trim(),
      },
      include: {
        template: true,
        treatmentPlan: true,
        treatmentItem: true,
        appointment: true,
      },
    });
  }
}
