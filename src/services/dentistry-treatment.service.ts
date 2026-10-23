import { db } from "../lib/db";
import { DentistryOdontogramService } from "./dentistry-odontogram.service";

export interface CreateProcedureInput {
  code?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  defaultPrice?: number | null;
}

export interface UpdateProcedureInput {
  code?: string | null;
  name?: string;
  description?: string | null;
  category?: string | null;
  defaultPrice?: number | null;
  isActive?: boolean;
}

export interface CreatePlanInput {
  title?: string | null;
  status?: string;
  notes?: string | null;
}

export interface UpdatePlanInput {
  title?: string | null;
  status?: string;
  notes?: string | null;
}

export interface AddItemInput {
  procedureId?: number | null;
  toothNumber?: number | null;
  procedureName?: string;
  unitPrice?: number;
  status?: string;
  notes?: string | null;
}

export interface UpdateItemInput {
  toothNumber?: number | null;
  procedureName?: string;
  unitPrice?: number;
  status?: string;
  notes?: string | null;
}

export interface StandardProcedureSeed {
  code: string;
  name: string;
  category: string;
  description: string;
  defaultPrice: number;
}

export const ECUADOR_STANDARD_DENTAL_PROCEDURES: StandardProcedureSeed[] = [
  // 1. Preventiva y Diagnóstico
  {
    code: 'PREV-01',
    name: 'Consulta Odontológica y Diagnóstico',
    category: 'Preventiva',
    description: 'Examen clínico integral, odontograma y plan de tratamiento',
    defaultPrice: 20.00,
  },
  {
    code: 'PREV-02',
    name: 'Profilaxis Dental y Destartraje',
    category: 'Preventiva',
    description: 'Limpieza ultrasónica supragingival y pulido coronario con pasta profiláctica',
    defaultPrice: 35.00,
  },
  {
    code: 'PREV-03',
    name: 'Aplicación Tópica de Flúor Barniz',
    category: 'Preventiva',
    description: 'Terapia preventiva remineralizante de esmalte de alta concentración',
    defaultPrice: 20.00,
  },
  {
    code: 'PREV-04',
    name: 'Sellante de Fosas y Fisuras (por pieza)',
    category: 'Preventiva',
    description: 'Sellado preventivo con resina fluida fotopolimerizable por pieza',
    defaultPrice: 15.00,
  },
  {
    code: 'PREV-05',
    name: 'Profilaxis Infantil y Adaptación',
    category: 'Preventiva',
    description: 'Limpieza dental pediátrica, profilaxis y técnica de cepillado',
    defaultPrice: 25.00,
  },

  // 2. Operatoria Dental y Restauraciones
  {
    code: 'OPER-01',
    name: 'Resina Compuesta Simple (1 Superficie)',
    category: 'Operatoria',
    description: 'Restauración estética con resina nanoparticulada (oclusal o vestibular)',
    defaultPrice: 35.00,
  },
  {
    code: 'OPER-02',
    name: 'Resina Compuesta Compuesta (2 Superficies)',
    category: 'Operatoria',
    description: 'Restauración estética interproximal (OM u OD) con matriz seccional',
    defaultPrice: 50.00,
  },
  {
    code: 'OPER-03',
    name: 'Resina Compleja / Reconstrucción (3+ Caras)',
    category: 'Operatoria',
    description: 'Reconstrucción cavitaria amplia (MOD) con aislamiento absoluto',
    defaultPrice: 70.00,
  },
  {
    code: 'OPER-04',
    name: 'Reconstrucción de Ángulo Incisal Anterior',
    category: 'Operatoria',
    description: 'Restauración estética de alta exigencia en sector anterior (clase IV)',
    defaultPrice: 85.00,
  },
  {
    code: 'OPER-05',
    name: 'Incrustación Dental de Resina / Onlay',
    category: 'Operatoria',
    description: 'Restauración indirecta de resina de laboratorio para molar o premolar',
    defaultPrice: 110.00,
  },
  {
    code: 'OPER-06',
    name: 'Incrustación Cerámica / Disilicato',
    category: 'Operatoria',
    description: 'Restauración indirecta libre de metal de alta resistencia estética',
    defaultPrice: 150.00,
  },

  // 3. Endodoncia
  {
    code: 'ENDO-01',
    name: 'Endodoncia Unirradicular',
    category: 'Endodoncia',
    description: 'Biopulpectomía u obturación radicular en incisivos o caninos',
    defaultPrice: 135.00,
  },
  {
    code: 'ENDO-02',
    name: 'Endodoncia Birradicular',
    category: 'Endodoncia',
    description: 'Tratamiento de conducto en piezas con dos raíces (premolares)',
    defaultPrice: 165.00,
  },
  {
    code: 'ENDO-03',
    name: 'Endodoncia Multirradicular (Molar)',
    category: 'Endodoncia',
    description: 'Instrumentación rotatoria y obturación tridimensional de molares',
    defaultPrice: 220.00,
  },
  {
    code: 'ENDO-04',
    name: 'Retratamiento Endodóntico (por conducto)',
    category: 'Endodoncia',
    description: 'Desobturación, desinfección y nueva obturación de conductos',
    defaultPrice: 180.00,
  },
  {
    code: 'ENDO-05',
    name: 'Pulpotomía / Terapia Pulpar Vital',
    category: 'Endodoncia',
    description: 'Eliminación de pulpa coronal y medicación biológica en piezas temporales o jóvenes',
    defaultPrice: 60.00,
  },

  // 4. Cirugía Oral y Exodoncias
  {
    code: 'CIRU-01',
    name: 'Exodoncia Simple Erupcionada',
    category: 'Cirugía',
    description: 'Extracción dental no compleja bajo anestesia local',
    defaultPrice: 25.00,
  },
  {
    code: 'CIRU-02',
    name: 'Exodoncia Quirúrgica / Restos Radiculares',
    category: 'Cirugía',
    description: 'Extracción con odontosección u ostectomía y sutura',
    defaultPrice: 50.00,
  },
  {
    code: 'CIRU-03',
    name: 'Cirugía de Tercer Molar Semi-Incluido',
    category: 'Cirugía',
    description: 'Extracción quirúrgica de muela del juicio con colgajo y sutura',
    defaultPrice: 90.00,
  },
  {
    code: 'CIRU-04',
    name: 'Cirugía de Tercer Molar Incluido',
    category: 'Cirugía',
    description: 'Odontotomía y ostectomía para retención ósea total',
    defaultPrice: 130.00,
  },
  {
    code: 'CIRU-05',
    name: 'Drenaje de Absceso Odontogénico',
    category: 'Cirugía',
    description: 'Descompresión, drenaje quirúrgico y lavado antiséptico',
    defaultPrice: 45.00,
  },
  {
    code: 'CIRU-06',
    name: 'Frenectomía Labial o Lingual',
    category: 'Cirugía',
    description: 'Corrección quirúrgica de frenillo anormal para ortodoncia o fonación',
    defaultPrice: 75.00,
  },

  // 5. Periodoncia
  {
    code: 'PERI-01',
    name: 'Detartraje Subgingival (por cuadrante)',
    category: 'Periodoncia',
    description: 'Eliminación de cálculo subgingival e irrigación antimicrobiana',
    defaultPrice: 45.00,
  },
  {
    code: 'PERI-02',
    name: 'Raspado y Alisado Radicular (Cuadrante)',
    category: 'Periodoncia',
    description: 'Terapia periodontal no quirúrgica con curetas Gracey por cuadrante',
    defaultPrice: 55.00,
  },
  {
    code: 'PERI-03',
    name: 'Gingivectomía / Alargamiento Coronario',
    category: 'Periodoncia',
    description: 'Remodelado de encía o margen gingival estético por pieza',
    defaultPrice: 40.00,
  },
  {
    code: 'PERI-04',
    name: 'Fisioterapia y Control de Placa',
    category: 'Periodoncia',
    description: 'Índice de placa O\'Leary y adiestramiento en higiene interdental',
    defaultPrice: 20.00,
  },

  // 6. Prótesis Fija y Removible
  {
    code: 'PROT-01',
    name: 'Corona Metal-Porcelana',
    category: 'Prótesis',
    description: 'Corona individual fija con estructura de aleación y recubrimiento cerámico',
    defaultPrice: 170.00,
  },
  {
    code: 'PROT-02',
    name: 'Corona Libre de Metal (Zirconio / E-max)',
    category: 'Prótesis',
    description: 'Corona estética de alta resistencia biocompatible sin base metálica',
    defaultPrice: 280.00,
  },
  {
    code: 'PROT-03',
    name: 'Perno de Fibra de Vidrio y Muñón',
    category: 'Prótesis',
    description: 'Anclaje intrarradicular de fibra y reconstrucción de muñón',
    defaultPrice: 50.00,
  },
  {
    code: 'PROT-04',
    name: 'Prótesis Total Acrílica (Superior o Inferior)',
    category: 'Prótesis',
    description: 'Dentadura mucosoportada completa de acrílico termocurado por arcada',
    defaultPrice: 260.00,
  },
  {
    code: 'PROT-05',
    name: 'Prótesis Parcial Removible Metálica',
    category: 'Prótesis',
    description: 'Prótesis esquelética cromo-cobalto con retenedores colados',
    defaultPrice: 290.00,
  },
  {
    code: 'PROT-06',
    name: 'Placa Miorrelajante / Férula Bruxismo',
    category: 'Prótesis',
    description: 'Férula rígida de acetato o acrílico termocurado ajustada en oclusión',
    defaultPrice: 85.00,
  },
  {
    code: 'PROT-07',
    name: 'Reparación o Rebase de Prótesis',
    category: 'Prótesis',
    description: 'Reajuste de base protésica o unión de fractura acrílica',
    defaultPrice: 45.00,
  },

  // 7. Estética Dental
  {
    code: 'ESTE-01',
    name: 'Blanqueamiento Dental en Consultorio',
    category: 'Estética',
    description: 'Aclaramiento dental con peróxido de hidrógeno y activación lumínica',
    defaultPrice: 130.00,
  },
  {
    code: 'ESTE-02',
    name: 'Blanqueamiento Dental Casero',
    category: 'Estética',
    description: 'Kit ambulatorio con férulas termoformadas personalizadas y gel peróxido',
    defaultPrice: 90.00,
  },
  {
    code: 'ESTE-03',
    name: 'Carilla de Resina de Alta Estética',
    category: 'Estética',
    description: 'Estratificación directa policromática con micropartículas por diente',
    defaultPrice: 95.00,
  },
  {
    code: 'ESTE-04',
    name: 'Carilla de Porcelana / Disilicato',
    category: 'Estética',
    description: 'Lámina ultrafina de cerámica adherida a esmalte vestibular',
    defaultPrice: 240.00,
  },

  // 8. Ortodoncia
  {
    code: 'ORTO-01',
    name: 'Instalación de Brackets Metálicos (por arcada)',
    category: 'Ortodoncia',
    description: 'Cementado directo de aparatología fija metálica prescripción Roth/MBT',
    defaultPrice: 180.00,
  },
  {
    code: 'ORTO-02',
    name: 'Instalación de Brackets Cerámicos (por arcada)',
    category: 'Ortodoncia',
    description: 'Cementado de brackets estéticos de zirconio o zafiro monocristalino',
    defaultPrice: 280.00,
  },
  {
    code: 'ORTO-03',
    name: 'Control Mensual de Ortodoncia',
    category: 'Ortodoncia',
    description: 'Activación mensual, recambio de arcos, ligaduras y elásticos',
    defaultPrice: 35.00,
  },
  {
    code: 'ORTO-04',
    name: 'Retenedor de Ortodoncia (Hawley o Essix)',
    category: 'Ortodoncia',
    description: 'Aparato de contención post-tratamiento por arcada',
    defaultPrice: 60.00,
  },
];

export class DentistryTreatmentService {
  // -------------------------------------------------------------
  // CATÁLOGO DE PROCEDIMIENTOS (DentalProcedure)
  // -------------------------------------------------------------

  public static async seedDefaultProcedures(
    organizationId: number,
    client: any = db
  ) {
    const existing = await client.dentalProcedure.findMany({
      where: { organizationId },
      select: { code: true, name: true },
    });

    const existingCodes = new Set(
      existing.map((e: any) => e.code?.trim().toUpperCase()).filter(Boolean)
    );
    const existingNames = new Set(
      existing.map((e: any) => e.name.trim().toLowerCase())
    );

    const toInsert = ECUADOR_STANDARD_DENTAL_PROCEDURES.filter((seed) => {
      const codeMatches = seed.code && existingCodes.has(seed.code.toUpperCase());
      const nameMatches = existingNames.has(seed.name.trim().toLowerCase());
      return !codeMatches && !nameMatches;
    });

    if (toInsert.length > 0) {
      await client.dentalProcedure.createMany({
        data: toInsert.map((item) => ({
          organizationId,
          code: item.code,
          name: item.name,
          category: item.category,
          description: item.description,
          defaultPrice: item.defaultPrice,
          isActive: true,
        })),
      });
    }

    const totalCount = await client.dentalProcedure.count({
      where: { organizationId },
    });

    return {
      createdCount: toInsert.length,
      skippedCount: ECUADOR_STANDARD_DENTAL_PROCEDURES.length - toInsert.length,
      totalCount,
    };
  }

  public static async getProcedures(
    organizationId: number,
    activeOnly = true,
    client: any = db
  ) {
    const where: any = { organizationId };
    if (activeOnly) {
      where.isActive = true;
    }

    const procedures = await client.dentalProcedure.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return procedures.map((p: any) => ({
      id: p.id,
      organizationId: p.organizationId,
      code: p.code || undefined,
      name: p.name,
      description: p.description || undefined,
      category: p.category || undefined,
      defaultPrice: p.defaultPrice !== null ? p.defaultPrice : undefined,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  public static async createProcedure(
    organizationId: number,
    data: CreateProcedureInput,
    client: any = db
  ) {
    if (!data.name || !data.name.trim()) {
      throw new Error("El nombre del procedimiento es obligatorio.");
    }

    const price =
      typeof data.defaultPrice === "number" && !isNaN(data.defaultPrice)
        ? Math.max(0, data.defaultPrice)
        : null;

    const procedure = await client.dentalProcedure.create({
      data: {
        organizationId,
        code: data.code?.trim() || null,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category?.trim() || null,
        defaultPrice: price,
        isActive: true,
      },
    });

    return {
      id: procedure.id,
      organizationId: procedure.organizationId,
      code: procedure.code || undefined,
      name: procedure.name,
      description: procedure.description || undefined,
      category: procedure.category || undefined,
      defaultPrice: procedure.defaultPrice !== null ? procedure.defaultPrice : undefined,
      isActive: procedure.isActive,
      createdAt: procedure.createdAt.toISOString(),
      updatedAt: procedure.updatedAt.toISOString(),
    };
  }

  public static async updateProcedure(
    organizationId: number,
    procedureId: number,
    data: UpdateProcedureInput,
    client: any = db
  ) {
    const existing = await client.dentalProcedure.findFirst({
      where: { id: procedureId, organizationId },
    });

    if (!existing) {
      throw new Error("Procedimiento no encontrado en esta organización.");
    }

    const updateData: any = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error("El nombre del procedimiento no puede estar vacío.");
      }
      updateData.name = data.name.trim();
    }
    if (data.code !== undefined) updateData.code = data.code?.trim() || null;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.category !== undefined) updateData.category = data.category?.trim() || null;
    if (data.defaultPrice !== undefined) {
      updateData.defaultPrice =
        typeof data.defaultPrice === "number" && !isNaN(data.defaultPrice)
          ? Math.max(0, data.defaultPrice)
          : null;
    }
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    const updated = await client.dentalProcedure.update({
      where: { id: procedureId },
      data: updateData,
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      code: updated.code || undefined,
      name: updated.name,
      description: updated.description || undefined,
      category: updated.category || undefined,
      defaultPrice: updated.defaultPrice !== null ? updated.defaultPrice : undefined,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // -------------------------------------------------------------
  // PLANES DE TRATAMIENTO (DentalTreatmentPlan)
  // -------------------------------------------------------------

  /**
   * Obtiene todos los planes de tratamiento de la organización con soporte de paginación y búsqueda.
   */
  public static async getAllTreatmentPlans(
    organizationId: number,
    options?: {
      status?: string;
      patientId?: number;
      search?: string;
      page?: number;
      limit?: number;
      skip?: number;
      take?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.patientId) {
      where.dentalRecord = { patientId: options.patientId };
    }

    if (options?.search && options.search.trim() !== "") {
      const term = options.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { dentalRecord: { patient: { name: { contains: term, mode: "insensitive" } } } },
        { dentalRecord: { patient: { idNumber: { contains: term, mode: "insensitive" } } } },
      ];
    }

    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit =
      options?.limit && options.limit > 0
        ? Math.min(options.limit, 100)
        : options?.take
        ? Math.min(options.take, 100)
        : 50;
    const skip = options?.skip !== undefined ? options.skip : (page - 1) * limit;

    const [total, plans] = await Promise.all([
      client.dentalTreatmentPlan.count({ where }),
      client.dentalTreatmentPlan.findMany({
        where,
        include: {
          dentalRecord: {
            include: {
              patient: true,
            },
          },
          items: {
            include: {
              executions: {
                orderBy: { performedAt: "desc" },
                include: {
                  performedByUser: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const mappedPlans = plans.map((p: any) => {
      const totalAmount = Math.round(
        p.items.reduce(
          (sum: number, it: any) => sum + (typeof it.unitPrice === "number" ? it.unitPrice : 0),
          0
        ) * 100
      ) / 100;
      return {
        id: p.id,
        organizationId: p.organizationId,
        dentalRecordId: p.dentalRecordId,
        patientId: p.dentalRecord?.patientId,
        patientName: p.dentalRecord?.patient?.name || "Paciente",
        title: p.title || "Plan de Tratamiento",
        status: p.status,
        notes: p.notes || undefined,
        totalAmount,
        totalEstimated: totalAmount,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        items: p.items.map((it: any) => {
          const unitPrice = typeof it.unitPrice === "number" ? it.unitPrice : 0;
          return {
            id: it.id,
            treatmentPlanId: it.treatmentPlanId,
            procedureId: it.procedureId || undefined,
            toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
            procedureName: it.procedureName,
            quantity: 1,
            unitPrice,
            discount: 0,
            totalPrice: unitPrice,
            status: it.status,
            notes: it.notes || undefined,
            executionsCount: it.executions?.length || 0,
            latestExecution: it.executions?.[0]
              ? {
                  id: it.executions[0].id,
                  performedAt: it.executions[0].performedAt.toISOString(),
                  performedByName: it.executions[0].performedByUser?.name,
                }
              : undefined,
            createdAt: it.createdAt.toISOString(),
            updatedAt: it.updatedAt.toISOString(),
          };
        }),
      };
    });

    return {
      plans: mappedPlans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public static async getTreatmentPlans(
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

    const plans = await client.dentalTreatmentPlan.findMany({
      where: {
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
      include: {
        items: {
          include: {
            executions: {
              orderBy: { performedAt: "desc" },
              include: {
                performedByUser: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return plans.map((p: any) => {
      const totalAmount = Math.round(
        p.items.reduce(
          (sum: number, it: any) => sum + (typeof it.unitPrice === "number" ? it.unitPrice : 0),
          0
        ) * 100
      ) / 100;
      return {
        id: p.id,
        organizationId: p.organizationId,
        dentalRecordId: p.dentalRecordId,
        title: p.title || "Plan de Tratamiento",
        status: p.status,
        notes: p.notes || undefined,
        totalAmount,
        totalEstimated: totalAmount,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        items: p.items.map((it: any) => {
          const unitPrice = typeof it.unitPrice === "number" ? it.unitPrice : 0;
          return {
            id: it.id,
            treatmentPlanId: it.treatmentPlanId,
            procedureId: it.procedureId || undefined,
            toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
            procedureName: it.procedureName,
            quantity: 1,
            unitPrice,
            discount: 0,
            totalPrice: unitPrice,
            status: it.status,
            notes: it.notes || undefined,
            createdAt: it.createdAt.toISOString(),
            updatedAt: it.updatedAt.toISOString(),
            executions: (it.executions || []).map((ex: any) => ({
              id: ex.id,
              treatmentPlanId: ex.treatmentPlanId,
              treatmentItemId: ex.treatmentItemId,
              toothNumber: ex.toothNumber !== null ? ex.toothNumber : undefined,
              procedureName: ex.procedureName,
              clinicalNotes: ex.clinicalNotes || undefined,
              performedAt: ex.performedAt.toISOString(),
              performedByUserId: ex.performedByUserId || undefined,
              performedByUser: ex.performedByUser || undefined,
              createdAt: ex.createdAt.toISOString(),
            })),
          };
        }),
      };
    });
  }

  public static async getTreatmentPlanById(
    organizationId: number,
    patientId: number,
    planId: number,
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
      include: {
        items: {
          include: {
            executions: {
              orderBy: { performedAt: "desc" },
              include: {
                performedByUser: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!plan) {
      throw new Error("Plan de tratamiento no encontrado.");
    }

    const totalAmount = plan.items.reduce(
      (sum: number, it: any) => sum + (Number(it.unitPrice) || 0),
      0
    );

    return {
      id: plan.id,
      organizationId: plan.organizationId,
      dentalRecordId: plan.dentalRecordId,
      title: plan.title || "Plan de Tratamiento",
      status: plan.status,
      notes: plan.notes || undefined,
      totalAmount,
      totalEstimated: totalAmount,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      items: plan.items.map((it: any) => ({
        id: it.id,
        treatmentPlanId: it.treatmentPlanId,
        procedureId: it.procedureId || undefined,
        toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
        procedureName: it.procedureName,
        unitPrice: Number(it.unitPrice),
        quantity: 1,
        discount: 0,
        totalPrice: Number(it.unitPrice),
        status: it.status,
        notes: it.notes || undefined,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
        executions: (it.executions || []).map((ex: any) => ({
          id: ex.id,
          treatmentPlanId: ex.treatmentPlanId,
          treatmentItemId: ex.treatmentItemId,
          toothNumber: ex.toothNumber !== null ? ex.toothNumber : undefined,
          procedureName: ex.procedureName,
          clinicalNotes: ex.clinicalNotes || undefined,
          performedAt: ex.performedAt.toISOString(),
          performedByUserId: ex.performedByUserId || undefined,
          performedByUser: ex.performedByUser || undefined,
          createdAt: ex.createdAt.toISOString(),
        })),
      })),
    };
  }

  public static async createTreatmentPlan(
    organizationId: number,
    patientId: number,
    data: CreatePlanInput,
    client: any = db
  ) {
    const patient = await client.patient.findFirst({
      where: { id: patientId, organizationId },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en esta organización.");
    }

    // Acción explícita de escritura: Si el paciente aún no tiene DentalRecord, lo crea atómicamente
    let dentalRecord = await client.dentalRecord.findFirst({
      where: { organizationId, patientId },
    });

    if (!dentalRecord) {
      dentalRecord = await client.dentalRecord.create({
        data: {
          organizationId,
          patientId,
        },
      });
    }

    const validStatuses = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
    const status = data.status && validStatuses.includes(data.status) ? data.status : "DRAFT";

    const plan = await client.dentalTreatmentPlan.create({
      data: {
        organizationId,
        dentalRecordId: dentalRecord.id,
        title: data.title?.trim() || "Plan de Tratamiento",
        status,
        notes: data.notes?.trim() || null,
      },
      include: {
        items: true,
      },
    });

    return {
      id: plan.id,
      organizationId: plan.organizationId,
      dentalRecordId: plan.dentalRecordId,
      title: plan.title,
      status: plan.status,
      notes: plan.notes || undefined,
      totalAmount: 0,
      totalEstimated: 0,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      items: [],
    };
  }

  public static async updateTreatmentPlan(
    organizationId: number,
    patientId: number,
    planId: number,
    data: UpdatePlanInput,
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

    const existingPlan = await client.dentalTreatmentPlan.findFirst({
      where: {
        id: planId,
        organizationId,
        dentalRecordId: dentalRecord.id,
      },
    });

    if (!existingPlan) {
      throw new Error("Plan de tratamiento no encontrado.");
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title?.trim() || "Plan de Tratamiento";
    if (data.status !== undefined) {
      const validStatuses = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
      if (!validStatuses.includes(data.status)) {
        throw new Error(
          `Estado de plan inválido. Valores permitidos: ${validStatuses.join(", ")}.`
        );
      }
      updateData.status = data.status;
    }
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    const updated = await client.dentalTreatmentPlan.update({
      where: { id: planId },
      data: updateData,
      include: {
        items: { orderBy: { createdAt: "asc" } },
      },
    });

    const totalAmount = updated.items.reduce(
      (sum: number, it: any) => sum + (Number(it.unitPrice) || 0),
      0
    );

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      dentalRecordId: updated.dentalRecordId,
      title: updated.title,
      status: updated.status,
      notes: updated.notes || undefined,
      totalAmount,
      totalEstimated: totalAmount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      items: updated.items.map((it: any) => ({
        id: it.id,
        treatmentPlanId: it.treatmentPlanId,
        procedureId: it.procedureId || undefined,
        toothNumber: it.toothNumber !== null ? it.toothNumber : undefined,
        procedureName: it.procedureName,
        unitPrice: Number(it.unitPrice),
        quantity: 1,
        discount: 0,
        totalPrice: Number(it.unitPrice),
        status: it.status,
        notes: it.notes || undefined,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
      })),
    };
  }

  // -------------------------------------------------------------
  // ITEMS DEL PLAN DE TRATAMIENTO (DentalTreatmentItem)
  // -------------------------------------------------------------

  public static async addTreatmentItem(
    organizationId: number,
    patientId: number,
    planId: number,
    data: AddItemInput,
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

    // Validación FDI: si toothNumber está presente, debe ser un diente FDI válido
    let toothNumber: number | null = null;
    if (data.toothNumber !== undefined && data.toothNumber !== null) {
      toothNumber = parseInt(String(data.toothNumber), 10);
      if (isNaN(toothNumber)) {
        throw new Error("Número de pieza dental inválido.");
      }
      DentistryOdontogramService.validateToothNumber(toothNumber);
    }

    let procedureName = data.procedureName?.trim() || "";
    let unitPrice =
      typeof data.unitPrice === "number" && !isNaN(data.unitPrice)
        ? Math.max(0, data.unitPrice)
        : 0;

    let procedureId: number | null = null;
    if (data.procedureId !== undefined && data.procedureId !== null) {
      procedureId = parseInt(String(data.procedureId), 10);
      if (!isNaN(procedureId)) {
        const proc = await client.dentalProcedure.findFirst({
          where: { id: procedureId, organizationId },
        });
        if (!proc) {
          throw new Error("El procedimiento seleccionado no pertenece a esta organización.");
        }
        if (!procedureName) {
          procedureName = proc.name;
        }
        if (data.unitPrice === undefined && proc.defaultPrice !== null) {
          unitPrice = proc.defaultPrice;
        }
      }
    }

    if (!procedureName) {
      throw new Error("Debe indicar el nombre del procedimiento o seleccionar uno del catálogo.");
    }

    const validItemStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    const status =
      data.status && validItemStatuses.includes(data.status) ? data.status : "PLANNED";

    // Crear el item con snapshot del nombre y precio
    const item = await client.dentalTreatmentItem.create({
      data: {
        organizationId,
        treatmentPlanId: plan.id,
        procedureId,
        toothNumber,
        procedureName,
        unitPrice,
        status,
        notes: data.notes?.trim() || null,
      },
    });

    return {
      id: item.id,
      treatmentPlanId: item.treatmentPlanId,
      procedureId: item.procedureId || undefined,
      toothNumber: item.toothNumber !== null ? item.toothNumber : undefined,
      procedureName: item.procedureName,
      unitPrice: Number(item.unitPrice),
      quantity: 1,
      discount: 0,
      totalPrice: Number(item.unitPrice),
      status: item.status,
      notes: item.notes || undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  public static async updateTreatmentItem(
    organizationId: number,
    patientId: number,
    planId: number,
    itemId: number,
    data: UpdateItemInput,
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

    const existingItem = await client.dentalTreatmentItem.findFirst({
      where: {
        id: itemId,
        treatmentPlanId: plan.id,
        organizationId,
      },
    });

    if (!existingItem) {
      throw new Error("Item de tratamiento no encontrado en este plan.");
    }

    const updateData: any = {};
    if (data.toothNumber !== undefined) {
      if (data.toothNumber === null) {
        updateData.toothNumber = null;
      } else {
        const tn = parseInt(String(data.toothNumber), 10);
        if (isNaN(tn)) {
          throw new Error("Número de pieza dental inválido.");
        }
        DentistryOdontogramService.validateToothNumber(tn);
        updateData.toothNumber = tn;
      }
    }

    if (data.procedureName !== undefined) {
      if (!data.procedureName.trim()) {
        throw new Error("El nombre del procedimiento no puede estar vacío.");
      }
      updateData.procedureName = data.procedureName.trim();
    }

    if (data.unitPrice !== undefined) {
      if (typeof data.unitPrice !== "number" || isNaN(data.unitPrice) || data.unitPrice < 0) {
        throw new Error("El precio unitario debe ser un número positivo.");
      }
      updateData.unitPrice = data.unitPrice;
    }

    if (data.status !== undefined) {
      const validItemStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
      if (!validItemStatuses.includes(data.status)) {
        throw new Error(
          `Estado de item inválido. Valores permitidos: ${validItemStatuses.join(", ")}.`
        );
      }
      updateData.status = data.status;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    const updated = await client.dentalTreatmentItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return {
      id: updated.id,
      treatmentPlanId: updated.treatmentPlanId,
      procedureId: updated.procedureId || undefined,
      toothNumber: updated.toothNumber !== null ? updated.toothNumber : undefined,
      procedureName: updated.procedureName,
      unitPrice: Number(updated.unitPrice),
      quantity: 1,
      discount: 0,
      totalPrice: Number(updated.unitPrice),
      status: updated.status,
      notes: updated.notes || undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  public static async deleteTreatmentItem(
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

    const existingItem = await client.dentalTreatmentItem.findFirst({
      where: {
        id: itemId,
        treatmentPlanId: plan.id,
        organizationId,
      },
    });

    if (!existingItem) {
      throw new Error("Item de tratamiento no encontrado en este plan.");
    }

    const executionCount = await client.dentalTreatmentExecution.count({
      where: { treatmentItemId: itemId },
    });

    if (executionCount > 0) {
      throw new Error(
        "No se puede eliminar un procedimiento que cuenta con ejecuciones clínicas registradas. Si no continuará, márquelo como CANCELADO."
      );
    }

    await client.dentalTreatmentItem.delete({
      where: { id: itemId },
    });

    return { success: true, message: "Item eliminado del plan exitosamente." };
  }
}
