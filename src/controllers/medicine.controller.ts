import { Request, Response } from "express";
import { MedicineService } from "../services/medicine.service";

export class MedicineController {
  // -------------------------------------------------------------
  // PACIENTES
  // -------------------------------------------------------------

  public static async createPatient(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const patient = await MedicineService.createPatient(org.id, req.body);
      return res.status(201).json({
        success: true,
        message: "Paciente registrado exitosamente.",
        data: patient,
      });
    } catch (error: any) {
      console.error("[MedicineController.createPatient] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar paciente.",
      });
    }
  }

  public static async listPatients(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      if (!org?.id) {
        return res.status(400).json({ success: false, error: "Organización no identificada." });
      }

      const { search, status, skip, take } = req.query;
      const result = await MedicineService.getPatients(org.id, {
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
      console.error("[MedicineController.listPatients] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar pacientes.",
      });
    }
  }

  public static async getPatientById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const patient = await MedicineService.getPatientById(org.id, patientId);
      if (!patient) {
        return res.status(404).json({ success: false, error: "Paciente no encontrado en esta organización." });
      }

      return res.status(200).json({ success: true, data: patient });
    } catch (error: any) {
      console.error("[MedicineController.getPatientById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener paciente.",
      });
    }
  }

  public static async updatePatient(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const updated = await MedicineService.updatePatient(org.id, patientId, req.body);
      return res.status(200).json({
        success: true,
        message: "Paciente actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[MedicineController.updatePatient] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar paciente.",
      });
    }
  }

  // -------------------------------------------------------------
  // FICHA CLÍNICA / ANAMNESIS
  // -------------------------------------------------------------

  public static async getMedicalRecord(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const record = await MedicineService.getMedicalRecord(org.id, patientId);
      return res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      console.error("[MedicineController.getMedicalRecord] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al obtener ficha clínica.",
      });
    }
  }

  public static async upsertMedicalRecord(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const record = await MedicineService.upsertMedicalRecord(org.id, patientId, req.body);
      return res.status(200).json({
        success: true,
        message: "Ficha clínica actualizada exitosamente.",
        data: record,
      });
    } catch (error: any) {
      console.error("[MedicineController.upsertMedicalRecord] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al guardar ficha clínica.",
      });
    }
  }

  // -------------------------------------------------------------
  // CONSULTAS EXTERNAS (SOAP)
  // -------------------------------------------------------------

  public static async createConsultation(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const user = (req as any).user || res.locals.user;
      const fallbackDoctor = user?.name || user?.email;

      const consultation = await MedicineService.createConsultation(org.id, {
        ...req.body,
        patientId,
        signedBy: req.body.status === "SIGNED" ? (req.body.signedBy || fallbackDoctor) : req.body.signedBy,
      });

      return res.status(201).json({
        success: true,
        message: "Consulta registrada exitosamente.",
        data: consultation,
      });
    } catch (error: any) {
      console.error("[MedicineController.createConsultation] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar consulta.",
      });
    }
  }

  public static async listConsultations(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const { patientId, status, skip, take } = req.query;

      const pId = patientId ? parseInt(String(patientId), 10) : (req.params.patientId ? parseInt(String(req.params.patientId), 10) : undefined);

      const result = await MedicineService.getConsultations(org.id, {
        patientId: pId && !isNaN(pId) ? pId : undefined,
        status: typeof status === "string" ? status : undefined,
        skip: skip ? parseInt(String(skip), 10) : undefined,
        take: take ? parseInt(String(take), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.consultations,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[MedicineController.listConsultations] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar consultas.",
      });
    }
  }

  public static async getConsultationById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const consultationId = parseInt(String(req.params.consultationId), 10);
      if (isNaN(consultationId)) {
        return res.status(400).json({ success: false, error: "ID de consulta inválido." });
      }

      const consultation = await MedicineService.getConsultationById(org.id, consultationId);
      if (!consultation) {
        return res.status(404).json({ success: false, error: "Consulta no encontrada en esta organización." });
      }

      return res.status(200).json({ success: true, data: consultation });
    } catch (error: any) {
      console.error("[MedicineController.getConsultationById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener consulta.",
      });
    }
  }

  public static async updateConsultation(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const consultationId = parseInt(String(req.params.consultationId), 10);
      if (isNaN(consultationId)) {
        return res.status(400).json({ success: false, error: "ID de consulta inválido." });
      }

      const user = (req as any).user || res.locals.user;
      const fallbackDoctor = user?.name || user?.email;

      const updated = await MedicineService.updateConsultation(org.id, consultationId, {
        ...req.body,
        signedBy: req.body.status === "SIGNED" ? (req.body.signedBy || fallbackDoctor) : req.body.signedBy,
      });
      return res.status(200).json({
        success: true,
        message: "Consulta actualizada exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[MedicineController.updateConsultation] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar consulta.",
      });
    }
  }

  // -------------------------------------------------------------
  // RECETAS MÉDICAS
  // -------------------------------------------------------------

  public static async createPrescription(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const prescription = await MedicineService.createPrescription(org.id, {
        ...req.body,
        patientId,
      });

      return res.status(201).json({
        success: true,
        message: "Receta emitida/creada exitosamente.",
        data: prescription,
      });
    } catch (error: any) {
      console.error("[MedicineController.createPrescription] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al crear receta médica.",
      });
    }
  }

  public static async listPrescriptions(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const { patientId, status, skip, take } = req.query;

      const pId = patientId ? parseInt(String(patientId), 10) : (req.params.patientId ? parseInt(String(req.params.patientId), 10) : undefined);

      const result = await MedicineService.getPrescriptions(org.id, {
        patientId: pId && !isNaN(pId) ? pId : undefined,
        status: typeof status === "string" ? status : undefined,
        skip: skip ? parseInt(String(skip), 10) : undefined,
        take: take ? parseInt(String(take), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.prescriptions,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[MedicineController.listPrescriptions] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar recetas.",
      });
    }
  }

  public static async getPrescriptionById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const prescriptionId = parseInt(String(req.params.prescriptionId), 10);
      if (isNaN(prescriptionId)) {
        return res.status(400).json({ success: false, error: "ID de receta inválido." });
      }

      const prescription = await MedicineService.getPrescriptionById(org.id, prescriptionId);
      if (!prescription) {
        return res.status(404).json({ success: false, error: "Receta no encontrada en esta organización." });
      }

      return res.status(200).json({ success: true, data: prescription });
    } catch (error: any) {
      console.error("[MedicineController.getPrescriptionById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener receta.",
      });
    }
  }

  public static async updatePrescriptionStatus(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const prescriptionId = parseInt(String(req.params.prescriptionId), 10);
      if (isNaN(prescriptionId)) {
        return res.status(400).json({ success: false, error: "ID de receta inválido." });
      }

      const { status, signedBy } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: "El estado es requerido." });
      }

      const updated = await MedicineService.updatePrescriptionStatus(
        org.id,
        prescriptionId,
        status,
        signedBy
      );

      return res.status(200).json({
        success: true,
        message: "Estado de receta actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[MedicineController.updatePrescriptionStatus] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar estado de la receta.",
      });
    }
  }

  // -------------------------------------------------------------
  // SEGUIMIENTOS CLÍNICOS
  // -------------------------------------------------------------

  public static async createFollowUp(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const followUp = await MedicineService.createFollowUp(org.id, {
        ...req.body,
        patientId,
      });

      return res.status(201).json({
        success: true,
        message: "Tarea de seguimiento registrada exitosamente.",
        data: followUp,
      });
    } catch (error: any) {
      console.error("[MedicineController.createFollowUp] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar seguimiento.",
      });
    }
  }

  public static async listFollowUps(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const { patientId, status, skip, take } = req.query;

      const pId = patientId ? parseInt(String(patientId), 10) : (req.params.patientId ? parseInt(String(req.params.patientId), 10) : undefined);

      const result = await MedicineService.getFollowUps(org.id, {
        patientId: pId && !isNaN(pId) ? pId : undefined,
        status: typeof status === "string" ? status : undefined,
        skip: skip ? parseInt(String(skip), 10) : undefined,
        take: take ? parseInt(String(take), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.followUps,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[MedicineController.listFollowUps] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar seguimientos.",
      });
    }
  }

  public static async updateFollowUp(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const followUpId = parseInt(String(req.params.followUpId), 10);
      if (isNaN(followUpId)) {
        return res.status(400).json({ success: false, error: "ID de seguimiento inválido." });
      }

      const updated = await MedicineService.updateFollowUp(org.id, followUpId, req.body);
      return res.status(200).json({
        success: true,
        message: "Seguimiento actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[MedicineController.updateFollowUp] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar seguimiento.",
      });
    }
  }

  // -------------------------------------------------------------
  // LABORATORIOS
  // -------------------------------------------------------------

  public static async createLaboratoryResult(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId || req.body.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const result = await MedicineService.createLaboratoryResult(org.id, {
        ...req.body,
        patientId,
      });

      return res.status(201).json({
        success: true,
        message: "Resultado de laboratorio registrado exitosamente.",
        data: result,
      });
    } catch (error: any) {
      console.error("[MedicineController.createLaboratoryResult] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar resultado de laboratorio.",
      });
    }
  }

  public static async listLaboratoryResults(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const { patientId, skip, take } = req.query;
      const pId = patientId ? parseInt(String(patientId), 10) : (req.params.patientId ? parseInt(String(req.params.patientId), 10) : undefined);

      const result = await MedicineService.getLaboratoryResults(org.id, {
        patientId: pId && !isNaN(pId) ? pId : undefined,
        skip: skip ? parseInt(String(skip), 10) : undefined,
        take: take ? parseInt(String(take), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.laboratories,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[MedicineController.listLaboratoryResults] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar resultados de laboratorio.",
      });
    }
  }

  public static async getLaboratoryResultById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const labId = parseInt(String(req.params.labId), 10);
      if (isNaN(labId)) {
        return res.status(400).json({ success: false, error: "ID de laboratorio inválido." });
      }

      const lab = await MedicineService.getLaboratoryResultById(org.id, labId);
      if (!lab) {
        return res.status(404).json({ success: false, error: "Resultado de laboratorio no encontrado." });
      }

      return res.status(200).json({ success: true, data: lab });
    } catch (error: any) {
      console.error("[MedicineController.getLaboratoryResultById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener resultado de laboratorio.",
      });
    }
  }

  // -------------------------------------------------------------
  // IMAGENOLOGÍA
  // -------------------------------------------------------------

  public static async createImagingStudy(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId || req.body.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const study = await MedicineService.createImagingStudy(org.id, {
        ...req.body,
        patientId,
      });

      return res.status(201).json({
        success: true,
        message: "Estudio de imagenología registrado exitosamente.",
        data: study,
      });
    } catch (error: any) {
      console.error("[MedicineController.createImagingStudy] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar estudio de imagenología.",
      });
    }
  }

  public static async listImagingStudies(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const { patientId, skip, take } = req.query;
      const pId = patientId ? parseInt(String(patientId), 10) : (req.params.patientId ? parseInt(String(req.params.patientId), 10) : undefined);

      const result = await MedicineService.getImagingStudies(org.id, {
        patientId: pId && !isNaN(pId) ? pId : undefined,
        skip: skip ? parseInt(String(skip), 10) : undefined,
        take: take ? parseInt(String(take), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.studies,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[MedicineController.listImagingStudies] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar estudios de imagenología.",
      });
    }
  }

  public static async getImagingStudyById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const studyId = parseInt(String(req.params.studyId), 10);
      if (isNaN(studyId)) {
        return res.status(400).json({ success: false, error: "ID de estudio inválido." });
      }

      const study = await MedicineService.getImagingStudyById(org.id, studyId);
      if (!study) {
        return res.status(404).json({ success: false, error: "Estudio de imagenología no encontrado." });
      }

      return res.status(200).json({ success: true, data: study });
    } catch (error: any) {
      console.error("[MedicineController.getImagingStudyById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener estudio de imagenología.",
      });
    }
  }

  // -------------------------------------------------------------
  // PREVENCIÓN
  // -------------------------------------------------------------

  public static async createPreventionRecord(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId || req.body.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const record = await MedicineService.createPreventionRecord(org.id, {
        ...req.body,
        patientId,
      });

      return res.status(201).json({
        success: true,
        message: "Registro preventivo guardado exitosamente.",
        data: record,
      });
    } catch (error: any) {
      console.error("[MedicineController.createPreventionRecord] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar prevención.",
      });
    }
  }

  public static async listPreventionRecords(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const { patientId, skip, take } = req.query;
      const pId = patientId ? parseInt(String(patientId), 10) : (req.params.patientId ? parseInt(String(req.params.patientId), 10) : undefined);

      const result = await MedicineService.getPreventionRecords(org.id, {
        patientId: pId && !isNaN(pId) ? pId : undefined,
        skip: skip ? parseInt(String(skip), 10) : undefined,
        take: take ? parseInt(String(take), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.records,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[MedicineController.listPreventionRecords] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar registros preventivos.",
      });
    }
  }

  public static async updatePreventionRecord(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const recordId = parseInt(String(req.params.recordId), 10);
      if (isNaN(recordId)) {
        return res.status(400).json({ success: false, error: "ID de registro inválido." });
      }

      const updated = await MedicineService.updatePreventionRecord(org.id, recordId, req.body);
      return res.status(200).json({
        success: true,
        message: "Registro preventivo actualizado exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[MedicineController.updatePreventionRecord] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar registro preventivo.",
      });
    }
  }

  // -------------------------------------------------------------
  // DOCUMENTOS CLÍNICOS
  // -------------------------------------------------------------

  public static async createDocument(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId || req.body.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const doc = await MedicineService.createDocument(org.id, {
        ...req.body,
        patientId,
      });

      return res.status(201).json({
        success: true,
        message: "Documento adjuntado exitosamente.",
        data: doc,
      });
    } catch (error: any) {
      console.error("[MedicineController.createDocument] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al registrar documento.",
      });
    }
  }

  public static async listDocuments(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const { patientId, skip, take } = req.query;
      const pId = patientId ? parseInt(String(patientId), 10) : (req.params.patientId ? parseInt(String(req.params.patientId), 10) : undefined);

      const result = await MedicineService.getDocuments(org.id, {
        patientId: pId && !isNaN(pId) ? pId : undefined,
        skip: skip ? parseInt(String(skip), 10) : undefined,
        take: take ? parseInt(String(take), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.documents,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[MedicineController.listDocuments] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar documentos.",
      });
    }
  }

  public static async getDocumentById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const documentId = parseInt(String(req.params.documentId), 10);
      if (isNaN(documentId)) {
        return res.status(400).json({ success: false, error: "ID de documento inválido." });
      }

      const doc = await MedicineService.getDocumentById(org.id, documentId);
      if (!doc) {
        return res.status(404).json({ success: false, error: "Documento no encontrado." });
      }

      return res.status(200).json({ success: true, data: doc });
    } catch (error: any) {
      console.error("[MedicineController.getDocumentById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener documento.",
      });
    }
  }

  // -------------------------------------------------------------
  // CITAS MÉDICAS (AGENDA)
  // -------------------------------------------------------------

  public static async createAppointment(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const patientId = parseInt(String(req.params.patientId || req.body.patientId), 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: "ID de paciente inválido." });
      }

      const appointment = await MedicineService.createAppointment(org.id, {
        ...req.body,
        patientId,
      });

      return res.status(201).json({
        success: true,
        message: "Cita médica agendada exitosamente.",
        data: appointment,
      });
    } catch (error: any) {
      console.error("[MedicineController.createAppointment] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al agendar cita médica.",
      });
    }
  }

  public static async listAppointments(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const { patientId, date, startDate, endDate, status, skip, take } = req.query;
      const pId = patientId ? parseInt(String(patientId), 10) : (req.params.patientId ? parseInt(String(req.params.patientId), 10) : undefined);

      const result = await MedicineService.getAppointments(org.id, {
        patientId: pId && !isNaN(pId) ? pId : undefined,
        date: date ? String(date) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        status: status ? String(status) : undefined,
        skip: skip ? parseInt(String(skip), 10) : undefined,
        take: take ? parseInt(String(take), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.appointments,
        total: result.total,
      });
    } catch (error: any) {
      console.error("[MedicineController.listAppointments] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al listar citas médicas.",
      });
    }
  }

  public static async getAppointmentById(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const appointmentId = parseInt(String(req.params.appointmentId), 10);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ success: false, error: "ID de cita médica inválido." });
      }

      const appointment = await MedicineService.getAppointmentById(org.id, appointmentId);
      if (!appointment) {
        return res.status(404).json({ success: false, error: "Cita médica no encontrada." });
      }

      return res.status(200).json({ success: true, data: appointment });
    } catch (error: any) {
      console.error("[MedicineController.getAppointmentById] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al obtener cita médica.",
      });
    }
  }

  public static async updateAppointment(req: Request, res: Response) {
    try {
      const org = (req as any).organization || res.locals.organization;
      const appointmentId = parseInt(String(req.params.appointmentId), 10);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ success: false, error: "ID de cita médica inválido." });
      }

      const updated = await MedicineService.updateAppointment(org.id, appointmentId, req.body);

      return res.status(200).json({
        success: true,
        message: "Cita médica actualizada exitosamente.",
        data: updated,
      });
    } catch (error: any) {
      console.error("[MedicineController.updateAppointment] Error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Error al actualizar cita médica.",
      });
    }
  }
}

