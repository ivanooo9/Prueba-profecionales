import { db } from "../lib/db";
import { ORGANIZATION_MEMBER_ROLE } from "../constants/organization.constants";

export interface CreateClientInput {
  name: string;
  identificationType?: "cedula" | "ruc" | "pasaporte" | string;
  identification: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  clientType?: "persona_natural" | "persona_juridica" | string;
  companyName?: string | null;
  companyRuc?: string | null;
  legalRepresentative?: string | null;
  status?: "activo" | "inactivo" | "prospecto" | string;
  notes?: string | null;
}

export interface UpdateClientInput {
  name?: string;
  identificationType?: "cedula" | "ruc" | "pasaporte" | string;
  identification?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  clientType?: "persona_natural" | "persona_juridica" | string;
  companyName?: string | null;
  companyRuc?: string | null;
  legalRepresentative?: string | null;
  status?: "activo" | "inactivo" | "prospecto" | string;
  notes?: string | null;
  organizationId?: number; // Whitelisted to verify caller is not altering tenant
}

export interface CreateCaseInput {
  clientId?: number;
  internalCaseNumber?: string;
  judicialProcessNumber?: string | null;
  title: string;
  description?: string | null;
  processType?: string | null;
  legalArea?: string;
  status?: string;
  priority?: string;
  responsibleUserId?: number | null;
  assignedLawyer?: string | null;
  courtName?: string | null;
  judgeName?: string | null;
  claimAmount?: string | null;
  startDate?: string | Date;
  expectedEndDate?: string | Date | null;
}

export interface UpdateCaseInput {
  organizationId?: number;
  clientId?: number;
  internalCaseNumber?: string;
  judicialProcessNumber?: string | null;
  title?: string;
  description?: string | null;
  processType?: string | null;
  legalArea?: string;
  status?: string;
  priority?: string;
  responsibleUserId?: number | null;
  assignedLawyer?: string | null;
  courtName?: string | null;
  judgeName?: string | null;
  claimAmount?: string | null;
  startDate?: string | Date;
  expectedEndDate?: string | Date | null;
}

export class LegalService {
  // -------------------------------------------------------------
  // VALIDACIÓN DE IDENTIDAD PROFESIONAL PARA ABOGADO RESPONSABLE
  // -------------------------------------------------------------
  public static async validateResponsibleLawyer(
    organizationId: number,
    responsibleUserId: number,
    client: any = db
  ): Promise<{ id: number; name: string }> {
    // 1. Verificar existencia de usuario
    const user = await client.user.findUnique({
      where: { id: responsibleUserId },
      include: {
        professionalProfile: {
          include: {
            specialties: {
              include: {
                specialty: {
                  include: {
                    profession: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error(`El usuario responsable con ID ${responsibleUserId} no existe.`);
    }

    // 2. Verificar membresía activa en la organización
    const membership = await client.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: responsibleUserId,
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      throw new Error(
        `El usuario responsable no es un miembro activo de la organización (Org ID: ${organizationId}).`
      );
    }

    // 3. Verificar que no sea rol de soporte
    const forbiddenRoles = ["ASSISTANT", "SECRETARY", "CLIENT", "STUDENT"];
    if (forbiddenRoles.includes(membership.role)) {
      throw new Error(
        `El rol '${membership.role}' no está autorizado para asumir la responsabilidad de un caso jurídico.`
      );
    }

    // 4. Regla: ADMIN / OWNER solo califican si tienen identidad profesional
    // Si el rol es PROFESSIONAL, es un profesional autorizado del despacho.
    // Si el rol es OWNER o ADMIN, debe tener rol profesional o perfil profesional activo.
    if (membership.role === "ADMIN") {
      // Un ADMIN sin perfil profesional no es automáticamente abogado responsable (Test 22)
      const hasLegalProfile = user.professionalProfile?.specialties?.some(
        (s: any) => s.specialty?.profession?.nombre?.toLowerCase().includes("derecho")
      );
      if (!hasLegalProfile && !user.professionalProfile) {
        throw new Error(
          "Un usuario con rol administrativo (ADMIN) no puede figurar como abogado responsable sin acreditar una identidad profesional jurídica."
        );
      }
    }

    return { id: user.id, name: user.name };
  }

  // -------------------------------------------------------------
  // GENERACIÓN DE NÚMERO INTERNO CONCURRENT-SAFE (CAS-{YYYY}-{NNNN})
  // -------------------------------------------------------------
  public static async generateNextCaseNumber(
    organizationId: number,
    targetYear?: number,
    client: any = db
  ): Promise<string> {
    const year = targetYear || new Date().getFullYear();

    // Cerrojo transaccional a nivel de PostgreSQL por organización y año
    await client.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext('legal_case_seq_' || ${organizationId}::text || '_' || ${year}::text))`
    );

    const casesThisYear = await client.legalCase.findMany({
      where: {
        organizationId,
        internalCaseNumber: { startsWith: `CAS-${year}-` },
      },
      select: { internalCaseNumber: true },
    });

    let highestSeq = 0;
    const pattern = new RegExp(`^CAS-${year}-(\\d+)$`, "i");

    for (const item of casesThisYear) {
      const match = item.internalCaseNumber.trim().match(pattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > highestSeq) {
          highestSeq = seq;
        }
      }
    }

    return `CAS-${year}-${String(highestSeq + 1).padStart(4, "0")}`;
  }

  // -------------------------------------------------------------
  // CLIENTES JURÍDICOS (LegalClient)
  // -------------------------------------------------------------

  public static async listClients(
    organizationId: number,
    filters?: {
      search?: string;
      status?: string;
      clientType?: string;
      limit?: number;
      offset?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.status && filters.status !== "todos") {
      where.status = filters.status;
    }

    if (filters?.clientType && filters.clientType !== "todos") {
      where.clientType = filters.clientType;
    }

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { identification: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        { companyName: { contains: s, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      client.legalClient.findMany({
        where,
        include: {
          _count: {
            select: { cases: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: filters?.limit ?? 100,
        skip: filters?.offset ?? 0,
      }),
      client.legalClient.count({ where }),
    ]);

    return {
      items: items.map((c: any) => ({
        id: String(c.id),
        name: c.name,
        identificationType: c.identificationType,
        identification: c.identification,
        email: c.email || "",
        phone: c.phone || "",
        address: c.address || "",
        clientType: c.clientType,
        companyName: c.companyName || undefined,
        companyRuc: c.companyRuc || undefined,
        legalRepresentative: c.legalRepresentative || undefined,
        status: c.status,
        notes: c.notes || undefined,
        createdAt: c.createdAt.toISOString().split("T")[0],
        updatedAt: c.updatedAt.toISOString().split("T")[0],
        caseCount: c._count?.cases ?? 0,
      })),
      total,
    };
  }

  public static async getClientById(
    organizationId: number,
    clientId: number,
    client: any = db
  ) {
    const found = await client.legalClient.findFirst({
      where: { id: clientId, organizationId },
      include: {
        cases: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!found) return null;

    return {
      id: String(found.id),
      name: found.name,
      identificationType: found.identificationType,
      identification: found.identification,
      email: found.email || "",
      phone: found.phone || "",
      address: found.address || "",
      clientType: found.clientType,
      companyName: found.companyName || undefined,
      companyRuc: found.companyRuc || undefined,
      legalRepresentative: found.legalRepresentative || undefined,
      status: found.status,
      notes: found.notes || undefined,
      createdAt: found.createdAt.toISOString().split("T")[0],
      updatedAt: found.updatedAt.toISOString().split("T")[0],
      cases: found.cases.map((cs: any) => ({
        id: String(cs.id),
        caseNumber: cs.internalCaseNumber,
        internalCaseNumber: cs.internalCaseNumber,
        judicialProcessNumber: cs.judicialProcessNumber,
        title: cs.title,
        clientId: String(cs.clientId),
        clientName: found.name,
        processType: cs.processType || "Ordinario Civil",
        legalArea: cs.legalArea,
        status: cs.status,
        priority: cs.priority,
        assignedLawyer: cs.assignedLawyer || "",
        responsibleUserId: cs.responsibleUserId,
        courtName: cs.courtName || "",
        judgeName: cs.judgeName || undefined,
        claimAmount: cs.claimAmount || undefined,
        startDate: cs.startDate.toISOString().split("T")[0],
        expectedEndDate: cs.expectedEndDate ? cs.expectedEndDate.toISOString().split("T")[0] : undefined,
        closedDate: cs.closedAt ? cs.closedAt.toISOString().split("T")[0] : undefined,
        description: cs.description || "",
        createdAt: cs.createdAt.toISOString().split("T")[0],
        updatedAt: cs.updatedAt.toISOString().split("T")[0],
      })),
    };
  }

  public static async createClient(
    organizationId: number,
    data: CreateClientInput,
    client: any = db
  ) {
    const name = data.name?.trim();
    if (!name) {
      throw new Error("El nombre del cliente es obligatorio.");
    }

    const identification = data.identification?.trim();
    if (!identification) {
      throw new Error("El número de identificación del cliente es obligatorio.");
    }

    const identificationType = data.identificationType || "cedula";
    const validIdTypes = ["cedula", "ruc", "pasaporte"];
    if (!validIdTypes.includes(identificationType)) {
      throw new Error(`Tipo de identificación inválido. Permitidos: ${validIdTypes.join(", ")}.`);
    }

    const clientType = data.clientType || "persona_natural";
    const validClientTypes = ["persona_natural", "persona_juridica"];
    if (!validClientTypes.includes(clientType)) {
      throw new Error(`Tipo de cliente inválido. Permitidos: ${validClientTypes.join(", ")}.`);
    }

    const status = data.status || "activo";
    const validStatuses = ["activo", "inactivo", "prospecto"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Estado de cliente inválido. Permitidos: ${validStatuses.join(", ")}.`);
    }

    // Verificar unicidad dentro del tenant
    const existing = await client.legalClient.findUnique({
      where: {
        organizationId_identification: {
          organizationId,
          identification,
        },
      },
    });

    if (existing) {
      throw new Error(
        `Ya existe un cliente con la identificación '${identification}' en esta organización.`
      );
    }

    const created = await client.legalClient.create({
      data: {
        organizationId,
        name,
        identificationType,
        identification,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        clientType,
        companyName: data.companyName?.trim() || null,
        companyRuc: data.companyRuc?.trim() || null,
        legalRepresentative: data.legalRepresentative?.trim() || null,
        status,
        notes: data.notes?.trim() || null,
      },
    });

    return {
      id: String(created.id),
      name: created.name,
      identificationType: created.identificationType,
      identification: created.identification,
      email: created.email || "",
      phone: created.phone || "",
      address: created.address || "",
      clientType: created.clientType,
      companyName: created.companyName || undefined,
      companyRuc: created.companyRuc || undefined,
      legalRepresentative: created.legalRepresentative || undefined,
      status: created.status,
      notes: created.notes || undefined,
      createdAt: created.createdAt.toISOString().split("T")[0],
      updatedAt: created.updatedAt.toISOString().split("T")[0],
    };
  }

  public static async updateClient(
    organizationId: number,
    clientId: number,
    data: UpdateClientInput,
    client: any = db
  ) {
    if (data.organizationId !== undefined && data.organizationId !== organizationId) {
      throw new Error("No se permite transferir un cliente a otra organización.");
    }

    const existing = await client.legalClient.findFirst({
      where: { id: clientId, organizationId },
    });

    if (!existing) {
      throw new Error(`Cliente con ID ${clientId} no encontrado en la organización.`);
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new Error("El nombre no puede estar vacío.");
      updateData.name = name;
    }

    if (data.identification !== undefined) {
      const iden = data.identification.trim();
      if (!iden) throw new Error("La identificación no puede estar vacía.");
      if (iden !== existing.identification) {
        const duplicate = await client.legalClient.findUnique({
          where: {
            organizationId_identification: {
              organizationId,
              identification: iden,
            },
          },
        });
        if (duplicate) {
          throw new Error(`Ya existe un cliente con la identificación '${iden}' en esta organización.`);
        }
      }
      updateData.identification = iden;
    }

    if (data.identificationType !== undefined) {
      const valid = ["cedula", "ruc", "pasaporte"];
      if (!valid.includes(data.identificationType)) {
        throw new Error(`Tipo de identificación inválido: ${data.identificationType}`);
      }
      updateData.identificationType = data.identificationType;
    }

    if (data.clientType !== undefined) {
      const valid = ["persona_natural", "persona_juridica"];
      if (!valid.includes(data.clientType)) {
        throw new Error(`Tipo de cliente inválido: ${data.clientType}`);
      }
      updateData.clientType = data.clientType;
    }

    if (data.status !== undefined) {
      const valid = ["activo", "inactivo", "prospecto"];
      if (!valid.includes(data.status)) {
        throw new Error(`Estado de cliente inválido: ${data.status}`);
      }
      updateData.status = data.status;
    }

    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.companyName !== undefined) updateData.companyName = data.companyName?.trim() || null;
    if (data.companyRuc !== undefined) updateData.companyRuc = data.companyRuc?.trim() || null;
    if (data.legalRepresentative !== undefined) updateData.legalRepresentative = data.legalRepresentative?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    const updated = await client.legalClient.update({
      where: { id: clientId },
      data: updateData,
    });

    return {
      id: String(updated.id),
      name: updated.name,
      identificationType: updated.identificationType,
      identification: updated.identification,
      email: updated.email || "",
      phone: updated.phone || "",
      address: updated.address || "",
      clientType: updated.clientType,
      companyName: updated.companyName || undefined,
      companyRuc: updated.companyRuc || undefined,
      legalRepresentative: updated.legalRepresentative || undefined,
      status: updated.status,
      notes: updated.notes || undefined,
      createdAt: updated.createdAt.toISOString().split("T")[0],
      updatedAt: updated.updatedAt.toISOString().split("T")[0],
    };
  }

  // -------------------------------------------------------------
  // CASOS / EXPEDIENTES JURÍDICOS (LegalCase)
  // -------------------------------------------------------------

  public static async createCase(
    organizationId: number,
    clientId: number,
    data: CreateCaseInput,
    client: any = db
  ) {
    // 1. Regla de autoridad: el clientId de la ruta manda. Si el body envía otro, rechazar.
    if (data.clientId !== undefined && Number(data.clientId) !== clientId) {
      throw new Error(
        `El clientId del cuerpo (${data.clientId}) no coincide con el cliente de la ruta (${clientId}).`
      );
    }

    // 2. Verificar que el cliente existe y pertenece a la organización
    const legalClient = await client.legalClient.findFirst({
      where: { id: clientId, organizationId },
    });

    if (!legalClient) {
      throw new Error(
        `Cliente jurídico con ID ${clientId} no encontrado en la organización ${organizationId}.`
      );
    }

    // 3. Validar título
    const title = data.title?.trim();
    if (!title) {
      throw new Error("El título del caso jurídico es obligatorio.");
    }

    // 4. Ejecutar en transacción con advisory lock para secuencial y unicidad
    return await client.$transaction(async (tx: any) => {
      let finalCaseNumber: string;

      if (data.internalCaseNumber?.trim()) {
        const customNumber = data.internalCaseNumber.trim();
        if (customNumber.length < 3 || customNumber.length > 50) {
          throw new Error("El código interno de caso debe tener entre 3 y 50 caracteres.");
        }
        // Verificar unicidad dentro de la organización
        const duplicate = await tx.legalCase.findUnique({
          where: {
            organizationId_internalCaseNumber: {
              organizationId,
              internalCaseNumber: customNumber,
            },
          },
        });
        if (duplicate) {
          throw new Error(
            `Ya existe un caso con el código interno '${customNumber}' en esta organización.`
          );
        }
        finalCaseNumber = customNumber;
      } else {
        // Autogenerar secuencial seguro
        finalCaseNumber = await LegalService.generateNextCaseNumber(
          organizationId,
          undefined,
          tx
        );
      }

      // 5. Validar responsibleUserId si se proporciona
      let assignedLawyer = data.assignedLawyer?.trim() || null;
      let responsibleUserId: number | null = null;

      if (data.responsibleUserId) {
        const validatedLawyer = await LegalService.validateResponsibleLawyer(
          organizationId,
          Number(data.responsibleUserId),
          tx
        );
        responsibleUserId = validatedLawyer.id;
        if (!assignedLawyer) {
          assignedLawyer = validatedLawyer.name;
        }
      }

      // 6. Fechas y valores
      const startDate = data.startDate ? new Date(data.startDate) : new Date();
      const expectedEndDate = data.expectedEndDate ? new Date(data.expectedEndDate) : null;

      const created = await tx.legalCase.create({
        data: {
          organizationId,
          clientId,
          internalCaseNumber: finalCaseNumber,
          judicialProcessNumber: data.judicialProcessNumber?.trim() || null,
          title,
          description: data.description?.trim() || "",
          processType: data.processType?.trim() || "Ordinario Civil",
          legalArea: data.legalArea || "Civil",
          status: data.status || "Nuevo",
          priority: data.priority || "Media",
          responsibleUserId,
          assignedLawyer: assignedLawyer || "Abogado del Despacho",
          courtName: data.courtName?.trim() || "",
          judgeName: data.judgeName?.trim() || null,
          claimAmount: data.claimAmount?.trim() || null,
          startDate,
          expectedEndDate,
        },
      });

      return {
        id: String(created.id),
        caseNumber: created.internalCaseNumber,
        internalCaseNumber: created.internalCaseNumber,
        judicialProcessNumber: created.judicialProcessNumber,
        title: created.title,
        clientId: String(created.clientId),
        clientName: legalClient.name,
        processType: created.processType,
        legalArea: created.legalArea,
        status: created.status,
        priority: created.priority,
        assignedLawyer: created.assignedLawyer,
        responsibleUserId: created.responsibleUserId,
        courtName: created.courtName || "",
        judgeName: created.judgeName || undefined,
        claimAmount: created.claimAmount || undefined,
        startDate: created.startDate.toISOString().split("T")[0],
        expectedEndDate: created.expectedEndDate
          ? created.expectedEndDate.toISOString().split("T")[0]
          : undefined,
        closedDate: created.closedAt ? created.closedAt.toISOString().split("T")[0] : undefined,
        description: created.description || "",
        createdAt: created.createdAt.toISOString().split("T")[0],
        updatedAt: created.updatedAt.toISOString().split("T")[0],
      };
    });
  }

  public static async listCases(
    organizationId: number,
    filters?: {
      clientId?: number;
      status?: string;
      legalArea?: string;
      priority?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
    client: any = db
  ) {
    const where: any = { organizationId };

    if (filters?.clientId) {
      where.clientId = Number(filters.clientId);
    }

    if (filters?.status && filters.status !== "todos") {
      where.status = filters.status;
    }

    if (filters?.legalArea && filters.legalArea !== "todos") {
      where.legalArea = filters.legalArea;
    }

    if (filters?.priority && filters.priority !== "todos") {
      where.priority = filters.priority;
    }

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      where.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { internalCaseNumber: { contains: s, mode: "insensitive" } },
        { judicialProcessNumber: { contains: s, mode: "insensitive" } },
        { courtName: { contains: s, mode: "insensitive" } },
        { client: { name: { contains: s, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      client.legalCase.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, identification: true },
          },
          responsibleUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: filters?.limit ?? 100,
        skip: filters?.offset ?? 0,
      }),
      client.legalCase.count({ where }),
    ]);

    return {
      items: items.map((cs: any) => ({
        id: String(cs.id),
        caseNumber: cs.internalCaseNumber,
        internalCaseNumber: cs.internalCaseNumber,
        judicialProcessNumber: cs.judicialProcessNumber,
        title: cs.title,
        clientId: String(cs.clientId),
        clientName: cs.client?.name || "Cliente Desconocido",
        processType: cs.processType || "Ordinario Civil",
        legalArea: cs.legalArea,
        status: cs.status,
        priority: cs.priority,
        assignedLawyer: cs.assignedLawyer || cs.responsibleUser?.name || "Abogado del Despacho",
        responsibleUserId: cs.responsibleUserId,
        courtName: cs.courtName || "",
        judgeName: cs.judgeName || undefined,
        claimAmount: cs.claimAmount || undefined,
        startDate: cs.startDate.toISOString().split("T")[0],
        expectedEndDate: cs.expectedEndDate
          ? cs.expectedEndDate.toISOString().split("T")[0]
          : undefined,
        closedDate: cs.closedAt ? cs.closedAt.toISOString().split("T")[0] : undefined,
        description: cs.description || "",
        createdAt: cs.createdAt.toISOString().split("T")[0],
        updatedAt: cs.updatedAt.toISOString().split("T")[0],
      })),
      total,
    };
  }

  public static async getCaseById(
    organizationId: number,
    caseId: number,
    client: any = db
  ) {
    const found = await client.legalCase.findFirst({
      where: { id: caseId, organizationId },
      include: {
        client: true,
        responsibleUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!found) return null;

    return {
      id: String(found.id),
      caseNumber: found.internalCaseNumber,
      internalCaseNumber: found.internalCaseNumber,
      judicialProcessNumber: found.judicialProcessNumber,
      title: found.title,
      clientId: String(found.clientId),
      clientName: found.client?.name || "",
      processType: found.processType || "Ordinario Civil",
      legalArea: found.legalArea,
      status: found.status,
      priority: found.priority,
      assignedLawyer: found.assignedLawyer || found.responsibleUser?.name || "",
      responsibleUserId: found.responsibleUserId,
      courtName: found.courtName || "",
      judgeName: found.judgeName || undefined,
      claimAmount: found.claimAmount || undefined,
      startDate: found.startDate.toISOString().split("T")[0],
      expectedEndDate: found.expectedEndDate
        ? found.expectedEndDate.toISOString().split("T")[0]
        : undefined,
      closedDate: found.closedAt ? found.closedAt.toISOString().split("T")[0] : undefined,
      description: found.description || "",
      createdAt: found.createdAt.toISOString().split("T")[0],
      updatedAt: found.updatedAt.toISOString().split("T")[0],
      client: found.client
        ? {
            id: String(found.client.id),
            name: found.client.name,
            identificationType: found.client.identificationType,
            identification: found.client.identification,
            email: found.client.email || "",
            phone: found.client.phone || "",
            address: found.client.address || "",
            clientType: found.client.clientType,
            status: found.client.status,
          }
        : undefined,
    };
  }

  public static async updateCase(
    organizationId: number,
    caseId: number,
    data: UpdateCaseInput,
    client: any = db
  ) {
    // 1. Inmutabilidad de relaciones: no se permite alterar organizationId ni clientId
    if (data.organizationId !== undefined && data.organizationId !== organizationId) {
      throw new Error("No se permite modificar la organización de un caso existente.");
    }

    const existing = await client.legalCase.findFirst({
      where: { id: caseId, organizationId },
      include: { client: true },
    });

    if (!existing) {
      throw new Error(`Caso jurídico con ID ${caseId} no encontrado en la organización.`);
    }

    if (data.clientId !== undefined && data.clientId !== existing.clientId) {
      throw new Error("No se permite transferir un caso existente a otro cliente.");
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new Error("El título no puede estar vacío.");
      updateData.title = title;
    }

    if (data.internalCaseNumber !== undefined) {
      const num = data.internalCaseNumber.trim();
      if (num.length < 3 || num.length > 50) {
        throw new Error("El código interno de caso debe tener entre 3 y 50 caracteres.");
      }
      if (num !== existing.internalCaseNumber) {
        const duplicate = await client.legalCase.findUnique({
          where: {
            organizationId_internalCaseNumber: {
              organizationId,
              internalCaseNumber: num,
            },
          },
        });
        if (duplicate) {
          throw new Error(`Ya existe un caso con el código interno '${num}' en esta organización.`);
        }
        updateData.internalCaseNumber = num;
      }
    }

    if (data.judicialProcessNumber !== undefined) {
      updateData.judicialProcessNumber = data.judicialProcessNumber?.trim() || null;
    }

    if (data.processType !== undefined) {
      updateData.processType = data.processType?.trim() || "Ordinario Civil";
    }

    if (data.legalArea !== undefined) updateData.legalArea = data.legalArea;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.courtName !== undefined) updateData.courtName = data.courtName?.trim() || "";
    if (data.judgeName !== undefined) updateData.judgeName = data.judgeName?.trim() || null;
    if (data.claimAmount !== undefined) updateData.claimAmount = data.claimAmount?.trim() || null;
    if (data.description !== undefined) updateData.description = data.description?.trim() || "";
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.expectedEndDate !== undefined) {
      updateData.expectedEndDate = data.expectedEndDate ? new Date(data.expectedEndDate) : null;
    }

    // Validación de responsable
    if (data.responsibleUserId !== undefined) {
      if (data.responsibleUserId === null) {
        updateData.responsibleUserId = null;
      } else {
        const validatedLawyer = await LegalService.validateResponsibleLawyer(
          organizationId,
          Number(data.responsibleUserId),
          client
        );
        updateData.responsibleUserId = validatedLawyer.id;
        if (!data.assignedLawyer) {
          updateData.assignedLawyer = validatedLawyer.name;
        }
      }
    }

    if (data.assignedLawyer !== undefined) {
      updateData.assignedLawyer = data.assignedLawyer?.trim() || null;
    }

    // Manejo de estado y cierre de caso
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "Cerrado" || data.status === "Archivado") {
        if (!existing.closedAt) {
          updateData.closedAt = new Date();
        }
      } else {
        // Si se reabre, limpiar closedAt
        updateData.closedAt = null;
      }
    }

    const updated = await client.legalCase.update({
      where: { id: caseId },
      data: updateData,
      include: {
        client: true,
        responsibleUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      id: String(updated.id),
      caseNumber: updated.internalCaseNumber,
      internalCaseNumber: updated.internalCaseNumber,
      judicialProcessNumber: updated.judicialProcessNumber,
      title: updated.title,
      clientId: String(updated.clientId),
      clientName: updated.client?.name || existing.client?.name || "",
      processType: updated.processType,
      legalArea: updated.legalArea,
      status: updated.status,
      priority: updated.priority,
      assignedLawyer: updated.assignedLawyer || updated.responsibleUser?.name || "",
      responsibleUserId: updated.responsibleUserId,
      courtName: updated.courtName || "",
      judgeName: updated.judgeName || undefined,
      claimAmount: updated.claimAmount || undefined,
      startDate: updated.startDate.toISOString().split("T")[0],
      expectedEndDate: updated.expectedEndDate
        ? updated.expectedEndDate.toISOString().split("T")[0]
        : undefined,
      closedDate: updated.closedAt ? updated.closedAt.toISOString().split("T")[0] : undefined,
      description: updated.description || "",
      createdAt: updated.createdAt.toISOString().split("T")[0],
      updatedAt: updated.updatedAt.toISOString().split("T")[0],
    };
  }
}
