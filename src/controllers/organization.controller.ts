import { Request, Response } from "express";
import { OrganizationService } from "../services/organization.service";
import { VALID_ORGANIZATION_TYPES, OrganizationType } from "../constants/organization.constants";

export class OrganizationController {
  /**
   * POST /api/organizations
   * Creates a new organization with the authenticated user as OWNER.
   */
  public static async create(req: Request, res: Response) {
    try {
      const user = (req as any).user || res.locals.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "No autenticado. Inicie sesión para crear una organización.",
        });
      }

      const { name, type } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: "El campo 'name' es requerido.",
        });
      }

      if (type && !VALID_ORGANIZATION_TYPES.includes(type as OrganizationType)) {
        return res.status(400).json({
          success: false,
          error: `Tipo de organización inválido. Valores permitidos: ${VALID_ORGANIZATION_TYPES.join(", ")}`,
        });
      }

      const result = await OrganizationService.createOrganization({
        userId: user.id,
        name: name.trim(),
        type: type as OrganizationType,
      });

      return res.status(201).json({
        success: true,
        message: "Organización creada exitosamente.",
        data: result,
      });
    } catch (error: any) {
      console.error("[OrganizationController.create] Error:", error);
      const statusCode = error.message?.includes("Solo usuarios con rol") ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Error al crear la organización.",
      });
    }
  }

  /**
   * GET /api/organizations
   * Lists all organizations where the authenticated user is an active member.
   */
  public static async listUserOrganizations(req: Request, res: Response) {
    try {
      const user = (req as any).user || res.locals.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "No autenticado.",
        });
      }

      const memberships = await OrganizationService.getUserOrganizations(user.id);

      return res.json({
        success: true,
        data: memberships.map((m) => ({
          membershipId: m.id,
          role: m.role,
          status: m.status,
          joinedAt: m.createdAt,
          organization: m.organization,
        })),
      });
    } catch (error: any) {
      console.error("[OrganizationController.listUserOrganizations] Error:", error);
      return res.status(500).json({
        success: false,
        error: "Error al obtener las organizaciones.",
      });
    }
  }

  /**
   * GET /api/organizations/:id
   * Retrieves organization details.
   * Access is strictly guarded: caller must have an active membership in the organization,
   * or be a global platform ADMIN.
   */
  public static async getById(req: Request, res: Response) {
    try {
      const organization = (req as any).organization || res.locals.organization;
      const membership = (req as any).organizationMember || res.locals.organizationMember;

      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "Organización no encontrada.",
        });
      }

      return res.json({
        success: true,
        data: {
          organization,
          membership: membership
            ? {
                id: membership.id,
                role: membership.role,
                status: membership.status,
                joinedAt: membership.createdAt,
              }
            : null,
        },
      });
    } catch (error: any) {
      console.error("[OrganizationController.getById] Error:", error);
      return res.status(500).json({
        success: false,
        error: "Error al obtener los detalles de la organización.",
      });
    }
  }
}
