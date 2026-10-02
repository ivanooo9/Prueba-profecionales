import { Request, Response } from "express";
import { ProfessionalModuleService } from "../services/professional-module.service";
import { extractOrganizationId } from "../lib/organization.middleware";

export class ProfessionalModuleController {
  /**
   * GET /api/modules
   * Lists all available active modules in the platform catalog.
   */
  public static async listCatalog(req: Request, res: Response) {
    try {
      const modules = await ProfessionalModuleService.getAvailableModules();
      return res.json({
        success: true,
        data: modules.map((m) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          description: m.description,
          status: m.status,
        })),
      });
    } catch (error: any) {
      console.error("[ProfessionalModuleController.listCatalog] Error:", error);
      return res.status(500).json({
        success: false,
        error: "Error al obtener el catálogo de módulos profesionales.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/modules
   * Lists the professional modules enabled for the specified organization.
   * Access is guarded by requireOrganization (caller must be member or global ADMIN).
   */
  public static async getOrganizationModules(req: Request, res: Response) {
    try {
      const organizationId = extractOrganizationId(req);
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: "Identificador de organización requerido o inválido.",
        });
      }

      const includeInactive = req.query.includeInactive === "true";
      const orgModules = await ProfessionalModuleService.getOrganizationModules(
        organizationId,
        includeInactive
      );

      return res.json({
        success: true,
        data: orgModules.map((om) => ({
          id: om.id,
          status: om.status,
          assignedAt: om.createdAt,
          updatedAt: om.updatedAt,
          module: {
            id: om.module.id,
            code: om.module.code,
            name: om.module.name,
            description: om.module.description,
          },
        })),
      });
    } catch (error: any) {
      console.error("[ProfessionalModuleController.getOrganizationModules] Error:", error);
      return res.status(500).json({
        success: false,
        error: "Error al obtener los módulos de la organización.",
      });
    }
  }

  /**
   * POST /api/organizations/:id/modules/:moduleCode/enable
   * Enables a professional module for the organization.
   * Access is guarded: caller must have role OWNER or ADMIN in the organization (or global ADMIN).
   */
  public static async enableModule(req: Request, res: Response) {
    try {
      const organizationId = extractOrganizationId(req);
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: "Identificador de organización requerido o inválido.",
        });
      }

      const { moduleCode } = req.params;
      if (!moduleCode) {
        return res.status(400).json({
          success: false,
          error: "Código de módulo requerido.",
        });
      }

      const result = await ProfessionalModuleService.enableModuleForOrganization(
        organizationId,
        String(moduleCode)
      );

      return res.json({
        success: true,
        message: `Módulo '${moduleCode}' habilitado exitosamente para la organización.`,
        data: {
          id: result.id,
          status: result.status,
          organizationId: result.organizationId,
          module: {
            id: result.module.id,
            code: result.module.code,
            name: result.module.name,
          },
        },
      });
    } catch (error: any) {
      console.error("[ProfessionalModuleController.enableModule] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al habilitar el módulo en la organización.",
      });
    }
  }

  /**
   * POST /api/organizations/:id/modules/:moduleCode/disable
   * Disables a professional module for the organization (sets status = INACTIVE).
   * Access is guarded: caller must have role OWNER or ADMIN in the organization (or global ADMIN).
   */
  public static async disableModule(req: Request, res: Response) {
    try {
      const organizationId = extractOrganizationId(req);
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: "Identificador de organización requerido o inválido.",
        });
      }

      const { moduleCode } = req.params;
      if (!moduleCode) {
        return res.status(400).json({
          success: false,
          error: "Código de módulo requerido.",
        });
      }

      const result = await ProfessionalModuleService.disableModuleForOrganization(
        organizationId,
        String(moduleCode)
      );

      return res.json({
        success: true,
        message: `Módulo '${moduleCode}' deshabilitado exitosamente para la organización.`,
        data: {
          id: result.id,
          status: result.status,
          organizationId: result.organizationId,
          module: {
            id: result.module.id,
            code: result.module.code,
            name: result.module.name,
          },
        },
      });
    } catch (error: any) {
      console.error("[ProfessionalModuleController.disableModule] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al deshabilitar el módulo en la organización.",
      });
    }
  }
}
