import type {
  Patient,
  PatientAnamnesis,
  EmergencyContact,
  Consultation,
  VitalSigns,
  Diagnosis,
  Prescription,
  PrescriptionItem,
  Medication,
  FollowUpTask,
  Allergy,
  Gender,
  PatientStatus,
  LabResult,
  ImagingStudy,
  PreventiveItem,
  ClinicalDocument,
  Appointment,
} from '../../types/clinical.types';
import type {
  ApiPatient,
  ApiMedicalRecord,
  ApiConsultation,
  ApiVitalSigns,
  ApiPrescription,
  ApiFollowUp,
  ApiLaboratoryResult,
  ApiImagingStudy,
  ApiPreventionRecord,
  ApiAppointment,
} from './medicineApi';

/**
 * Normaliza fechas ISO a formato YYYY-MM-DD
 */
export function formatDateYmd(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Mapea la ficha anamnésica de la API al tipo PatientAnamnesis del frontend
 */
export function mapApiRecordToAnamnesis(
  record?: ApiMedicalRecord | null
): PatientAnamnesis | undefined {
  if (!record) return undefined;
  return {
    heightCm: record.heightCm ?? undefined,
    weightKg: record.weightKg ?? undefined,
    bloodType: record.bloodType ?? undefined,
    allergies: record.allergies ?? undefined,
    currentIllnesses: record.currentIllnesses ?? undefined,
    chronicDiseases: record.chronicDiseases ?? undefined,
    currentMedications: record.currentMedications ?? undefined,
    personalHistory: record.personalHistory ?? undefined,
    familyHistory: record.familyHistory ?? undefined,
    previousSurgeries: record.previousSurgeries ?? undefined,
    hospitalizations: record.hospitalizations ?? undefined,
    tobaccoUse: record.tobaccoUse ?? undefined,
    alcoholUse: record.alcoholUse ?? undefined,
    pregnancyStatus: (record.pregnancyStatus as any) ?? undefined,
    gestationalWeeks: record.gestationalWeeks ?? undefined,
    breastfeeding: (record.breastfeeding as any) ?? undefined,
  };
}

/**
 * Mapea ApiPatient a Patient del frontend
 */
export function mapApiPatientToPatient(api: ApiPatient): Patient {
  const anamnesis = mapApiRecordToAnamnesis(api.record);

  const emergencyContact: EmergencyContact | undefined = api.emergencyContact?.name
    ? {
        name: api.emergencyContact.name || '',
        phone: api.emergencyContact.phone || '',
        relationship: api.emergencyContact.relationship || '',
      }
    : undefined;

  return {
    id: String(api.id),
    name: api.name,
    birthDate: formatDateYmd(api.birthDate),
    gender: (api.gender as Gender) || 'UNSPECIFIED',
    idNumber: api.idNumber || '',
    bloodType: api.bloodType || anamnesis?.bloodType || undefined,
    phone: api.phone || undefined,
    email: api.email || undefined,
    address: api.address || undefined,
    anamnesis,
    emergencyContact,
    status: (api.status as PatientStatus) || 'CONTROLADO',
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

/**
 * Mapea el formulario de paciente a CreatePatientInput de la API
 */
export function mapPatientToApi(patient: Partial<Patient>): any {
  return {
    name: patient.name,
    idNumber: patient.idNumber || null,
    birthDate: patient.birthDate || null,
    gender: patient.gender || 'UNSPECIFIED',
    bloodType: patient.bloodType || patient.anamnesis?.bloodType || null,
    phone: patient.phone || null,
    email: patient.email || null,
    address: patient.address || null,
    emergencyContact: patient.emergencyContact || null,
    status: patient.status || 'CONTROLADO',
    anamnesis: patient.anamnesis
      ? {
          heightCm: patient.anamnesis.heightCm ?? null,
          weightKg: patient.anamnesis.weightKg ?? null,
          bloodType: patient.anamnesis.bloodType || null,
          allergies: patient.anamnesis.allergies || null,
          currentIllnesses: patient.anamnesis.currentIllnesses || null,
          chronicDiseases: patient.anamnesis.chronicDiseases || null,
          currentMedications: patient.anamnesis.currentMedications || null,
          personalHistory: patient.anamnesis.personalHistory || null,
          familyHistory: patient.anamnesis.familyHistory || null,
          previousSurgeries: patient.anamnesis.previousSurgeries || null,
          hospitalizations: patient.anamnesis.hospitalizations || null,
          tobaccoUse: patient.anamnesis.tobaccoUse || null,
          alcoholUse: patient.anamnesis.alcoholUse || null,
          pregnancyStatus: patient.anamnesis.pregnancyStatus || null,
          gestationalWeeks: patient.anamnesis.gestationalWeeks ?? null,
          breastfeeding: patient.anamnesis.breastfeeding || null,
        }
      : undefined,
  };
}

/**
 * Extrae alergias del texto anamnésico para alimentar clinicalStore.allergies
 */
export function extractAllergiesFromPatient(patient: Patient): Allergy[] {
  if (!patient.anamnesis?.allergies) return [];
  const parts = patient.anamnesis.allergies.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  return parts.map((substance, idx) => ({
    id: `alg-${patient.id}-${idx}`,
    patientId: patient.id,
    substance,
    severity: 'SEVERE',
    status: 'ACTIVE',
    recordedAt: patient.updatedAt || patient.createdAt,
    recordedBy: 'Historia Clínica',
  }));
}

/**
 * Mapea ApiVitalSigns a VitalSigns del frontend
 */
export function mapApiVitalSignsToVitalSigns(v: ApiVitalSigns): VitalSigns {
  return {
    id: String(v.id),
    patientId: String(v.patientId),
    consultationId: v.consultationId ? String(v.consultationId) : undefined,
    bloodPressureSystolic: v.bloodPressureSystolic ?? undefined,
    bloodPressureDiastolic: v.bloodPressureDiastolic ?? undefined,
    heartRate: v.heartRate ?? undefined,
    temperatureC: v.temperatureC ?? undefined,
    spo2: v.spo2 ?? undefined,
    weightKg: v.weightKg ?? undefined,
    heightCm: v.heightCm ?? undefined,
    measuredAt: v.measuredAt,
  };
}

/**
 * Mapea ApiConsultation a Consultation y genera Diagnóstico y Signos Vitales correspondientes
 */
export function mapApiConsultationToConsultation(api: ApiConsultation): {
  consultation: Consultation;
  vitalSigns?: VitalSigns;
  diagnosis?: Diagnosis;
} {
  const consultationId = String(api.id);
  const patientId = String(api.patientId);

  let vitalSigns: VitalSigns | undefined;
  if (api.vitalSigns && api.vitalSigns.length > 0) {
    vitalSigns = mapApiVitalSignsToVitalSigns(api.vitalSigns[0]);
  }

  let diagnosis: Diagnosis | undefined;
  if (api.cie10Code || api.cie10Description || api.assessment) {
    diagnosis = {
      id: `diag-${api.id}`,
      patientId,
      consultationId,
      cie10Code: api.cie10Code || 'Z00.0',
      description: api.cie10Description || api.assessment || 'Examen médico general',
      type: 'PRIMARY',
      status: 'ACTIVE',
      diagnosedAt: api.date,
    };
  }

  const consultation: Consultation = {
    id: consultationId,
    patientId,
    date: api.date,
    reason: api.reason,
    subjective: api.subjective || '',
    objective: api.objective || '',
    assessment: api.assessment || diagnosis?.description || '',
    plan: api.plan || '',
    vitalSignsId: vitalSigns?.id,
    diagnosisIds: diagnosis ? [diagnosis.id] : [],
    status: (api.status as any) || 'DRAFT',
    createdBy: api.signedBy || 'Profesional Médico',
    createdAt: api.createdAt,
    signedBy: api.signedBy || undefined,
    signedAt: api.signedAt || undefined,
    cie10Code: api.cie10Code || undefined,
    cie10Description: api.cie10Description || undefined,
  };

  return { consultation, vitalSigns, diagnosis };
}

/**
 * Mapea ApiPrescription a Prescription, PrescriptionItem[] y Medication[] del frontend
 */
export function mapApiPrescriptionToPrescription(api: ApiPrescription): {
  prescription: Prescription;
  items: PrescriptionItem[];
  medications: Medication[];
} {
  const prescriptionId = String(api.id);
  const patientId = String(api.patientId);

  const items: PrescriptionItem[] = (api.items || []).map((item) => ({
    id: String(item.id),
    prescriptionId,
    genericName: item.genericName || undefined,
    concentration: item.concentration || undefined,
    pharmaceuticalForm: item.pharmaceuticalForm || undefined,
    medicationName: item.medicationName,
    activeIngredient: item.genericName || undefined,
    presentation: item.pharmaceuticalForm || undefined,
    dose: item.dose,
    frequency: item.frequency,
    route: item.route,
    duration: item.duration || undefined,
    quantity: item.quantity || undefined,
    instructions: item.instructions || undefined,
  }));

  const prescription: Prescription = {
    id: prescriptionId,
    patientId,
    consultationId: api.consultationId ? String(api.consultationId) : undefined,
    diagnosis: api.diagnosis || undefined,
    status: (api.status as any) || 'DRAFT',
    generalInstructions: api.generalInstructions || undefined,
    issuedAt: api.signedAt || api.createdAt,
    signedAt: api.signedAt || undefined,
    signedBy: api.signedBy || undefined,
    itemIds: items.map((i) => i.id),
    createdAt: api.createdAt,
  };

  const medications: Medication[] =
    api.status === 'SIGNED'
      ? items.map((item, idx) => ({
          id: `med-${api.id}-${idx}`,
          patientId,
          name: item.medicationName,
          activeIngredient: item.genericName || item.medicationName,
          presentation: item.pharmaceuticalForm || item.presentation,
          dose: item.dose,
          frequency: item.frequency,
          route: item.route,
          duration: item.duration,
          startDate: formatDateYmd(api.signedAt || api.createdAt),
          status: 'ACTIVE',
          indication: item.instructions,
          prescribedBy: api.signedBy || 'Dr. Roberto Silva',
          sourcePrescriptionId: prescriptionId,
          createdAt: api.createdAt,
          updatedAt: api.updatedAt,
        }))
      : [];

  return { prescription, items, medications };
}

/**
 * Mapea ApiFollowUp a FollowUpTask del frontend
 */
export function mapApiFollowUpToFollowUpTask(api: ApiFollowUp): FollowUpTask {
  return {
    id: String(api.id),
    patientId: String(api.patientId),
    type: (api.type as any) || 'OTHER',
    title: api.title,
    description: api.description || undefined,
    dueDate: api.dueDate,
    priority: (api.priority as any) || 'NORMAL',
    status: (api.status as any) || 'PENDING',
    createdAt: api.createdAt,
    completedAt: api.completedAt || undefined,
  };
}

/**
 * Mapea ApiLaboratoryResult a LabResult del frontend
 */
export function mapApiLaboratoryResultToLabResult(api: ApiLaboratoryResult): LabResult {
  const structuredItems: LabResult['items'] = Array.isArray(api.results)
    ? api.results.map((item: any, idx: number) => {
        let abnormality: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' = 'NORMAL';
        if (item.abnormality) {
          abnormality = item.abnormality;
        } else if (item.isAbnormal) {
          abnormality = 'HIGH';
        }

        const refText =
          item.referenceText ||
          item.referenceRange ||
          (item.referenceLow !== undefined && item.referenceHigh !== undefined
            ? `${item.referenceLow} - ${item.referenceHigh} ${item.unit || ''}`
            : undefined);

        return {
          id: item.id || `litem-${api.id}-${idx + 1}`,
          name: item.name || item.code || `Parámetro ${idx + 1}`,
          value: item.value !== undefined ? String(item.value) : '',
          unit: item.unit || '',
          referenceLow: item.referenceLow,
          referenceHigh: item.referenceHigh,
          referenceText: refText,
          abnormality,
        };
      })
    : [];

  return {
    id: String(api.id),
    labOrderId: api.consultationId ? `cons-${api.consultationId}` : `ord-${api.id}`,
    patientId: String(api.patientId),
    consultationId: api.consultationId ? String(api.consultationId) : undefined,
    testName: api.testName,
    category: api.category || undefined,
    laboratory: api.laboratory || undefined,
    resultDate: api.resultDate,
    status: (api.status as any) || 'READY',
    items: structuredItems,
    notes: api.notes || undefined,
    fileUrl: api.fileUrl || undefined,
    fileName: api.fileName || undefined,
  };
}

/**
 * Mapea ApiImagingStudy a ImagingStudy del frontend
 */
export function mapApiImagingStudyToImagingStudy(api: ApiImagingStudy): ImagingStudy {
  return {
    id: String(api.id),
    patientId: String(api.patientId),
    consultationId: api.consultationId ? String(api.consultationId) : undefined,
    studyType: api.studyType,
    bodyPart: api.bodyPart || undefined,
    performedAt: api.performedAt,
    status: (api.status as any) || 'COMPLETED',
    report: api.report || undefined,
    conclusion: api.conclusion || undefined,
    fileUrl: api.fileUrl || undefined,
    fileName: api.fileName || undefined,
    documentIds: api.fileUrl ? [api.fileUrl] : [],
  };
}

/**
 * Mapea ApiPreventionRecord a PreventiveItem del frontend
 */
export function mapApiPreventionRecordToPreventiveItem(api: ApiPreventionRecord): PreventiveItem {
  return {
    id: String(api.id),
    patientId: String(api.patientId),
    type: (api.type as any) || 'OTHER',
    title: api.title,
    status: (api.status as any) || 'PENDING',
    dueDate: api.dueDate ? api.dueDate.split('T')[0] : undefined,
    completedAt: api.completedAt ? api.completedAt.split('T')[0] : undefined,
    notes: api.notes || undefined,
  };
}

/**
 * Mapea ApiDocument a ClinicalDocument del frontend
 */
export function mapApiDocumentToClinicalDocument(api: any): ClinicalDocument {
  return {
    id: String(api.id),
    patientId: String(api.patientId),
    title: api.title,
    type: api.type || 'OTHER',
    date: api.date ? api.date.split('T')[0] : new Date().toISOString().split('T')[0],
    author: api.author || undefined,
    fileName: api.fileName || 'documento.pdf',
    fileUrl: api.fileUrl || undefined,
    fileSize: api.fileSize || undefined,
    mimeType: api.mimeType || 'application/pdf',
    isMock: false,
  };
}

/**
 * Mapea ApiAppointment a Appointment del frontend
 */
export function mapApiAppointmentToAppointment(api: ApiAppointment): Appointment {
  return {
    id: String(api.id),
    patientId: String(api.patientId),
    date: api.date ? api.date.split('T')[0] : new Date().toISOString().split('T')[0],
    startTime: api.startTime || '08:00',
    endTime: api.endTime || undefined,
    reason: api.reason || '',
    type: (api.type as any) || 'FIRST_CONSULTATION',
    status: (api.status as any) || 'PENDING',
    room: api.room || undefined,
    notes: api.notes || undefined,
    consultationId: api.consultationId ? String(api.consultationId) : undefined,
  };
}



