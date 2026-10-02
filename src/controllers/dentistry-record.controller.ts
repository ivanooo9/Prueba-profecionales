import { Request, Response } from "express";
import { DentistryRecordService } from "../services/dentistry-record.service";

export class DentistryRecordController {
  /**
   * GET /api/organizations/:id/dentistry/patients/:patientId/record
   * Obtiene el expediente dental del paciente.
   * Regla View sin efectos secundarios: si el paciente no tiene expediente dental,
   * retorna 200 con data: null sin crear registros en la base de datos.
   */
  public static async getDentalRecord(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const record = await DentistryRecordService.getDentalRecord(org.id, patientId);
      return res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      console.error("[DentistryRecordController.getDentalRecord] Error:", error);
      if (error.message?.includes("Paciente no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener expediente odontológico.",
      });
    }
  }

  /**
   * PUT/PATCH /api/organizations/:id/dentistry/patients/:patientId/record
   * Crea o actualiza el expediente odontológico del paciente (DentalRecord).
   */
  public static async upsertDentalRecord(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const record = await DentistryRecordService.upsertDentalRecord(
        org.id,
        patientId,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Expediente odontológico guardado exitosamente.",
        data: record,
      });
    } catch (error: any) {
      console.error("[DentistryRecordController.upsertDentalRecord] Error:", error);
      if (error.message?.includes("Paciente no encontrado")) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({
        success: false,
        error: error.message || "Error al guardar expediente odontológico.",
      });
    }
  }
}
