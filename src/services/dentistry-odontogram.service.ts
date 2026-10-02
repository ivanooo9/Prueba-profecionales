import { db } from "../lib/db";

export const VALID_PERMANENT_TEETH = new Set<number>([
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  48, 47, 46, 45, 44, 43, 42, 41,
]);

export const VALID_TOOTH_STATES = new Set<string>([
  "Sano",
  "Caries",
  "Restauracion",
  "Ausente",
  "Tratamiento",
  "Corona",
  "Extraccion_Indicada",
  "Fractura",
]);

export const VALID_SURFACES = [
  "mesial",
  "distal",
  "occlusal",
  "vestibular",
  "lingual",
] as const;

export type ToothSurfaceKey = typeof VALID_SURFACES[number];

export interface SaveToothInput {
  state: string;
  surfaces?: Record<string, boolean>;
  notes?: string | null;
  suggestedTreatment?: string | null;
}

export class DentistryOdontogramService {
  /**
   * Valida estrictamente que el número de pieza corresponda a las 32 piezas permanentes FDI.
   */
  public static validateToothNumber(toothNumber: number): void {
    if (!VALID_PERMANENT_TEETH.has(toothNumber)) {
      throw new Error(
        `Pieza dental #${toothNumber} inválida. Debe ser un número de dentición permanente FDI válido.`
      );
    }
  }

  /**
   * Valida que el estado pertenezca a la lista de estados clínicos soportados.
   */
  public static validateToothState(state: string): void {
    if (!VALID_TOOTH_STATES.has(state)) {
      throw new Error(
        `Estado clínico '${state}' inválido. Valores permitidos: ${Array.from(VALID_TOOTH_STATES).join(", ")}.`
      );
    }
  }

  /**
   * Normaliza y valida el objeto de superficies. Rechaza claves desconocidas y asegura tipos booleanos.
   */
  public static normalizeSurfaces(surfaces?: Record<string, any>): Record<ToothSurfaceKey, boolean> {
    const normalized: Record<ToothSurfaceKey, boolean> = {
      mesial: false,
      distal: false,
      occlusal: false,
      vestibular: false,
      lingual: false,
    };

    if (surfaces && typeof surfaces === "object") {
      for (const surface of VALID_SURFACES) {
        if (typeof surfaces[surface] === "boolean") {
          normalized[surface] = surfaces[surface];
        }
      }
    }

    return normalized;
  }

  /**
   * GET Odontograma del paciente.
   * REGLA ESTRICTA READ-ONLY: Cero efectos secundarios.
   * Si el paciente no tiene DentalRecord o no tiene piezas guardadas, retorna [] sin crear nada en BD.
   */
  public static async getOdontogram(
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

    const snapshots = await client.dentalToothSnapshot.findMany({
      where: {
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
      orderBy: { toothNumber: "asc" },
    });

    return snapshots.map((s: any) => ({
      pieceNumber: s.toothNumber,
      state: s.state,
      surfaces: s.surfaces,
      notes: s.notes || undefined,
      suggestedTreatment: s.suggestedTreatment || undefined,
      updatedAt: s.updatedAt ? s.updatedAt.toISOString().split("T")[0] : undefined,
    }));
  }

  /**
   * PUT Pieza en el odontograma.
   * Realiza un upsert atómico sobre la pieza dental especificada y registra el evento evolutivo inmutable
   * dentro de una única transacción de Prisma si existe un cambio clínico real.
   * Garantiza que Snapshot.organizationId = Event.organizationId = DentalRecord.organizationId = Patient.organizationId.
   */
  public static async saveToothSnapshot(
    organizationId: number,
    patientId: number,
    toothNumber: number,
    data: SaveToothInput,
    client: any = db
  ) {
    this.validateToothNumber(toothNumber);
    this.validateToothState(data.state);
    const normalizedSurfaces = this.normalizeSurfaces(data.surfaces);

    const runInTransaction = async (tx: any) => {
      const patient = await tx.patient.findFirst({
        where: { id: patientId, organizationId },
      });

      if (!patient) {
        throw new Error("Paciente no encontrado en esta organización.");
      }

      // Acción explícita de escritura: Si el paciente aún no tiene DentalRecord, lo crea atómicamente
      let dentalRecord = await tx.dentalRecord.findFirst({
        where: { organizationId, patientId },
      });

      if (!dentalRecord) {
        dentalRecord = await tx.dentalRecord.create({
          data: {
            organizationId,
            patientId,
          },
        });
      }

      // Obtener snapshot actual para comparar cambios clínicos
      const existingSnapshot = await tx.dentalToothSnapshot.findUnique({
        where: {
          dentalRecordId_toothNumber: {
            dentalRecordId: dentalRecord.id,
            toothNumber,
          },
        },
      });

      // Superficies previas: si no existía snapshot, todas se consideran false
      const prevSurfaces: Record<ToothSurfaceKey, boolean> = existingSnapshot?.surfaces
        ? this.normalizeSurfaces(existingSnapshot.surfaces as any)
        : { mesial: false, distal: false, occlusal: false, vestibular: false, lingual: false };

      const prevState = existingSnapshot ? existingSnapshot.state : "Sano";
      const prevNotes = existingSnapshot?.notes?.trim() || null;
      const prevTreatment = existingSnapshot?.suggestedTreatment?.trim() || null;

      const newNotes = data.notes !== undefined ? (data.notes?.trim() || null) : prevNotes;
      const newTreatment =
        data.suggestedTreatment !== undefined
          ? data.suggestedTreatment?.trim() || null
          : prevTreatment;

      // Detección de cambio clínico real para evitar eventos redundantes
      const stateChanged = prevState !== data.state;
      const surfacesChanged = VALID_SURFACES.some(
        (surf) => Boolean(prevSurfaces[surf]) !== Boolean(normalizedSurfaces[surf])
      );
      const notesChanged = prevNotes !== newNotes;
      const treatmentChanged = prevTreatment !== newTreatment;

      const hasClinicalChange = stateChanged || surfacesChanged || notesChanged || treatmentChanged;

      // Crear DentalToothEvent inmutable únicamente si existe cambio clínico
      if (hasClinicalChange) {
        await tx.dentalToothEvent.create({
          data: {
            organizationId,
            dentalRecordId: dentalRecord.id,
            toothNumber,
            eventType: "STATE_CHANGE",
            previousState: existingSnapshot ? existingSnapshot.state : "Sano",
            newState: data.state,
            previousSurfaces: prevSurfaces,
            newSurfaces: normalizedSurfaces,
            notes: newNotes,
          },
        });
      }

      // Upsert seguro sobre la clave compuesta dentalRecordId_toothNumber
      const snapshot = await tx.dentalToothSnapshot.upsert({
        where: {
          dentalRecordId_toothNumber: {
            dentalRecordId: dentalRecord.id,
            toothNumber,
          },
        },
        create: {
          organizationId,
          dentalRecordId: dentalRecord.id,
          toothNumber,
          state: data.state,
          surfaces: normalizedSurfaces,
          notes: newNotes,
          suggestedTreatment: newTreatment,
        },
        update: {
          state: data.state,
          surfaces: normalizedSurfaces,
          notes: newNotes,
          suggestedTreatment: newTreatment,
        },
      });

      return {
        pieceNumber: snapshot.toothNumber,
        state: snapshot.state,
        surfaces: snapshot.surfaces,
        notes: snapshot.notes || undefined,
        suggestedTreatment: snapshot.suggestedTreatment || undefined,
        updatedAt: snapshot.updatedAt ? snapshot.updatedAt.toISOString().split("T")[0] : undefined,
        eventCreated: hasClinicalChange,
      };
    };

    if (client.$transaction) {
      return await client.$transaction(runInTransaction);
    } else {
      return await runInTransaction(client);
    }
  }

  /**
   * GET Historial inmutable de eventos de una pieza dental específica.
   * Orden cronológico explícito (createdAt DESC).
   * Estrictamente READ ONLY: Cero efectos secundarios.
   */
  public static async getToothHistory(
    organizationId: number,
    patientId: number,
    toothNumber: number,
    client: any = db
  ) {
    this.validateToothNumber(toothNumber);

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

    const events = await client.dentalToothEvent.findMany({
      where: {
        organizationId,
        dentalRecordId: dentalRecord.id,
        toothNumber,
      },
      orderBy: { createdAt: "desc" },
    });

    return events.map((e: any) => ({
      id: e.id,
      toothNumber: e.toothNumber,
      eventType: e.eventType,
      previousState: e.previousState,
      newState: e.newState,
      previousSurfaces: e.previousSurfaces,
      newSurfaces: e.newSurfaces,
      notes: e.notes || undefined,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  /**
   * GET Historial inmutable completo del odontograma de un paciente.
   * Orden cronológico explícito (createdAt DESC).
   * Estrictamente READ ONLY: Cero efectos secundarios.
   */
  public static async getOdontogramHistory(
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

    const events = await client.dentalToothEvent.findMany({
      where: {
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
      orderBy: { createdAt: "desc" },
    });

    return events.map((e: any) => ({
      id: e.id,
      toothNumber: e.toothNumber,
      eventType: e.eventType,
      previousState: e.previousState,
      newState: e.newState,
      previousSurfaces: e.previousSurfaces,
      newSurfaces: e.newSurfaces,
      notes: e.notes || undefined,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}

