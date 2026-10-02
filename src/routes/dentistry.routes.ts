import express, { Request, Response, NextFunction } from "express";
import { DentistryPatientController } from "../controllers/dentistry-patient.controller";
import { DentistryRecordController } from "../controllers/dentistry-record.controller";
import { DentistryOdontogramController } from "../controllers/dentistry-odontogram.controller";
import { DentistryTreatmentController } from "../controllers/dentistry-treatment.controller";
import { DentistryBudgetController } from "../controllers/dentistry-budget.controller";
import { DentistryExecutionController } from "../controllers/dentistry-execution.controller";
import { DentistryPrescriptionController } from "../controllers/dentistry-prescription.controller";
import { DentistryDocumentController } from "../controllers/dentistry-document.controller";
import { DentistryAppointmentController } from "../controllers/dentistry-appointment.controller";
import { DentistryConsentController } from "../controllers/dentistry-consent.controller";
import {
  requireOrganization,
  requireOrganizationModule,
} from "../lib/organization.middleware";

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

// Middleware compuesto para el módulo DENTISTRY: autenticación, membresía y módulo activo
const requireDentistryModule = [
  requireAuth,
  requireOrganization,
  requireOrganizationModule("DENTISTRY"),
];

// -------------------------------------------------------------
// PACIENTES COMPARTIDOS (MÓDULO DENTISTRY)
// Opera sobre la entidad central Patient (tabla "MedicalPatient")
// -------------------------------------------------------------

// Registrar nuevo paciente desde Odontología
router.post(
  "/api/organizations/:id/dentistry/patients",
  requireDentistryModule,
  DentistryPatientController.createPatient
);

// Listar pacientes compartidos de la organización
router.get(
  "/api/organizations/:id/dentistry/patients",
  requireDentistryModule,
  DentistryPatientController.listPatients
);

// Obtener detalle de un paciente específico
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId",
  requireDentistryModule,
  DentistryPatientController.getPatientById
);

// Actualizar datos del paciente
router.put(
  "/api/organizations/:id/dentistry/patients/:patientId",
  requireDentistryModule,
  DentistryPatientController.updatePatient
);
router.patch(
  "/api/organizations/:id/dentistry/patients/:patientId",
  requireDentistryModule,
  DentistryPatientController.updatePatient
);

// -------------------------------------------------------------
// EXPEDIENTE ODONTOLÓGICO (DentalRecord)
// Raíz clínica 1:1 por paciente en la organización
// -------------------------------------------------------------

// Obtener expediente odontológico del paciente (sin side effects)
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/record",
  requireDentistryModule,
  DentistryRecordController.getDentalRecord
);

// Crear o actualizar expediente odontológico del paciente
router.put(
  "/api/organizations/:id/dentistry/patients/:patientId/record",
  requireDentistryModule,
  DentistryRecordController.upsertDentalRecord
);
router.patch(
  "/api/organizations/:id/dentistry/patients/:patientId/record",
  requireDentistryModule,
  DentistryRecordController.upsertDentalRecord
);

// -------------------------------------------------------------
// ODONTOGRAMA (DentalToothSnapshot)
// Persistencia real pieza por pieza para el odontograma interactivo
// -------------------------------------------------------------

// Consultar odontograma del paciente (estrictamente READ-ONLY)
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/odontogram",
  requireDentistryModule,
  DentistryOdontogramController.getOdontogram
);

// Guardar o actualizar condición clínica de una pieza dental
router.put(
  "/api/organizations/:id/dentistry/patients/:patientId/odontogram/teeth/:toothNumber",
  requireDentistryModule,
  DentistryOdontogramController.saveTooth
);

// -------------------------------------------------------------
// HISTORIAL EVOLUTIVO DEL ODONTOGRAMA (DentalToothEvent)
// Consultas cronológicas inmutables (estrictamente READ-ONLY)
// -------------------------------------------------------------

// Consultar historial de una pieza dental específica
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/odontogram/teeth/:toothNumber/history",
  requireDentistryModule,
  DentistryOdontogramController.getToothHistory
);

// Consultar historial completo del odontograma del paciente
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/odontogram/history",
  requireDentistryModule,
  DentistryOdontogramController.getOdontogramHistory
);

// -------------------------------------------------------------
// CATÁLOGO DE PROCEDIMIENTOS (DentalProcedure)
// -------------------------------------------------------------

// Listar procedimientos del catálogo de la organización
router.get(
  "/api/organizations/:id/dentistry/procedures",
  requireDentistryModule,
  DentistryTreatmentController.getProcedures
);

// Crear nuevo procedimiento en el catálogo
router.post(
  "/api/organizations/:id/dentistry/procedures",
  requireDentistryModule,
  DentistryTreatmentController.createProcedure
);

// Actualizar procedimiento existente en el catálogo
router.put(
  "/api/organizations/:id/dentistry/procedures/:procedureId",
  requireDentistryModule,
  DentistryTreatmentController.updateProcedure
);

// -------------------------------------------------------------
// PLANES DE TRATAMIENTO ODONTOLÓGICO (DentalTreatmentPlan)
// -------------------------------------------------------------

// Listar planes de tratamiento del paciente
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans",
  requireDentistryModule,
  DentistryTreatmentController.getTreatmentPlans
);

// Obtener detalle de un plan específico
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId",
  requireDentistryModule,
  DentistryTreatmentController.getTreatmentPlanById
);

// Crear plan de tratamiento para el paciente
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans",
  requireDentistryModule,
  DentistryTreatmentController.createTreatmentPlan
);

// Actualizar plan de tratamiento
router.put(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId",
  requireDentistryModule,
  DentistryTreatmentController.updateTreatmentPlan
);

// -------------------------------------------------------------
// ITEMS DEL PLAN DE TRATAMIENTO (DentalTreatmentItem)
// -------------------------------------------------------------

// Agregar procedimiento / item al plan de tratamiento
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId/items",
  requireDentistryModule,
  DentistryTreatmentController.addTreatmentItem
);

// Actualizar item del plan de tratamiento
router.put(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId/items/:itemId",
  requireDentistryModule,
  DentistryTreatmentController.updateTreatmentItem
);

// Eliminar item del plan de tratamiento
router.delete(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId/items/:itemId",
  requireDentistryModule,
  DentistryTreatmentController.deleteTreatmentItem
);

// -------------------------------------------------------------
// PRESUPUESTOS FORMALES (DentalBudget)
// -------------------------------------------------------------

// Listar presupuestos formales del paciente (READ-ONLY)
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/budgets",
  requireDentistryModule,
  DentistryBudgetController.getBudgets
);

// Obtener detalle de un presupuesto formal específico con balance y pagos
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/budgets/:budgetId",
  requireDentistryModule,
  DentistryBudgetController.getBudgetById
);

// Generar presupuesto formal a partir de un plan de tratamiento
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId/budgets",
  requireDentistryModule,
  DentistryBudgetController.createBudgetFromPlan
);

// Actualizar estado o notas de un presupuesto
router.put(
  "/api/organizations/:id/dentistry/patients/:patientId/budgets/:budgetId",
  requireDentistryModule,
  DentistryBudgetController.updateBudget
);

// -------------------------------------------------------------
// PAGOS Y ABONOS (DentalPayment)
// Concurrencia segura y balance financiero
// -------------------------------------------------------------

// Registrar un pago o abono a un presupuesto
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/budgets/:budgetId/payments",
  requireDentistryModule,
  DentistryBudgetController.recordPayment
);

// Consultar historial de pagos de un presupuesto
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/budgets/:budgetId/payments",
  requireDentistryModule,
  DentistryBudgetController.getPayments
);

// -------------------------------------------------------------
// EJECUCIÓN CLÍNICA Y EVOLUCIÓN (DentalTreatmentExecution)
// Acciones clínicas de sesión, finalización e integración con odontograma
// -------------------------------------------------------------

// Consultar ejecuciones clínicas de un ítem de tratamiento (READ ONLY)
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId/items/:itemId/executions",
  requireDentistryModule,
  DentistryExecutionController.getItemExecutions
);

// Registrar una nueva ejecución clínica atómica para un ítem
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/treatment-plans/:planId/items/:itemId/executions",
  requireDentistryModule,
  DentistryExecutionController.createItemExecution
);

// Consultar historial general de evoluciones/ejecuciones del paciente
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/executions",
  requireDentistryModule,
  DentistryExecutionController.getPatientExecutions
);

// -------------------------------------------------------------
// RECETAS ODONTOLÓGICAS (DentalPrescription)
// Prescripciones farmacológicas con ciclo de vida e inmutabilidad
// -------------------------------------------------------------

// Listar recetas odontológicas del paciente (READ-ONLY)
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/prescriptions",
  requireDentistryModule,
  DentistryPrescriptionController.listPrescriptions
);

// Obtener detalle de una receta específica con ítems
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/prescriptions/:prescriptionId",
  requireDentistryModule,
  DentistryPrescriptionController.getPrescriptionById
);

// Crear nueva receta odontológica (DRAFT o ISSUED)
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/prescriptions",
  requireDentistryModule,
  DentistryPrescriptionController.createPrescription
);

// Actualizar receta odontológica en borrador (DRAFT)
router.put(
  "/api/organizations/:id/dentistry/patients/:patientId/prescriptions/:prescriptionId",
  requireDentistryModule,
  DentistryPrescriptionController.updatePrescription
);

// Emitir formalmente una receta (DRAFT -> ISSUED)
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/prescriptions/:prescriptionId/issue",
  requireDentistryModule,
  DentistryPrescriptionController.issuePrescription
);

// Anular una receta emitida (CANCELLED) con motivo
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/prescriptions/:prescriptionId/cancel",
  requireDentistryModule,
  DentistryPrescriptionController.cancelPrescription
);

// -------------------------------------------------------------
// DOCUMENTOS Y ARCHIVOS CLÍNICOS ODONTOLÓGICOS (DentalDocument)
// Radiografías, fotografías, consentimientos e informes
// -------------------------------------------------------------

// Listar documentos clínicos del paciente
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/documents",
  requireDentistryModule,
  DentistryDocumentController.listDocuments
);

// Listar todos los documentos de la organización odontológica
router.get(
  "/api/organizations/:id/dentistry/documents",
  requireDentistryModule,
  DentistryDocumentController.listDocuments
);

// Obtener detalle de un documento específico
router.get(
  "/api/organizations/:id/dentistry/documents/:documentId",
  requireDentistryModule,
  DentistryDocumentController.getDocumentById
);

// Registrar nueva ficha de documento para un paciente
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/documents",
  requireDentistryModule,
  DentistryDocumentController.createDocument
);

// Eliminar ficha de documento
router.delete(
  "/api/organizations/:id/dentistry/documents/:documentId",
  requireDentistryModule,
  DentistryDocumentController.deleteDocument
);

// -------------------------------------------------------------
// CITAS Y AGENDA ODONTOLÓGICA (DentalAppointment)
// Programación, estados de atención y vinculación clínica
// -------------------------------------------------------------

// Listar citas odontológicas de la organización con filtros (fecha, rango, estado, profesional, paciente)
router.get(
  "/api/organizations/:id/dentistry/appointments",
  requireDentistryModule,
  DentistryAppointmentController.listAppointments
);

// Listar profesionales autorizados de la clínica para agendamiento
router.get(
  "/api/organizations/:id/dentistry/professionals",
  requireDentistryModule,
  DentistryAppointmentController.listDentists
);

// Obtener detalle de una cita específica
router.get(
  "/api/organizations/:id/dentistry/appointments/:appointmentId",
  requireDentistryModule,
  DentistryAppointmentController.getAppointmentById
);

// Listar citas de un paciente específico
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/appointments",
  requireDentistryModule,
  DentistryAppointmentController.listPatientAppointments
);

// Programar nueva cita odontológica (con advisory lock y validación de overlap)
router.post(
  "/api/organizations/:id/dentistry/appointments",
  requireDentistryModule,
  DentistryAppointmentController.createAppointment
);

// Reprogramar o actualizar campos permitidos de la cita
router.put(
  "/api/organizations/:id/dentistry/appointments/:appointmentId",
  requireDentistryModule,
  DentistryAppointmentController.updateAppointment
);

// Transicionar estado de atención (SCHEDULED -> CONFIRMED -> IN_PROGRESS -> COMPLETED)
router.patch(
  "/api/organizations/:id/dentistry/appointments/:appointmentId/status",
  requireDentistryModule,
  DentistryAppointmentController.updateAppointmentStatus
);

// Cancelar cita formalmente con motivo obligatorio
router.post(
  "/api/organizations/:id/dentistry/appointments/:appointmentId/cancel",
  requireDentistryModule,
  DentistryAppointmentController.cancelAppointment
);

// -------------------------------------------------------------
// PLANTILLAS DE CONSENTIMIENTO INFORMADO (DentalConsentTemplate)
// -------------------------------------------------------------

// Listar plantillas de consentimiento de la organización
router.get(
  "/api/organizations/:id/dentistry/consent-templates",
  requireDentistryModule,
  DentistryConsentController.listTemplates
);

// Obtener detalle de una plantilla de consentimiento
router.get(
  "/api/organizations/:id/dentistry/consent-templates/:templateId",
  requireDentistryModule,
  DentistryConsentController.getTemplateById
);

// Crear nueva plantilla de consentimiento
router.post(
  "/api/organizations/:id/dentistry/consent-templates",
  requireDentistryModule,
  DentistryConsentController.createTemplate
);

// Actualizar plantilla (in-place si no fue usada, o crea nueva versión v_n+1 si ya fue usada)
router.put(
  "/api/organizations/:id/dentistry/consent-templates/:templateId",
  requireDentistryModule,
  DentistryConsentController.updateTemplate
);

// Desactivar plantilla (soft deactivation)
router.patch(
  "/api/organizations/:id/dentistry/consent-templates/:templateId/deactivate",
  requireDentistryModule,
  DentistryConsentController.deactivateTemplate
);

// -------------------------------------------------------------
// CONSENTIMIENTOS INFORMADOS CLÍNICOS (DentalConsent)
// -------------------------------------------------------------

// Listar consentimientos de la organización con filtros
router.get(
  "/api/organizations/:id/dentistry/consents",
  requireDentistryModule,
  DentistryConsentController.listConsents
);

// Listar consentimientos de un paciente específico
router.get(
  "/api/organizations/:id/dentistry/patients/:patientId/consents",
  requireDentistryModule,
  DentistryConsentController.listConsents
);

// Obtener detalle de un consentimiento específico
router.get(
  "/api/organizations/:id/dentistry/consents/:consentId",
  requireDentistryModule,
  DentistryConsentController.getConsentById
);

// Registrar nuevo consentimiento en borrador (DRAFT)
router.post(
  "/api/organizations/:id/dentistry/consents",
  requireDentistryModule,
  DentistryConsentController.createConsent
);

// Registrar nuevo consentimiento en borrador para un paciente (DRAFT)
router.post(
  "/api/organizations/:id/dentistry/patients/:patientId/consents",
  requireDentistryModule,
  DentistryConsentController.createConsent
);

// Modificar consentimiento en borrador (solo permitido en DRAFT)
router.put(
  "/api/organizations/:id/dentistry/consents/:consentId",
  requireDentistryModule,
  DentistryConsentController.updateConsentDraft
);

// Emitir formalmente el consentimiento (DRAFT -> ISSUED) con bloqueo de concurrencia
router.post(
  "/api/organizations/:id/dentistry/consents/:consentId/issue",
  requireDentistryModule,
  DentistryConsentController.issueConsent
);

// Registrar firma del consentimiento (ISSUED -> SIGNED) con bloqueo de concurrencia
router.post(
  "/api/organizations/:id/dentistry/consents/:consentId/sign",
  requireDentistryModule,
  DentistryConsentController.signConsent
);

// Cancelar formalmente el consentimiento con motivo obligatorio
router.post(
  "/api/organizations/:id/dentistry/consents/:consentId/cancel",
  requireDentistryModule,
  DentistryConsentController.cancelConsent
);

export default router;





