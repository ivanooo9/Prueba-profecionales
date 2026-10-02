export const MEDICINE_MODULE_CODE = "MEDICINE";

export const MEDICAL_PATIENT_STATUS = {
  CONTROLADO: "CONTROLADO",
  EN_ESPERA: "EN ESPERA",
  CRONICO: "CRÓNICO",
  ALTA: "ALTA",
  ALERTA_VITAL: "ALERTA VITAL",
} as const;

export type MedicalPatientStatus =
  (typeof MEDICAL_PATIENT_STATUS)[keyof typeof MEDICAL_PATIENT_STATUS];

export const MEDICAL_CONSULTATION_STATUS = {
  DRAFT: "DRAFT",
  SIGNED: "SIGNED",
  CANCELLED: "CANCELLED",
} as const;

export type MedicalConsultationStatus =
  (typeof MEDICAL_CONSULTATION_STATUS)[keyof typeof MEDICAL_CONSULTATION_STATUS];

export const MEDICAL_PRESCRIPTION_STATUS = {
  DRAFT: "DRAFT",
  SIGNED: "SIGNED",
  CANCELLED: "CANCELLED",
} as const;

export type MedicalPrescriptionStatus =
  (typeof MEDICAL_PRESCRIPTION_STATUS)[keyof typeof MEDICAL_PRESCRIPTION_STATUS];

export const MEDICAL_FOLLOW_UP_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type MedicalFollowUpStatus =
  (typeof MEDICAL_FOLLOW_UP_STATUS)[keyof typeof MEDICAL_FOLLOW_UP_STATUS];

export const MEDICAL_FOLLOW_UP_PRIORITY = {
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export type MedicalFollowUpPriority =
  (typeof MEDICAL_FOLLOW_UP_PRIORITY)[keyof typeof MEDICAL_FOLLOW_UP_PRIORITY];

export const MEDICAL_GENDER = {
  FEMALE: "FEMALE",
  MALE: "MALE",
  OTHER: "OTHER",
  UNSPECIFIED: "UNSPECIFIED",
} as const;

export type MedicalGender =
  (typeof MEDICAL_GENDER)[keyof typeof MEDICAL_GENDER];
