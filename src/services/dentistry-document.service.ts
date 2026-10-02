import { db } from "../lib/db";

export const CANONICAL_DOCUMENT_TYPES = [
  "RADIOGRAPHY",
  "PHOTOGRAPHY",
  "CONSENT",
  "REPORT",
  "BUDGET_ATTACHMENT",
  "OTHER",
] as const;

export type CanonicalDocumentType = (typeof CANONICAL_DOCUMENT_TYPES)[number];

const DOCUMENT_TYPE_MAP: Record<string, CanonicalDocumentType> = {
  radiografia: "RADIOGRAPHY",
  radiografía: "RADIOGRAPHY",
  radiography: "RADIOGRAPHY",
  fotografia: "PHOTOGRAPHY",
  fotografía: "PHOTOGRAPHY",
  photography: "PHOTOGRAPHY",
  consentimiento: "CONSENT",
  consent: "CONSENT",
  informe: "REPORT",
  report: "REPORT",
  presupuesto: "BUDGET_ATTACHMENT",
  budget: "BUDGET_ATTACHMENT",
  budget_attachment: "BUDGET_ATTACHMENT",
  otro: "OTHER",
  other: "OTHER",
};

export function normalizeDocumentType(type?: string | null): CanonicalDocumentType {
  if (!type) return "OTHER";
  const lower = type.trim().toLowerCase();
  return DOCUMENT_TYPE_MAP[lower] || "OTHER";
}

export interface CreateDentalDocumentInput {
  title: string;
  type?: string | null;
  date?: string | Date | null;
  description?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  fileSize?: number | string | null;
  mimeType?: string | null;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  executionId?: number | null;
}

export class DentistryDocumentService {
  /**
   * Registra una ficha documental odontológica (radiografía, consentimiento, foto, informe).
   */
  public static async createDocument(
    organizationId: number,
    patientId: number,
    data: CreateDentalDocumentInput,
    userId?: number,
    client: any = db
  ) {
    if (!data.title || !data.title.trim()) {
      throw new Error("El título del documento es requerido.");
    }

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

    // 3. Validaciones de vínculos clínicos opcionales
    if (data.treatmentPlanId) {
      const plan = await client.dentalTreatmentPlan.findFirst({
        where: {
          id: data.treatmentPlanId,
          organizationId,
          dentalRecordId: dentalRecord.id,
        },
      });
      if (!plan) {
        throw new Error("El plan de tratamiento no pertenece al expediente.");
      }
    }

    if (data.treatmentItemId) {
      const item = await client.dentalTreatmentItem.findFirst({
        where: {
          id: data.treatmentItemId,
          organizationId,
        },
      });
      if (!item) {
        throw new Error("El ítem de tratamiento no existe.");
      }
    }

    if (data.executionId) {
      const exec = await client.dentalTreatmentExecution.findFirst({
        where: {
          id: data.executionId,
          organizationId,
          dentalRecordId: dentalRecord.id,
        },
      });
      if (!exec) {
        throw new Error("La ejecución clínica no pertenece al expediente.");
      }
    }

    const normType = normalizeDocumentType(data.type);
    const sanitizedTitle = data.title.trim();
    const docDate = data.date ? new Date(data.date) : new Date();
    if (isNaN(docDate.getTime())) {
      throw new Error("La fecha del documento es inválida.");
    }

    const fileName = data.fileName?.trim() || `${sanitizedTitle.replace(/\s+/g, "_")}.pdf`;
    const fileUrl = data.fileUrl?.trim() || `/documents/dental/${organizationId}/${patientId}/${Date.now()}_${encodeURIComponent(fileName)}`;

    let fileSizeNumber: number | null = null;
    if (typeof data.fileSize === "number") {
      fileSizeNumber = data.fileSize;
    } else if (typeof data.fileSize === "string") {
      const parsed = parseInt(data.fileSize.replace(/[^\d]/g, ""), 10);
      fileSizeNumber = isNaN(parsed) ? null : parsed;
    }

    return client.dentalDocument.create({
      data: {
        organizationId,
        dentalRecordId: dentalRecord.id,
        patientId,
        treatmentPlanId: data.treatmentPlanId || null,
        treatmentItemId: data.treatmentItemId || null,
        executionId: data.executionId || null,
        title: sanitizedTitle,
        type: normType,
        date: docDate,
        description: data.description?.trim() || null,
        fileName,
        fileUrl,
        fileSize: fileSizeNumber,
        mimeType: data.mimeType?.trim() || "application/pdf",
        uploadedByUserId: userId || null,
      },
      include: {
        patient: {
          select: { id: true, name: true, idNumber: true },
        },
        treatmentPlan: {
          select: { id: true, title: true },
        },
        treatmentItem: {
          select: { id: true, procedureName: true, toothNumber: true },
        },
      },
    });
  }

  /**
   * Obtiene la lista de documentos de un paciente o de toda la organización odontológica.
   * REGLA ESTRICTA READ-ONLY: Idempotente y sin efectos secundarios.
   */
  public static async getDocuments(
    organizationId: number,
    options?: {
      patientId?: number;
      type?: string;
      skip?: number;
      take?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (options?.patientId) {
      where.patientId = options.patientId;
    }

    if (options?.type) {
      where.type = normalizeDocumentType(options.type);
    }

    return client.dentalDocument.findMany({
      where,
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
      skip: options?.skip || 0,
      take: options?.take || 100,
      include: {
        patient: {
          select: { id: true, name: true, idNumber: true },
        },
        treatmentPlan: {
          select: { id: true, title: true },
        },
        treatmentItem: {
          select: { id: true, procedureName: true, toothNumber: true },
        },
        uploadedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Obtiene el detalle de un documento específico verificando tenant.
   */
  public static async getDocumentById(
    organizationId: number,
    documentId: number,
    client: any = db
  ) {
    const doc = await client.dentalDocument.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
      include: {
        patient: true,
        treatmentPlan: true,
        treatmentItem: true,
        execution: true,
        uploadedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!doc) {
      throw new Error("Documento odontológico no encontrado en esta organización.");
    }

    return doc;
  }

  /**
   * Elimina una ficha documental asegurando pertenencia a la organización.
   */
  public static async deleteDocument(
    organizationId: number,
    documentId: number,
    client: any = db
  ) {
    const existing = await client.dentalDocument.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!existing) {
      throw new Error("Documento no encontrado o no pertenece a la organización.");
    }

    await client.dentalDocument.delete({
      where: { id: documentId },
    });

    return { success: true, message: "Documento eliminado correctamente." };
  }
}
