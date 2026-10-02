import express, { Request, Response, NextFunction } from "express";
import { MedicineController } from "../controllers/medicine.controller";
import {
  requireOrganization,
  requireOrganizationModule,
} from "../lib/organization.middleware";
import { MEDICINE_MODULE_CODE } from "../constants/medicine.constants";

const router = express.Router();

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user || res?.locals?.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "No autenticado. Inicie sesión para continuar.",
    });
  }
  next();
}

// Middleware compuesto para el módulo MEDICINE: autenticación, membresía en organización y módulo activo
const requireMedicineModule = [
  requireAuth,
  requireOrganization,
  requireOrganizationModule(MEDICINE_MODULE_CODE),
];

// -------------------------------------------------------------
// PACIENTES
// -------------------------------------------------------------

// Registrar nuevo paciente
router.post(
  "/api/organizations/:id/medicine/patients",
  requireMedicineModule,
  MedicineController.createPatient
);

// Listar pacientes de la organización
router.get(
  "/api/organizations/:id/medicine/patients",
  requireMedicineModule,
  MedicineController.listPatients
);

// Obtener detalle de un paciente
router.get(
  "/api/organizations/:id/medicine/patients/:patientId",
  requireMedicineModule,
  MedicineController.getPatientById
);

// Actualizar datos de un paciente
router.put(
  "/api/organizations/:id/medicine/patients/:patientId",
  requireMedicineModule,
  MedicineController.updatePatient
);
router.patch(
  "/api/organizations/:id/medicine/patients/:patientId",
  requireMedicineModule,
  MedicineController.updatePatient
);

// -------------------------------------------------------------
// FICHA CLÍNICA / ANAMNESIS
// -------------------------------------------------------------

// Obtener ficha clínica de un paciente
router.get(
  "/api/organizations/:id/medicine/patients/:patientId/record",
  requireMedicineModule,
  MedicineController.getMedicalRecord
);

// Crear o actualizar ficha clínica de un paciente
router.put(
  "/api/organizations/:id/medicine/patients/:patientId/record",
  requireMedicineModule,
  MedicineController.upsertMedicalRecord
);
router.patch(
  "/api/organizations/:id/medicine/patients/:patientId/record",
  requireMedicineModule,
  MedicineController.upsertMedicalRecord
);

// -------------------------------------------------------------
// CONSULTAS EXTERNAS (SOAP)
// -------------------------------------------------------------

// Registrar consulta médica
router.post(
  "/api/organizations/:id/medicine/patients/:patientId/consultations",
  requireMedicineModule,
  MedicineController.createConsultation
);

// Listar consultas de un paciente
router.get(
  "/api/organizations/:id/medicine/patients/:patientId/consultations",
  requireMedicineModule,
  MedicineController.listConsultations
);

// Listar todas las consultas de la organización
router.get(
  "/api/organizations/:id/medicine/consultations",
  requireMedicineModule,
  MedicineController.listConsultations
);

// Obtener detalle de una consulta específica
router.get(
  "/api/organizations/:id/medicine/consultations/:consultationId",
  requireMedicineModule,
  MedicineController.getConsultationById
);

// Actualizar / firmar consulta
router.put(
  "/api/organizations/:id/medicine/consultations/:consultationId",
  requireMedicineModule,
  MedicineController.updateConsultation
);
router.patch(
  "/api/organizations/:id/medicine/consultations/:consultationId",
  requireMedicineModule,
  MedicineController.updateConsultation
);

// -------------------------------------------------------------
// RECETAS MÉDICAS
// -------------------------------------------------------------

// Emitir / registrar receta médica
router.post(
  "/api/organizations/:id/medicine/patients/:patientId/prescriptions",
  requireMedicineModule,
  MedicineController.createPrescription
);

// Listar recetas de un paciente
router.get(
  "/api/organizations/:id/medicine/patients/:patientId/prescriptions",
  requireMedicineModule,
  MedicineController.listPrescriptions
);

// Listar recetas de la organización
router.get(
  "/api/organizations/:id/medicine/prescriptions",
  requireMedicineModule,
  MedicineController.listPrescriptions
);

// Obtener detalle de una receta
router.get(
  "/api/organizations/:id/medicine/prescriptions/:prescriptionId",
  requireMedicineModule,
  MedicineController.getPrescriptionById
);

// Actualizar estado de una receta (SIGNED, CANCELLED)
router.put(
  "/api/organizations/:id/medicine/prescriptions/:prescriptionId/status",
  requireMedicineModule,
  MedicineController.updatePrescriptionStatus
);
router.patch(
  "/api/organizations/:id/medicine/prescriptions/:prescriptionId/status",
  requireMedicineModule,
  MedicineController.updatePrescriptionStatus
);

// -------------------------------------------------------------
// SEGUIMIENTOS CLÍNICOS
// -------------------------------------------------------------

// Crear tarea de seguimiento
router.post(
  "/api/organizations/:id/medicine/patients/:patientId/follow-ups",
  requireMedicineModule,
  MedicineController.createFollowUp
);

// Listar seguimientos de un paciente
router.get(
  "/api/organizations/:id/medicine/patients/:patientId/follow-ups",
  requireMedicineModule,
  MedicineController.listFollowUps
);

// Listar todos los seguimientos de la organización
router.get(
  "/api/organizations/:id/medicine/follow-ups",
  requireMedicineModule,
  MedicineController.listFollowUps
);

// Actualizar estado de seguimiento
router.put(
  "/api/organizations/:id/medicine/follow-ups/:followUpId",
  requireMedicineModule,
  MedicineController.updateFollowUp
);
router.patch(
  "/api/organizations/:id/medicine/follow-ups/:followUpId",
  requireMedicineModule,
  MedicineController.updateFollowUp
);

// -------------------------------------------------------------
// LABORATORIOS
// -------------------------------------------------------------

router.post(
  "/api/organizations/:id/medicine/patients/:patientId/laboratories",
  requireMedicineModule,
  MedicineController.createLaboratoryResult
);

router.get(
  "/api/organizations/:id/medicine/patients/:patientId/laboratories",
  requireMedicineModule,
  MedicineController.listLaboratoryResults
);

router.get(
  "/api/organizations/:id/medicine/laboratories",
  requireMedicineModule,
  MedicineController.listLaboratoryResults
);

router.get(
  "/api/organizations/:id/medicine/laboratories/:labId",
  requireMedicineModule,
  MedicineController.getLaboratoryResultById
);

// -------------------------------------------------------------
// IMAGENOLOGÍA
// -------------------------------------------------------------

router.post(
  "/api/organizations/:id/medicine/patients/:patientId/imaging",
  requireMedicineModule,
  MedicineController.createImagingStudy
);

router.get(
  "/api/organizations/:id/medicine/patients/:patientId/imaging",
  requireMedicineModule,
  MedicineController.listImagingStudies
);

router.get(
  "/api/organizations/:id/medicine/imaging",
  requireMedicineModule,
  MedicineController.listImagingStudies
);

router.get(
  "/api/organizations/:id/medicine/imaging/:studyId",
  requireMedicineModule,
  MedicineController.getImagingStudyById
);

// -------------------------------------------------------------
// PREVENCIÓN
// -------------------------------------------------------------

router.post(
  "/api/organizations/:id/medicine/patients/:patientId/prevention",
  requireMedicineModule,
  MedicineController.createPreventionRecord
);

router.get(
  "/api/organizations/:id/medicine/patients/:patientId/prevention",
  requireMedicineModule,
  MedicineController.listPreventionRecords
);

router.get(
  "/api/organizations/:id/medicine/prevention",
  requireMedicineModule,
  MedicineController.listPreventionRecords
);

router.put(
  "/api/organizations/:id/medicine/prevention/:recordId",
  requireMedicineModule,
  MedicineController.updatePreventionRecord
);
router.patch(
  "/api/organizations/:id/medicine/prevention/:recordId",
  requireMedicineModule,
  MedicineController.updatePreventionRecord
);

// -------------------------------------------------------------
// DOCUMENTOS CLÍNICOS
// -------------------------------------------------------------

router.post(
  "/api/organizations/:id/medicine/patients/:patientId/documents",
  requireMedicineModule,
  MedicineController.createDocument
);

router.post(
  "/api/organizations/:id/medicine/documents",
  requireMedicineModule,
  MedicineController.createDocument
);

router.get(
  "/api/organizations/:id/medicine/patients/:patientId/documents",
  requireMedicineModule,
  MedicineController.listDocuments
);

router.get(
  "/api/organizations/:id/medicine/documents",
  requireMedicineModule,
  MedicineController.listDocuments
);

router.get(
  "/api/organizations/:id/medicine/documents/:documentId",
  requireMedicineModule,
  MedicineController.getDocumentById
);

// -------------------------------------------------------------
// CITAS MÉDICAS (AGENDA)
// -------------------------------------------------------------

router.post(
  "/api/organizations/:id/medicine/patients/:patientId/appointments",
  requireMedicineModule,
  MedicineController.createAppointment
);

router.post(
  "/api/organizations/:id/medicine/appointments",
  requireMedicineModule,
  MedicineController.createAppointment
);

router.get(
  "/api/organizations/:id/medicine/patients/:patientId/appointments",
  requireMedicineModule,
  MedicineController.listAppointments
);

router.get(
  "/api/organizations/:id/medicine/appointments",
  requireMedicineModule,
  MedicineController.listAppointments
);

router.get(
  "/api/organizations/:id/medicine/appointments/:appointmentId",
  requireMedicineModule,
  MedicineController.getAppointmentById
);

router.put(
  "/api/organizations/:id/medicine/appointments/:appointmentId",
  requireMedicineModule,
  MedicineController.updateAppointment
);

router.patch(
  "/api/organizations/:id/medicine/appointments/:appointmentId",
  requireMedicineModule,
  MedicineController.updateAppointment
);

export default router;

