import express, { Request, Response, NextFunction } from "express";
import {
  ArchitectureController,
  architectureUploadMiddleware,
} from "../controllers/architecture.controller";
import {
  requireOrganization,
  requireOrganizationModule,
} from "../lib/organization.middleware";
import { PROFESSIONAL_MODULE_CODE } from "../constants/professional-module.constants";

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

// Middleware compuesto para el módulo ARCHITECTURE: autenticación, membresía y módulo activo
const requireArchitectureModule = [
  requireAuth,
  requireOrganization,
  requireOrganizationModule(PROFESSIONAL_MODULE_CODE.ARCHITECTURE),
];

// -------------------------------------------------------------
// CLIENTES (ArchitectureClient)
// -------------------------------------------------------------

router.get(
  "/api/organizations/:id/architecture/clients",
  requireArchitectureModule,
  ArchitectureController.getClients
);

router.get(
  "/api/organizations/:id/architecture/clients/:clientId",
  requireArchitectureModule,
  ArchitectureController.getClientById
);

router.post(
  "/api/organizations/:id/architecture/clients",
  requireArchitectureModule,
  ArchitectureController.createClient
);

router.put(
  "/api/organizations/:id/architecture/clients/:clientId",
  requireArchitectureModule,
  ArchitectureController.updateClient
);

router.delete(
  "/api/organizations/:id/architecture/clients/:clientId",
  requireArchitectureModule,
  ArchitectureController.inactivateClient
);

// -------------------------------------------------------------
// PROYECTOS (ArchitectureProject)
// -------------------------------------------------------------

router.get(
  "/api/organizations/:id/architecture/projects",
  requireArchitectureModule,
  ArchitectureController.getProjects
);

router.get(
  "/api/organizations/:id/architecture/projects/:projectId",
  requireArchitectureModule,
  ArchitectureController.getProjectById
);

router.post(
  "/api/organizations/:id/architecture/projects",
  requireArchitectureModule,
  ArchitectureController.createProject
);

router.put(
  "/api/organizations/:id/architecture/projects/:projectId",
  requireArchitectureModule,
  ArchitectureController.updateProject
);

router.post(
  "/api/organizations/:id/architecture/projects/:projectId/archive",
  requireArchitectureModule,
  ArchitectureController.archiveProject
);

router.post(
  "/api/organizations/:id/architecture/projects/:projectId/unarchive",
  requireArchitectureModule,
  ArchitectureController.unarchiveProject
);

// -------------------------------------------------------------
// ETAPAS (ArchitectureProjectStage)
// -------------------------------------------------------------

router.put(
  "/api/organizations/:id/architecture/projects/:projectId/stages/:stageId",
  requireArchitectureModule,
  ArchitectureController.updateStage
);

// -------------------------------------------------------------
// TAREAS (ArchitectureTask)
// -------------------------------------------------------------

router.get(
  "/api/organizations/:id/architecture/tasks",
  requireArchitectureModule,
  ArchitectureController.getTasks
);

router.get(
  "/api/organizations/:id/architecture/projects/:projectId/tasks",
  requireArchitectureModule,
  ArchitectureController.getTasks
);

router.get(
  "/api/organizations/:id/architecture/tasks/:taskId",
  requireArchitectureModule,
  ArchitectureController.getTaskById
);

router.post(
  "/api/organizations/:id/architecture/tasks",
  requireArchitectureModule,
  ArchitectureController.createTask
);

router.post(
  "/api/organizations/:id/architecture/projects/:projectId/tasks",
  requireArchitectureModule,
  ArchitectureController.createTask
);

router.put(
  "/api/organizations/:id/architecture/tasks/:taskId",
  requireArchitectureModule,
  ArchitectureController.updateTask
);

router.patch(
  "/api/organizations/:id/architecture/tasks/:taskId/toggle",
  requireArchitectureModule,
  ArchitectureController.toggleTaskStatus
);

router.post(
  "/api/organizations/:id/architecture/tasks/:taskId/toggle",
  requireArchitectureModule,
  ArchitectureController.toggleTaskStatus
);

// -------------------------------------------------------------
// ENTREGABLES (ArchitectureDeliverable)
// -------------------------------------------------------------

router.get(
  "/api/organizations/:id/architecture/deliverables",
  requireArchitectureModule,
  ArchitectureController.getDeliverables
);

router.get(
  "/api/organizations/:id/architecture/projects/:projectId/deliverables",
  requireArchitectureModule,
  ArchitectureController.getDeliverables
);

router.get(
  "/api/organizations/:id/architecture/deliverables/:deliverableId",
  requireArchitectureModule,
  ArchitectureController.getDeliverableById
);

router.post(
  "/api/organizations/:id/architecture/deliverables",
  requireArchitectureModule,
  ArchitectureController.createDeliverable
);

router.post(
  "/api/organizations/:id/architecture/projects/:projectId/deliverables",
  requireArchitectureModule,
  ArchitectureController.createDeliverable
);

router.put(
  "/api/organizations/:id/architecture/deliverables/:deliverableId",
  requireArchitectureModule,
  ArchitectureController.updateDeliverable
);

// -------------------------------------------------------------
// REUNIONES E INSPECCIONES (ArchitectureMeeting)
// -------------------------------------------------------------

router.get(
  "/api/organizations/:id/architecture/meetings",
  requireArchitectureModule,
  ArchitectureController.getMeetings
);

router.get(
  "/api/organizations/:id/architecture/projects/:projectId/meetings",
  requireArchitectureModule,
  ArchitectureController.getMeetings
);

router.get(
  "/api/organizations/:id/architecture/meetings/:meetingId",
  requireArchitectureModule,
  ArchitectureController.getMeetingById
);

router.post(
  "/api/organizations/:id/architecture/meetings",
  requireArchitectureModule,
  ArchitectureController.createMeeting
);

router.post(
  "/api/organizations/:id/architecture/projects/:projectId/meetings",
  requireArchitectureModule,
  ArchitectureController.createMeeting
);

router.put(
  "/api/organizations/:id/architecture/meetings/:meetingId",
  requireArchitectureModule,
  ArchitectureController.updateMeeting
);

// -------------------------------------------------------------
// DOCUMENTOS TÉCNICOS (ArchitectureDocument & ArchitectureDocumentVersion)
// -------------------------------------------------------------

// Listar todos los documentos de la organización o con filtros
router.get(
  "/api/organizations/:id/architecture/documents",
  requireArchitectureModule,
  ArchitectureController.getDocuments
);

// Listar documentos de un proyecto específico
router.get(
  "/api/organizations/:id/architecture/projects/:projectId/documents",
  requireArchitectureModule,
  ArchitectureController.getDocuments
);

// Obtener un documento por ID
router.get(
  "/api/organizations/:id/architecture/documents/:documentId",
  requireArchitectureModule,
  ArchitectureController.getDocumentById
);

// Crear documento (soporta JSON o multipart con archivo opcional)
router.post(
  "/api/organizations/:id/architecture/documents",
  requireArchitectureModule,
  architectureUploadMiddleware.single("file"),
  ArchitectureController.createDocument
);

// Crear documento anidado en proyecto
router.post(
  "/api/organizations/:id/architecture/projects/:projectId/documents",
  requireArchitectureModule,
  architectureUploadMiddleware.single("file"),
  ArchitectureController.createDocument
);

// Actualizar metadatos / estado del documento
router.put(
  "/api/organizations/:id/architecture/documents/:documentId",
  requireArchitectureModule,
  ArchitectureController.updateDocument
);

router.patch(
  "/api/organizations/:id/architecture/documents/:documentId",
  requireArchitectureModule,
  ArchitectureController.updateDocument
);

// Listar versiones de un documento
router.get(
  "/api/organizations/:id/architecture/documents/:documentId/versions",
  requireArchitectureModule,
  ArchitectureController.getDocumentVersions
);

// Subir nueva versión a un documento (multipart con campo "file" o JSON base64)
router.post(
  "/api/organizations/:id/architecture/documents/:documentId/versions",
  requireArchitectureModule,
  architectureUploadMiddleware.single("file"),
  ArchitectureController.addDocumentVersion
);

// Subir nueva versión ruta anidada a proyecto
router.post(
  "/api/organizations/:id/architecture/projects/:projectId/documents/:documentId/versions",
  requireArchitectureModule,
  architectureUploadMiddleware.single("file"),
  ArchitectureController.addDocumentVersion
);

// Obtener detalle de una versión
router.get(
  "/api/organizations/:id/architecture/documents/:documentId/versions/:versionId",
  requireArchitectureModule,
  ArchitectureController.getDocumentVersion
);

// Descargar archivo físico de una versión específica
router.get(
  "/api/organizations/:id/architecture/documents/:documentId/versions/:versionId/download",
  requireArchitectureModule,
  ArchitectureController.downloadDocumentVersion
);

// Descargar archivo físico de una versión específica (alias /file)
router.get(
  "/api/organizations/:id/architecture/documents/:documentId/versions/:versionId/file",
  requireArchitectureModule,
  ArchitectureController.downloadDocumentVersion
);

// Descargar archivo físico de la última versión del documento
router.get(
  "/api/organizations/:id/architecture/documents/:documentId/download",
  requireArchitectureModule,
  ArchitectureController.downloadDocumentVersion
);

// -------------------------------------------------------------
// PRESUPUESTOS (ArchitectureBudget)
// -------------------------------------------------------------

// Listar presupuestos
router.get(
  "/api/organizations/:id/architecture/budgets",
  requireArchitectureModule,
  ArchitectureController.listBudgets
);

router.get(
  "/api/organizations/:id/architecture/projects/:projectId/budgets",
  requireArchitectureModule,
  ArchitectureController.listBudgets
);

// Obtener detalle de un presupuesto
router.get(
  "/api/organizations/:id/architecture/budgets/:budgetId",
  requireArchitectureModule,
  ArchitectureController.getBudgetById
);

router.get(
  "/api/organizations/:id/architecture/projects/:projectId/budgets/:budgetId",
  requireArchitectureModule,
  ArchitectureController.getBudgetById
);

// Crear presupuesto
router.post(
  "/api/organizations/:id/architecture/budgets",
  requireArchitectureModule,
  ArchitectureController.createBudget
);

router.post(
  "/api/organizations/:id/architecture/projects/:projectId/budgets",
  requireArchitectureModule,
  ArchitectureController.createBudget
);

// Actualizar presupuesto
router.put(
  "/api/organizations/:id/architecture/budgets/:budgetId",
  requireArchitectureModule,
  ArchitectureController.updateBudget
);

router.put(
  "/api/organizations/:id/architecture/projects/:projectId/budgets/:budgetId",
  requireArchitectureModule,
  ArchitectureController.updateBudget
);

// Aprobar presupuesto (concurrencia controlada por lock)
router.post(
  "/api/organizations/:id/architecture/budgets/:budgetId/approve",
  requireArchitectureModule,
  ArchitectureController.approveBudget
);

router.post(
  "/api/organizations/:id/architecture/projects/:projectId/budgets/:budgetId/approve",
  requireArchitectureModule,
  ArchitectureController.approveBudget
);

// -------------------------------------------------------------
// RUBROS DE PRESUPUESTO (ArchitectureBudgetItem)
// -------------------------------------------------------------

// Agregar rubro a presupuesto
router.post(
  "/api/organizations/:id/architecture/budgets/:budgetId/items",
  requireArchitectureModule,
  ArchitectureController.addBudgetItem
);

router.post(
  "/api/organizations/:id/architecture/projects/:projectId/budgets/:budgetId/items",
  requireArchitectureModule,
  ArchitectureController.addBudgetItem
);

// Actualizar rubro de presupuesto
router.put(
  "/api/organizations/:id/architecture/budgets/:budgetId/items/:itemId",
  requireArchitectureModule,
  ArchitectureController.updateBudgetItem
);

router.put(
  "/api/organizations/:id/architecture/projects/:projectId/budgets/:budgetId/items/:itemId",
  requireArchitectureModule,
  ArchitectureController.updateBudgetItem
);

// -------------------------------------------------------------
// READ MODELS DERIVADOS (Dashboard, Calendario, Reportes)
// -------------------------------------------------------------

router.get(
  "/api/organizations/:id/architecture/calendar",
  requireArchitectureModule,
  ArchitectureController.getCalendarEvents
);

router.get(
  "/api/organizations/:id/architecture/dashboard",
  requireArchitectureModule,
  ArchitectureController.getDashboardData
);

router.get(
  "/api/organizations/:id/architecture/reports/summary",
  requireArchitectureModule,
  ArchitectureController.getReportsSummary
);

export default router;

