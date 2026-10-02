import express, { Request, Response, NextFunction } from "express";
import { LegalController } from "../controllers/legal.controller";
import { LegalCaseOperationsController } from "../controllers/legal-case-operations.controller";
import {
  LegalDocumentController,
  legalUploadMiddleware,
} from "../controllers/legal-document.controller";
import { LegalFinanceController } from "../controllers/legal-finance.controller";
import { LegalCalendarController } from "../controllers/legal-calendar.controller";
import { LegalReminderController } from "../controllers/legal-reminder.controller";
import { LegalNotificationController } from "../controllers/legal-notification.controller";
import { LegalDashboardController } from "../controllers/legal-dashboard.controller";
import { LegalCaseClosureController } from "../controllers/legal-case-closure.controller";
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

// Middleware compuesto para el módulo LEGAL: autenticación, membresía y módulo activo
const requireLegalModule = [
  requireAuth,
  requireOrganization,
  requireOrganizationModule(PROFESSIONAL_MODULE_CODE.LEGAL),
];

// -------------------------------------------------------------
// CLIENTES JURÍDICOS (LegalClient)
// -------------------------------------------------------------

router.get(
  "/api/organizations/:id/legal/clients",
  requireLegalModule,
  LegalController.getClients
);

router.get(
  "/api/organizations/:id/legal/clients/:clientId",
  requireLegalModule,
  LegalController.getClientById
);

router.post(
  "/api/organizations/:id/legal/clients",
  requireLegalModule,
  LegalController.createClient
);

router.put(
  "/api/organizations/:id/legal/clients/:clientId",
  requireLegalModule,
  LegalController.updateClient
);

// -------------------------------------------------------------
// CASOS / EXPEDIENTES JURÍDICOS (LegalCase)
// -------------------------------------------------------------

router.get(
  "/api/organizations/:id/legal/cases",
  requireLegalModule,
  LegalController.getCases
);

router.get(
  "/api/organizations/:id/legal/clients/:clientId/cases",
  requireLegalModule,
  LegalController.getCasesByClient
);

router.get(
  "/api/organizations/:id/legal/cases/:caseId",
  requireLegalModule,
  LegalController.getCaseById
);

/**
 * RUTA CANÓNICA ÚNICA PARA CREAR CASOS:
 * POST /api/organizations/:id/legal/clients/:clientId/cases
 * Cumple con la regla de dominio: PRIMERO CLIENTE -> DESPUÉS CASO
 */
router.post(
  "/api/organizations/:id/legal/clients/:clientId/cases",
  requireLegalModule,
  LegalController.createCase
);

router.put(
  "/api/organizations/:id/legal/cases/:caseId",
  requireLegalModule,
  LegalController.updateCase
);

// -------------------------------------------------------------
// CIERRE FORMAL Y ARCHIVADO DE EXPEDIENTES (FASE 8)
// -------------------------------------------------------------

router.get(
  ["/api/organizations/:id/legal/cases/:caseId/closure-check", "/api/organizations/:orgId/legal/cases/:caseId/closure-check"],
  requireLegalModule,
  LegalCaseClosureController.getClosureCheck
);

router.post(
  ["/api/organizations/:id/legal/cases/:caseId/close", "/api/organizations/:orgId/legal/cases/:caseId/close"],
  requireLegalModule,
  LegalCaseClosureController.closeCase
);

router.post(
  ["/api/organizations/:id/legal/cases/:caseId/archive", "/api/organizations/:orgId/legal/cases/:caseId/archive"],
  requireLegalModule,
  LegalCaseClosureController.archiveCase
);

// -------------------------------------------------------------
// LISTADOS GLOBALES OPERATIVOS (MÓDULO LEGAL)
// -------------------------------------------------------------

router.get(
  "/api/organizations/:id/legal/tasks",
  requireLegalModule,
  LegalCaseOperationsController.getGlobalTasks
);

router.get(
  "/api/organizations/:id/legal/deadlines",
  requireLegalModule,
  LegalCaseOperationsController.getGlobalDeadlines
);

router.get(
  "/api/organizations/:id/legal/hearings",
  requireLegalModule,
  LegalCaseOperationsController.getGlobalHearings
);

// -------------------------------------------------------------
// OPERACIONES DEL EXPEDIENTE (LegalCase Activity, Task, Deadline, Hearing)
// -------------------------------------------------------------

// Actuaciones / Bitácora
router.get(
  "/api/organizations/:id/legal/cases/:caseId/activities",
  requireLegalModule,
  LegalCaseOperationsController.getActivities
);

router.post(
  "/api/organizations/:id/legal/cases/:caseId/activities",
  requireLegalModule,
  LegalCaseOperationsController.createActivity
);

// Tareas del Caso
router.get(
  "/api/organizations/:id/legal/cases/:caseId/tasks",
  requireLegalModule,
  LegalCaseOperationsController.getCaseTasks
);

router.post(
  "/api/organizations/:id/legal/cases/:caseId/tasks",
  requireLegalModule,
  LegalCaseOperationsController.createCaseTask
);

router.put(
  "/api/organizations/:id/legal/cases/:caseId/tasks/:taskId",
  requireLegalModule,
  LegalCaseOperationsController.updateCaseTask
);

// Plazos Procesales del Caso
router.get(
  "/api/organizations/:id/legal/cases/:caseId/deadlines",
  requireLegalModule,
  LegalCaseOperationsController.getCaseDeadlines
);

router.post(
  "/api/organizations/:id/legal/cases/:caseId/deadlines",
  requireLegalModule,
  LegalCaseOperationsController.createCaseDeadline
);

router.put(
  "/api/organizations/:id/legal/cases/:caseId/deadlines/:deadlineId",
  requireLegalModule,
  LegalCaseOperationsController.updateCaseDeadline
);

// Audiencias del Caso
router.get(
  "/api/organizations/:id/legal/cases/:caseId/hearings",
  requireLegalModule,
  LegalCaseOperationsController.getCaseHearings
);

router.post(
  "/api/organizations/:id/legal/cases/:caseId/hearings",
  requireLegalModule,
  LegalCaseOperationsController.createCaseHearing
);

router.put(
  "/api/organizations/:id/legal/cases/:caseId/hearings/:hearingId",
  requireLegalModule,
  LegalCaseOperationsController.updateCaseHearing
);

// -------------------------------------------------------------
// EXPEDIENTE DOCUMENTAL (LegalDocument & LegalDocumentVersion)
// -------------------------------------------------------------

// Listar documentos del expediente (Strictly Read-Only)
router.get(
  "/api/organizations/:id/legal/cases/:caseId/documents",
  requireLegalModule,
  LegalDocumentController.getDocuments
);

// Crear documento con versión inicial (v1)
router.post(
  "/api/organizations/:id/legal/cases/:caseId/documents",
  requireLegalModule,
  legalUploadMiddleware.single("file"),
  LegalDocumentController.createDocument
);

// Detalle de documento con historial de versiones
router.get(
  "/api/organizations/:id/legal/cases/:caseId/documents/:documentId",
  requireLegalModule,
  LegalDocumentController.getDocumentById
);

// Actualizar metadatos del documento (título, tipo, descripción, estado)
router.put(
  "/api/organizations/:id/legal/cases/:caseId/documents/:documentId",
  requireLegalModule,
  LegalDocumentController.updateDocument
);

// Archivar documento (conservación histórica sin borrado físico)
router.post(
  "/api/organizations/:id/legal/cases/:caseId/documents/:documentId/archive",
  requireLegalModule,
  LegalDocumentController.archiveDocument
);

// Añadir nueva versión documental (v2, v3, ...) con advisory lock
router.post(
  "/api/organizations/:id/legal/cases/:caseId/documents/:documentId/versions",
  requireLegalModule,
  legalUploadMiddleware.single("file"),
  LegalDocumentController.addVersion
);

// Descarga / visualización protegida del archivo confidencial
router.get(
  "/api/organizations/:id/legal/cases/:caseId/documents/:documentId/versions/:versionId/file",
  requireLegalModule,
  LegalDocumentController.downloadVersionFile
);

// -------------------------------------------------------------
// HONORARIOS PROFESIONALES Y PAGOS (LegalFeeAgreement & LegalPayment)
// -------------------------------------------------------------

// Listar acuerdos de honorarios del expediente (Strictly Read-Only)
router.get(
  "/api/organizations/:id/legal/cases/:caseId/fee-agreements",
  requireLegalModule,
  LegalFinanceController.getFeeAgreements
);

// Crear acuerdo de honorarios
router.post(
  "/api/organizations/:id/legal/cases/:caseId/fee-agreements",
  requireLegalModule,
  LegalFinanceController.createFeeAgreement
);

// Detalle de un acuerdo de honorarios
router.get(
  "/api/organizations/:id/legal/cases/:caseId/fee-agreements/:agreementId",
  requireLegalModule,
  LegalFinanceController.getFeeAgreementById
);

// Actualizar acuerdo de honorarios (estructura económica bloqueada si hay pagos)
router.put(
  "/api/organizations/:id/legal/cases/:caseId/fee-agreements/:agreementId",
  requireLegalModule,
  LegalFinanceController.updateFeeAgreement
);

// Registrar pago o abono a un acuerdo (con control pesimista FOR UPDATE y anti-overpayment)
router.post(
  "/api/organizations/:id/legal/cases/:caseId/fee-agreements/:agreementId/payments",
  requireLegalModule,
  LegalFinanceController.recordPayment
);

// Listar pagos registrados para un acuerdo (Strictly Read-Only)
router.get(
  "/api/organizations/:id/legal/cases/:caseId/fee-agreements/:agreementId/payments",
  requireLegalModule,
  LegalFinanceController.getPayments
);

// -------------------------------------------------------------
// AGENDA Y CALENDARIO UNIFICADO (Proyección Task + Deadline + Hearing)
// -------------------------------------------------------------
router.get(
  "/api/organizations/:id/legal/calendar",
  requireLegalModule,
  LegalCalendarController.getCalendar
);

// -------------------------------------------------------------
// RECORDATORIOS Y ALERTAS TEMPORALES (LegalReminder)
// -------------------------------------------------------------
// Listar recordatorios de la organización (Strictly Read-Only)
router.get(
  "/api/organizations/:id/legal/reminders",
  requireLegalModule,
  LegalReminderController.getReminders
);

// Crear recordatorio para un caso y evento específico
router.post(
  "/api/organizations/:id/legal/cases/:caseId/reminders",
  requireLegalModule,
  LegalReminderController.createReminder
);

// Actualizar recordatorio
router.put(
  "/api/organizations/:id/legal/cases/:caseId/reminders/:reminderId",
  requireLegalModule,
  LegalReminderController.updateReminder
);

// Descartar recordatorio sin borrado físico
router.post(
  "/api/organizations/:id/legal/cases/:caseId/reminders/:reminderId/dismiss",
  requireLegalModule,
  LegalReminderController.dismissReminder
);

// -------------------------------------------------------------
// CENTRO DE NOTIFICACIONES Y ALERTAS (LegalNotification)
// -------------------------------------------------------------
// Listar notificaciones del usuario autenticado (Strictly Read-Only)
router.get(
  "/api/organizations/:id/legal/notifications",
  requireLegalModule,
  LegalNotificationController.getNotifications
);

// Conteo de no leídas para el usuario autenticado (Strictly Read-Only)
router.get(
  "/api/organizations/:id/legal/notifications/unread-count",
  requireLegalModule,
  LegalNotificationController.getUnreadCount
);

// Marcar notificación como leída
router.post(
  "/api/organizations/:id/legal/notifications/:notificationId/read",
  requireLegalModule,
  LegalNotificationController.markAsRead
);

// Descartar notificación sin borrado físico
router.post(
  "/api/organizations/:id/legal/notifications/:notificationId/dismiss",
  requireLegalModule,
  LegalNotificationController.dismissNotification
);

// Procesar recordatorios vencidos manualmente
router.post(
  "/api/organizations/:id/legal/notifications/process",
  requireLegalModule,
  LegalNotificationController.processDueReminders
);

// -------------------------------------------------------------
// DASHBOARD EJECUTIVO Y REPORTES (FASE 7)
// Read Model agregado sobre datos de PostgreSQL
// -------------------------------------------------------------

// Dashboard Principal del Despacho (Strictly Read-Only)
router.get(
  "/api/organizations/:id/legal/dashboard",
  requireLegalModule,
  LegalDashboardController.getDashboard
);

// Reporte Operacional y Estadísticas con filtros temporales (Strictly Read-Only)
router.get(
  "/api/organizations/:id/legal/reports",
  requireLegalModule,
  LegalDashboardController.getReports
);

export default router;
