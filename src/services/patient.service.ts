import { db } from "../lib/db";
import { validarCedulaEcuador, validarPasaporte, validarDocumentoIdentidad } from "../lib/ecuador-validators";

export interface EmergencyContactInput {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface CreatePatientInput {
  name: string;
  idNumber?: string | null;
  idType?: "CEDULA" | "PASAPORTE" | string | null;
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
  idType?: "CEDULA" | "PASAPORTE" | string | null;
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

    let normalizedIdNumber: string | null = null;

    if (data.idNumber && data.idNumber.trim() !== "") {
      const cleanId = data.idNumber.trim();
      const validation = validarDocumentoIdentidad(data.idType, cleanId);
      if (!validation.isValid) {
        throw new Error(validation.error || "Documento de identificación inválido.");
      }
      normalizedIdNumber = validation.normalized || cleanId;

      const existing = await client.patient.findFirst({
        where: {
          organizationId,
          idNumber: normalizedIdNumber,
        },
      });

      if (existing) {
        throw new Error(
          `Ya existe un paciente registrado con la identificación '${normalizedIdNumber}' en esta organización.`
        );
      }
    }

    const birthDate = data.birthDate ? new Date(data.birthDate) : null;

    const patient = await client.patient.create({
      data: {
        organizationId,
        name: data.name.trim(),
        idNumber: normalizedIdNumber,
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

    let normalizedIdNumber: string | null = patient.idNumber;

    if (data.idNumber !== undefined) {
      if (data.idNumber === null || data.idNumber.trim() === "") {
        normalizedIdNumber = null;
      } else {
        const cleanId = data.idNumber.trim();
        const isChanging = cleanId !== patient.idNumber;
        if (isChanging || data.idType) {
          const validation = validarDocumentoIdentidad(data.idType, cleanId);
          if (!validation.isValid) {
            throw new Error(validation.error || "Documento de identificación inválido.");
          }
          normalizedIdNumber = validation.normalized || cleanId;
        } else {
          normalizedIdNumber = cleanId;
        }

        if (normalizedIdNumber && normalizedIdNumber !== patient.idNumber) {
          const existing = await client.patient.findFirst({
            where: {
              organizationId,
              idNumber: normalizedIdNumber,
              NOT: { id: patientId },
            },
          });

          if (existing) {
            throw new Error(
              `Ya existe otro paciente con la identificación '${normalizedIdNumber}' en esta organización.`
            );
          }
        }
      }
    }

    const birthDate = data.birthDate ? new Date(data.birthDate) : undefined;

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.idNumber !== undefined) updateData.idNumber = normalizedIdNumber;
    if (birthDate !== undefined) updateData.birthDate = birthDate && !isNaN(birthDate.getTime()) ? birthDate : null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.bloodType !== undefined) updateData.bloodType = data.bloodType ? data.bloodType.trim() : null;
    if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;
    if (data.email !== undefined) updateData.email = data.email ? data.email.trim() : null;
    if (data.address !== undefined) updateData.address = data.address ? data.address.trim() : null;
    if (data.emergencyContact !== undefined) updateData.emergencyContact = (data.emergencyContact as any) || null;
    if (data.status !== undefined) updateData.status = data.status;

    await client.patient.update({
      where: { id: patientId },
      data: updateData,
    });



    return this.getPatientById(organizationId, patientId, client);
  }
}
