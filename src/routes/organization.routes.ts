import express, { Request, Response, NextFunction } from "express";
import { OrganizationController } from "../controllers/organization.controller";
import { requireOrganization } from "../lib/organization.middleware";

const router = express.Router();

/**
 * Ensures request has an authenticated user attached.
 */
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

// 1. Crear organización (usuario autenticado; asigna OWNER al creador)
router.post("/api/organizations", requireAuth, OrganizationController.create);

// 2. Listar organizaciones del usuario autenticado
router.get("/api/organizations", requireAuth, OrganizationController.listUserOrganizations);

// 3. Obtener detalles de una organización específica (valida membresía en PostgreSQL)
router.get("/api/organizations/:id", requireAuth, requireOrganization, OrganizationController.getById);

export default router;
