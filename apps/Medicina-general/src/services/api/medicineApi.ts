import { apiClient } from './apiClient';

export interface ApiPatient {
  id: number;
  organizationId: number;
  name: string;
  idNumber: string | null;
  birthDate: string | null;
  gender: string | null;
  bloodType: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: { name?: string; phone?: string; relationship?: string } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  record?: ApiMedicalRecord | null;
  _count?: {
    consultations?: number;
    prescriptions?: number;
    followUps?: number;
  };
}

export interface ApiMedicalRecord {
  id: number;
  organizationId: number;
  patientId: number;
  heightCm: number | null;
  weightKg: number | null;
  bloodType: string | null;
  allergies: string | null;
  currentIllnesses: string | null;
  chronicDiseases: string | null;
  currentMedications: string | null;
  personalHistory: string | null;
  familyHistory: string | null;
  previousSurgeries: string | null;
  hospitalizations: string | null;
  tobaccoUse: string | null;
  alcoholUse: string | null;
  pregnancyStatus: string | null;
  gestationalWeeks: number | null;
  breastfeeding: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiVitalSigns {
  id: number;
  organizationId: number;
  patientId: number;
  consultationId: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  temperatureC: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
  measuredAt: string;
  createdAt: string;
}

export interface ApiConsultation {
  id: number;
  organizationId: number;
  patientId: number;
  professionalId: number | null;
  date: string;
  reason: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  cie10Code: string | null;
  cie10Description: string | null;
  status: string;
  signedBy: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: ApiPatient;
  vitalSigns?: ApiVitalSigns[];
  prescriptions?: ApiPrescription[];
  followUps?: ApiFollowUp[];
}

export interface ApiPrescriptionItem {
  id: number;
  prescriptionId: number;
  medicationName: string;
  genericName: string | null;
  concentration: string | null;
  pharmaceuticalForm: string | null;
  dose: string;
  frequency: string;
  route: string;
  duration: string | null;
  quantity: string | null;
  instructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPrescription {
  id: number;
  organizationId: number;
  patientId: number;
  consultationId: number | null;
  diagnosis: string | null;
  generalInstructions: string | null;
  status: string;
  signedBy: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: ApiPrescriptionItem[];
  patient?: ApiPatient;
  consultation?: ApiConsultation;
}

export interface ApiFollowUp {
  id: number;
  organizationId: number;
  patientId: number;
  consultationId: number | null;
  type: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: string;
  status: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: ApiPatient;
}

export interface ApiLaboratoryResult {
  id: number;
  organizationId: number;
  patientId: number;
  consultationId: number | null;
  testName: string;
  category: string | null;
  laboratory: string | null;
  resultDate: string;
  status: string;
  notes: string | null;
  results: any;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiImagingStudy {
  id: number;
  organizationId: number;
  patientId: number;
  consultationId: number | null;
  studyType: string;
  bodyPart: string | null;
  performedAt: string;
  status: string;
  report: string | null;
  conclusion: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPreventionRecord {
  id: number;
  organizationId: number;
  patientId: number;
  type: string;
  title: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDocument {
  id: number;
  organizationId: number;
  patientId: number;
  consultationId: number | null;
  title: string;
  type: string;
  date: string;
  author: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAppointment {
  id: number;
  organizationId: number;
  patientId: number;
  professionalId: number | null;
  consultationId: number | null;
  date: string;
  startTime: string;
  endTime: string | null;
  reason: string;
  type: string;
  status: string;
  room: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: number;
    name: string;
    idNumber: string | null;
    phone: string | null;
    email: string | null;
  };
  consultation?: {
    id: number;
    status: string;
    date: string;
  } | null;
}

export const medicineApi = {
  // -------------------------------------------------------------
  // PACIENTES
  // -------------------------------------------------------------

  async getPatients(
    organizationId: number,
    options?: { search?: string; status?: string; skip?: number; take?: number }
  ): Promise<{ patients: ApiPatient[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.status) params.append('status', options.status);
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiPatient[]>(
      `/api/organizations/${organizationId}/medicine/patients${qs}`
    );
    return {
      patients: res.data || [],
      total: res.total ?? (res.data?.length || 0),
    };
  },

  async getPatientById(
    organizationId: number,
    patientId: number | string
  ): Promise<ApiPatient | null> {
    const res = await apiClient.get<ApiPatient>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}`
    );
    return res.data || null;
  },

  async createPatient(organizationId: number, data: any): Promise<ApiPatient> {
    const res = await apiClient.post<ApiPatient>(
      `/api/organizations/${organizationId}/medicine/patients`,
      data
    );
    return res.data!;
  },

  async updatePatient(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<ApiPatient> {
    const res = await apiClient.put<ApiPatient>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}`,
      data
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // FICHA CLÍNICA / ANAMNESIS
  // -------------------------------------------------------------

  async getMedicalRecord(
    organizationId: number,
    patientId: number | string
  ): Promise<ApiMedicalRecord | null> {
    const res = await apiClient.get<ApiMedicalRecord>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}/record`
    );
    return res.data || null;
  },

  async upsertMedicalRecord(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<ApiMedicalRecord> {
    const res = await apiClient.put<ApiMedicalRecord>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}/record`,
      data
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // CONSULTAS (SOAP)
  // -------------------------------------------------------------

  async getConsultations(
    organizationId: number,
    options?: { patientId?: number | string; status?: string; skip?: number; take?: number }
  ): Promise<{ consultations: ApiConsultation[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.patientId) params.append('patientId', String(options.patientId));
    if (options?.status) params.append('status', options.status);
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiConsultation[]>(
      `/api/organizations/${organizationId}/medicine/consultations${qs}`
    );
    return {
      consultations: res.data || [],
      total: res.total ?? (res.data?.length || 0),
    };
  },

  async getConsultationById(
    organizationId: number,
    consultationId: number | string
  ): Promise<ApiConsultation | null> {
    const res = await apiClient.get<ApiConsultation>(
      `/api/organizations/${organizationId}/medicine/consultations/${consultationId}`
    );
    return res.data || null;
  },

  async createConsultation(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<ApiConsultation> {
    const res = await apiClient.post<ApiConsultation>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}/consultations`,
      data
    );
    return res.data!;
  },

  async updateConsultation(
    organizationId: number,
    consultationId: number | string,
    data: any
  ): Promise<ApiConsultation> {
    const res = await apiClient.put<ApiConsultation>(
      `/api/organizations/${organizationId}/medicine/consultations/${consultationId}`,
      data
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // RECETAS MÉDICAS
  // -------------------------------------------------------------

  async getPrescriptions(
    organizationId: number,
    options?: { patientId?: number | string; status?: string; skip?: number; take?: number }
  ): Promise<{ prescriptions: ApiPrescription[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.patientId) params.append('patientId', String(options.patientId));
    if (options?.status) params.append('status', options.status);
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiPrescription[]>(
      `/api/organizations/${organizationId}/medicine/prescriptions${qs}`
    );
    return {
      prescriptions: res.data || [],
      total: res.total ?? (res.data?.length || 0),
    };
  },

  async getPrescriptionById(
    organizationId: number,
    prescriptionId: number | string
  ): Promise<ApiPrescription | null> {
    const res = await apiClient.get<ApiPrescription>(
      `/api/organizations/${organizationId}/medicine/prescriptions/${prescriptionId}`
    );
    return res.data || null;
  },

  async createPrescription(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<ApiPrescription> {
    const res = await apiClient.post<ApiPrescription>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}/prescriptions`,
      data
    );
    return res.data!;
  },

  async updatePrescriptionStatus(
    organizationId: number,
    prescriptionId: number | string,
    status: string,
    signedBy?: string
  ): Promise<ApiPrescription> {
    const res = await apiClient.put<ApiPrescription>(
      `/api/organizations/${organizationId}/medicine/prescriptions/${prescriptionId}/status`,
      { status, signedBy }
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // SEGUIMIENTOS CLÍNICOS
  // -------------------------------------------------------------

  async getFollowUps(
    organizationId: number,
    options?: { patientId?: number | string; status?: string; skip?: number; take?: number }
  ): Promise<{ followUps: ApiFollowUp[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.patientId) params.append('patientId', String(options.patientId));
    if (options?.status) params.append('status', options.status);
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiFollowUp[]>(
      `/api/organizations/${organizationId}/medicine/follow-ups${qs}`
    );
    return {
      followUps: res.data || [],
      total: res.total ?? (res.data?.length || 0),
    };
  },

  async createFollowUp(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<ApiFollowUp> {
    const res = await apiClient.post<ApiFollowUp>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}/follow-ups`,
      data
    );
    return res.data!;
  },

  async updateFollowUp(
    organizationId: number,
    followUpId: number | string,
    data: { status?: string; completedAt?: string | null }
  ): Promise<ApiFollowUp> {
    const res = await apiClient.put<ApiFollowUp>(
      `/api/organizations/${organizationId}/medicine/follow-ups/${followUpId}`,
      data
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // LABORATORIOS
  // -------------------------------------------------------------

  async getLaboratories(
    organizationId: number,
    options?: { patientId?: number | string; skip?: number; take?: number }
  ): Promise<{ laboratories: ApiLaboratoryResult[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.patientId) params.append('patientId', String(options.patientId));
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiLaboratoryResult[]>(
      `/api/organizations/${organizationId}/medicine/laboratories${qs}`
    );
    return {
      laboratories: res.data || [],
      total: res.total ?? (res.data?.length || 0),
    };
  },

  async createLaboratory(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<ApiLaboratoryResult> {
    const res = await apiClient.post<ApiLaboratoryResult>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}/laboratories`,
      data
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // IMAGENOLOGÍA
  // -------------------------------------------------------------

  async getImagingStudies(
    organizationId: number,
    options?: { patientId?: number | string; skip?: number; take?: number }
  ): Promise<{ studies: ApiImagingStudy[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.patientId) params.append('patientId', String(options.patientId));
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiImagingStudy[]>(
      `/api/organizations/${organizationId}/medicine/imaging${qs}`
    );
    return {
      studies: res.data || [],
      total: res.total ?? (res.data?.length || 0),
    };
  },

  async createImagingStudy(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<ApiImagingStudy> {
    const res = await apiClient.post<ApiImagingStudy>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}/imaging`,
      data
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // PREVENCIÓN
  // -------------------------------------------------------------

  async getPreventionRecords(
    organizationId: number,
    options?: { patientId?: number | string; skip?: number; take?: number }
  ): Promise<{ records: ApiPreventionRecord[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.patientId) params.append('patientId', String(options.patientId));
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiPreventionRecord[]>(
      `/api/organizations/${organizationId}/medicine/prevention${qs}`
    );
    return {
      records: res.data || [],
      total: res.total ?? (res.data?.length || 0),
    };
  },

  async createPreventionRecord(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<ApiPreventionRecord> {
    const res = await apiClient.post<ApiPreventionRecord>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}/prevention`,
      data
    );
    return res.data!;
  },

  async updatePreventionRecord(
    organizationId: number,
    recordId: number | string,
    data: any
  ): Promise<ApiPreventionRecord> {
    const res = await apiClient.put<ApiPreventionRecord>(
      `/api/organizations/${organizationId}/medicine/prevention/${recordId}`,
      data
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // DOCUMENTOS CLÍNICOS
  // -------------------------------------------------------------

  async getDocuments(
    organizationId: number,
    options?: { patientId?: number | string; skip?: number; take?: number }
  ): Promise<{ documents: ApiDocument[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.patientId) params.append('patientId', String(options.patientId));
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiDocument[]>(
      `/api/organizations/${organizationId}/medicine/documents${qs}`
    );
    return {
      documents: res.data || [],
      total: res.total ?? (res.data?.length || 0),
    };
  },

  async createDocument(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<ApiDocument> {
    const res = await apiClient.post<ApiDocument>(
      `/api/organizations/${organizationId}/medicine/patients/${patientId}/documents`,
      data
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // CITAS MÉDICAS (AGENDA)
  // -------------------------------------------------------------

  async getAppointments(
    organizationId: number,
    options?: {
      patientId?: number | string;
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      skip?: number;
      take?: number;
    }
  ): Promise<{ appointments: ApiAppointment[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.patientId) params.append('patientId', String(options.patientId));
    if (options?.date) params.append('date', options.date);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.status) params.append('status', options.status);
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.take !== undefined) params.append('take', String(options.take));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiAppointment[]>(
      `/api/organizations/${organizationId}/medicine/appointments${qs}`
    );
    return {
      appointments: res.data || [],
      total: res.total ?? (res.data?.length || 0),
    };
  },

  async createAppointment(
    organizationId: number,
    data: {
      patientId: number | string;
      date?: string;
      startTime: string;
      endTime?: string;
      reason: string;
      type?: string;
      status?: string;
      room?: string;
      notes?: string;
    }
  ): Promise<ApiAppointment> {
    const res = await apiClient.post<ApiAppointment>(
      `/api/organizations/${organizationId}/medicine/appointments`,
      data
    );
    return res.data!;
  },

  async updateAppointment(
    organizationId: number,
    appointmentId: number | string,
    data: {
      patientId?: number | string;
      date?: string;
      startTime?: string;
      endTime?: string;
      reason?: string;
      type?: string;
      status?: string;
      room?: string;
      notes?: string;
      consultationId?: number | null;
    }
  ): Promise<ApiAppointment> {
    const res = await apiClient.put<ApiAppointment>(
      `/api/organizations/${organizationId}/medicine/appointments/${appointmentId}`,
      data
    );
    return res.data!;
  },
};

