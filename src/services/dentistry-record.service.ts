import { db } from "../lib/db";

export interface DentalRecordInput {
  dentalBackground?: string | null;
  chiefComplaint?: string | null;
  evaluationNotes?: string | null;
  diagnosisSummary?: string | null;
}

export class DentistryRecordService {
  /**
   * Obtiene el expediente dental del paciente sin efectos secundarios.
   * Si no existe un DentalRecord previo, retorna null sin crearlo.
   */
  static async getDentalRecord(
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

    return client.dentalRecord.findUnique({
      where: { patientId },
    });
  }

  /**
   * Crea o actualiza el expediente odontológico del paciente.
   * Multi-tenancy estricto: valida pertenencia del paciente antes de upsert.
   */
  static async upsertDentalRecord(
    organizationId: number,
    patientId: number,
    data: DentalRecordInput,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    return client.dentalRecord.upsert({
      where: { patientId },
      create: {
        organizationId,
        patientId,
        dentalBackground: data.dentalBackground?.trim() || null,
        chiefComplaint: data.chiefComplaint?.trim() || null,
        evaluationNotes: data.evaluationNotes?.trim() || null,
        diagnosisSummary: data.diagnosisSummary?.trim() || null,
      },
      update: {
        dentalBackground:
          data.dentalBackground !== undefined
            ? data.dentalBackground?.trim() || null
            : undefined,
        chiefComplaint:
          data.chiefComplaint !== undefined
            ? data.chiefComplaint?.trim() || null
            : undefined,
        evaluationNotes:
          data.evaluationNotes !== undefined
            ? data.evaluationNotes?.trim() || null
            : undefined,
        diagnosisSummary:
          data.diagnosisSummary !== undefined
            ? data.diagnosisSummary?.trim() || null
            : undefined,
      },
    });
  }
}
