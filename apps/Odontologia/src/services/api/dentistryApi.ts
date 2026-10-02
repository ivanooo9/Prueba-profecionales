import { apiClient } from './apiClient';
import {
  DentalToothEvent,
  DentalProcedure,
  DentalTreatmentPlan,
  DentalTreatmentItem,
  DentalBudget,
  DentalPayment,
  DentalTreatmentExecution,
  CreateTreatmentExecutionInput,
  Prescription,
  DocumentItem,
  DentistryProfessional,
  DentalConsentTemplate,
  DentalConsent,
  CreateConsentInput,
  UpdateConsentDraftInput,
  SignConsentInput,
} from '../../types';

export interface ApiEmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface ApiMedicalRecord {
  id?: number;
  heightCm?: number | null;
  weightKg?: number | null;
  bloodType?: string | null;
  allergies?: string | null;
  currentIllnesses?: string | null;
  chronicDiseases?: string | null;
  currentMedications?: string | null;
  personalHistory?: string | null;
  familyHistory?: string | null;
  previousSurgeries?: string | null;
  hospitalizations?: string | null;
  tobaccoUse?: string | null;
  alcoholUse?: string | null;
  pregnancyStatus?: string | null;
  gestationalWeeks?: number | null;
  breastfeeding?: string | null;
}

export interface ApiPatient {
  id: number;
  organizationId: number;
  name: string;
  idNumber?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: ApiEmergencyContact | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  record?: ApiMedicalRecord | null;
}

export interface CreateDentistryPatientInput {
  name: string;
  idNumber?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: ApiEmergencyContact | null;
  status?: string;
}

export interface UpdateDentistryPatientInput {
  name?: string;
  idNumber?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: ApiEmergencyContact | null;
  status?: string;
}

export const dentistryApi = {
  /**
   * Obtiene la lista de pacientes compartidos de la organización activa.
   */
  async getPatients(
    organizationId: number,
    options?: { search?: string; status?: string }
  ): Promise<ApiPatient[]> {
    const params = new URLSearchParams();
    if (options?.search) params.set('search', options.search);
    if (options?.status) params.set('status', options.status);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await apiClient.get<ApiPatient[]>(
      `/api/organizations/${organizationId}/dentistry/patients${qs}`
    );
    return res.data || [];
  },

  /**
   * Obtiene el detalle de un paciente específico de la organización.
   */
  async getPatientById(
    organizationId: number,
    patientId: number | string
  ): Promise<ApiPatient | null> {
    const res = await apiClient.get<ApiPatient>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}`
    );
    return res.data || null;
  },

  /**
   * Registra un nuevo paciente en la organización desde Odontología.
   */
  async createPatient(
    organizationId: number,
    data: CreateDentistryPatientInput
  ): Promise<ApiPatient> {
    const res = await apiClient.post<ApiPatient>(
      `/api/organizations/${organizationId}/dentistry/patients`,
      data
    );
    return res.data!;
  },

  /**
   * Actualiza los datos de un paciente de la organización desde Odontología.
   */
  async updatePatient(
    organizationId: number,
    patientId: number | string,
    data: UpdateDentistryPatientInput
  ): Promise<ApiPatient> {
    const res = await apiClient.put<ApiPatient>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}`,
      data
    );
    return res.data!;
  },

  /**
   * Obtiene el expediente dental de un paciente (sin efectos secundarios).
   * Si no existe, retorna null sin crearlo.
   */
  async getDentalRecord(
    organizationId: number,
    patientId: number | string
  ): Promise<ApiDentalRecord | null> {
    const res = await apiClient.get<ApiDentalRecord | null>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/record`
    );
    return res.data || null;
  },

  /**
   * Crea o actualiza el expediente odontológico del paciente.
   */
  async saveDentalRecord(
    organizationId: number,
    patientId: number | string,
    data: SaveDentalRecordInput
  ): Promise<ApiDentalRecord> {
    const res = await apiClient.put<ApiDentalRecord>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/record`,
      data
    );
    return res.data!;
  },

  /**
   * Obtiene las piezas persistidas en el odontograma del paciente (estrictamente READ-ONLY).
   */
  async getOdontogram(
    organizationId: number,
    patientId: number | string
  ): Promise<any[]> {
    const res = await apiClient.get<any[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/odontogram`
    );
    return res.data || [];
  },

  /**
   * Guarda o actualiza el estado de una pieza individual en el odontograma mediante upsert atómico.
   */
  async saveToothCondition(
    organizationId: number,
    patientId: number | string,
    toothNumber: number,
    data: {
      state: string;
      surfaces?: Record<string, boolean>;
      notes?: string;
      suggestedTreatment?: string;
    }
  ): Promise<any> {
    const res = await apiClient.put<any>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/odontogram/teeth/${toothNumber}`,
      data
    );
    return res.data!;
  },

  /**
   * Obtiene el historial de eventos inmutable de una pieza dental específica.
   */
  async getToothHistory(
    organizationId: number,
    patientId: number | string,
    toothNumber: number
  ): Promise<DentalToothEvent[]> {
    const res = await apiClient.get<DentalToothEvent[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/odontogram/teeth/${toothNumber}/history`
    );
    return res.data || [];
  },

  /**
   * Obtiene el historial completo de eventos de todas las piezas del paciente.
   */
  async getOdontogramHistory(
    organizationId: number,
    patientId: number | string
  ): Promise<DentalToothEvent[]> {
    const res = await apiClient.get<DentalToothEvent[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/odontogram/history`
    );
    return res.data || [];
  },

  /**
   * Catálogo de procedimientos odontológicos de la organización activa.
   */
  async getProcedures(
    organizationId: number,
    options?: { category?: string; activeOnly?: boolean; search?: string }
  ): Promise<DentalProcedure[]> {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.activeOnly !== undefined) params.set('activeOnly', String(options.activeOnly));
    if (options?.search) params.set('search', options.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<DentalProcedure[]>(
      `/api/organizations/${organizationId}/dentistry/procedures${qs}`
    );
    return res.data || [];
  },

  async createProcedure(
    organizationId: number,
    data: {
      code?: string;
      name: string;
      category?: string;
      defaultPrice?: number;
      estimatedDurationMin?: number;
    }
  ): Promise<DentalProcedure> {
    const res = await apiClient.post<DentalProcedure>(
      `/api/organizations/${organizationId}/dentistry/procedures`,
      data
    );
    return res.data!;
  },

  async updateProcedure(
    organizationId: number,
    procedureId: number,
    data: {
      code?: string;
      name?: string;
      category?: string;
      defaultPrice?: number;
      estimatedDurationMin?: number;
      isActive?: boolean;
    }
  ): Promise<DentalProcedure> {
    const res = await apiClient.put<DentalProcedure>(
      `/api/organizations/${organizationId}/dentistry/procedures/${procedureId}`,
      data
    );
    return res.data!;
  },

  /**
   * Planes de tratamiento del paciente (READ-ONLY, sin efectos colaterales).
   */
  async getTreatmentPlans(
    organizationId: number,
    patientId: number | string
  ): Promise<DentalTreatmentPlan[]> {
    const res = await apiClient.get<DentalTreatmentPlan[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/treatment-plans`
    );
    return res.data || [];
  },

  async getTreatmentPlanById(
    organizationId: number,
    planId: number
  ): Promise<DentalTreatmentPlan | null> {
    const res = await apiClient.get<DentalTreatmentPlan>(
      `/api/organizations/${organizationId}/dentistry/treatment-plans/${planId}`
    );
    return res.data || null;
  },

  async createTreatmentPlan(
    organizationId: number,
    patientId: number | string,
    data: {
      title: string;
      notes?: string;
      status?: string;
    }
  ): Promise<DentalTreatmentPlan> {
    const res = await apiClient.post<DentalTreatmentPlan>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/treatment-plans`,
      data
    );
    return res.data!;
  },

  async updateTreatmentPlan(
    organizationId: number,
    planId: number,
    data: {
      title?: string;
      notes?: string;
      status?: string;
    }
  ): Promise<DentalTreatmentPlan> {
    const res = await apiClient.put<DentalTreatmentPlan>(
      `/api/organizations/${organizationId}/dentistry/treatment-plans/${planId}`,
      data
    );
    return res.data!;
  },

  async addTreatmentItem(
    organizationId: number,
    patientId: number | string,
    planId: number,
    data: {
      procedureId?: number;
      procedureName?: string;
      toothNumber?: number | null;
      quantity?: number;
      unitPrice?: number;
      discount?: number;
      notes?: string;
      status?: string;
    }
  ): Promise<DentalTreatmentItem> {
    const res = await apiClient.post<DentalTreatmentItem>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/treatment-plans/${planId}/items`,
      data
    );
    return res.data!;
  },

  async updateTreatmentItem(
    organizationId: number,
    patientId: number | string,
    planId: number,
    itemId: number,
    data: {
      toothNumber?: number | null;
      quantity?: number;
      unitPrice?: number;
      discount?: number;
      notes?: string;
      status?: string;
    }
  ): Promise<DentalTreatmentItem> {
    const res = await apiClient.put<DentalTreatmentItem>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/treatment-plans/${planId}/items/${itemId}`,
      data
    );
    return res.data!;
  },

  async deleteTreatmentItem(
    organizationId: number,
    patientId: number | string,
    planId: number,
    itemId: number
  ): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.delete<{ success: boolean; message?: string }>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/treatment-plans/${planId}/items/${itemId}`
    );
    return res.data || { success: true };
  },

  // -------------------------------------------------------------
  // PRESUPUESTOS FORMALES Y PAGOS/ABONOS (Fase 7)
  // -------------------------------------------------------------

  async getBudgets(
    organizationId: number,
    patientId: number | string
  ): Promise<DentalBudget[]> {
    const res = await apiClient.get<DentalBudget[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/budgets`
    );
    return res.data || [];
  },

  async getBudgetById(
    organizationId: number,
    patientId: number | string,
    budgetId: number
  ): Promise<DentalBudget> {
    const res = await apiClient.get<DentalBudget>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/budgets/${budgetId}`
    );
    return res.data!;
  },

  async createBudgetFromPlan(
    organizationId: number,
    patientId: number | string,
    planId: number,
    data: {
      title?: string;
      discount?: number;
      notes?: string;
    }
  ): Promise<DentalBudget> {
    const res = await apiClient.post<DentalBudget>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/treatment-plans/${planId}/budgets`,
      data
    );
    return res.data!;
  },

  async updateBudget(
    organizationId: number,
    patientId: number | string,
    budgetId: number,
    data: {
      status?: string;
      notes?: string;
      discount?: number;
    }
  ): Promise<DentalBudget> {
    const res = await apiClient.put<DentalBudget>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/budgets/${budgetId}`,
      data
    );
    return res.data!;
  },

  async recordPayment(
    organizationId: number,
    patientId: number | string,
    budgetId: number,
    data: {
      amount: number;
      paymentMethod?: string;
      reference?: string;
      notes?: string;
    }
  ): Promise<{
    payment: DentalPayment;
    budget: DentalBudget;
    previousPaid: number;
    newPaid: number;
    balance: number;
  }> {
    const res = await apiClient.post<{
      payment: DentalPayment;
      budget: DentalBudget;
      previousPaid: number;
      newPaid: number;
      balance: number;
    }>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/budgets/${budgetId}/payments`,
      data
    );
    return res.data!;
  },

  async getPayments(
    organizationId: number,
    patientId: number | string,
    budgetId: number
  ): Promise<DentalPayment[]> {
    const res = await apiClient.get<DentalPayment[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/budgets/${budgetId}/payments`
    );
    return res.data || [];
  },

  /**
   * Obtiene el historial de ejecuciones clínicas de un ítem de tratamiento.
   */
  async getItemExecutions(
    organizationId: number,
    patientId: number | string,
    planId: number,
    itemId: number
  ): Promise<DentalTreatmentExecution[]> {
    const res = await apiClient.get<DentalTreatmentExecution[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/treatment-plans/${planId}/items/${itemId}/executions`
    );
    return res.data || [];
  },

  /**
   * Registra una nueva ejecución clínica atómica para un ítem de tratamiento.
   */
  async createItemExecution(
    organizationId: number,
    patientId: number | string,
    planId: number,
    itemId: number,
    data: CreateTreatmentExecutionInput
  ): Promise<{
    execution: DentalTreatmentExecution;
    itemStatus: string;
    planStatus: string;
    odontogram?: any;
  }> {
    const res = await apiClient.post<{
      execution: DentalTreatmentExecution;
      itemStatus: string;
      planStatus: string;
      odontogram?: any;
    }>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/treatment-plans/${planId}/items/${itemId}/executions`,
      data
    );
    return res.data!;
  },

  /**
   * Obtiene el historial completo de ejecuciones clínicas del paciente.
   */
  async getPatientExecutions(
    organizationId: number,
    patientId: number | string
  ): Promise<DentalTreatmentExecution[]> {
    const res = await apiClient.get<DentalTreatmentExecution[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/executions`
    );
    return res.data || [];
  },

  // -------------------------------------------------------------
  // RECETAS ODONTOLÓGICAS (Fase 9)
  // -------------------------------------------------------------

  /**
   * Obtiene la lista de recetas odontológicas del paciente.
   */
  async getPrescriptions(
    organizationId: number,
    patientId: number | string,
    status?: string
  ): Promise<Prescription[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await apiClient.get<any[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/prescriptions${query}`
    );
    return (res.data || []).map((rx) => ({
      ...rx,
      medications: rx.items || rx.medications || [],
    }));
  },

  /**
   * Obtiene el detalle de una receta odontológica específica.
   */
  async getPrescriptionById(
    organizationId: number,
    patientId: number | string,
    prescriptionId: number | string
  ): Promise<Prescription | null> {
    const res = await apiClient.get<any>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/prescriptions/${prescriptionId}`
    );
    if (!res.data) return null;
    return {
      ...res.data,
      medications: res.data.items || res.data.medications || [],
    };
  },

  /**
   * Crea una nueva receta odontológica (DRAFT o ISSUED).
   */
  async createPrescription(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<Prescription> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/prescriptions`,
      data
    );
    const rx = res.data!;
    return {
      ...rx,
      medications: rx.items || rx.medications || [],
    };
  },

  /**
   * Actualiza una receta en borrador.
   */
  async updatePrescription(
    organizationId: number,
    patientId: number | string,
    prescriptionId: number | string,
    data: any
  ): Promise<Prescription> {
    const res = await apiClient.put<any>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/prescriptions/${prescriptionId}`,
      data
    );
    const rx = res.data!;
    return {
      ...rx,
      medications: rx.items || rx.medications || [],
    };
  },

  /**
   * Emite y sella formalmente una receta.
   */
  async issuePrescription(
    organizationId: number,
    patientId: number | string,
    prescriptionId: number | string,
    signedBy?: string
  ): Promise<Prescription> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/prescriptions/${prescriptionId}/issue`,
      { signedBy }
    );
    const rx = res.data!;
    return {
      ...rx,
      medications: rx.items || rx.medications || [],
    };
  },

  /**
   * Anula una receta emitida.
   */
  async cancelPrescription(
    organizationId: number,
    patientId: number | string,
    prescriptionId: number | string,
    reason: string
  ): Promise<Prescription> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/prescriptions/${prescriptionId}/cancel`,
      { reason }
    );
    const rx = res.data!;
    return {
      ...rx,
      medications: rx.items || rx.medications || [],
    };
  },

  // -------------------------------------------------------------
  // DOCUMENTOS Y ARCHIVOS CLÍNICOS (Fase 9)
  // -------------------------------------------------------------

  /**
   * Obtiene la lista de documentos clínicos de un paciente o de toda la clínica.
   */
  async getDocuments(
    organizationId: number,
    patientId?: number | string,
    type?: string
  ): Promise<DocumentItem[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', String(patientId));
    if (type) params.append('type', type);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const endpoint = patientId
      ? `/api/organizations/${organizationId}/dentistry/patients/${patientId}/documents${qs}`
      : `/api/organizations/${organizationId}/dentistry/documents${qs}`;

    const res = await apiClient.get<any[]>(endpoint);
    return (res.data || []).map((doc) => ({
      ...doc,
      date: typeof doc.date === 'string' ? doc.date.split('T')[0] : new Date(doc.date).toISOString().split('T')[0],
    }));
  },

  /**
   * Obtiene el detalle de un documento específico.
   */
  async getDocumentById(
    organizationId: number,
    documentId: number | string
  ): Promise<DocumentItem | null> {
    const res = await apiClient.get<any>(
      `/api/organizations/${organizationId}/dentistry/documents/${documentId}`
    );
    return res.data || null;
  },

  /**
   * Registra una ficha documental para un paciente.
   */
  async createDocument(
    organizationId: number,
    patientId: number | string,
    data: any
  ): Promise<DocumentItem> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/documents`,
      data
    );
    const doc = res.data!;
    return {
      ...doc,
      date: typeof doc.date === 'string' ? doc.date.split('T')[0] : new Date(doc.date).toISOString().split('T')[0],
    };
  },

  /**
   * Elimina un documento clínico asegurando tenant.
   */
  async deleteDocument(
    organizationId: number,
    documentId: number | string
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/organizations/${organizationId}/dentistry/documents/${documentId}`
    );
    return res.data || { success: true, message: 'Documento eliminado.' };
  },

  /**
   * Obtiene la lista de profesionales autorizados de la clínica para agendar citas.
   */
  async getDentistryProfessionals(organizationId: number): Promise<DentistryProfessional[]> {
    const res = await apiClient.get<DentistryProfessional[]>(
      `/api/organizations/${organizationId}/dentistry/professionals`
    );
    return res.data || [];
  },

  /**
   * Lista citas odontológicas con filtros opcionales.
   */
  async getAppointments(
    organizationId: number,
    filters: {
      date?: string;
      startDate?: string;
      endDate?: string;
      patientId?: number | string;
      professionalUserId?: number;
      status?: string;
    } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.patientId) params.append('patientId', String(filters.patientId));
    if (filters.professionalUserId) params.append('professionalUserId', String(filters.professionalUserId));
    if (filters.status) params.append('status', filters.status);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any[]>(
      `/api/organizations/${organizationId}/dentistry/appointments${queryStr}`
    );
    return res.data || [];
  },

  /**
   * Obtiene el detalle de una cita específica.
   */
  async getAppointmentById(
    organizationId: number,
    appointmentId: number | string
  ): Promise<any> {
    const res = await apiClient.get<any>(
      `/api/organizations/${organizationId}/dentistry/appointments/${appointmentId}`
    );
    return res.data || null;
  },

  /**
   * Crea una nueva cita odontológica con validación de agenda y profesional.
   */
  async createAppointment(
    organizationId: number,
    data: {
      patientId: number;
      dentalRecordId?: number;
      professionalUserId: number;
      treatmentPlanId?: number | null;
      treatmentItemId?: number | null;
      title?: string | null;
      reason?: string | null;
      type?: string;
      notes?: string | null;
      scheduledAt: string | Date;
      durationMinutes?: number;
      status?: string;
    }
  ): Promise<any> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/dentistry/appointments`,
      data
    );
    return res.data;
  },

  /**
   * Actualiza o reprograma una cita odontológica.
   */
  async updateAppointment(
    organizationId: number,
    appointmentId: number | string,
    data: any
  ): Promise<any> {
    const res = await apiClient.put<any>(
      `/api/organizations/${organizationId}/dentistry/appointments/${appointmentId}`,
      data
    );
    return res.data;
  },

  /**
   * Actualiza el estado de una cita odontológica.
   */
  async updateAppointmentStatus(
    organizationId: number,
    appointmentId: number | string,
    status: string,
    cancellationReason?: string
  ): Promise<any> {
    const res = await apiClient.patch<any>(
      `/api/organizations/${organizationId}/dentistry/appointments/${appointmentId}/status`,
      { status, cancellationReason }
    );
    return res.data;
  },

  /**
   * Cancela una cita con motivo obligatorio.
   */
  async cancelAppointment(
    organizationId: number,
    appointmentId: number | string,
    reason: string
  ): Promise<any> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/dentistry/appointments/${appointmentId}/cancel`,
      { reason }
    );
    return res.data;
  },

  // -------------------------------------------------------------
  // FASE 11: PLANTILLAS DE CONSENTIMIENTO INFORMADO
  // -------------------------------------------------------------

  /**
   * Obtiene la lista de plantillas de consentimiento de la organización.
   */
  async getConsentTemplates(
    organizationId: number,
    params?: { category?: string; isActive?: boolean }
  ): Promise<DentalConsentTemplate[]> {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (typeof params?.isActive === 'boolean') q.append('isActive', String(params.isActive));
    const queryStr = q.toString() ? `?${q.toString()}` : '';

    const res = await apiClient.get<DentalConsentTemplate[]>(
      `/api/organizations/${organizationId}/dentistry/consent-templates${queryStr}`
    );
    return res.data || [];
  },

  /**
   * Obtiene el detalle de una plantilla de consentimiento específica.
   */
  async getConsentTemplateById(
    organizationId: number,
    templateId: number | string
  ): Promise<DentalConsentTemplate> {
    const res = await apiClient.get<DentalConsentTemplate>(
      `/api/organizations/${organizationId}/dentistry/consent-templates/${templateId}`
    );
    return res.data!;
  },

  /**
   * Crea una nueva plantilla de consentimiento.
   */
  async createConsentTemplate(
    organizationId: number,
    data: {
      name: string;
      description?: string | null;
      content: string;
      category?: string | null;
      procedureCode?: string | null;
      isActive?: boolean;
    }
  ): Promise<DentalConsentTemplate> {
    const res = await apiClient.post<DentalConsentTemplate>(
      `/api/organizations/${organizationId}/dentistry/consent-templates`,
      data
    );
    return res.data!;
  },

  /**
   * Modifica una plantilla. Si ya fue usada, el backend creará automáticamente una nueva versión (v_n+1).
   */
  async updateConsentTemplate(
    organizationId: number,
    templateId: number | string,
    data: {
      name?: string;
      description?: string | null;
      content?: string;
      category?: string | null;
      procedureCode?: string | null;
      isActive?: boolean;
    }
  ): Promise<DentalConsentTemplate> {
    const res = await apiClient.put<DentalConsentTemplate>(
      `/api/organizations/${organizationId}/dentistry/consent-templates/${templateId}`,
      data
    );
    return res.data!;
  },

  /**
   * Desactiva una plantilla de consentimiento.
   */
  async deactivateConsentTemplate(
    organizationId: number,
    templateId: number | string
  ): Promise<DentalConsentTemplate> {
    const res = await apiClient.patch<DentalConsentTemplate>(
      `/api/organizations/${organizationId}/dentistry/consent-templates/${templateId}/deactivate`
    );
    return res.data!;
  },

  // -------------------------------------------------------------
  // FASE 11: CONSENTIMIENTOS INFORMADOS CLÍNICOS
  // -------------------------------------------------------------

  /**
   * Lista consentimientos informados con filtros opcionales.
   */
  async getConsents(
    organizationId: number,
    params?: {
      patientId?: number | string;
      status?: string;
      treatmentPlanId?: number | string;
      appointmentId?: number | string;
    }
  ): Promise<DentalConsent[]> {
    const q = new URLSearchParams();
    if (params?.patientId) q.append('patientId', String(params.patientId));
    if (params?.status) q.append('status', params.status);
    if (params?.treatmentPlanId) q.append('treatmentPlanId', String(params.treatmentPlanId));
    if (params?.appointmentId) q.append('appointmentId', String(params.appointmentId));
    const queryStr = q.toString() ? `?${q.toString()}` : '';

    const res = await apiClient.get<DentalConsent[]>(
      `/api/organizations/${organizationId}/dentistry/consents${queryStr}`
    );
    return res.data || [];
  },

  /**
   * Lista consentimientos de un paciente específico.
   */
  async getPatientConsents(
    organizationId: number,
    patientId: number | string,
    params?: { status?: string }
  ): Promise<DentalConsent[]> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    const queryStr = q.toString() ? `?${q.toString()}` : '';

    const res = await apiClient.get<DentalConsent[]>(
      `/api/organizations/${organizationId}/dentistry/patients/${patientId}/consents${queryStr}`
    );
    return res.data || [];
  },

  /**
   * Obtiene detalle de un consentimiento específico.
   */
  async getConsentById(
    organizationId: number,
    consentId: number | string
  ): Promise<DentalConsent> {
    const res = await apiClient.get<DentalConsent>(
      `/api/organizations/${organizationId}/dentistry/consents/${consentId}`
    );
    return res.data!;
  },

  /**
   * Registra un nuevo consentimiento en borrador (DRAFT) congelando los datos del paciente y plantilla.
   */
  async createConsent(
    organizationId: number,
    data: CreateConsentInput
  ): Promise<DentalConsent> {
    const res = await apiClient.post<DentalConsent>(
      `/api/organizations/${organizationId}/dentistry/consents`,
      data
    );
    return res.data!;
  },

  /**
   * Modifica un consentimiento en estado borrador (DRAFT).
   */
  async updateConsentDraft(
    organizationId: number,
    consentId: number | string,
    data: UpdateConsentDraftInput
  ): Promise<DentalConsent> {
    const res = await apiClient.put<DentalConsent>(
      `/api/organizations/${organizationId}/dentistry/consents/${consentId}`,
      data
    );
    return res.data!;
  },

  /**
   * Emite formalmente el consentimiento (DRAFT -> ISSUED) congelando su contenido.
   */
  async issueConsent(
    organizationId: number,
    consentId: number | string,
    professionalName?: string
  ): Promise<DentalConsent> {
    const res = await apiClient.post<DentalConsent>(
      `/api/organizations/${organizationId}/dentistry/consents/${consentId}/issue`,
      { professionalName }
    );
    return res.data!;
  },

  /**
   * Registra la firma del consentimiento por paciente y profesional (ISSUED -> SIGNED).
   */
  async signConsent(
    organizationId: number,
    consentId: number | string,
    data: SignConsentInput
  ): Promise<DentalConsent> {
    const res = await apiClient.post<DentalConsent>(
      `/api/organizations/${organizationId}/dentistry/consents/${consentId}/sign`,
      data
    );
    return res.data!;
  },

  /**
   * Cancela formalmente el consentimiento con motivo obligatorio.
   */
  async cancelConsent(
    organizationId: number,
    consentId: number | string,
    reason: string
  ): Promise<DentalConsent> {
    const res = await apiClient.post<DentalConsent>(
      `/api/organizations/${organizationId}/dentistry/consents/${consentId}/cancel`,
      { reason }
    );
    return res.data!;
  },
};


export interface ApiDentalRecord {
  id?: number;
  organizationId?: number;
  patientId?: number;
  dentalBackground?: string | null;
  chiefComplaint?: string | null;
  evaluationNotes?: string | null;
  diagnosisSummary?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveDentalRecordInput {
  dentalBackground?: string | null;
  chiefComplaint?: string | null;
  evaluationNotes?: string | null;
  diagnosisSummary?: string | null;
}

