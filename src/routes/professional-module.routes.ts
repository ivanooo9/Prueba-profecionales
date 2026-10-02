import express, { Request, Response, NextFunction } from "express";
import { ProfessionalModuleController } from "../controllers/professional-module.controller";
import {
  requireOrganization,
  requireOrganizationRole,
} from "../lib/organization.middleware";
import { ORGANIZATION_MEMBER_ROLE } from "../constants/organization.constants";

const router = express.Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user || res.locals.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "No autenticado. Inicie sesión para continuar.",
    });
  }
  next();
}

const requireManagerRole = requireOrganizationRole([
  ORGANIZATION_MEMBER_ROLE.OWNER,
  ORGANIZATION_MEMBER_ROLE.ADMIN,
]);

// 1. Catálogo público/plataforma de módulos profesionales disponibles
router.get("/api/modules", ProfessionalModuleController.listCatalog);

// 2. Módulos asignados/habilitados para una organización específica (requiere ser miembro o admin global)
router.get(
  "/api/organizations/:id/modules",
  requireAuth,
  requireOrganization,
  ProfessionalModuleController.getOrganizationModules
);

// 3. Habilitar módulo profesional para la organización (requiere OWNER o ADMIN en la organización)
router.post(
  "/api/organizations/:id/modules/:moduleCode/enable",
  requireAuth,
  requireOrganization,
  requireManagerRole,
  ProfessionalModuleController.enableModule
);
router.patch(
  "/api/organizations/:id/modules/:moduleCode/enable",
  requireAuth,
  requireOrganization,
  requireManagerRole,
  ProfessionalModuleController.enableModule
);

// 4. Deshabilitar módulo profesional para la organización (requiere OWNER o ADMIN en la organización)
router.post(
  "/api/organizations/:id/modules/:moduleCode/disable",
  requireAuth,
  requireOrganization,
  requireManagerRole,
  ProfessionalModuleController.disableModule
);
router.patch(
  "/api/organizations/:id/modules/:moduleCode/disable",
  requireAuth,
  requireOrganization,
  requireManagerRole,
  ProfessionalModuleController.disableModule
);

export default router;
