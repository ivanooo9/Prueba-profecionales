// Domain Types for OdontoCare Pro

export type ToothState = 
  | 'Sano' 
  | 'Caries' 
  | 'Restauracion' 
  | 'Ausente' 
  | 'Tratamiento' 
  | 'Corona' 
  | 'Extraccion_Indicada'
  | 'Fractura';

export const TOOTH_STATES: ToothState[] = [
  'Sano',
  'Caries',
  'Restauracion',
  'Ausente',
  'Tratamiento',
  'Corona',
  'Extraccion_Indicada',
  'Fractura',
];

export type ToothSurface = 'mesial' | 'distal' | 'occlusal' | 'vestibular' | 'lingual';

export interface ToothCondition {
  pieceNumber: number;
  state: ToothState;
  surfaces?: {
    mesial?: boolean;
    distal?: boolean;
    occlusal?: boolean;
    vestibular?: boolean;
    lingual?: boolean;
  };
  notes?: string;
  suggestedTreatment?: string;
  updatedAt?: string;
}

export interface DentalToothEvent {
  id: number;
  toothNumber: number;
  eventType: string;
  previousState?: string | null;
  newState: string;
  previousSurfaces?: Record<string, boolean> | null;
  newSurfaces: Record<string, boolean>;
  notes?: string;
  createdAt: string;
}

export interface PatientEmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface PatientAnamnesis {
  height?: string;
  weight?: string;
  bloodType?: string;
  allergies?: string;
  currentDiseases?: string;
  chronicDiseases?: string;
  currentMedications?: string;
  personalMedicalHistory?: string;
  familyHistory?: string;
  previousSurgeries?: string;
  previousHospitalizations?: string;
  tobaccoUse?: string;
  alcoholUse?: string;
  pregnancyStatus?: 'Sí' | 'No' | 'No sabe';
  gestationWeeks?: string;
  breastfeeding?: 'Sí' | 'No';
}

export interface Patient {
  id: string;
  names: string;
  surnames: string;
  identification: string; // CI
  birthDate: string;
  gender: 'Femenino' | 'Masculino' | 'Otro';
  phone: string;
  email: string;
  address: string;
  emergencyContact: PatientEmergencyContact;
  anamnesis?: PatientAnamnesis;
  medicalNotes?: string;
  status: 'Activo' | 'Inactivo' | 'En tratamiento';
  createdAt: string;
  lastVisit?: string;
  nextAppointment?: string;
  avatarUrl?: string;
}

export interface ClinicalHistory {
  patientId: string;
  medicalBackground: string; // Antecedentes médicos relevantes
  allergies: string; // Alergias
  currentMedication: string; // Medicación actual
  dentalBackground: string; // Antecedentes odontológicos
  chiefComplaint: string; // Motivo de consulta
  evaluationNotes: string; // Observaciones y hallazgos
  diagnosisSummary: string; // Diagnóstico general
  updatedAt: string;
}

export type AppointmentType = 
  | 'Consulta' 
  | 'Limpieza' 
  | 'Evaluación' 
  | 'Restauración' 
  | 'Endodoncia' 
  | 'Ortodoncia' 
  | 'Extracción' 
  | 'Control' 
  | 'Otro';

export type AppointmentStatus = 
  | 'Programada' 
  | 'Confirmada' 
  | 'En espera' 
  | 'Atendida' 
  | 'Cancelada' 
  | 'No asistió';

export interface DentistryProfessional {
  userId: number;
  name: string;
  email: string;
  role: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  type: AppointmentType;
  dentist: string;
  professionalUserId?: number;
  status: AppointmentStatus;
  notes?: string;
  treatmentId?: string;
  treatmentPlanId?: number;
  treatmentItemId?: number;
  treatmentPlanTitle?: string;
  treatmentItemProcedure?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt?: string;
}

export type TreatmentStatus = 'Planificado' | 'En progreso' | 'Completado' | 'Suspendido';

export interface Treatment {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  description: string;
  pieceNumbers?: number[];
  startDate: string;
  targetDate?: string;
  progress: number; // 0 to 100
  status: TreatmentStatus;
  estimatedCost: number;
  dentist: string;
}

export interface EvolutionEntry {
  id: string;
  patientId: string;
  date: string;
  consultationType: string;
  procedureDone: string;
  piecesInvolved?: number[];
  notes: string;
  dentist: string;
  outcomeStatus: string;
}

export type BudgetStatus = 'Pendiente' | 'Enviado' | 'Aprobado' | 'Rechazado' | 'Completado';

export interface BudgetItem {
  id: string;
  description: string;
  pieceNumber?: string;
  price: number;
}

export interface Budget {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  date: string;
  items: BudgetItem[];
  totalAmount: number;
  status: BudgetStatus;
  notes?: string;
}

export type DocumentType =
  | 'Radiografía'
  | 'Fotografía'
  | 'Consentimiento'
  | 'Informe'
  | 'Presupuesto'
  | 'Otro'
  | 'RADIOGRAPHY'
  | 'PHOTOGRAPHY'
  | 'CONSENT'
  | 'REPORT'
  | 'BUDGET_ATTACHMENT'
  | 'OTHER';

export interface DocumentItem {
  id: string | number;
  patientId: string | number;
  patientName?: string;
  title: string;
  type: DocumentType;
  date: string;
  description: string;
  fileName?: string;
  fileSize?: string | number | null;
  fileUrl?: string;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  executionId?: number | null;
  uploadedByUserId?: number | null;
  uploadedByUser?: { id: number; name: string; email?: string } | null;
}

export interface Diagnosis {
  id: string;
  patientId: string;
  date: string;
  title: string;
  pieceNumber?: number;
  description: string;
  dentist: string;
  status: 'Activo' | 'Resuelto';
}

export interface PrescriptionItem {
  id?: string | number;
  genericName?: string;
  medicationName?: string;
  concentration?: string;
  pharmaceuticalForm?: string;
  dose: string;
  route?: string;
  frequency: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export type PrescriptionStatus = 'draft' | 'issued' | 'cancelled' | 'DRAFT' | 'ISSUED' | 'CANCELLED';

export interface Prescription {
  id: string | number;
  patientId: string | number;
  treatmentId?: string;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  executionId?: number | null;
  diagnosis?: string;
  procedure?: string;
  medications: PrescriptionItem[];
  generalInstructions?: string;
  status: PrescriptionStatus;
  createdAt: string;
  issuedAt?: string;
  signedBy?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  issuedByUserId?: number | null;
}

export interface MetricItem {
  id: string;
  title: string;
  value: string | number;
  changeText: string;
  isPositive: boolean;
  iconName: string;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: 'appointment' | 'treatment' | 'budget' | 'followup';
  severity: 'normal' | 'urgent';
  patientId?: string;
}

export type ActiveView =
  | 'dashboard'
  | 'patients'
  | 'patient-detail'
  | 'agenda'
  | 'treatments'
  | 'budgets'
  | 'documents'
  | 'reports';

// --- FASE 6: PROCEDIMIENTOS Y PLANES DE TRATAMIENTO ODONTOLÓGICOS ---
export interface DentalProcedure {
  id: number;
  organizationId: number;
  code?: string | null;
  name: string;
  category?: string | null;
  defaultPrice: number;
  estimatedDurationMin?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DentalTreatmentPlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type DentalTreatmentItemStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface DentalTreatmentItem {
  id: number;
  treatmentPlanId: number;
  procedureId?: number | null;
  procedureName: string;
  toothNumber?: number | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  status: DentalTreatmentItemStatus;
  notes?: string | null;
  performedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  procedure?: DentalProcedure | null;
  executions?: DentalTreatmentExecution[];
}

export interface DentalTreatmentPlan {
  id: number;
  organizationId: number;
  dentalRecordId: number;
  title: string;
  notes?: string | null;
  status: DentalTreatmentPlanStatus;
  totalEstimated: number;
  createdAt: string;
  updatedAt: string;
  items: DentalTreatmentItem[];
}

// --- FASE 7: PRESUPUESTOS FORMALES Y PAGOS/ABONOS ---
export type DentalBudgetStatus = 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export type DentalPaymentFinancialStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type DentalPaymentStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export interface DentalBudgetItem {
  id: number;
  budgetId: number;
  treatmentItemId?: number | null;
  procedureName: string;
  toothNumber?: number | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface DentalPayment {
  id: number;
  organizationId: number;
  budgetId: number;
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
  status: DentalPaymentStatus;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DentalBudget {
  id: number;
  organizationId: number;
  dentalRecordId: number;
  treatmentPlanId?: number | null;
  title: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: DentalBudgetStatus;
  paymentStatus: DentalPaymentFinancialStatus;
  notes?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: DentalBudgetItem[];
  payments: DentalPayment[];
}

// --- FASE 8: EJECUCIÓN CLÍNICA Y EVOLUCIÓN DE TRATAMIENTOS ---
export interface DentalTreatmentExecution {
  id: number;
  organizationId: number;
  dentalRecordId: number;
  treatmentPlanId: number;
  treatmentItemId: number;
  performedByUserId?: number | null;
  toothNumber?: number | null;
  procedureName: string;
  clinicalNotes?: string | null;
  performedAt: string;
  createdAt: string;
  performedByUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface CreateTreatmentExecutionInput {
  clinicalNotes?: string | null;
  completed?: boolean;
  performedAt?: string | null;
  odontogramUpdate?: {
    toothNumber?: number;
    state: ToothState;
    surfaces?: Record<ToothSurface, boolean>;
    notes?: string | null;
  } | null;
}

// --- FASE 11: CONSENTIMIENTOS INFORMADOS ODONTOLÓGICOS ---

export type DentalConsentStatus = 'DRAFT' | 'ISSUED' | 'SIGNED' | 'CANCELLED';

export interface DentalConsentTemplate {
  id: number;
  organizationId: number;
  name: string;
  description?: string | null;
  content: string;
  category?: string | null;
  procedureCode?: string | null;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DentalConsent {
  id: number;
  organizationId: number;
  dentalRecordId: number;
  patientId: number;
  templateId?: number | null;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  executionId?: number | null;
  appointmentId?: number | null;

  title: string;
  templateVersion?: number | null;
  contentSnapshot: string;
  status: DentalConsentStatus;

  patientNameSnapshot: string;
  patientIdNumberSnapshot?: string | null;
  professionalNameSnapshot?: string | null;
  issuedByUserId?: number | null;

  signedByPatientName?: string | null;
  signedByProfessionalName?: string | null;
  patientSignatureData?: string | null;
  professionalSignatureData?: string | null;

  issuedAt?: string | null;
  patientSignedAt?: string | null;
  professionalSignedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;

  createdAt: string;
  updatedAt: string;

  template?: {
    id: number;
    name: string;
    version: number;
    category?: string | null;
  } | null;
  treatmentPlan?: {
    id: number;
    title: string;
    status: string;
  } | null;
  treatmentItem?: {
    id: number;
    procedureName: string;
    toothNumber?: number | null;
    status: string;
  } | null;
  appointment?: {
    id: number;
    scheduledAt: string;
    status: string;
    dentistName?: string | null;
  } | null;
  issuedByUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface CreateConsentInput {
  patientId: number;
  templateId?: number | null;
  title?: string | null;
  content?: string | null;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  executionId?: number | null;
  appointmentId?: number | null;
}

export interface UpdateConsentDraftInput {
  title?: string | null;
  content?: string | null;
  treatmentPlanId?: number | null;
  treatmentItemId?: number | null;
  executionId?: number | null;
  appointmentId?: number | null;
}

export interface SignConsentInput {
  signedByPatientName: string;
  signedByProfessionalName: string;
  patientSignatureData?: string | null;
  professionalSignatureData?: string | null;
  patientSignedAt?: string;
  professionalSignedAt?: string;
}

