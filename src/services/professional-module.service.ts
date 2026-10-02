import { db } from "../lib/db";
import {
  DEFAULT_PROFESSIONAL_MODULES,
  PROFESSIONAL_MODULE_STATUS,
  ORGANIZATION_MODULE_STATUS,
  ORGANIZATION_STATUS,
} from "../constants";

export class ProfessionalModuleService {
  /**
   * Initializes or updates the default professional modules catalog.
   * Completely idempotent: uses upsert by unique 'code'.
   */
  public static async ensureDefaultProfessionalModules(client = db) {
    const results = [];
    for (const def of DEFAULT_PROFESSIONAL_MODULES) {
      const mod = await client.professionalModule.upsert({
        where: { code: def.code },
        update: {
          name: def.name,
          description: def.description,
          status: PROFESSIONAL_MODULE_STATUS.ACTIVE,
        },
        create: {
          code: def.code,
          name: def.name,
          description: def.description,
          status: PROFESSIONAL_MODULE_STATUS.ACTIVE,
        },
      });
      results.push(mod);
    }
    return results;
  }

  /**
   * Retrieves all active modules available in the platform catalog.
   */
  public static async getAvailableModules(client = db) {
    return await client.professionalModule.findMany({
      where: { status: PROFESSIONAL_MODULE_STATUS.ACTIVE },
      orderBy: { id: "asc" },
    });
  }

  /**
   * Retrieves a module by its unique code.
   */
  public static async getModuleByCode(code: string, client = db) {
    if (!code || typeof code !== "string") {
      return null;
    }
    return await client.professionalModule.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }

  /**
   * Retrieves the modules assigned to an organization.
   * By default returns only active modules unless includeInactive is true.
   */
  public static async getOrganizationModules(
    organizationId: number,
    includeInactive = false,
    client = db
  ) {
    if (!organizationId || isNaN(organizationId)) {
      return [];
    }

    return await client.organizationModule.findMany({
      where: {
        organizationId,
        ...(includeInactive
          ? {}
          : { status: ORGANIZATION_MODULE_STATUS.ACTIVE }),
      },
      include: {
        module: true,
      },
      orderBy: {
        id: "asc",
      },
    });
  }

  /**
   * Checks if an organization currently has an active professional module enabled.
   * Requires:
   * 1. Organization exists and is ACTIVE
   * 2. OrganizationModule exists and is ACTIVE
   * 3. ProfessionalModule exists and is ACTIVE
   */
  public static async organizationHasModule(
    organizationId: number,
    moduleCode: string,
    client = db
  ): Promise<boolean> {
    if (!organizationId || !moduleCode) {
      return false;
    }

    const orgModule = await client.organizationModule.findFirst({
      where: {
        organizationId,
        status: ORGANIZATION_MODULE_STATUS.ACTIVE,
        organization: {
          status: ORGANIZATION_STATUS.ACTIVE,
        },
        module: {
          code: moduleCode.trim().toUpperCase(),
          status: PROFESSIONAL_MODULE_STATUS.ACTIVE,
        },
      },
    });

    return !!orgModule;
  }

  /**
   * Enables a professional module for an organization.
   * Idempotent: respects unique constraint [organizationId, moduleId].
   * If already exists as INACTIVE, reactivates it to ACTIVE without creating duplicate rows.
   */
  public static async enableModuleForOrganization(
    organizationId: number,
    moduleCode: string,
    client = db
  ) {
    if (!organizationId || isNaN(organizationId)) {
      throw new Error("Identificador de organización inválido.");
    }

    if (!moduleCode || typeof moduleCode !== "string") {
      throw new Error("Código de módulo inválido.");
    }

    const cleanCode = moduleCode.trim().toUpperCase();

    // Verify organization exists and is active
    const organization = await client.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error("Organización no encontrada.");
    }

    if (organization.status !== ORGANIZATION_STATUS.ACTIVE) {
      throw new Error("La organización se encuentra inactiva o suspendida.");
    }

    // Verify module exists in catalog and is active
    const moduleItem = await client.professionalModule.findUnique({
      where: { code: cleanCode },
    });

    if (!moduleItem) {
      throw new Error(`El módulo '${cleanCode}' no existe en el catálogo.`);
    }

    if (moduleItem.status !== PROFESSIONAL_MODULE_STATUS.ACTIVE) {
      throw new Error(`El módulo '${cleanCode}' no está activo en la plataforma.`);
    }

    // Upsert organization module record
    return await client.organizationModule.upsert({
      where: {
        organizationId_moduleId: {
          organizationId,
          moduleId: moduleItem.id,
        },
      },
      update: {
        status: ORGANIZATION_MODULE_STATUS.ACTIVE,
      },
      create: {
        organizationId,
        moduleId: moduleItem.id,
        status: ORGANIZATION_MODULE_STATUS.ACTIVE,
      },
      include: {
        module: true,
      },
    });
  }

  /**
   * Disables a professional module for an organization.
   * Preserves history: sets status to INACTIVE, does NOT delete row.
   */
  public static async disableModuleForOrganization(
    organizationId: number,
    moduleCode: string,
    client = db
  ) {
    if (!organizationId || isNaN(organizationId)) {
      throw new Error("Identificador de organización inválido.");
    }

    if (!moduleCode || typeof moduleCode !== "string") {
      throw new Error("Código de módulo inválido.");
    }

    const cleanCode = moduleCode.trim().toUpperCase();

    const moduleItem = await client.professionalModule.findUnique({
      where: { code: cleanCode },
    });

    if (!moduleItem) {
      throw new Error(`El módulo '${cleanCode}' no existe en el catálogo.`);
    }

    const existingOrgModule = await client.organizationModule.findUnique({
      where: {
        organizationId_moduleId: {
          organizationId,
          moduleId: moduleItem.id,
        },
      },
    });

    if (!existingOrgModule) {
      throw new Error(`El módulo '${cleanCode}' no está asignado a esta organización.`);
    }

    return await client.organizationModule.update({
      where: {
        id: existingOrgModule.id,
      },
      data: {
        status: ORGANIZATION_MODULE_STATUS.INACTIVE,
      },
      include: {
        module: true,
      },
    });
  }
}
