import { Request, Response } from "express";
import { PatientService } from "../services/patient.service";

export class DentistryPatientController {
  /**
   * POST /api/organizations/:id/dentistry/patients
   * Registra un nuevo paciente en la organización desde el módulo de Odontología.
   */
  public static async createPatient(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patient = await PatientService.createPatient(org.id, req.body);
      return res.status(201).json({
        success: true,
        message: "Paciente registrado exitosamente.",
        data: patient,
      });
    } catch (error: any) {
      console.error("[DentistryPatientController.createPatient] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar paciente.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/patients
   * Lista los pacientes compartidos de la organización para el módulo de Odontología.
   */
  public static async listPatients(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { search, status, skip, take } = req.query;
      const result = await PatientService.getPatients(org.id, {
        search: typeof search === "string" ? search : undefined,
        status: typeof status === "string" ? status : undefined,
        skip: skip ? parseInt(String(skip), 10) : undefined,
        take: take ? parseInt(String(take), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.patients,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[DentistryPatientController.listPatients] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar pacientes.",
      });
    }
  }

  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId
   * Obtiene el detalle de un paciente específico de la organización.
   */
  public static async getPatientById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const patient = await PatientService.getPatientById(org.id, patientId);
      if (!patient) {
        return res.status(404).json({ success: false, error: "Paciente no encontrado en esta organización." });
      }

      return res.status(200).json({ success: true, data: patient });
    } catch (error: any) {
      console.error("[DentistryPatientController.getPatientById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener paciente.",
      });
    }
  }

  /**
   * PUT/PATCH /api/organizations/:id/dentistry/patients/:patientId
   * Actualiza los datos de un paciente de la organización desde Odontología.
   */
  public static async updatePatient(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const updated = await PatientService.updatePatient(org.id, patientId, req.body);
      return res.status(200).json({
        success: true,
        message: "Paciente actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[DentistryPatientController.updatePatient] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar paciente.",
      });
    }
  }
}
