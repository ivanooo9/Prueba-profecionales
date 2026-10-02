import { db } from "../lib/db";

export interface EmergencyContactInput {
  name?: string;
  phone?: string;
  relationship?: string;
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
  anamnesis?: any | null;
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
  anamnesis?: any | null;
}

export class PatientService {
  /**
   * Obtiene la lista de pacientes de la organización.
   * Multi-tenancy estricto: filtra siempre por organizationId.
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
              appointments: true,
            },
          },
        },
      }),
    ]);

    return { total, patients };
  }

  /**
   * Obtiene un paciente por su ID asegurando pertenencia a la organización.
   */
  static async getPatientById(
    organizationId: number,
    patientId: number,
    client: any = db
  ) {
    return client.patient.findFirst({
      where: {
        id: patientId,
        organizationId,
      },
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
            appointments: true,
          },
        },
      },
    });
  }

  /**
   * Crea un nuevo paciente en la organización.
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

    const patient = await client.patient.create({
      data: {
        organizationId,
        name: data.name.trim(),
        idNumber: data.idNumber?.trim() || null,
        birthDate: birthDate && !isNaN(birthDate.getTime()) ? birthDate : null,
        gender: data.gender || "UNSPECIFIED",
        bloodType: data.bloodType?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        emergencyContact: (data.emergencyContact as any) || undefined,
        status: data.status || "CONTROLADO",
      },
    });

    return this.getPatientById(organizationId, patient.id, client);
  }

  /**
   * Actualiza los datos demográficos y de contacto de un paciente existente.
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
          NOT: { id: patientId },
        },
      });

      if (existing) {
        throw new Error(
          `Ya existe otro paciente con la identificación '${data.idNumber.trim()}' en esta organización.`
        );
      }
    }

    const birthDate = data.birthDate ? new Date(data.birthDate) : undefined;

    await client.patient.update({
      where: { id: patientId },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        idNumber: data.idNumber !== undefined ? (data.idNumber ? data.idNumber.trim() : null) : undefined,
        birthDate: birthDate !== undefined ? (birthDate && !isNaN(birthDate.getTime()) ? birthDate : null) : undefined,
        gender: data.gender !== undefined ? data.gender : undefined,
        bloodType: data.bloodType !== undefined ? (data.bloodType ? data.bloodType.trim() : null) : undefined,
        phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
        email: data.email !== undefined ? (data.email ? data.email.trim() : null) : undefined,
        address: data.address !== undefined ? (data.address ? data.address.trim() : null) : undefined,
        emergencyContact: data.emergencyContact !== undefined ? ((data.emergencyContact as any) || null) : undefined,
        status: data.status !== undefined ? data.status : undefined,
      },
    });

    return this.getPatientById(organizationId, patientId, client);
  }
}
