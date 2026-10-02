export type Gender = 'FEMALE' | 'MALE' | 'OTHER' | 'UNSPECIFIED';

export type PatientStatus = 'CRÓNICO' | 'CONTROLADO' | 'EN ESPERA' | 'ALERTA VITAL' | 'ALTA';

export interface PatientAnamnesis {
  heightCm?: number;
  weightKg?: number;
  bloodType?: string;
  allergies?: string;
  currentIllnesses?: string;
  chronicDiseases?: string;
  currentMedications?: string;
  personalHistory?: string;
  familyHistory?: string;
  previousSurgeries?: string;
  hospitalizations?: string;
  tobaccoUse?: string;
  alcoholUse?: string;
  pregnancyStatus?: 'YES' | 'NO' | 'UNKNOWN';
  gestationalWeeks?: number;
  breastfeeding?: 'YES' | 'NO';
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AlertType = 'ALLERGY' | 'VITAL_RISK' | 'CLINICAL_WARNING' | 'FOLLOW_UP' | 'SYSTEM';

export interface Patient {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD para calcular la edad dinámicamente
  gender: Gender;
  idNumber: string; // Cédula / RUC Ecuador
  bloodType?: string;
  phone?: string;
  email?: string;
  address?: string;
  anamnesis?: PatientAnamnesis;
  emergencyContact?: EmergencyContact;
  status: PatientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  substance: string;
  reaction?: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'UNKNOWN';
  status: 'ACTIVE' | 'RESOLVED' | 'UNCONFIRMED';
  recordedAt: string;
  recordedBy?: string;
}

export interface ClinicalAlert {
  id: string;
  patientId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  sourceId?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  active: boolean;
}

export type ClinicalNotificationType = 'APPOINTMENT' | 'FOLLOW_UP' | 'CLINICAL_ALERT';

export interface ClinicalNotification {
  id: string;
  type: ClinicalNotificationType;
  title: string;
  message: string;
  patientId?: string;
  createdAt: string;
  read: boolean;
}

export interface Diagnosis {
  id: string;
  patientId: string;
  consultationId?: string;
  cie10Code: string;
  description: string;
  type: 'PRIMARY' | 'SECONDARY';
  status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  diagnosedAt: string;
  resolvedAt?: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  consultationId?: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperatureC?: number;
  spo2?: number;
  weightKg?: number;
  heightCm?: number;
  measuredAt: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  appointmentId?: string;
  date: string;
  reason: string;
  subjective: string;
  objective: string;
  vitalSignsId?: string;
  diagnosisIds: string[];
  assessment?: string;
  plan: string;
  status: 'DRAFT' | 'SIGNED' | 'AMENDED';
  createdBy: string;
  createdAt: string;
  signedBy?: string;
  signedAt?: string;
  cie10Code?: string;
  cie10Description?: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  activeIngredient?: string;
  presentation?: string;
  dose: string;
  frequency: string;
  route: string;
  duration?: string;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
  indication?: string;
  prescribedBy: string;
  sourcePrescriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  genericName?: string;
  concentration?: string;
  pharmaceuticalForm?: string;
  medicationName: string;
  activeIngredient?: string;
  presentation?: string;
  dose: string;
  frequency: string;
  route: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export type PrescriptionStatus = 'draft' | 'issued' | 'cancelled';

export interface Prescription {
  id: string;
  patientId: string;
  consultationId?: string;
  treatmentId?: string;
  diagnosis?: string;
  status: 'DRAFT' | 'SIGNED' | 'CANCELLED';
  generalInstructions?: string;
  issuedAt?: string;
  signedAt?: string;
  signedBy?: string;
  sriAccessKey?: string;
  certificateReference?: string;
  itemIds: string[];
  createdAt: string;
}

export interface LabResultItem {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  referenceLow?: number;
  referenceHigh?: number;
  referenceText?: string;
  abnormality?: 'LOW' | 'HIGH' | 'CRITICAL' | 'NORMAL' | 'UNKNOWN';
}

export interface LabResult {
  id: string;
  labOrderId?: string;
  patientId: string;
  consultationId?: string;
  testName: string;
  category?: string;
  laboratory?: string;
  resultDate: string;
  status: 'PENDING' | 'READY' | 'CANCELLED';
  items: LabResultItem[];
  notes?: string;
  fileUrl?: string;
  fileName?: string;
}

export interface ImagingStudy {
  id: string;
  patientId: string;
  consultationId?: string;
  studyType: string;
  bodyPart?: string;
  performedAt: string;
  status: 'ORDERED' | 'COMPLETED' | 'REPORTED';
  report?: string;
  conclusion?: string;
  fileUrl?: string;
  fileName?: string;
  documentIds?: string[];
}

export interface ClinicalDocument {
  id: string;
  patientId: string;
  title: string;
  type: 'LAB_REPORT' | 'IMAGING_REPORT' | 'IMAGE' | 'CERTIFICATE' | 'REFERRAL' | 'INTERCONSULTATION' | 'CONSENT' | 'OTHER';
  date: string;
  author?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  storageReference?: string;
  isMock: boolean;
}

export interface FollowUpTask {
  id: string;
  patientId: string;
  consultationId?: string;
  type: 'REVIEW_LAB' | 'CALL_PATIENT' | 'RENEW_PRESCRIPTION' | 'CONTROL_CHECKUP' | 'OTHER';
  title: string;
  description?: string;
  dueDate: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  createdAt: string;
  completedAt?: string;
  assignedTo?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // Ej: "08:30"
  endTime?: string;
  reason: string;
  type: 'FIRST_CONSULTATION' | 'FOLLOW_UP' | 'EXAM_REVIEW' | 'URGENT';
  status: 'CONFIRMED' | 'PENDING' | 'WAITING_ROOM' | 'IN_CONSULTATION' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW';
  room?: string;
  notes?: string;
  consultationId?: string;
}

export interface PreventiveItem {
  id: string;
  patientId: string;
  type: 'VACCINE' | 'SCREENING' | 'PREVENTIVE_CONTROL' | 'RISK_FACTOR' | 'OTHER';
  title: string;
  status: 'PENDING' | 'UP_TO_DATE' | 'DUE' | 'OVERDUE';
  dueDate?: string;
  completedAt?: string;
  notes?: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
