import { db } from "../lib/db";
import { uploadBase64ToCloudinary } from "../lib/cloudinary";
import {
  MEDICAL_CONSULTATION_STATUS,
  MEDICAL_PATIENT_STATUS,
  MEDICAL_PRESCRIPTION_STATUS,
  MEDICAL_FOLLOW_UP_STATUS,
} from "../constants/medicine.constants";

export interface EmergencyContactInput {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface MedicalRecordInput {
  heightCm?: number | null;
  weightKg?: number | null;
  bloodType?: string | null;
  allergies?: string | null;
  currentIllnesses?: string | null;
  chronicDiseases?: string | null;
  currentMedications?: string | null;
  personalHistory?: string | null;
  familyHistory?: string | null;
  previousSurgeries?: string | null;
  hospitalizations?: string | null;
  tobaccoUse?: string | null;
  alcoholUse?: string | null;
  pregnancyStatus?: string | null;
  gestationalWeeks?: number | null;
  breastfeeding?: string | null;
}

export interface CreatePatientInput {
  name: string;
  idNumber?: string | null;
  birthDate?: string | Date | null;
  gender?: string | null;
  bloodType?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: EmergencyContactInput | null;
  status?: string;
  anamnesis?: MedicalRecordInput | null;
}

export interface UpdatePatientInput {
  name?: string;
  idNumber?: string | null;
  birthDate?: string | Date | null;
  gender?: string | null;
  bloodType?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: EmergencyContactInput | null;
  status?: string;
  anamnesis?: MedicalRecordInput | null;
}

export interface VitalSignsInput {
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  temperatureC?: number | null;
  spo2?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  measuredAt?: string | Date | null;
}

export interface CreateConsultationInput {
  patientId: number;
  professionalId?: number | null;
  date?: string | Date | null;
  reason: string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  cie10Code?: string | null;
  cie10Description?: string | null;
  status?: string;
  signedBy?: string | null;
  vitalSigns?: VitalSignsInput | null;
}

export interface UpdateConsultationInput {
  reason?: string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  cie10Code?: string | null;
  cie10Description?: string | null;
  status?: string;
  signedBy?: string | null;
  vitalSigns?: VitalSignsInput | null;
}

export interface PrescriptionItemInput {
  medicationName: string;
  genericName?: string | null;
  concentration?: string | null;
  pharmaceuticalForm?: string | null;
  dose: string;
  frequency: string;
  route?: string;
  duration?: string | null;
  quantity?: string | null;
  instructions?: string | null;
}

export interface CreatePrescriptionInput {
  patientId: number;
  consultationId?: number | null;
  diagnosis?: string | null;
  generalInstructions?: string | null;
  status?: string;
  signedBy?: string | null;
  items: PrescriptionItemInput[];
}

export interface CreateFollowUpInput {
  patientId: number;
  consultationId?: number | null;
  type?: string;
  title: string;
  description?: string | null;
  dueDate: string | Date;
  priority?: string;
}

export interface CreateLaboratoryResultInput {
  patientId: number;
  consultationId?: number | null;
  testName: string;
  category?: string | null;
  laboratory?: string | null;
  resultDate?: string | Date;
  status?: string;
  notes?: string | null;
  results?: any;
  file?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}

export interface CreateImagingStudyInput {
  patientId: number;
  consultationId?: number | null;
  studyType: string;
  bodyPart?: string | null;
  performedAt?: string | Date;
  status?: string;
  report?: string | null;
  conclusion?: string | null;
  file?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}

export interface CreatePreventionRecordInput {
  patientId: number;
  type?: string;
  title: string;
  status?: string;
  dueDate?: string | Date | null;
  completedAt?: string | Date | null;
  notes?: string | null;
}

export interface CreateDocumentInput {
  patientId: number;
  consultationId?: number | null;
  title: string;
  type?: string;
  date?: string | Date | null;
  author?: string | null;
  fileName: string;
  file?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

export interface CreateAppointmentInput {
  patientId: number;
  professionalId?: number | null;
  consultationId?: number | null;
  date?: string | Date;
  startTime: string;
  endTime?: string | null;
  reason: string;
  type?: string;
  status?: string;
  room?: string | null;
  notes?: string | null;
}

export interface UpdateAppointmentInput {
  patientId?: number;
  professionalId?: number | null;
  consultationId?: number | null;
  date?: string | Date;
  startTime?: string;
  endTime?: string | null;
  reason?: string;
  type?: string;
  status?: string;
  room?: string | null;
  notes?: string | null;
}


export class MedicineService {
  /**
   * Registra un nuevo paciente en la organización.
   * Multi-tenancy estricto: el paciente se asocia a la organización autenticada.
   */
  static async createPatient(
    organizationId: number,
    data: CreatePatientInput,
    client: any = db
  ) {
    if (!data.name || data.name.trim() === "") {
      throw new Error("El nombre del paciente es obligatorio.");
    }

    if (data.idNumber && data.idNumber.trim() !== "") {
      const existing = await client.patient.findFirst({
        where: {
          organizationId,
          idNumber: data.idNumber.trim(),
        },
      });

      if (existing) {
        throw new Error(
          `Ya existe un paciente registrado con la identificación '${data.idNumber.trim()}' en esta organización.`
        );
      }
    }

    const birthDate = data.birthDate ? new Date(data.birthDate) : null;

    const canonicalBloodType = data.bloodType?.trim() || data.anamnesis?.bloodType?.trim() || null;

    const patient = await client.patient.create({
      data: {
        organizationId,
        name: data.name.trim(),
        idNumber: data.idNumber?.trim() || null,
        birthDate: birthDate && !isNaN(birthDate.getTime()) ? birthDate : null,
        gender: data.gender || "UNSPECIFIED",
        bloodType: canonicalBloodType,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        emergencyContact: (data.emergencyContact as any) || undefined,
        status: data.status || MEDICAL_PATIENT_STATUS.CONTROLADO,
      },
    });

    // Si se enviaron datos anamnésicos, creamos la ficha clínica asociada asegurando sincronización de bloodType
    if (data.anamnesis) {
      const recordPayload = {
        ...data.anamnesis,
        bloodType: data.anamnesis.bloodType?.trim() || canonicalBloodType || undefined,
      };
      await this.upsertMedicalRecord(organizationId, patient.id, recordPayload, client);
    }

    return this.getPatientById(organizationId, patient.id, client);
  }

  /**
   * Obtiene la lista de pacientes de la organización.
   */
  static async getPatients(
    organizationId: number,
    options?: {
      search?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.search && options.search.trim() !== "") {
      const term = options.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { idNumber: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
      ];
    }

    const [total, patients] = await Promise.all([
      client.patient.count({ where }),
      client.patient.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: options?.skip || 0,
        take: options?.take || 50,
        include: {
          record: true,
          _count: {
            select: {
              consultations: true,
              prescriptions: true,
              followUps: true,
              laboratoryResults: true,
              imagingStudies: true,
              preventionRecords: true,
              documents: true,
            },
          },
        },
      }),
    ]);

    return { total, patients };
  }

  /**
   * Obtiene el detalle completo de un paciente asegurando pertenencia a la organización.
   */
  static async getPatientById(
    organizationId: number,
    patientId: number,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
      },
      include: {
        record: true,
        consultations: {
          orderBy: { date: "desc" },
          take: 10,
          include: {
            vitalSigns: true,
          },
        },
        vitalSigns: {
          orderBy: { measuredAt: "desc" },
          take: 10,
        },
        prescriptions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            items: true,
          },
        },
        followUps: {
          orderBy: { dueDate: "asc" },
          take: 10,
        },
        laboratoryResults: {
          orderBy: { resultDate: "desc" },
          take: 20,
        },
        imagingStudies: {
          orderBy: { performedAt: "desc" },
          take: 20,
        },
        preventionRecords: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        documents: {
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    });

    return patient;
  }

  /**
   * Actualiza los datos generales de un paciente.
   */
  static async updatePatient(
    organizationId: number,
    patientId: number,
    data: UpdatePatientInput,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    if (data.idNumber && data.idNumber.trim() !== patient.idNumber) {
      const existing = await client.patient.findFirst({
        where: {
          organizationId,
          idNumber: data.idNumber.trim(),
          id: { not: patientId },
        },
      });

      if (existing) {
        throw new Error(
          `Ya existe otro paciente con la identificación '${data.idNumber.trim()}' en esta organización.`
        );
      }
    }

    const birthDate = data.birthDate !== undefined
      ? data.birthDate ? new Date(data.birthDate) : null
      : undefined;

    // Si se enviaron datos anamnésicos, actualizamos la ficha clínica asociada
    if (data.anamnesis !== undefined && data.anamnesis !== null) {
      await this.upsertMedicalRecord(organizationId, patientId, data.anamnesis, client);
    }

    const bloodType = data.bloodType !== undefined
      ? (data.bloodType?.trim() || null)
      : (data.anamnesis?.bloodType !== undefined ? (data.anamnesis.bloodType?.trim() || null) : undefined);

    await client.patient.update({
      where: { id: patientId },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        idNumber: data.idNumber !== undefined ? (data.idNumber?.trim() || null) : undefined,
        birthDate: birthDate !== undefined && birthDate && !isNaN(birthDate.getTime()) ? birthDate : undefined,
        gender: data.gender !== undefined ? data.gender : undefined,
        bloodType,
        phone: data.phone !== undefined ? (data.phone?.trim() || null) : undefined,
        email: data.email !== undefined ? (data.email?.trim() || null) : undefined,
        address: data.address !== undefined ? (data.address?.trim() || null) : undefined,
        emergencyContact: data.emergencyContact !== undefined ? (data.emergencyContact as any) : undefined,
        status: data.status !== undefined ? data.status : undefined,
      },
    });

    return this.getPatientById(organizationId, patientId, client);
  }

  /**
   * Obtiene la ficha clínica (anamnesis) del paciente.
   */
  static async getMedicalRecord(
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

    return client.medicalRecord.findUnique({
      where: { patientId },
    });
  }

  /**
   * Crea o actualiza la ficha clínica (anamnesis) del paciente.
   */
  static async upsertMedicalRecord(
    organizationId: number,
    patientId: number,
    data: MedicalRecordInput,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    const heightCm = data.heightCm !== undefined && data.heightCm !== null && (data.heightCm as any) !== ""
      ? Number(data.heightCm)
      : (data.heightCm === null || (data.heightCm as any) === "" ? null : undefined);

    const weightKg = data.weightKg !== undefined && data.weightKg !== null && (data.weightKg as any) !== ""
      ? Number(data.weightKg)
      : (data.weightKg === null || (data.weightKg as any) === "" ? null : undefined);

    const gestationalWeeks = data.gestationalWeeks !== undefined && data.gestationalWeeks !== null && (data.gestationalWeeks as any) !== ""
      ? parseInt(String(data.gestationalWeeks), 10)
      : (data.gestationalWeeks === null || (data.gestationalWeeks as any) === "" ? null : undefined);

    const record = await client.medicalRecord.upsert({
      where: { patientId },
      create: {
        organizationId,
        patientId,
        heightCm: heightCm !== undefined ? heightCm : null,
        weightKg: weightKg !== undefined ? weightKg : null,
        bloodType: data.bloodType?.trim() || null,
        allergies: data.allergies?.trim() || null,
        currentIllnesses: data.currentIllnesses?.trim() || null,
        chronicDiseases: data.chronicDiseases?.trim() || null,
        currentMedications: data.currentMedications?.trim() || null,
        personalHistory: data.personalHistory?.trim() || null,
        familyHistory: data.familyHistory?.trim() || null,
        previousSurgeries: data.previousSurgeries?.trim() || null,
        hospitalizations: data.hospitalizations?.trim() || null,
        tobaccoUse: data.tobaccoUse?.trim() || null,
        alcoholUse: data.alcoholUse?.trim() || null,
        pregnancyStatus: data.pregnancyStatus || null,
        gestationalWeeks: gestationalWeeks !== undefined ? gestationalWeeks : null,
        breastfeeding: data.breastfeeding || null,
      },
      update: {
        heightCm: heightCm !== undefined ? heightCm : undefined,
        weightKg: weightKg !== undefined ? weightKg : undefined,
        bloodType: data.bloodType !== undefined ? (data.bloodType?.trim() || null) : undefined,
        allergies: data.allergies !== undefined ? (data.allergies?.trim() || null) : undefined,
        currentIllnesses: data.currentIllnesses !== undefined ? (data.currentIllnesses?.trim() || null) : undefined,
        chronicDiseases: data.chronicDiseases !== undefined ? (data.chronicDiseases?.trim() || null) : undefined,
        currentMedications: data.currentMedications !== undefined ? (data.currentMedications?.trim() || null) : undefined,
        personalHistory: data.personalHistory !== undefined ? (data.personalHistory?.trim() || null) : undefined,
        familyHistory: data.familyHistory !== undefined ? (data.familyHistory?.trim() || null) : undefined,
        previousSurgeries: data.previousSurgeries !== undefined ? (data.previousSurgeries?.trim() || null) : undefined,
        hospitalizations: data.hospitalizations !== undefined ? (data.hospitalizations?.trim() || null) : undefined,
        tobaccoUse: data.tobaccoUse !== undefined ? (data.tobaccoUse?.trim() || null) : undefined,
        alcoholUse: data.alcoholUse !== undefined ? (data.alcoholUse?.trim() || null) : undefined,
        pregnancyStatus: data.pregnancyStatus !== undefined ? data.pregnancyStatus : undefined,
        gestationalWeeks: gestationalWeeks !== undefined ? gestationalWeeks : undefined,
        breastfeeding: data.breastfeeding !== undefined ? data.breastfeeding : undefined,
      },
    });

    // Sincronizar bidireccionalmente el tipo de sangre en Patient
    if (data.bloodType !== undefined) {
      await client.patient.update({
        where: { id: patientId },
        data: { bloodType: data.bloodType?.trim() || null },
      });
    }

    return record;
  }

  /**
   * Registra una consulta externa con estructura SOAP.
   */
  static async createConsultation(
    organizationId: number,
    data: CreateConsultationInput,
    client: any = db
  ) {
    if (!data.reason || data.reason.trim() === "") {
      throw new Error("El motivo de consulta es obligatorio.");
    }

    if (data.status !== undefined && !Object.values(MEDICAL_CONSULTATION_STATUS).includes(data.status as any)) {
      throw new Error("Estado de consulta inválido.");
    }

    const execute = async (tx: any) => {
      const patient = await tx.patient.findFirst({
        where: { id: data.patientId, organizationId },
      });

      if (!patient) {
        throw new Error("Paciente no encontrado en esta organización.");
      }

      const isSigned = data.status === MEDICAL_CONSULTATION_STATUS.SIGNED;
      const now = new Date();

      const consultation = await tx.medicalConsultation.create({
        data: {
          organizationId,
          patientId: data.patientId,
          professionalId: data.professionalId || null,
          date: data.date ? new Date(data.date) : now,
          reason: data.reason.trim(),
          subjective: data.subjective?.trim() || null,
          objective: data.objective?.trim() || null,
          assessment: data.assessment?.trim() || null,
          plan: data.plan?.trim() || null,
          cie10Code: data.cie10Code?.trim() || null,
          cie10Description: data.cie10Description?.trim() || null,
          status: data.status || MEDICAL_CONSULTATION_STATUS.DRAFT,
          signedBy: isSigned ? (data.signedBy?.trim() || "Profesional Médico") : null,
          signedAt: isSigned ? now : null,
        },
      });

      // Si se enviaron signos vitales, los registramos vinculados a la consulta y al paciente
      if (data.vitalSigns) {
        await tx.medicalVitalSigns.create({
          data: {
            organizationId,
            patientId: data.patientId,
            consultationId: consultation.id,
            bloodPressureSystolic: data.vitalSigns.bloodPressureSystolic ?? null,
            bloodPressureDiastolic: data.vitalSigns.bloodPressureDiastolic ?? null,
            heartRate: data.vitalSigns.heartRate ?? null,
            temperatureC: data.vitalSigns.temperatureC ?? null,
            spo2: data.vitalSigns.spo2 ?? null,
            weightKg: data.vitalSigns.weightKg ?? null,
            heightCm: data.vitalSigns.heightCm ?? null,
            measuredAt: data.vitalSigns.measuredAt ? new Date(data.vitalSigns.measuredAt) : now,
          },
        });
      }

      return MedicineService.getConsultationById(organizationId, consultation.id, tx);
    };

    if (client === db && typeof client.$transaction === "function") {
      return await client.$transaction(execute);
    }
    return await execute(client);
  }

  /**
   * Obtiene una consulta por su ID asegurando pertenencia a la organización.
   */
  static async getConsultationById(
    organizationId: number,
    consultationId: number,
    client: any = db
  ) {
    return client.medicalConsultation.findFirst({
      where: {
        id: consultationId,
        organizationId,
      },
      include: {
        patient: true,
        vitalSigns: true,
        prescriptions: {
          include: { items: true },
        },
        followUps: true,
      },
    });
  }

  /**
   * Obtiene la lista de consultas de la organización o de un paciente específico.
   */
  static async getConsultations(
    organizationId: number,
    options?: {
      patientId?: number;
      status?: string;
      skip?: number;
      take?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (options?.patientId) {
      where.patientId = options.patientId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    const [total, consultations] = await Promise.all([
      client.medicalConsultation.count({ where }),
      client.medicalConsultation.findMany({
        where,
        orderBy: { date: "desc" },
        skip: options?.skip || 0,
        take: options?.take || 50,
        include: {
          patient: true,
          vitalSigns: true,
          _count: {
            select: {
              prescriptions: true,
              followUps: true,
            },
          },
        },
      }),
    ]);

    return { total, consultations };
  }

  /**
   * Actualiza una consulta (ej. completar SOAP, firmar consulta).
   */
  static async updateConsultation(
    organizationId: number,
    consultationId: number,
    data: UpdateConsultationInput,
    client: any = db
  ) {
    if (data.status !== undefined && !Object.values(MEDICAL_CONSULTATION_STATUS).includes(data.status as any)) {
      throw new Error("Estado de consulta inválido.");
    }

    const execute = async (tx: any) => {
      const existing = await tx.medicalConsultation.findFirst({
        where: { id: consultationId, organizationId },
      });

      if (!existing) {
        throw new Error("Consulta no encontrada en esta organización.");
      }

      // 1. Estado terminal CANCELLED: no se puede editar ni reabrir
      if (existing.status === MEDICAL_CONSULTATION_STATUS.CANCELLED) {
        throw new Error("No se puede modificar una consulta médica que ha sido cancelada.");
      }

      // 2. Estado SIGNED: registro médico legal e inmutable
      if (existing.status === MEDICAL_CONSULTATION_STATUS.SIGNED) {
        // Bloquear doble firma
        if (data.status === MEDICAL_CONSULTATION_STATUS.SIGNED) {
          throw new Error("Esta consulta ya se encuentra firmada (doble firma no permitida).");
        }

        // Anulación explícita de consulta firmada
        if (data.status === MEDICAL_CONSULTATION_STATUS.CANCELLED) {
          // No permitir alterar campos clínicos al anular
          const modifiesClinical =
            (data.reason !== undefined && data.reason.trim() !== existing.reason) ||
            (data.subjective !== undefined && (data.subjective?.trim() || null) !== existing.subjective) ||
            (data.objective !== undefined && (data.objective?.trim() || null) !== existing.objective) ||
            (data.assessment !== undefined && (data.assessment?.trim() || null) !== existing.assessment) ||
            (data.plan !== undefined && (data.plan?.trim() || null) !== existing.plan) ||
            (data.cie10Code !== undefined && (data.cie10Code?.trim() || null) !== existing.cie10Code) ||
            (data.cie10Description !== undefined && (data.cie10Description?.trim() || null) !== existing.cie10Description) ||
            (data.vitalSigns !== undefined && data.vitalSigns !== null);

          if (modifiesClinical) {
            throw new Error("No se pueden modificar los campos clínicos de una consulta firmada al anularla.");
          }

          await tx.medicalConsultation.update({
            where: { id: consultationId },
            data: { status: MEDICAL_CONSULTATION_STATUS.CANCELLED },
          });

          return MedicineService.getConsultationById(organizationId, consultationId, tx);
        }

        // Cualquier otro intento de modificación sobre consulta firmada está prohibido
        throw new Error("No se puede editar una consulta médica que ya ha sido firmada.");
      }

      // 3. Estado DRAFT: actualización de campos o transición a SIGNED / CANCELLED
      const isSigningNow = data.status === MEDICAL_CONSULTATION_STATUS.SIGNED;
      const now = new Date();

      if (isSigningNow) {
        // Transición atómica a SIGNED condicionada a que siga en estado DRAFT
        const updateResult = await tx.medicalConsultation.updateMany({
          where: {
            id: consultationId,
            organizationId,
            status: MEDICAL_CONSULTATION_STATUS.DRAFT,
          },
          data: {
            reason: data.reason !== undefined ? data.reason.trim() : undefined,
            subjective: data.subjective !== undefined ? (data.subjective?.trim() || null) : undefined,
            objective: data.objective !== undefined ? (data.objective?.trim() || null) : undefined,
            assessment: data.assessment !== undefined ? (data.assessment?.trim() || null) : undefined,
            plan: data.plan !== undefined ? (data.plan?.trim() || null) : undefined,
            cie10Code: data.cie10Code !== undefined ? (data.cie10Code?.trim() || null) : undefined,
            cie10Description: data.cie10Description !== undefined ? (data.cie10Description?.trim() || null) : undefined,
            status: MEDICAL_CONSULTATION_STATUS.SIGNED,
            signedBy: data.signedBy?.trim() || existing.signedBy || "Profesional Médico",
            signedAt: now,
          },
        });

        if (updateResult.count === 0) {
          throw new Error("No se pudo firmar la consulta: ya no se encuentra en estado borrador o ha sido modificada concurrentemente.");
        }
      } else {
        if (data.reason !== undefined && data.reason.trim() === "") {
          throw new Error("El motivo de consulta no puede quedar vacío.");
        }

        await tx.medicalConsultation.update({
          where: { id: consultationId },
          data: {
            reason: data.reason !== undefined ? data.reason.trim() : undefined,
            subjective: data.subjective !== undefined ? (data.subjective?.trim() || null) : undefined,
            objective: data.objective !== undefined ? (data.objective?.trim() || null) : undefined,
            assessment: data.assessment !== undefined ? (data.assessment?.trim() || null) : undefined,
            plan: data.plan !== undefined ? (data.plan?.trim() || null) : undefined,
            cie10Code: data.cie10Code !== undefined ? (data.cie10Code?.trim() || null) : undefined,
            cie10Description: data.cie10Description !== undefined ? (data.cie10Description?.trim() || null) : undefined,
            status: data.status !== undefined ? data.status : undefined,
          },
        });
      }

      // Manejo de signos vitales (solo permitido mientras la consulta está en DRAFT)
      if (data.vitalSigns) {
        const existingVital = await tx.medicalVitalSigns.findFirst({
          where: { consultationId },
        });

        if (existingVital) {
          await tx.medicalVitalSigns.update({
            where: { id: existingVital.id },
            data: {
              bloodPressureSystolic: data.vitalSigns.bloodPressureSystolic !== undefined ? data.vitalSigns.bloodPressureSystolic : existingVital.bloodPressureSystolic,
              bloodPressureDiastolic: data.vitalSigns.bloodPressureDiastolic !== undefined ? data.vitalSigns.bloodPressureDiastolic : existingVital.bloodPressureDiastolic,
              heartRate: data.vitalSigns.heartRate !== undefined ? data.vitalSigns.heartRate : existingVital.heartRate,
              temperatureC: data.vitalSigns.temperatureC !== undefined ? data.vitalSigns.temperatureC : existingVital.temperatureC,
              spo2: data.vitalSigns.spo2 !== undefined ? data.vitalSigns.spo2 : existingVital.spo2,
              weightKg: data.vitalSigns.weightKg !== undefined ? data.vitalSigns.weightKg : existingVital.weightKg,
              heightCm: data.vitalSigns.heightCm !== undefined ? data.vitalSigns.heightCm : existingVital.heightCm,
              measuredAt: data.vitalSigns.measuredAt ? new Date(data.vitalSigns.measuredAt) : existingVital.measuredAt,
            },
          });
        } else {
          await tx.medicalVitalSigns.create({
            data: {
              organizationId,
              patientId: existing.patientId,
              consultationId,
              bloodPressureSystolic: data.vitalSigns.bloodPressureSystolic ?? null,
              bloodPressureDiastolic: data.vitalSigns.bloodPressureDiastolic ?? null,
              heartRate: data.vitalSigns.heartRate ?? null,
              temperatureC: data.vitalSigns.temperatureC ?? null,
              spo2: data.vitalSigns.spo2 ?? null,
              weightKg: data.vitalSigns.weightKg ?? null,
              heightCm: data.vitalSigns.heightCm ?? null,
              measuredAt: data.vitalSigns.measuredAt ? new Date(data.vitalSigns.measuredAt) : now,
            },
          });
        }
      }

      return MedicineService.getConsultationById(organizationId, consultationId, tx);
    };

    if (client === db && typeof client.$transaction === "function") {
      return await client.$transaction(execute);
    }
    return await execute(client);
  }

  /**
   * Crea una receta médica con medicamentos asociados.
   */
  static async createPrescription(
    organizationId: number,
    data: CreatePrescriptionInput,
    client: any = db
  ) {
    if (!data.items || data.items.length === 0) {
      throw new Error("La receta debe incluir al menos un medicamento.");
    }

    const patient = await client.patient.findFirst({
      where: { id: data.patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    if (data.consultationId) {
      const consultation = await client.medicalConsultation.findFirst({
        where: { id: data.consultationId, organizationId },
      });
      if (!consultation) {
        throw new Error("Consulta asociada no encontrada en esta organización.");
      }
    }

    const isSigned = data.status === MEDICAL_PRESCRIPTION_STATUS.SIGNED;
    const now = new Date();

    const prescription = await client.medicalPrescription.create({
      data: {
        organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId || null,
        diagnosis: data.diagnosis?.trim() || null,
        generalInstructions: data.generalInstructions?.trim() || null,
        status: data.status || MEDICAL_PRESCRIPTION_STATUS.DRAFT,
        signedBy: isSigned ? (data.signedBy?.trim() || "Profesional Médico") : null,
        signedAt: isSigned ? now : null,
        items: {
          create: data.items.map((item) => ({
            medicationName: item.medicationName.trim(),
            genericName: item.genericName?.trim() || null,
            concentration: item.concentration?.trim() || null,
            pharmaceuticalForm: item.pharmaceuticalForm?.trim() || null,
            dose: item.dose.trim(),
            frequency: item.frequency.trim(),
            route: item.route?.trim() || "Vía oral",
            duration: item.duration?.trim() || null,
            quantity: item.quantity?.trim() || null,
            instructions: item.instructions?.trim() || null,
          })),
        },
      },
      include: {
        items: true,
        patient: true,
      },
    });

    return prescription;
  }

  /**
   * Obtiene una receta por su ID asegurando pertenencia a la organización.
   */
  static async getPrescriptionById(
    organizationId: number,
    prescriptionId: number,
    client: any = db
  ) {
    return client.medicalPrescription.findFirst({
      where: {
        id: prescriptionId,
        organizationId,
      },
      include: {
        items: true,
        patient: true,
        consultation: true,
      },
    });
  }

  /**
   * Lista recetas de la organización o de un paciente específico.
   */
  static async getPrescriptions(
    organizationId: number,
    options?: {
      patientId?: number;
      status?: string;
      skip?: number;
      take?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (options?.patientId) {
      where.patientId = options.patientId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    const [total, prescriptions] = await Promise.all([
      client.medicalPrescription.count({ where }),
      client.medicalPrescription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: options?.skip || 0,
        take: options?.take || 50,
        include: {
          items: true,
          patient: true,
        },
      }),
    ]);

    return { total, prescriptions };
  }

  /**
   * Actualiza el estado de una receta (SIGNED, CANCELLED).
   */
  static async updatePrescriptionStatus(
    organizationId: number,
    prescriptionId: number,
    status: string,
    signedBy?: string,
    client: any = db
  ) {
    const existing = await client.medicalPrescription.findFirst({
      where: { id: prescriptionId, organizationId },
    });

    if (!existing) {
      throw new Error("Receta no encontrada en esta organización.");
    }

    const now = new Date();
    return client.medicalPrescription.update({
      where: { id: prescriptionId },
      data: {
        status,
        signedBy: status === MEDICAL_PRESCRIPTION_STATUS.SIGNED ? (signedBy?.trim() || existing.signedBy || "Profesional Médico") : undefined,
        signedAt: status === MEDICAL_PRESCRIPTION_STATUS.SIGNED ? now : undefined,
      },
      include: {
        items: true,
      },
    });
  }

  /**
   * Registra una tarea de seguimiento clínico.
   */
  static async createFollowUp(
    organizationId: number,
    data: CreateFollowUpInput,
    client: any = db
  ) {
    if (!data.title || data.title.trim() === "") {
      throw new Error("El título del seguimiento es obligatorio.");
    }

    if (!data.dueDate) {
      throw new Error("La fecha límite del seguimiento es obligatoria.");
    }

    const patient = await client.patient.findFirst({
      where: { id: data.patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      throw new Error("Fecha límite de seguimiento inválida.");
    }

    return client.medicalFollowUp.create({
      data: {
        organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId || null,
        type: data.type || "OTHER",
        title: data.title.trim(),
        description: data.description?.trim() || null,
        dueDate,
        priority: data.priority || "NORMAL",
        status: MEDICAL_FOLLOW_UP_STATUS.PENDING,
      },
      include: {
        patient: true,
      },
    });
  }

  /**
   * Lista seguimientos de la organización.
   */
  static async getFollowUps(
    organizationId: number,
    options?: {
      patientId?: number;
      status?: string;
      skip?: number;
      take?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (options?.patientId) {
      where.patientId = options.patientId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    const [total, followUps] = await Promise.all([
      client.medicalFollowUp.count({ where }),
      client.medicalFollowUp.findMany({
        where,
        orderBy: { dueDate: "asc" },
        skip: options?.skip || 0,
        take: options?.take || 50,
        include: {
          patient: true,
        },
      }),
    ]);

    return { total, followUps };
  }

  /**
   * Actualiza el estado de un seguimiento (PENDING, COMPLETED, CANCELLED).
   */
  static async updateFollowUp(
    organizationId: number,
    followUpId: number,
    data: { status?: string; completedAt?: Date | null },
    client: any = db
  ) {
    const existing = await client.medicalFollowUp.findFirst({
      where: { id: followUpId, organizationId },
    });

    if (!existing) {
      throw new Error("Seguimiento no encontrado en esta organización.");
    }

    const isCompleting = data.status === MEDICAL_FOLLOW_UP_STATUS.COMPLETED;

    return client.medicalFollowUp.update({
      where: { id: followUpId },
      data: {
        status: data.status !== undefined ? data.status : undefined,
        completedAt: isCompleting ? (data.completedAt || new Date()) : (data.status === MEDICAL_FOLLOW_UP_STATUS.PENDING ? null : undefined),
      },
    });
  }

  // -------------------------------------------------------------
  // LABORATORIOS
  // -------------------------------------------------------------

  static async createLaboratoryResult(
    organizationId: number,
    data: CreateLaboratoryResultInput,
    client: any = db
  ) {
    if (!data.testName || data.testName.trim() === "") {
      throw new Error("El nombre del examen de laboratorio es obligatorio.");
    }

    const patient = await client.patient.findFirst({
      where: { id: data.patientId, organizationId },
    });
    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    if (data.consultationId) {
      const consultation = await client.medicalConsultation.findFirst({
        where: { id: data.consultationId, organizationId, patientId: data.patientId },
      });
      if (!consultation) {
        throw new Error("La consulta relacionada no pertenece a este paciente y organización.");
      }
    }

    let finalFileUrl = data.fileUrl || null;
    let finalFileName = data.fileName || null;

    if (data.file && data.file.trim()) {
      try {
        finalFileUrl = await uploadBase64ToCloudinary(
          data.file,
          "medicine/laboratories",
          finalFileName || `Lab_${patient.id}_${Date.now()}`
        );
      } catch (uploadErr: any) {
        console.warn("[MedicineService.createLaboratoryResult] Error subiendo archivo a Cloudinary:", uploadErr.message);
      }
    }

    const resultDate = data.resultDate ? new Date(data.resultDate) : new Date();

    return client.medicalLaboratoryResult.create({
      data: {
        organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId || null,
        testName: data.testName.trim(),
        category: data.category?.trim() || null,
        laboratory: data.laboratory?.trim() || null,
        resultDate,
        status: data.status || "READY",
        notes: data.notes?.trim() || null,
        results: data.results || null,
        fileUrl: finalFileUrl,
        fileName: finalFileName,
      },
    });
  }

  static async getLaboratoryResults(
    organizationId: number,
    options: { patientId?: number; skip?: number; take?: number } = {},
    client: any = db
  ) {
    const where: any = { organizationId };
    if (options.patientId) where.patientId = options.patientId;

    const [total, laboratories] = await Promise.all([
      client.medicalLaboratoryResult.count({ where }),
      client.medicalLaboratoryResult.findMany({
        where,
        orderBy: { resultDate: "desc" },
        skip: options.skip,
        take: options.take,
      }),
    ]);

    return { total, laboratories };
  }

  static async getLaboratoryResultById(
    organizationId: number,
    labId: number,
    client: any = db
  ) {
    return client.medicalLaboratoryResult.findFirst({
      where: { id: labId, organizationId },
      include: { patient: true, consultation: true },
    });
  }

  // -------------------------------------------------------------
  // IMAGENOLOGÍA
  // -------------------------------------------------------------

  static async createImagingStudy(
    organizationId: number,
    data: CreateImagingStudyInput,
    client: any = db
  ) {
    if (!data.studyType || data.studyType.trim() === "") {
      throw new Error("El tipo de estudio de imagenología es obligatorio.");
    }

    const patient = await client.patient.findFirst({
      where: { id: data.patientId, organizationId },
    });
    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    if (data.consultationId) {
      const consultation = await client.medicalConsultation.findFirst({
        where: { id: data.consultationId, organizationId, patientId: data.patientId },
      });
      if (!consultation) {
        throw new Error("La consulta relacionada no pertenece a este paciente y organización.");
      }
    }

    let finalFileUrl = data.fileUrl || null;
    let finalFileName = data.fileName || null;

    if (data.file && data.file.trim()) {
      try {
        finalFileUrl = await uploadBase64ToCloudinary(
          data.file,
          "medicine/imaging",
          finalFileName || `Image_${patient.id}_${Date.now()}`
        );
      } catch (uploadErr: any) {
        console.warn("[MedicineService.createImagingStudy] Error subiendo archivo a Cloudinary:", uploadErr.message);
      }
    }

    const performedAt = data.performedAt ? new Date(data.performedAt) : new Date();

    return client.medicalImagingStudy.create({
      data: {
        organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId || null,
        studyType: data.studyType.trim(),
        bodyPart: data.bodyPart?.trim() || null,
        performedAt,
        status: data.status || "COMPLETED",
        report: data.report?.trim() || null,
        conclusion: data.conclusion?.trim() || null,
        fileUrl: finalFileUrl,
        fileName: finalFileName,
      },
    });
  }

  static async getImagingStudies(
    organizationId: number,
    options: { patientId?: number; skip?: number; take?: number } = {},
    client: any = db
  ) {
    const where: any = { organizationId };
    if (options.patientId) where.patientId = options.patientId;

    const [total, studies] = await Promise.all([
      client.medicalImagingStudy.count({ where }),
      client.medicalImagingStudy.findMany({
        where,
        orderBy: { performedAt: "desc" },
        skip: options.skip,
        take: options.take,
      }),
    ]);

    return { total, studies };
  }

  static async getImagingStudyById(
    organizationId: number,
    studyId: number,
    client: any = db
  ) {
    return client.medicalImagingStudy.findFirst({
      where: { id: studyId, organizationId },
      include: { patient: true, consultation: true },
    });
  }

  // -------------------------------------------------------------
  // PREVENCIÓN
  // -------------------------------------------------------------

  static async createPreventionRecord(
    organizationId: number,
    data: CreatePreventionRecordInput,
    client: any = db
  ) {
    if (!data.title || data.title.trim() === "") {
      throw new Error("El título del registro preventivo es obligatorio.");
    }

    const patient = await client.patient.findFirst({
      where: { id: data.patientId, organizationId },
    });
    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    return client.medicalPreventionRecord.create({
      data: {
        organizationId,
        patientId: data.patientId,
        type: data.type || "OTHER",
        title: data.title.trim(),
        status: data.status || "PENDING",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
        notes: data.notes?.trim() || null,
      },
    });
  }

  static async getPreventionRecords(
    organizationId: number,
    options: { patientId?: number; skip?: number; take?: number } = {},
    client: any = db
  ) {
    const where: any = { organizationId };
    if (options.patientId) where.patientId = options.patientId;

    const [total, records] = await Promise.all([
      client.medicalPreventionRecord.count({ where }),
      client.medicalPreventionRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: options.skip,
        take: options.take,
      }),
    ]);

    return { total, records };
  }

  static async updatePreventionRecord(
    organizationId: number,
    recordId: number,
    data: { status?: string; completedAt?: Date | string | null; notes?: string },
    client: any = db
  ) {
    const existing = await client.medicalPreventionRecord.findFirst({
      where: { id: recordId, organizationId },
    });
    if (!existing) {
      throw new Error("Registro preventivo no encontrado en esta organización.");
    }

    return client.medicalPreventionRecord.update({
      where: { id: recordId },
      data: {
        status: data.status !== undefined ? data.status : undefined,
        completedAt: data.completedAt !== undefined ? (data.completedAt ? new Date(data.completedAt) : null) : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
    });
  }

  // -------------------------------------------------------------
  // DOCUMENTOS CLÍNICOS
  // -------------------------------------------------------------

  static async createDocument(
    organizationId: number,
    data: CreateDocumentInput,
    client: any = db
  ) {
    if (!data.title || data.title.trim() === "") {
      throw new Error("El título del documento es obligatorio.");
    }
    if (!data.fileName || data.fileName.trim() === "") {
      throw new Error("El nombre de archivo es obligatorio.");
    }

    const patient = await client.patient.findFirst({
      where: { id: data.patientId, organizationId },
    });
    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    if (data.consultationId) {
      const consultation = await client.medicalConsultation.findFirst({
        where: { id: data.consultationId, organizationId, patientId: data.patientId },
      });
      if (!consultation) {
        throw new Error("La consulta relacionada no pertenece a este paciente y organización.");
      }
    }

    let finalFileUrl = data.fileUrl || null;
    const finalFileName = data.fileName.trim();

    if (data.file && data.file.trim()) {
      try {
        finalFileUrl = await uploadBase64ToCloudinary(
          data.file,
          "medicine/documents",
          finalFileName.replace(/\.[^/.]+$/, "") + `_${Date.now()}`
        );
      } catch (uploadErr: any) {
        console.warn("[MedicineService.createDocument] Error subiendo archivo a Cloudinary:", uploadErr.message);
      }
    }

    if (!finalFileUrl) {
      throw new Error("Debe proporcionar un archivo PDF o una URL de documento válida.");
    }

    const docDate = data.date ? new Date(data.date) : new Date();

    return client.medicalDocument.create({
      data: {
        organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId || null,
        title: data.title.trim(),
        type: data.type || "OTHER",
        date: docDate,
        author: data.author?.trim() || null,
        fileName: finalFileName,
        fileUrl: finalFileUrl,
        fileSize: data.fileSize || null,
        mimeType: data.mimeType || "application/pdf",
      },
    });
  }

  static async getDocuments(
    organizationId: number,
    options: { patientId?: number; skip?: number; take?: number } = {},
    client: any = db
  ) {
    const where: any = { organizationId };
    if (options.patientId) where.patientId = options.patientId;

    const [total, documents] = await Promise.all([
      client.medicalDocument.count({ where }),
      client.medicalDocument.findMany({
        where,
        orderBy: { date: "desc" },
        skip: options.skip,
        take: options.take,
      }),
    ]);

    return { total, documents };
  }

  static async getDocumentById(
    organizationId: number,
    documentId: number,
    client: any = db
  ) {
    return client.medicalDocument.findFirst({
      where: { id: documentId, organizationId },
      include: { patient: true, consultation: true },
    });
  }

  // -------------------------------------------------------------
  // CITAS MÉDICAS (AGENDA)
  // -------------------------------------------------------------

  static async createAppointment(
    organizationId: number,
    data: CreateAppointmentInput,
    client: any = db
  ) {
    if (!data.patientId) {
      throw new Error("El ID del paciente es requerido");
    }
    if (!data.startTime || !data.reason) {
      throw new Error("La hora de inicio y el motivo son requeridos");
    }

    const patient = await client.patient.findFirst({
      where: { id: data.patientId, organizationId },
    });
    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización");
    }

    let appointmentDate: Date;
    if (data.date) {
      if (typeof data.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        appointmentDate = new Date(`${data.date}T12:00:00.000Z`);
      } else {
        appointmentDate = new Date(data.date);
      }
    } else {
      appointmentDate = new Date();
    }

    return client.medicalAppointment.create({
      data: {
        organizationId,
        patientId: data.patientId,
        professionalId: data.professionalId || null,
        consultationId: data.consultationId || null,
        date: appointmentDate,
        startTime: data.startTime.trim(),
        endTime: data.endTime?.trim() || null,
        reason: data.reason.trim(),
        type: data.type || "FIRST_CONSULTATION",
        status: data.status || "PENDING",
        room: data.room?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            idNumber: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  }

  static async getAppointments(
    organizationId: number,
    options: {
      patientId?: number;
      date?: string | Date;
      startDate?: string | Date;
      endDate?: string | Date;
      status?: string;
      skip?: number;
      take?: number;
    } = {},
    client: any = db
  ) {
    const where: any = { organizationId };
    if (options.patientId) where.patientId = options.patientId;
    if (options.status) where.status = options.status;

    if (options.date) {
      let dateStr: string;
      if (typeof options.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
        dateStr = options.date;
      } else {
        const d = new Date(options.date);
        dateStr = d.toISOString().slice(0, 10);
      }
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
      where.date = {
        gte: dayStart,
        lte: dayEnd,
      };
    } else if (options.startDate || options.endDate) {
      where.date = {};
      if (options.startDate) where.date.gte = new Date(options.startDate);
      if (options.endDate) where.date.lte = new Date(options.endDate);
    }

    const [total, appointments] = await Promise.all([
      client.medicalAppointment.count({ where }),
      client.medicalAppointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              idNumber: true,
              phone: true,
              email: true,
            },
          },
          consultation: {
            select: {
              id: true,
              status: true,
              date: true,
            },
          },
        },
        orderBy: [
          { date: "asc" },
          { startTime: "asc" },
        ],
        skip: options.skip,
        take: options.take,
      }),
    ]);

    return { total, appointments };
  }

  static async getAppointmentById(
    organizationId: number,
    appointmentId: number,
    client: any = db
  ) {
    return client.medicalAppointment.findFirst({
      where: { id: appointmentId, organizationId },
      include: {
        patient: true,
        consultation: true,
      },
    });
  }

  static async updateAppointment(
    organizationId: number,
    appointmentId: number,
    data: UpdateAppointmentInput,
    client: any = db
  ) {
    const existing = await client.medicalAppointment.findFirst({
      where: { id: appointmentId, organizationId },
    });
    if (!existing) {
      throw new Error("Cita médica no encontrada");
    }

    const updateData: any = {};
    if (data.patientId !== undefined) updateData.patientId = data.patientId;
    if (data.professionalId !== undefined) updateData.professionalId = data.professionalId;
    if (data.consultationId !== undefined) updateData.consultationId = data.consultationId;
    if (data.date !== undefined) {
      if (typeof data.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        updateData.date = new Date(`${data.date}T12:00:00.000Z`);
      } else {
        updateData.date = new Date(data.date);
      }
    }
    if (data.startTime !== undefined) updateData.startTime = data.startTime.trim();
    if (data.endTime !== undefined) updateData.endTime = data.endTime ? data.endTime.trim() : null;
    if (data.reason !== undefined) updateData.reason = data.reason.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.room !== undefined) updateData.room = data.room ? data.room.trim() : null;
    if (data.notes !== undefined) updateData.notes = data.notes ? data.notes.trim() : null;

    return client.medicalAppointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            idNumber: true,
            phone: true,
            email: true,
          },
        },
        consultation: {
          select: {
            id: true,
            status: true,
            date: true,
          },
        },
      },
    });
  }
}

