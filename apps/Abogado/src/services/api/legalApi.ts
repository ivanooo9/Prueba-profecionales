import { apiClient } from './apiClient';
import {
  Client,
  LegalCase,
  CaseActivity,
  LegalTask,
  ProceduralDeadline,
  Hearing,
  LegalDocument,
  LegalDocumentVersion,
  LegalFeeAgreement,
  LegalFeeItem,
  LegalPayment,
  LegalCalendarEntry,
  LegalReminder,
  LegalNotification,
  LegalDashboardDTO,
  LegalReportsDTO,
  ClosureCheckDTO,
  CloseCaseInput,
  ArchiveCaseInput,
} from '../../types';

export const legalApi = {
  // --- CLIENTES JURÍDICOS ---
  async getClients(
    organizationId: number,
    filters?: { search?: string; status?: string; clientType?: string }
  ): Promise<Client[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.clientType && filters.clientType !== 'todos') params.set('clientType', filters.clientType);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<Client[]>(`/api/organizations/${organizationId}/legal/clients${query}`);
    return res.data || [];
  },

  async getClientById(organizationId: number, clientId: string | number): Promise<Client | null> {
    const res = await apiClient.get<Client>(`/api/organizations/${organizationId}/legal/clients/${clientId}`);
    return res.data || null;
  },

  async createClient(
    organizationId: number,
    data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Client> {
    const res = await apiClient.post<Client>(`/api/organizations/${organizationId}/legal/clients`, data);
    if (!res.data) throw new Error(res.error || 'Error al crear cliente');
    return res.data;
  },

  async updateClient(
    organizationId: number,
    clientId: string | number,
    data: Partial<Client>
  ): Promise<Client> {
    const res = await apiClient.put<Client>(`/api/organizations/${organizationId}/legal/clients/${clientId}`, data);
    if (!res.data) throw new Error(res.error || 'Error al actualizar cliente');
    return res.data;
  },

  // --- CASOS / EXPEDIENTES JURÍDICOS ---
  async getCases(
    organizationId: number,
    filters?: { clientId?: string | number; status?: string; legalArea?: string; search?: string }
  ): Promise<LegalCase[]> {
    const params = new URLSearchParams();
    if (filters?.clientId) params.set('clientId', String(filters.clientId));
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.legalArea && filters.legalArea !== 'todos') params.set('legalArea', filters.legalArea);
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<LegalCase[]>(`/api/organizations/${organizationId}/legal/cases${query}`);
    return res.data || [];
  },

  async getCasesByClient(organizationId: number, clientId: string | number): Promise<LegalCase[]> {
    const res = await apiClient.get<LegalCase[]>(`/api/organizations/${organizationId}/legal/clients/${clientId}/cases`);
    return res.data || [];
  },

  async getCaseById(organizationId: number, caseId: string | number): Promise<LegalCase | null> {
    const res = await apiClient.get<LegalCase>(`/api/organizations/${organizationId}/legal/cases/${caseId}`);
    return res.data || null;
  },

  /**
   * RUTA CANÓNICA ÚNICA PARA CREAR CASOS:
   * POST /api/organizations/:id/legal/clients/:clientId/cases
   * Garantiza la regla: PRIMERO CLIENTE -> DESPUÉS CASO
   */
  async createCaseForClient(
    organizationId: number,
    clientId: string | number,
    data: Omit<LegalCase, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LegalCase> {
    const res = await apiClient.post<LegalCase>(
      `/api/organizations/${organizationId}/legal/clients/${clientId}/cases`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al crear caso jurídico');
    return res.data;
  },

  async updateCase(
    organizationId: number,
    caseId: string | number,
    data: Partial<LegalCase>
  ): Promise<LegalCase> {
    const res = await apiClient.put<LegalCase>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar caso jurídico');
    return res.data;
  },

  // --- ACTUACIONES / BITÁCORA (CaseActivity) ---
  async getCaseActivities(
    organizationId: number,
    caseId: string | number
  ): Promise<CaseActivity[]> {
    const res = await apiClient.get<CaseActivity[]>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/activities`
    );
    return res.data || [];
  },

  async createCaseActivity(
    organizationId: number,
    caseId: string | number,
    data: {
      type: CaseActivity['type'];
      title: string;
      description?: string;
      occurredAt?: string;
      performedBy?: string;
    }
  ): Promise<CaseActivity> {
    const res = await apiClient.post<CaseActivity>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/activities`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al registrar la actuación');
    return res.data;
  },

  // --- TAREAS OPERATIVAS (LegalTask) ---
  async getTasks(
    organizationId: number,
    filters?: { caseId?: string | number; status?: string; priority?: string }
  ): Promise<LegalTask[]> {
    const params = new URLSearchParams();
    if (filters?.caseId) params.set('caseId', String(filters.caseId));
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.priority && filters.priority !== 'todos') params.set('priority', filters.priority);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<LegalTask[]>(
      `/api/organizations/${organizationId}/legal/tasks${query}`
    );
    return res.data || [];
  },

  async getCaseTasks(
    organizationId: number,
    caseId: string | number
  ): Promise<LegalTask[]> {
    const res = await apiClient.get<LegalTask[]>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/tasks`
    );
    return res.data || [];
  },

  async createCaseTask(
    organizationId: number,
    caseId: string | number,
    data: Omit<LegalTask, 'id' | 'createdAt'>
  ): Promise<LegalTask> {
    const res = await apiClient.post<LegalTask>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/tasks`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al crear tarea operativa');
    return res.data;
  },

  async updateCaseTask(
    organizationId: number,
    caseId: string | number,
    taskId: string | number,
    data: Partial<LegalTask>
  ): Promise<LegalTask> {
    const res = await apiClient.put<LegalTask>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/tasks/${taskId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar tarea operativa');
    return res.data;
  },

  // --- PLAZOS PROCESALES (ProceduralDeadline) ---
  async getDeadlines(
    organizationId: number,
    filters?: { caseId?: string | number; status?: string; urgent?: boolean }
  ): Promise<ProceduralDeadline[]> {
    const params = new URLSearchParams();
    if (filters?.caseId) params.set('caseId', String(filters.caseId));
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.urgent !== undefined) params.set('urgent', String(filters.urgent));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ProceduralDeadline[]>(
      `/api/organizations/${organizationId}/legal/deadlines${query}`
    );
    return res.data || [];
  },

  async getCaseDeadlines(
    organizationId: number,
    caseId: string | number
  ): Promise<ProceduralDeadline[]> {
    const res = await apiClient.get<ProceduralDeadline[]>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/deadlines`
    );
    return res.data || [];
  },

  async createCaseDeadline(
    organizationId: number,
    caseId: string | number,
    data: Omit<ProceduralDeadline, 'id' | 'createdAt'>
  ): Promise<ProceduralDeadline> {
    const res = await apiClient.post<ProceduralDeadline>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/deadlines`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al registrar plazo procesal');
    return res.data;
  },

  async updateCaseDeadline(
    organizationId: number,
    caseId: string | number,
    deadlineId: string | number,
    data: Partial<ProceduralDeadline>
  ): Promise<ProceduralDeadline> {
    const res = await apiClient.put<ProceduralDeadline>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/deadlines/${deadlineId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar plazo procesal');
    return res.data;
  },

  // --- AUDIENCIAS Y DILIGENCIAS (Hearing) ---
  async getHearings(
    organizationId: number,
    filters?: { caseId?: string | number; status?: string; from?: string; to?: string }
  ): Promise<Hearing[]> {
    const params = new URLSearchParams();
    if (filters?.caseId) params.set('caseId', String(filters.caseId));
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<Hearing[]>(
      `/api/organizations/${organizationId}/legal/hearings${query}`
    );
    return res.data || [];
  },

  async getCaseHearings(
    organizationId: number,
    caseId: string | number
  ): Promise<Hearing[]> {
    const res = await apiClient.get<Hearing[]>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/hearings`
    );
    return res.data || [];
  },

  async createCaseHearing(
    organizationId: number,
    caseId: string | number,
    data: Omit<Hearing, 'id' | 'createdAt'>
  ): Promise<Hearing> {
    const res = await apiClient.post<Hearing>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/hearings`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al programar audiencia');
    return res.data;
  },

  async updateCaseHearing(
    organizationId: number,
    caseId: string | number,
    hearingId: string | number,
    data: Partial<Hearing>
  ): Promise<Hearing> {
    const res = await apiClient.put<Hearing>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/hearings/${hearingId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar audiencia');
    return res.data;
  },

  // --- DOCUMENTOS Y VERSIONES (LegalDocument & LegalDocumentVersion) ---
  async getCaseDocuments(
    organizationId: number,
    caseId: string | number,
    filters?: { status?: string; documentType?: string; search?: string }
  ): Promise<LegalDocument[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.documentType && filters.documentType !== 'todos') params.set('documentType', filters.documentType);
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any[]>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/documents${query}`
    );

    const rawList = res.data || [];
    return rawList.map((doc) => ({
      id: String(doc.id),
      caseId: String(doc.legalCaseId),
      caseNumber: doc.legalCase?.caseNumber || '',
      caseTitle: doc.legalCase?.title || '',
      clientId: String(doc.legalCase?.clientId || ''),
      name: doc.title,
      type: doc.documentType,
      fileExtension: doc.latestVersion?.fileName?.split('.').pop() || 'pdf',
      status: doc.status,
      description: doc.description || '',
      date: (doc.createdAt || '').split('T')[0],
      uploadDate: (doc.createdAt || '').split('T')[0],
      uploadedBy: doc.createdByUser?.name || 'Abogado Responsable',
      createdAt: doc.createdAt,
      versionCount: doc.versionCount || doc.versions?.length || 1,
      latestVersion: doc.latestVersion || doc.versions?.[0] || null,
      versions: doc.versions || [],
      fileUrl: doc.latestVersion?.fileUrl || null,
    }));
  },

  async getDocumentById(
    organizationId: number,
    caseId: string | number,
    documentId: string | number
  ): Promise<LegalDocument | null> {
    const res = await apiClient.get<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/documents/${documentId}`
    );
    if (!res.data) return null;

    const doc = res.data;
    return {
      id: String(doc.id),
      caseId: String(doc.legalCaseId),
      caseNumber: doc.legalCase?.caseNumber || '',
      caseTitle: doc.legalCase?.title || '',
      clientId: String(doc.legalCase?.clientId || ''),
      name: doc.title,
      type: doc.documentType,
      fileExtension: doc.latestVersion?.fileName?.split('.').pop() || 'pdf',
      status: doc.status,
      description: doc.description || '',
      date: (doc.createdAt || '').split('T')[0],
      uploadDate: (doc.createdAt || '').split('T')[0],
      uploadedBy: doc.createdByUser?.name || 'Abogado Responsable',
      createdAt: doc.createdAt,
      versionCount: doc.versionCount || doc.versions?.length || 1,
      latestVersion: doc.latestVersion || doc.versions?.[0] || null,
      versions: doc.versions || [],
      fileUrl: doc.latestVersion?.fileUrl || null,
    };
  },

  async createCaseDocument(
    organizationId: number,
    caseId: string | number,
    payload: FormData | any
  ): Promise<LegalDocument> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/documents`,
      payload
    );
    if (!res.data) throw new Error(res.error || 'Error al crear documento jurídico');

    const doc = res.data;
    return {
      id: String(doc.id),
      caseId: String(doc.legalCaseId),
      caseNumber: doc.legalCase?.caseNumber || '',
      caseTitle: doc.legalCase?.title || '',
      clientId: String(doc.legalCase?.clientId || ''),
      name: doc.title,
      type: doc.documentType,
      fileExtension: doc.latestVersion?.fileName?.split('.').pop() || 'pdf',
      status: doc.status,
      description: doc.description || '',
      date: (doc.createdAt || '').split('T')[0],
      uploadDate: (doc.createdAt || '').split('T')[0],
      uploadedBy: doc.createdByUser?.name || 'Abogado Responsable',
      createdAt: doc.createdAt,
      versionCount: doc.versionCount || doc.versions?.length || 1,
      latestVersion: doc.latestVersion || doc.versions?.[0] || null,
      versions: doc.versions || [],
      fileUrl: doc.latestVersion?.fileUrl || null,
    };
  },

  async updateDocument(
    organizationId: number,
    caseId: string | number,
    documentId: string | number,
    data: Partial<{ title: string; documentType: string; description: string; status: string }>
  ): Promise<LegalDocument> {
    const res = await apiClient.put<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/documents/${documentId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar documento');

    const doc = res.data;
    return {
      id: String(doc.id),
      caseId: String(doc.legalCaseId),
      caseNumber: doc.legalCase?.caseNumber || '',
      caseTitle: doc.legalCase?.title || '',
      clientId: String(doc.legalCase?.clientId || ''),
      name: doc.title,
      type: doc.documentType,
      fileExtension: doc.latestVersion?.fileName?.split('.').pop() || 'pdf',
      status: doc.status,
      description: doc.description || '',
      date: (doc.createdAt || '').split('T')[0],
      uploadDate: (doc.createdAt || '').split('T')[0],
      uploadedBy: doc.createdByUser?.name || 'Abogado Responsable',
      createdAt: doc.createdAt,
      versionCount: doc.versionCount || doc.versions?.length || 1,
      latestVersion: doc.latestVersion || doc.versions?.[0] || null,
      versions: doc.versions || [],
      fileUrl: doc.latestVersion?.fileUrl || null,
    };
  },

  async addDocumentVersion(
    organizationId: number,
    caseId: string | number,
    documentId: string | number,
    payload: FormData | any
  ): Promise<LegalDocumentVersion> {
    const res = await apiClient.post<LegalDocumentVersion>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/documents/${documentId}/versions`,
      payload
    );
    if (!res.data) throw new Error(res.error || 'Error al subir nueva versión del documento');
    return res.data;
  },

  async archiveDocument(
    organizationId: number,
    caseId: string | number,
    documentId: string | number
  ): Promise<LegalDocument> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/documents/${documentId}/archive`
    );
    if (!res.data) throw new Error(res.error || 'Error al archivar documento');
    const doc = res.data;
    return {
      id: String(doc.id),
      caseId: String(doc.legalCaseId),
      caseNumber: '',
      caseTitle: '',
      clientId: '',
      name: doc.title,
      type: doc.documentType,
      fileExtension: doc.latestVersion?.fileName?.split('.').pop() || 'pdf',
      status: doc.status,
      description: doc.description || '',
      date: (doc.createdAt || '').split('T')[0],
      uploadDate: (doc.createdAt || '').split('T')[0],
      uploadedBy: 'Abogado Responsable',
      createdAt: doc.createdAt,
      versionCount: doc.versionCount || doc.versions?.length || 1,
      latestVersion: doc.latestVersion || null,
      versions: doc.versions || [],
      fileUrl: doc.latestVersion?.fileUrl || null,
    };
  },

  getDocumentVersionDownloadUrl(
    organizationId: number,
    caseId: string | number,
    documentId: string | number,
    versionId: string | number
  ): string {
    return `/api/organizations/${organizationId}/legal/cases/${caseId}/documents/${documentId}/versions/${versionId}/file`;
  },

  // --- HONORARIOS PROFESIONALES Y PAGOS (LegalFeeAgreement & LegalPayment) ---
  async getFeeAgreements(
    organizationId: number,
    caseId: string | number
  ): Promise<LegalFeeAgreement[]> {
    const res = await apiClient.get<any[]>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/fee-agreements`
    );
    const rawList = res.data || [];
    return rawList.map((a) => ({
      id: String(a.id),
      caseId: String(a.legalCaseId),
      title: a.title,
      description: a.description || '',
      status: a.status,
      subtotal: a.subtotal,
      discount: a.discount,
      total: a.total,
      paidAmount: a.paidAmount,
      balance: a.balance,
      paymentStatus: a.paymentStatus,
      agreedAt: a.agreedAt ? a.agreedAt.split('T')[0] : undefined,
      createdAt: a.createdAt,
      items: a.items || [],
      payments: a.payments || [],
    }));
  },

  async getFeeAgreementById(
    organizationId: number,
    caseId: string | number,
    agreementId: string | number
  ): Promise<LegalFeeAgreement | null> {
    const res = await apiClient.get<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/fee-agreements/${agreementId}`
    );
    if (!res.data) return null;
    const a = res.data;
    return {
      id: String(a.id),
      caseId: String(a.legalCaseId),
      title: a.title,
      description: a.description || '',
      status: a.status,
      subtotal: a.subtotal,
      discount: a.discount,
      total: a.total,
      paidAmount: a.paidAmount,
      balance: a.balance,
      paymentStatus: a.paymentStatus,
      agreedAt: a.agreedAt ? a.agreedAt.split('T')[0] : undefined,
      createdAt: a.createdAt,
      items: a.items || [],
      payments: a.payments || [],
    };
  },

  async createFeeAgreement(
    organizationId: number,
    caseId: string | number,
    data: any
  ): Promise<LegalFeeAgreement> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/fee-agreements`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al crear acuerdo de honorarios');
    const a = res.data;
    return {
      id: String(a.id),
      caseId: String(a.legalCaseId),
      title: a.title,
      description: a.description || '',
      status: a.status,
      subtotal: a.subtotal,
      discount: a.discount,
      total: a.total,
      paidAmount: a.paidAmount,
      balance: a.balance,
      paymentStatus: a.paymentStatus,
      agreedAt: a.agreedAt ? a.agreedAt.split('T')[0] : undefined,
      createdAt: a.createdAt,
      items: a.items || [],
      payments: a.payments || [],
    };
  },

  async updateFeeAgreement(
    organizationId: number,
    caseId: string | number,
    agreementId: string | number,
    data: any
  ): Promise<LegalFeeAgreement> {
    const res = await apiClient.put<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/fee-agreements/${agreementId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar acuerdo de honorarios');
    const a = res.data;
    return {
      id: String(a.id),
      caseId: String(a.legalCaseId),
      title: a.title,
      description: a.description || '',
      status: a.status,
      subtotal: a.subtotal,
      discount: a.discount,
      total: a.total,
      paidAmount: a.paidAmount,
      balance: a.balance,
      paymentStatus: a.paymentStatus,
      agreedAt: a.agreedAt ? a.agreedAt.split('T')[0] : undefined,
      createdAt: a.createdAt,
      items: a.items || [],
      payments: a.payments || [],
    };
  },

  async recordPayment(
    organizationId: number,
    caseId: string | number,
    agreementId: string | number,
    data: { amount: number; paymentMethod?: string; reference?: string; notes?: string; paidAt?: string }
  ): Promise<{ payment: LegalPayment; financialSummary: any }> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/fee-agreements/${agreementId}/payments`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al registrar pago de honorarios');
    return res.data;
  },

  async getPayments(
    organizationId: number,
    caseId: string | number,
    agreementId: string | number
  ): Promise<LegalPayment[]> {
    const res = await apiClient.get<any[]>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/fee-agreements/${agreementId}/payments`
    );
    return res.data || [];
  },

  // --- CALENDARIO UNIFICADO (PROYECCIÓN) ---
  async getCalendar(
    organizationId: number,
    filters?: {
      from?: string;
      to?: string;
      type?: string;
      legalCaseId?: number | string;
      responsibleUserId?: number | string;
      status?: string;
    }
  ): Promise<LegalCalendarEntry[]> {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.type && filters.type !== 'todos') params.set('type', filters.type);
    if (filters?.legalCaseId) params.set('legalCaseId', String(filters.legalCaseId));
    if (filters?.responsibleUserId) params.set('responsibleUserId', String(filters.responsibleUserId));
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<LegalCalendarEntry[]>(
      `/api/organizations/${organizationId}/legal/calendar${query}`
    );
    return res.data || [];
  },

  // --- RECORDATORIOS PERSISTENTES ---
  async getReminders(
    organizationId: number,
    filters?: {
      userId?: number | string;
      legalCaseId?: number | string;
      status?: string;
      sourceType?: string;
      sourceId?: number | string;
      from?: string;
      to?: string;
    }
  ): Promise<LegalReminder[]> {
    const params = new URLSearchParams();
    if (filters?.userId) params.set('userId', String(filters.userId));
    if (filters?.legalCaseId) params.set('legalCaseId', String(filters.legalCaseId));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.sourceType) params.set('sourceType', filters.sourceType);
    if (filters?.sourceId) params.set('sourceId', String(filters.sourceId));
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<LegalReminder[]>(
      `/api/organizations/${organizationId}/legal/reminders${query}`
    );
    return res.data || [];
  },

  async createReminder(
    organizationId: number,
    caseId: number | string,
    data: {
      sourceType: string;
      sourceId: number;
      remindAt: string;
      message?: string;
      userId?: number;
    }
  ): Promise<LegalReminder> {
    const res = await apiClient.post<LegalReminder>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/reminders`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al crear recordatorio');
    return res.data;
  },

  async updateReminder(
    organizationId: number,
    caseId: number | string,
    reminderId: number | string,
    data: Partial<LegalReminder>
  ): Promise<LegalReminder> {
    const res = await apiClient.put<LegalReminder>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/reminders/${reminderId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar recordatorio');
    return res.data;
  },

  async dismissReminder(
    organizationId: number,
    caseId: number | string,
    reminderId: number | string
  ): Promise<LegalReminder> {
    const res = await apiClient.post<LegalReminder>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/reminders/${reminderId}/dismiss`,
      {}
    );
    if (!res.data) throw new Error(res.error || 'Error al descartar recordatorio');
    return res.data;
  },

  // --- NOTIFICACIONES INTERNAS (FASE 6) ---
  async getNotifications(
    organizationId: number,
    filters?: { status?: string; limit?: number; offset?: number }
  ): Promise<{ items: LegalNotification[]; total: number; limit: number; offset: number }> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<{ items: LegalNotification[]; total: number; limit: number; offset: number }>(
      `/api/organizations/${organizationId}/legal/notifications${query}`
    );
    return res.data || { items: [], total: 0, limit: 20, offset: 0 };
  },

  async getUnreadNotificationsCount(organizationId: number): Promise<number> {
    const res = await apiClient.get<{ count: number }>(
      `/api/organizations/${organizationId}/legal/notifications/unread-count`
    );
    return res.data?.count || 0;
  },

  async markNotificationAsRead(
    organizationId: number,
    notificationId: number | string
  ): Promise<LegalNotification> {
    const res = await apiClient.post<LegalNotification>(
      `/api/organizations/${organizationId}/legal/notifications/${notificationId}/read`,
      {}
    );
    if (!res.data) throw new Error(res.error || 'Error al marcar notificación como leída');
    return res.data;
  },

  async dismissNotification(
    organizationId: number,
    notificationId: number | string
  ): Promise<LegalNotification> {
    const res = await apiClient.post<LegalNotification>(
      `/api/organizations/${organizationId}/legal/notifications/${notificationId}/dismiss`,
      {}
    );
    if (!res.data) throw new Error(res.error || 'Error al descartar notificación');
    return res.data;
  },

  // --- DASHBOARD Y REPORTES (FASE 7) ---
  async getDashboard(organizationId: number): Promise<LegalDashboardDTO> {
    const res = await apiClient.get<LegalDashboardDTO>(
      `/api/organizations/${organizationId}/legal/dashboard`
    );
    if (!res.data) throw new Error(res.error || 'Error al obtener dashboard jurídico');
    return res.data;
  },

  async getReports(
    organizationId: number,
    filters?: { from?: string; to?: string }
  ): Promise<LegalReportsDTO> {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<LegalReportsDTO>(
      `/api/organizations/${organizationId}/legal/reports${query}`
    );
    if (!res.data) throw new Error(res.error || 'Error al obtener reportes jurídicos');
    return res.data;
  },

  // --- CIERRE FORMAL Y ARCHIVADO (FASE 8) ---
  async getClosureCheck(
    organizationId: number,
    caseId: string | number
  ): Promise<ClosureCheckDTO> {
    const res = await apiClient.get<ClosureCheckDTO>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/closure-check`
    );
    if (!res.data) throw new Error(res.error || 'Error al verificar cierre del expediente');
    return res.data;
  },

  async closeCase(
    organizationId: number,
    caseId: string | number,
    data: CloseCaseInput
  ): Promise<any> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/close`,
      data
    );
    if (!res.data && !res.success) throw new Error(res.error || 'Error al cerrar el expediente');
    return res.data || res;
  },

  async archiveCase(
    organizationId: number,
    caseId: string | number,
    data: ArchiveCaseInput
  ): Promise<any> {
    const res = await apiClient.post<any>(
      `/api/organizations/${organizationId}/legal/cases/${caseId}/archive`,
      data
    );
    if (!res.data && !res.success) throw new Error(res.error || 'Error al archivar el expediente');
    return res.data || res;
  },
};

