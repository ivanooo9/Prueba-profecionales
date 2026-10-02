import { useSyncExternalStore } from 'react';
import type {
  Patient,
  Allergy,
  ClinicalAlert,
  Diagnosis,
  VitalSigns,
  Consultation,
  Medication,
  Prescription,
  PrescriptionItem,
  LabResult,
  ImagingStudy,
  ClinicalDocument,
  FollowUpTask,
  Appointment,
  PreventiveItem,
  AuditEvent,
  ClinicalNotification,
} from '../../types/clinical.types';

import {
  organizationApi,
  type Organization,
  type UserSession,
} from '../api/organizationApi';
import { medicineApi } from '../api/medicineApi';
import {
  mapApiPatientToPatient,
  mapPatientToApi,
  extractAllergiesFromPatient,
  mapApiConsultationToConsultation,
  mapApiPrescriptionToPrescription,
  mapApiFollowUpToFollowUpTask,
  mapApiLaboratoryResultToLabResult,
  mapApiImagingStudyToImagingStudy,
  mapApiPreventionRecordToPreventiveItem,
  mapApiDocumentToClinicalDocument,
  mapApiAppointmentToAppointment,
} from '../api/mappers';

export interface ClinicalState {
  patients: Patient[];
  allergies: Allergy[];
  alerts: ClinicalAlert[];
  diagnoses: Diagnosis[];
  vitalSigns: VitalSigns[];
  consultations: Consultation[];
  medications: Medication[];
  prescriptions: Prescription[];
  prescriptionItems: PrescriptionItem[];
  labResults: LabResult[];
  imagingStudies: ImagingStudy[];
  documents: ClinicalDocument[];
  followUpTasks: FollowUpTask[];
  appointments: Appointment[];
  preventiveItems: PreventiveItem[];
  auditEvents: AuditEvent[];
  readNotificationIds: string[];

  // Estados de Integración Core & Multi-Tenant
  currentUser: UserSession | null;
  userOrganizations: Organization[];
  activeOrganization: Organization | null;
  isMedicineEnabled: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const ACTIVE_ORG_STORAGE_KEY = 'medicina-general-active-org-id';

const initialState: ClinicalState = {
  patients: [],
  allergies: [],
  alerts: [],
  diagnoses: [],
  vitalSigns: [],
  consultations: [],
  medications: [],
  prescriptions: [],
  prescriptionItems: [],
  labResults: [],
  imagingStudies: [],
  documents: [],
  followUpTasks: [],
  appointments: [],
  preventiveItems: [],
  auditEvents: [],
  readNotificationIds: [],

  currentUser: null,
  userOrganizations: [],
  activeOrganization: null,
  isMedicineEnabled: false,
  isLoading: true,
  isInitialized: false,
  error: null,
};

let currentState: ClinicalState = { ...initialState };
const listeners = new Set<() => void>();
let loadRequestId = 0;

export const clinicalStore = {
  getState: (): ClinicalState => currentState,

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setState: (updater: (prev: ClinicalState) => ClinicalState): void => {
    currentState = updater(currentState);
    listeners.forEach((listener) => listener());
  },

  // -------------------------------------------------------------
  // INICIALIZACIÓN Y GESTIÓN DE ORGANIZACIÓN (TENANT)
  // -------------------------------------------------------------

  /**
   * Arranca la aplicación: verifica sesión, obtiene organizaciones,
   * selecciona la organización activa y carga los datos clínicos reales desde PostgreSQL.
   */
  init: async (): Promise<void> => {
    clinicalStore.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const user = await organizationApi.getCurrentUser();
      if (!user) {
        clinicalStore.setState((prev) => ({
          ...prev,
          currentUser: null,
          userOrganizations: [],
          activeOrganization: null,
          isMedicineEnabled: false,
          isLoading: false,
          isInitialized: true,
          error: 'No autenticado. Por favor inicie sesión en Profesionales Ecuador.',
        }));
        return;
      }

      const orgs = await organizationApi.getUserOrganizations();
      let targetOrg: Organization | null = null;

      // Recuperar última organización usada si sigue perteneciendo al usuario
      if (typeof window !== 'undefined') {
        const savedIdStr = window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
        if (savedIdStr) {
          const savedId = parseInt(savedIdStr, 10);
          targetOrg = orgs.find((o) => o.id === savedId) || null;
        }
      }

      // Si no hay guardada o ya no es válida, tomar la primera
      if (!targetOrg && orgs.length > 0) {
        targetOrg = orgs[0];
      }

      clinicalStore.setState((prev) => ({
        ...prev,
        currentUser: user,
        userOrganizations: orgs,
        activeOrganization: targetOrg,
      }));

      if (targetOrg) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(targetOrg.id));
        }

        const isEnabled = await organizationApi.isMedicineModuleEnabled(targetOrg.id);
        clinicalStore.setState((prev) => ({
          ...prev,
          isMedicineEnabled: isEnabled,
        }));

        if (isEnabled) {
          await clinicalStore.loadOrganizationData(targetOrg.id);
        } else {
          clinicalStore.setState((prev) => ({
            ...prev,
            isLoading: false,
            isInitialized: true,
          }));
        }
      } else {
        // Usuario sin organización
        clinicalStore.setState((prev) => ({
          ...prev,
          isLoading: false,
          isInitialized: true,
        }));
      }
    } catch (err: any) {
      console.error('[clinicalStore.init] Error en inicialización:', err);
      clinicalStore.setState((prev) => ({
        ...prev,
        isLoading: false,
        isInitialized: true,
        error: err.message || 'Error al conectar con el servidor.',
      }));
    }
  },

  /**
   * Cambia de organización activa con protección contra fuga visual de datos
   * y control estricto de condiciones de carrera.
   */
  switchOrganization: async (organizationId: number): Promise<void> => {
    const org = currentState.userOrganizations.find((o) => o.id === organizationId);
    if (!org) {
      console.error(`Organización con ID ${organizationId} no disponible para el usuario.`);
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(org.id));
    }

    // Paso 1: Limpieza inmediata de datos clínicos del tenant anterior
    clinicalStore.setState((prev) => ({
      ...prev,
      activeOrganization: org,
      patients: [],
      allergies: [],
      alerts: [],
      diagnoses: [],
      vitalSigns: [],
      consultations: [],
      medications: [],
      prescriptions: [],
      prescriptionItems: [],
      followUpTasks: [],
      labResults: [],
      imagingStudies: [],
      preventiveItems: [],
      documents: [],
      isLoading: true,
      error: null,
    }));

    try {
      // Paso 2: Verificar si la nueva organización tiene MEDICINE habilitado
      const isEnabled = await organizationApi.isMedicineModuleEnabled(org.id);
      clinicalStore.setState((prev) => ({
        ...prev,
        isMedicineEnabled: isEnabled,
      }));

      // Paso 3: Cargar datos si está activo
      if (isEnabled) {
        await clinicalStore.loadOrganizationData(org.id);
      } else {
        clinicalStore.setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (err: any) {
      console.error('[clinicalStore.switchOrganization] Error:', err);
      clinicalStore.setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Error al cambiar de organización.',
      }));
    }
  },

  /**
   * Crea una nueva organización y la establece como activa.
   */
  createOrganization: async (name: string, type: string = 'CLINIC'): Promise<Organization> => {
    clinicalStore.setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const newOrg = await organizationApi.createOrganization(name, type);
      const updatedOrgs = [...currentState.userOrganizations, newOrg];

      clinicalStore.setState((prev) => ({
        ...prev,
        userOrganizations: updatedOrgs,
        activeOrganization: newOrg,
        isMedicineEnabled: false,
      }));

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(newOrg.id));
      }

      // Intentar habilitar MEDICINE automáticamente si el usuario acaba de crearla (es OWNER)
      try {
        await organizationApi.enableMedicineModule(newOrg.id);
        clinicalStore.setState((prev) => ({ ...prev, isMedicineEnabled: true }));
        await clinicalStore.loadOrganizationData(newOrg.id);
      } catch (modErr) {
        console.warn('Módulo no habilitado automáticamente:', modErr);
        clinicalStore.setState((prev) => ({ ...prev, isLoading: false }));
      }

      return newOrg;
    } catch (err: any) {
      clinicalStore.setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Error al crear organización.',
      }));
      throw err;
    }
  },

  /**
   * Habilita el módulo MEDICINE en la organización activa.
   */
  enableMedicineModule: async (organizationId?: number): Promise<void> => {
    const orgId = organizationId || currentState.activeOrganization?.id;
    if (!orgId) return;

    clinicalStore.setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await organizationApi.enableMedicineModule(orgId);
      clinicalStore.setState((prev) => ({ ...prev, isMedicineEnabled: true }));
      await clinicalStore.loadOrganizationData(orgId);
    } catch (err: any) {
      clinicalStore.setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Error al habilitar el módulo Medicina General.',
      }));
      throw err;
    }
  },

  /**
   * Carga concurrentemente pacientes, consultas, recetas y seguimientos desde PostgreSQL.
   */
  loadOrganizationData: async (organizationId: number): Promise<void> => {
    const reqId = ++loadRequestId;
    clinicalStore.setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const [
        patientsRes,
        consultationsRes,
        prescriptionsRes,
        followUpsRes,
        labsRes,
        imagingRes,
        preventionRes,
        docsRes,
        appointmentsRes,
      ] = await Promise.all([
        medicineApi.getPatients(organizationId, { take: 100 }),
        medicineApi.getConsultations(organizationId, { take: 100 }),
        medicineApi.getPrescriptions(organizationId, { take: 100 }),
        medicineApi.getFollowUps(organizationId, { take: 100 }),
        medicineApi.getLaboratories(organizationId, { take: 100 }),
        medicineApi.getImagingStudies(organizationId, { take: 100 }),
        medicineApi.getPreventionRecords(organizationId, { take: 100 }),
        medicineApi.getDocuments(organizationId, { take: 100 }),
        medicineApi.getAppointments(organizationId, { take: 200 }),
      ]);

      // Protección contra race conditions si el usuario cambió de organización antes de responder
      if (reqId !== loadRequestId || currentState.activeOrganization?.id !== organizationId) {
        return;
      }

      // Mapear pacientes y extraer alergias
      const mappedPatients: Patient[] = patientsRes.patients.map(mapApiPatientToPatient);
      const allExtractedAllergies: Allergy[] = mappedPatients.flatMap(extractAllergiesFromPatient);

      // Mapear consultas, signos vitales y diagnósticos
      const mappedConsultations: Consultation[] = [];
      const mappedVitalSigns: VitalSigns[] = [];
      const mappedDiagnoses: Diagnosis[] = [];

      for (const apiC of consultationsRes.consultations) {
        const { consultation, vitalSigns, diagnosis } = mapApiConsultationToConsultation(apiC);
        mappedConsultations.push(consultation);
        if (vitalSigns) mappedVitalSigns.push(vitalSigns);
        if (diagnosis) mappedDiagnoses.push(diagnosis);
      }

      // Mapear recetas y fármacos asociados
      const mappedPrescriptions: Prescription[] = [];
      const mappedPrescriptionItems: PrescriptionItem[] = [];
      const mappedMedications: Medication[] = [];

      for (const apiP of prescriptionsRes.prescriptions) {
        const { prescription, items, medications } = mapApiPrescriptionToPrescription(apiP);
        mappedPrescriptions.push(prescription);
        mappedPrescriptionItems.push(...items);
        mappedMedications.push(...medications);
      }

      // Mapear tareas de seguimiento
      const mappedFollowUps: FollowUpTask[] = followUpsRes.followUps.map(mapApiFollowUpToFollowUpTask);

      // Mapear laboratorios, imagenología y registros preventivos
      const mappedLabs: LabResult[] = labsRes.laboratories.map(mapApiLaboratoryResultToLabResult);
      const mappedImaging: ImagingStudy[] = imagingRes.studies.map(mapApiImagingStudyToImagingStudy);
      const mappedPrevention: PreventiveItem[] = preventionRes.records.map(mapApiPreventionRecordToPreventiveItem);

      // Mapear documentos y agregar adjuntos paraclínicos (PDFs de lab e imagen)
      const mappedDocs: ClinicalDocument[] = docsRes.documents.map(mapApiDocumentToClinicalDocument);

      for (const lab of mappedLabs) {
        if (lab.fileUrl && !mappedDocs.some((d) => d.fileUrl === lab.fileUrl)) {
          mappedDocs.push({
            id: `doc-lab-${lab.id}`,
            patientId: lab.patientId,
            title: `Resultado Lab: ${lab.testName}`,
            type: 'LAB_REPORT',
            date: lab.resultDate ? lab.resultDate.split('T')[0] : new Date().toISOString().split('T')[0],
            author: lab.laboratory || 'Laboratorio Clínico',
            fileName: lab.fileName || 'Resultado_Laboratorio.pdf',
            fileUrl: lab.fileUrl,
            mimeType: 'application/pdf',
            isMock: false,
          });
        }
      }

      for (const img of mappedImaging) {
        if (img.fileUrl && !mappedDocs.some((d) => d.fileUrl === img.fileUrl)) {
          mappedDocs.push({
            id: `doc-img-${img.id}`,
            patientId: img.patientId,
            title: `Estudio Imagen: ${img.studyType}`,
            type: 'IMAGING_REPORT',
            date: img.performedAt ? img.performedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            author: 'Centro de Imagenología',
            fileName: img.fileName || 'Informe_Imagen.pdf',
            fileUrl: img.fileUrl,
            mimeType: 'application/pdf',
            isMock: false,
          });
        }
      }

      const mappedAppointments: Appointment[] = appointmentsRes.appointments.map(mapApiAppointmentToAppointment);

      clinicalStore.setState((prev) => ({
        ...prev,
        patients: mappedPatients,
        allergies: allExtractedAllergies,
        consultations: mappedConsultations,
        vitalSigns: mappedVitalSigns,
        diagnoses: mappedDiagnoses,
        prescriptions: mappedPrescriptions,
        prescriptionItems: mappedPrescriptionItems,
        medications: mappedMedications,
        followUpTasks: mappedFollowUps,
        labResults: mappedLabs,
        imagingStudies: mappedImaging,
        preventiveItems: mappedPrevention,
        documents: mappedDocs,
        appointments: mappedAppointments,
        isLoading: false,
        isInitialized: true,
        error: null,
      }));
    } catch (err: any) {
      if (reqId === loadRequestId) {
        console.error('[clinicalStore.loadOrganizationData] Error cargando datos:', err);
        clinicalStore.setState((prev) => ({
          ...prev,
          isLoading: false,
          isInitialized: true,
          error: err.message || 'Error al cargar los datos clínicos de la organización.',
        }));
      }
    }
  },

  // -------------------------------------------------------------
  // MUTACIONES CLÍNICAS (POSTGRESQL + STORE LOCAL)
  // -------------------------------------------------------------

  /**
   * Registra un paciente en el backend y actualiza el store local.
   */
  addPatient: async (newPatient: Patient): Promise<Patient> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const apiPayload = mapPatientToApi(newPatient);
    const created = await medicineApi.createPatient(orgId, apiPayload);
    const mapped = mapApiPatientToPatient(created);
    const allergies = extractAllergiesFromPatient(mapped);

    clinicalStore.setState((prev) => ({
      ...prev,
      patients: [mapped, ...prev.patients.filter((p) => p.id !== mapped.id)],
      allergies: [...allergies, ...prev.allergies.filter((a) => a.patientId !== mapped.id)],
    }));

    return mapped;
  },

  /**
   * Actualiza los datos de un paciente en el backend y en el store local.
   */
  updatePatient: async (updatedPatient: Patient): Promise<Patient> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const apiPayload = mapPatientToApi(updatedPatient);
    const updated = await medicineApi.updatePatient(orgId, updatedPatient.id, apiPayload);
    const mapped = mapApiPatientToPatient(updated);
    const allergies = extractAllergiesFromPatient(mapped);

    clinicalStore.setState((prev) => ({
      ...prev,
      patients: prev.patients.map((p) => (p.id === mapped.id ? mapped : p)),
      allergies: [
        ...allergies,
        ...prev.allergies.filter((a) => a.patientId !== mapped.id),
      ],
    }));

    return mapped;
  },

  /**
   * Guarda o actualiza la ficha anamnésica en el backend.
   */
  saveMedicalRecord: async (patientId: string, anamnesis: any): Promise<void> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    await medicineApi.upsertMedicalRecord(orgId, patientId, anamnesis);
    const refreshed = await medicineApi.getPatientById(orgId, patientId);
    if (refreshed) {
      const mapped = mapApiPatientToPatient(refreshed);
      clinicalStore.setState((prev) => ({
        ...prev,
        patients: prev.patients.map((p) => (p.id === mapped.id ? mapped : p)),
      }));
    }
  },

  /**
   * Registra una consulta médica externa (SOAP) en PostgreSQL.
   */
  addConsultation: async (
    consultation: Consultation,
    vitals?: VitalSigns,
    diagnosis?: Diagnosis
  ): Promise<Consultation> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const payload = {
      date: consultation.date,
      reason: consultation.reason,
      subjective: consultation.subjective,
      objective: consultation.objective,
      assessment: consultation.assessment || diagnosis?.description,
      plan: consultation.plan,
      cie10Code: diagnosis?.cie10Code,
      cie10Description: diagnosis?.description,
      status: consultation.status,
      signedBy: consultation.signedBy,
      vitalSigns: vitals
        ? {
            bloodPressureSystolic: vitals.bloodPressureSystolic,
            bloodPressureDiastolic: vitals.bloodPressureDiastolic,
            heartRate: vitals.heartRate,
            temperatureC: vitals.temperatureC,
            spo2: vitals.spo2,
            weightKg: vitals.weightKg,
            heightCm: vitals.heightCm,
            measuredAt: vitals.measuredAt,
          }
        : undefined,
    };

    const createdApi = await medicineApi.createConsultation(
      orgId,
      consultation.patientId,
      payload
    );
    const { consultation: mappedC, vitalSigns: mappedV, diagnosis: mappedD } =
      mapApiConsultationToConsultation(createdApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      consultations: [mappedC, ...prev.consultations],
      vitalSigns: mappedV ? [mappedV, ...prev.vitalSigns] : prev.vitalSigns,
      diagnoses: mappedD ? [mappedD, ...prev.diagnoses] : prev.diagnoses,
    }));

    // Auto-completar cita si el paciente tenía una cita activa para hoy
    const consultationDateStr = (consultation.date || new Date().toISOString()).split('T')[0];
    const pendingAppointment = currentState.appointments.find(
      (a) =>
        a.patientId === consultation.patientId &&
        a.date === consultationDateStr &&
        ['PENDING', 'WAITING_ROOM', 'IN_CONSULTATION'].includes(a.status)
    );
    if (pendingAppointment) {
      clinicalStore.updateAppointment(pendingAppointment.id, {
        status: 'ATTENDED',
        consultationId: mappedC.id,
      }).catch((e) => console.warn('[addConsultation] No se pudo auto-vincular la cita:', e));
    }

    return mappedC;
  },

  /**
   * Actualiza o firma una consulta médica externa en PostgreSQL.
   */
  updateConsultation: async (
    consultation: Consultation,
    vitals?: VitalSigns,
    diagnosis?: Diagnosis
  ): Promise<Consultation> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const payload = {
      reason: consultation.reason,
      subjective: consultation.subjective,
      objective: consultation.objective,
      assessment: consultation.assessment || diagnosis?.description,
      plan: consultation.plan,
      cie10Code: diagnosis?.cie10Code,
      cie10Description: diagnosis?.description,
      status: consultation.status,
      signedBy: consultation.signedBy,
      vitalSigns: vitals
        ? {
            bloodPressureSystolic: vitals.bloodPressureSystolic,
            bloodPressureDiastolic: vitals.bloodPressureDiastolic,
            heartRate: vitals.heartRate,
            temperatureC: vitals.temperatureC,
            spo2: vitals.spo2,
            weightKg: vitals.weightKg,
            heightCm: vitals.heightCm,
            measuredAt: vitals.measuredAt,
          }
        : undefined,
    };

    const updatedApi = await medicineApi.updateConsultation(orgId, consultation.id, payload);
    const { consultation: mappedC, vitalSigns: mappedV, diagnosis: mappedD } =
      mapApiConsultationToConsultation(updatedApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      consultations: prev.consultations.map((c) => (c.id === mappedC.id ? mappedC : c)),
      vitalSigns: mappedV
        ? [mappedV, ...prev.vitalSigns.filter((v) => v.id !== mappedV.id)]
        : prev.vitalSigns,
      diagnoses: mappedD
        ? [mappedD, ...prev.diagnoses.filter((d) => d.id !== mappedD.id)]
        : prev.diagnoses,
    }));

    // Si la consulta fue firmada, marcar cita pendiente como atendida
    if (mappedC.status === 'SIGNED') {
      const consultationDateStr = (mappedC.date || new Date().toISOString()).split('T')[0];
      const pendingAppointment = currentState.appointments.find(
        (a) =>
          a.patientId === mappedC.patientId &&
          a.date === consultationDateStr &&
          ['PENDING', 'WAITING_ROOM', 'IN_CONSULTATION'].includes(a.status)
      );
      if (pendingAppointment) {
        clinicalStore.updateAppointment(pendingAppointment.id, {
          status: 'ATTENDED',
          consultationId: mappedC.id,
        }).catch((e) => console.warn('[updateConsultation] No se pudo auto-vincular la cita:', e));
      }
    }

    return mappedC;
  },

  /**
   * Registra una receta médica con ítems de medicación en PostgreSQL.
   */
  addPrescription: async (
    prescription: Prescription,
    items: PrescriptionItem[]
  ): Promise<Prescription> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const payload = {
      consultationId: prescription.consultationId
        ? parseInt(prescription.consultationId, 10) || undefined
        : undefined,
      diagnosis: prescription.diagnosis,
      generalInstructions: prescription.generalInstructions,
      status: prescription.status,
      signedBy: prescription.signedBy,
      items: items.map((item) => ({
        medicationName: item.medicationName,
        genericName: item.genericName,
        concentration: item.concentration,
        pharmaceuticalForm: item.pharmaceuticalForm,
        dose: item.dose,
        frequency: item.frequency,
        route: item.route,
        duration: item.duration,
        quantity: item.quantity,
        instructions: item.instructions,
      })),
    };

    const createdApi = await medicineApi.createPrescription(orgId, prescription.patientId, payload);
    const { prescription: mappedP, items: mappedItems, medications: mappedMeds } =
      mapApiPrescriptionToPrescription(createdApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      prescriptions: [mappedP, ...prev.prescriptions],
      prescriptionItems: [...mappedItems, ...prev.prescriptionItems],
      medications: [...mappedMeds, ...prev.medications],
    }));

    return mappedP;
  },

  /**
   * Actualiza el estado de una receta (SIGNED, CANCELLED).
   */
  updatePrescriptionStatus: async (
    prescriptionId: string,
    status: Prescription['status'],
    signedBy?: string
  ): Promise<void> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const updatedApi = await medicineApi.updatePrescriptionStatus(
      orgId,
      prescriptionId,
      status,
      signedBy
    );
    const { prescription: mappedP, medications: mappedMeds } =
      mapApiPrescriptionToPrescription(updatedApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.map((p) => (p.id === mappedP.id ? mappedP : p)),
      medications:
        mappedMeds.length > 0
          ? [...mappedMeds, ...prev.medications.filter((m) => m.sourcePrescriptionId !== prescriptionId)]
          : prev.medications,
    }));
  },

  /**
   * Registra una tarea de seguimiento clínico en PostgreSQL.
   */
  addFollowUpTask: async (task: FollowUpTask): Promise<FollowUpTask> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const payload = {
      consultationId: undefined,
      type: task.type,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
    };

    const createdApi = await medicineApi.createFollowUp(orgId, task.patientId, payload);
    const mapped = mapApiFollowUpToFollowUpTask(createdApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      followUpTasks: [mapped, ...prev.followUpTasks],
    }));

    return mapped;
  },

  /**
   * Actualiza el estado de una tarea de seguimiento (COMPLETED, PENDING).
   */
  updateTaskStatus: async (
    taskId: string,
    status: FollowUpTask['status']
  ): Promise<void> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const updatedApi = await medicineApi.updateFollowUp(orgId, taskId, { status });
    const mapped = mapApiFollowUpToFollowUpTask(updatedApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      followUpTasks: prev.followUpTasks.map((t) => (t.id === mapped.id ? mapped : t)),
    }));
  },

  // -------------------------------------------------------------
  // ACCIONES LOCALES AUXILIARES (AGENDA, PREVENTIVOS, NOTIFICACIONES)
  // -------------------------------------------------------------

  addAppointment: async (appointmentData: {
    id?: string;
    patientId: string;
    date: string;
    startTime: string;
    endTime?: string;
    reason: string;
    type?: any;
    status?: any;
    room?: string;
    notes?: string;
  }): Promise<Appointment> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const createdApi = await medicineApi.createAppointment(orgId, {
      patientId: parseInt(appointmentData.patientId, 10),
      date: appointmentData.date,
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      reason: appointmentData.reason,
      type: appointmentData.type || 'FIRST_CONSULTATION',
      status: appointmentData.status || 'PENDING',
      room: appointmentData.room,
      notes: appointmentData.notes,
    });

    const mapped = mapApiAppointmentToAppointment(createdApi);
    clinicalStore.setState((prev) => ({
      ...prev,
      appointments: [mapped, ...prev.appointments.filter((a) => a.id !== mapped.id)],
    }));
    return mapped;
  },

  updateAppointmentStatus: async (appointmentId: string, status: Appointment['status']): Promise<void> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) return;

    try {
      const updatedApi = await medicineApi.updateAppointment(orgId, appointmentId, { status });
      const mapped = mapApiAppointmentToAppointment(updatedApi);
      clinicalStore.setState((prev) => ({
        ...prev,
        appointments: prev.appointments.map((apt) =>
          apt.id === appointmentId ? mapped : apt
        ),
      }));
    } catch (err) {
      console.error('[clinicalStore.updateAppointmentStatus] Error:', err);
      clinicalStore.setState((prev) => ({
        ...prev,
        appointments: prev.appointments.map((apt) =>
          apt.id === appointmentId ? { ...apt, status } : apt
        ),
      }));
    }
  },

  updateAppointment: async (
    appointmentId: string,
    data: {
      patientId?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      reason?: string;
      type?: any;
      status?: any;
      room?: string;
      notes?: string;
      consultationId?: string | null;
    }
  ): Promise<Appointment> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const updatedApi = await medicineApi.updateAppointment(orgId, appointmentId, {
      patientId: data.patientId ? parseInt(data.patientId, 10) : undefined,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason,
      type: data.type,
      status: data.status,
      room: data.room,
      notes: data.notes,
      consultationId: data.consultationId ? parseInt(data.consultationId, 10) : undefined,
    });

    const mapped = mapApiAppointmentToAppointment(updatedApi);
    clinicalStore.setState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((apt) =>
        apt.id === appointmentId ? mapped : apt
      ),
    }));
    return mapped;
  },

  /**
   * Registra un resultado de laboratorio clínico en PostgreSQL.
   */
  addLabResult: async (
    lab: {
      patientId: string;
      consultationId?: string;
      testName: string;
      category?: string;
      laboratory?: string;
      resultDate?: string;
      status?: 'PENDING' | 'READY' | 'CANCELLED';
      notes?: string;
      items?: any[];
      file?: string | null;
      fileName?: string | null;
    }
  ): Promise<LabResult> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const payload = {
      consultationId: lab.consultationId ? parseInt(lab.consultationId, 10) : undefined,
      testName: lab.testName,
      category: lab.category,
      laboratory: lab.laboratory,
      resultDate: lab.resultDate,
      status: lab.status || 'READY',
      notes: lab.notes,
      results: lab.items,
      file: lab.file,
      fileName: lab.fileName,
    };

    const createdApi = await medicineApi.createLaboratory(orgId, lab.patientId, payload);
    const mapped = mapApiLaboratoryResultToLabResult(createdApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      labResults: [mapped, ...prev.labResults],
    }));

    return mapped;
  },

  /**
   * Registra un estudio de imagenología en PostgreSQL.
   */
  addImagingStudy: async (
    study: {
      patientId: string;
      consultationId?: string;
      studyType: string;
      bodyPart?: string;
      performedAt?: string;
      status?: 'ORDERED' | 'COMPLETED' | 'REPORTED';
      report?: string;
      conclusion?: string;
      file?: string | null;
      fileName?: string | null;
    }
  ): Promise<ImagingStudy> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const payload = {
      consultationId: study.consultationId ? parseInt(study.consultationId, 10) : undefined,
      studyType: study.studyType,
      bodyPart: study.bodyPart,
      performedAt: study.performedAt,
      status: study.status || 'COMPLETED',
      report: study.report,
      conclusion: study.conclusion,
      file: study.file,
      fileName: study.fileName,
    };

    const createdApi = await medicineApi.createImagingStudy(orgId, study.patientId, payload);
    const mapped = mapApiImagingStudyToImagingStudy(createdApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      imagingStudies: [mapped, ...prev.imagingStudies],
    }));

    return mapped;
  },

  /**
   * Registra un ítem o control preventivo en PostgreSQL.
   */
  addPreventiveItem: async (
    item: {
      patientId: string;
      type?: string;
      title: string;
      status?: 'PENDING' | 'UP_TO_DATE' | 'DUE' | 'OVERDUE';
      dueDate?: string;
      completedAt?: string;
      notes?: string;
    }
  ): Promise<PreventiveItem> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const payload = {
      type: item.type || 'OTHER',
      title: item.title,
      status: item.status || 'PENDING',
      dueDate: item.dueDate || undefined,
      completedAt: item.completedAt || undefined,
      notes: item.notes,
    };

    const createdApi = await medicineApi.createPreventionRecord(orgId, item.patientId, payload);
    const mapped = mapApiPreventionRecordToPreventiveItem(createdApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      preventiveItems: [mapped, ...prev.preventiveItems],
    }));

    return mapped;
  },

  /**
   * Actualiza el estado de un registro preventivo en PostgreSQL.
   */
  updatePreventiveItem: async (
    itemId: string,
    data: { status?: string; completedAt?: string | null; notes?: string }
  ): Promise<void> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const updatedApi = await medicineApi.updatePreventionRecord(orgId, itemId, data);
    const mapped = mapApiPreventionRecordToPreventiveItem(updatedApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      preventiveItems: prev.preventiveItems.map((p) => (p.id === mapped.id ? mapped : p)),
    }));
  },

  /**
   * Adjunta y persiste un documento clínico (PDF) en PostgreSQL y Cloudinary.
   */
  addDocument: async (doc: {
    patientId: string;
    consultationId?: string;
    title: string;
    type?: string;
    date?: string;
    author?: string;
    fileName: string;
    file?: string | null;
    fileUrl?: string | null;
    fileSize?: number;
    mimeType?: string;
  }): Promise<ClinicalDocument> => {
    const orgId = currentState.activeOrganization?.id;
    if (!orgId) throw new Error('No hay una organización activa seleccionada.');

    const payload = {
      consultationId: doc.consultationId ? parseInt(doc.consultationId, 10) : undefined,
      title: doc.title,
      type: doc.type || 'OTHER',
      date: doc.date || new Date().toISOString(),
      author: doc.author,
      fileName: doc.fileName,
      file: doc.file,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType || 'application/pdf',
    };

    const createdApi = await medicineApi.createDocument(orgId, doc.patientId, payload);
    const mapped = mapApiDocumentToClinicalDocument(createdApi);

    clinicalStore.setState((prev) => ({
      ...prev,
      documents: [mapped, ...prev.documents],
    }));

    return mapped;
  },

  markNotificationRead: (notificationId: string): void => {
    clinicalStore.setState((prev) =>
      prev.readNotificationIds.includes(notificationId)
        ? prev
        : { ...prev, readNotificationIds: [...prev.readNotificationIds, notificationId] }
    );
  },

  markAllNotificationsRead: (notifications: ClinicalNotification[]): void => {
    clinicalStore.setState((prev) => ({
      ...prev,
      readNotificationIds: Array.from(
        new Set([...prev.readNotificationIds, ...notifications.map((n) => n.id)])
      ),
    }));
  },
};

export function useClinicalStore<T = ClinicalState>(selector?: (state: ClinicalState) => T): T {
  const storeState = useSyncExternalStore(
    clinicalStore.subscribe,
    clinicalStore.getState,
    clinicalStore.getState
  );
  return selector ? selector(storeState) : (storeState as unknown as T);
}
