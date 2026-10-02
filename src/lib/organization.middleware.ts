import { Request, Response, NextFunction } from "express";
import { OrganizationService } from "../services/organization.service";
import { ProfessionalModuleService } from "../services/professional-module.service";
import { ORGANIZATION_MEMBER_STATUS, ORGANIZATION_STATUS } from "../constants/organization.constants";

export interface AuthenticatedUser {
  id: number;
  email: string;
  role?: { id: number; name: string };
  status: string;
}

/**
 * Extracts organization ID from params, headers, query, or body.
 */
export function extractOrganizationId(req: Request): number | null {
  const paramId = req.params.organizationId || req.params.id;
  const headerId = req.headers["x-organization-id"];
  const queryId = req.query.organizationId;
  const bodyId = req.body?.organizationId;

  const raw = paramId || headerId || queryId || bodyId;
  if (!raw) return null;

  const parsed = parseInt(String(raw), 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
}

/**
 * Requires an authenticated user to be an active member of the requested organization.
 * Never trusts organizationId alone; strictly validates membership in PostgreSQL.
 */
export function requireOrganization(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user || res.locals.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "No autenticado. Inicie sesión para acceder a la organización.",
    });
  }

  const organizationId = extractOrganizationId(req);
  if (!organizationId) {
    return res.status(400).json({
      success: false,
      error: "Identificador de organización requerido o inválido.",
    });
  }

  // Check global ADMIN override if configured, but prefer membership validation
  const isGlobalAdmin = user.role?.name === "ADMIN";

  OrganizationService.getOrganizationMembership(user.id, organizationId)
    .then((membership) => {
      if (membership && membership.status === ORGANIZATION_MEMBER_STATUS.ACTIVE) {
        if (membership.organization.status !== ORGANIZATION_STATUS.ACTIVE && !isGlobalAdmin) {
          return res.status(403).json({
            success: false,
            error: "La organización se encuentra inactiva o suspendida.",
          });
        }

        (req as any).organization = membership.organization;
        (req as any).organizationMember = membership;
        res.locals.organization = membership.organization;
        res.locals.organizationMember = membership;
        return next();
      }

      // If user is global ADMIN, allow read/manage but note lack of explicit membership
      if (isGlobalAdmin) {
        return OrganizationService.getOrganizationById(organizationId).then((org) => {
          if (!org) {
            return res.status(404).json({
              success: false,
              error: "Organización no encontrada.",
            });
          }
          (req as any).organization = org;
          (req as any).organizationMember = null;
          res.locals.organization = org;
          res.locals.organizationMember = null;
          return next();
        });
      }

      return res.status(403).json({
        success: false,
        error: "Acceso denegado: no pertenece a esta organización.",
      });
    })
    .catch((err) => {
      console.error("[requireOrganization] Error validating membership:", err);
      return res.status(500).json({
        success: false,
        error: "Error interno al validar membresía de organización.",
      });
    });
}

/**
 * Requires the authenticated user to hold one of the specified internal roles within the organization.
 */
export function requireOrganizationRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireOrganization(req, res, () => {
      const user = (req as any).user || res.locals.user;
      const isGlobalAdmin = user?.role?.name === "ADMIN";
      const member = (req as any).organizationMember;

      if (isGlobalAdmin && !member) {
        return next();
      }

      if (!member || !allowedRoles.includes(member.role)) {
        return res.status(403).json({
          success: false,
          error: `Acceso denegado: se requiere uno de los siguientes roles en la organización: ${allowedRoles.join(", ")}.`,
        });
      }

      next();
    });
  };
}

/**
 * Requires that the organization has the specified professional module enabled and active.
 * Validates that Organization, OrganizationModule, and ProfessionalModule are all ACTIVE.
 */
export function requireOrganizationModule(moduleCode: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireOrganization(req, res, async () => {
      try {
        const organizationId = extractOrganizationId(req);
        if (!organizationId) {
          return res.status(400).json({
            success: false,
            error: "Identificador de organización inválido.",
          });
        }

        const hasModule = await ProfessionalModuleService.organizationHasModule(
          organizationId,
          moduleCode
        );

        if (!hasModule) {
          return res.status(403).json({
            success: false,
            error: `El módulo profesional '${moduleCode}' no está habilitado para esta organización.`,
          });
        }

        next();
      } catch (error) {
        console.error("[requireOrganizationModule] Error:", error);
        return res.status(500).json({
          success: false,
          error: "Error interno al verificar módulo de organización.",
        });
      }
    });
  };
}
