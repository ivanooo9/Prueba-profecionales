import express from "express";
import { ProfessionalIdController } from "../controllers/professional/professional-id.controller";
import { StudentIdController } from "../controllers/student/student-id.controller";
import { requireProfessional } from "../lib/middlewares";

const router = express.Router();

async function requireStudent(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = res.locals.user || (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, error: "No autenticado." });
  }
  const roleName = user.role?.name;
  if (roleName !== "STUDENT" && roleName !== "ADMIN") {
    return res.status(403).json({ success: false, error: "Acceso denegado." });
  }
  (req as any).user = user;
  next();
}

// Ruta pública de vista del ID (@usuario)
router.get("/@:slug", ProfessionalIdController.getPublicId);
router.get("/e/@:slug", StudentIdController.getPublicId);

// Endpoint público de analítica
router.post("/api/id/track", ProfessionalIdController.trackEvent);
router.post("/api/student/id/track", StudentIdController.trackAnalytics);

// Rutas privadas para edición en el Dashboard del Profesional
router.get("/api/professional/id/config", requireProfessional, ProfessionalIdController.getDashboardConfig);
router.post("/api/professional/id/config", requireProfessional, ProfessionalIdController.updateConfig);

router.post("/api/professional/id/links", requireProfessional, ProfessionalIdController.upsertLink);
router.delete("/api/professional/id/links/:id", requireProfessional, ProfessionalIdController.deleteLink);
router.post("/api/professional/id/links/reorder", requireProfessional, ProfessionalIdController.reorderLinks);

router.post("/api/professional/id/blocks", requireProfessional, ProfessionalIdController.upsertBlock);
router.delete("/api/professional/id/blocks/:id", requireProfessional, ProfessionalIdController.deleteBlock);

router.get("/api/professional/id/analytics", requireProfessional, ProfessionalIdController.getAnalytics);

// Rutas privadas para edición en el Dashboard del Estudiante
router.get("/api/student/id/config", requireStudent, StudentIdController.getDashboardConfig);
router.post("/api/student/id/config", requireStudent, StudentIdController.updateConfig);

router.post("/api/student/id/links", requireStudent, StudentIdController.upsertLink);
router.delete("/api/student/id/links/:id", requireStudent, StudentIdController.deleteLink);
router.post("/api/student/id/links/reorder", requireStudent, StudentIdController.reorderLinks);

router.post("/api/student/id/blocks", requireStudent, StudentIdController.upsertBlock);
router.delete("/api/student/id/blocks/:id", requireStudent, StudentIdController.deleteBlock);

export default router;
