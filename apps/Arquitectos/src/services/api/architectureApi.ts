import { apiClient } from './apiClient';
import type {
  Client,
  Project,
  Stage,
  Task,
  Deliverable,
  Meeting,
  DocumentMetadata,
  DocumentVersion,
  Budget,
  BudgetItem,
  CalendarEvent,
  DashboardData,
  ReportsSummary,
} from '../../types';

export const architectureApi = {
  // --- CLIENTES ---
  async getClients(
    organizationId: number,
    filters?: { search?: string; status?: string; clientType?: string }
  ): Promise<Client[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.clientType && filters.clientType !== 'todos') params.set('clientType', filters.clientType);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<Client[]>(`/api/organizations/${organizationId}/architecture/clients${query}`);
    return res.data || [];
  },

  async getClientById(organizationId: number, clientId: string | number): Promise<Client | null> {
    const res = await apiClient.get<Client>(`/api/organizations/${organizationId}/architecture/clients/${clientId}`);
    return res.data || null;
  },

  async createClient(
    organizationId: number,
    data: Partial<Client>
  ): Promise<Client> {
    const res = await apiClient.post<Client>(`/api/organizations/${organizationId}/architecture/clients`, data);
    if (!res.data) throw new Error(res.error || 'Error al crear el cliente');
    return res.data;
  },

  async updateClient(
    organizationId: number,
    clientId: string | number,
    data: Partial<Client>
  ): Promise<Client> {
    const res = await apiClient.put<Client>(`/api/organizations/${organizationId}/architecture/clients/${clientId}`, data);
    if (!res.data) throw new Error(res.error || 'Error al actualizar el cliente');
    return res.data;
  },

  async inactivateClient(
    organizationId: number,
    clientId: string | number
  ): Promise<Client> {
    const res = await apiClient.delete<Client>(`/api/organizations/${organizationId}/architecture/clients/${clientId}`);
    if (!res.data) throw new Error(res.error || 'Error al inactivar el cliente');
    return res.data;
  },

  // --- PROYECTOS ---
  async getProjects(
    organizationId: number,
    filters?: { clientId?: string | number; status?: string; type?: string; search?: string; includeArchived?: boolean }
  ): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.clientId) params.set('clientId', String(filters.clientId));
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.type && filters.type !== 'todos') params.set('type', filters.type);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.includeArchived) params.set('includeArchived', 'true');

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<Project[]>(`/api/organizations/${organizationId}/architecture/projects${query}`);
    return res.data || [];
  },

  async getProjectById(organizationId: number, projectId: string | number): Promise<Project | null> {
    const res = await apiClient.get<Project>(`/api/organizations/${organizationId}/architecture/projects/${projectId}`);
    return res.data || null;
  },

  async createProject(
    organizationId: number,
    data: any
  ): Promise<Project> {
    const res = await apiClient.post<Project>(`/api/organizations/${organizationId}/architecture/projects`, data);
    if (!res.data) throw new Error(res.error || 'Error al crear el proyecto');
    return res.data;
  },

  async updateProject(
    organizationId: number,
    projectId: string | number,
    data: Partial<Project>
  ): Promise<Project> {
    const res = await apiClient.put<Project>(`/api/organizations/${organizationId}/architecture/projects/${projectId}`, data);
    if (!res.data) throw new Error(res.error || 'Error al actualizar el proyecto');
    return res.data;
  },

  async archiveProject(
    organizationId: number,
    projectId: string | number,
    reason?: string
  ): Promise<Project> {
    const res = await apiClient.post<Project>(`/api/organizations/${organizationId}/architecture/projects/${projectId}/archive`, { reason });
    if (!res.data) throw new Error(res.error || 'Error al archivar el proyecto');
    return res.data;
  },

  async unarchiveProject(
    organizationId: number,
    projectId: string | number
  ): Promise<Project> {
    const res = await apiClient.post<Project>(`/api/organizations/${organizationId}/architecture/projects/${projectId}/unarchive`, {});
    if (!res.data) throw new Error(res.error || 'Error al desarchivar el proyecto');
    return res.data;
  },

  // --- ETAPAS ---
  async updateStage(
    organizationId: number,
    projectId: string | number,
    stageId: string | number,
    data: { status?: string; progress?: number; startDate?: string; dueDate?: string; notes?: string }
  ): Promise<Project> {
    const res = await apiClient.put<Project>(
      `/api/organizations/${organizationId}/architecture/projects/${projectId}/stages/${stageId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar la etapa del proyecto');
    return res.data;
  },

  // --- TAREAS (ArchitectureTask) ---
  async getTasks(
    organizationId: number,
    filters?: { projectId?: string | number; stageId?: string | number; status?: string; search?: string }
  ): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.stageId) params.set('stageId', String(filters.stageId));
    if (filters?.status && filters.status !== 'all' && filters.status !== 'todos') {
      params.set('status', filters.status);
    }
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<Task[]>(`/api/organizations/${organizationId}/architecture/tasks${query}`);
    return res.data || [];
  },

  async getTaskById(organizationId: number, taskId: string | number): Promise<Task | null> {
    const res = await apiClient.get<Task>(`/api/organizations/${organizationId}/architecture/tasks/${taskId}`);
    return res.data || null;
  },

  async createTask(
    organizationId: number,
    data: Partial<Task>
  ): Promise<Task> {
    const res = await apiClient.post<Task>(`/api/organizations/${organizationId}/architecture/tasks`, data);
    if (!res.data) throw new Error(res.error || 'Error al crear la tarea');
    return res.data;
  },

  async updateTask(
    organizationId: number,
    taskId: string | number,
    data: Partial<Task>
  ): Promise<Task> {
    const res = await apiClient.put<Task>(`/api/organizations/${organizationId}/architecture/tasks/${taskId}`, data);
    if (!res.data) throw new Error(res.error || 'Error al actualizar la tarea');
    return res.data;
  },

  async toggleTaskStatus(
    organizationId: number,
    taskId: string | number
  ): Promise<Task> {
    const res = await apiClient.patch<Task>(`/api/organizations/${organizationId}/architecture/tasks/${taskId}/toggle`, {});
    if (!res.data) throw new Error(res.error || 'Error al cambiar estado de la tarea');
    return res.data;
  },

  // --- ENTREGABLES (ArchitectureDeliverable) ---
  async getDeliverables(
    organizationId: number,
    filters?: { projectId?: string | number; stageId?: string | number; status?: string; type?: string; search?: string }
  ): Promise<Deliverable[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.stageId) params.set('stageId', String(filters.stageId));
    if (filters?.status && filters.status !== 'all' && filters.status !== 'todos') {
      params.set('status', filters.status);
    }
    if (filters?.type && filters.type !== 'all' && filters.type !== 'todos') {
      params.set('type', filters.type);
    }
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<Deliverable[]>(`/api/organizations/${organizationId}/architecture/deliverables${query}`);
    return res.data || [];
  },

  async getDeliverableById(organizationId: number, deliverableId: string | number): Promise<Deliverable | null> {
    const res = await apiClient.get<Deliverable>(`/api/organizations/${organizationId}/architecture/deliverables/${deliverableId}`);
    return res.data || null;
  },

  async createDeliverable(
    organizationId: number,
    data: Partial<Deliverable>
  ): Promise<Deliverable> {
    const res = await apiClient.post<Deliverable>(`/api/organizations/${organizationId}/architecture/deliverables`, data);
    if (!res.data) throw new Error(res.error || 'Error al registrar el entregable');
    return res.data;
  },

  async updateDeliverable(
    organizationId: number,
    deliverableId: string | number,
    data: Partial<Deliverable>
  ): Promise<Deliverable> {
    const res = await apiClient.put<Deliverable>(`/api/organizations/${organizationId}/architecture/deliverables/${deliverableId}`, data);
    if (!res.data) throw new Error(res.error || 'Error al actualizar el entregable');
    return res.data;
  },

  // --- REUNIONES E INSPECCIONES (ArchitectureMeeting) ---
  async getMeetings(
    organizationId: number,
    filters?: { projectId?: string | number; status?: string; modality?: string; search?: string }
  ): Promise<Meeting[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.status && filters.status !== 'all' && filters.status !== 'todos') {
      params.set('status', filters.status);
    }
    if (filters?.modality && filters.modality !== 'all' && filters.modality !== 'todos') {
      params.set('modality', filters.modality);
    }
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<Meeting[]>(`/api/organizations/${organizationId}/architecture/meetings${query}`);
    return res.data || [];
  },

  async getMeetingById(organizationId: number, meetingId: string | number): Promise<Meeting | null> {
    const res = await apiClient.get<Meeting>(`/api/organizations/${organizationId}/architecture/meetings/${meetingId}`);
    return res.data || null;
  },

  async createMeeting(
    organizationId: number,
    data: Partial<Meeting>
  ): Promise<Meeting> {
    const res = await apiClient.post<Meeting>(`/api/organizations/${organizationId}/architecture/meetings`, data);
    if (!res.data) throw new Error(res.error || 'Error al agendar la reunión');
    return res.data;
  },

  async updateMeeting(
    organizationId: number,
    meetingId: string | number,
    data: Partial<Meeting>
  ): Promise<Meeting> {
    const res = await apiClient.put<Meeting>(`/api/organizations/${organizationId}/architecture/meetings/${meetingId}`, data);
    if (!res.data) throw new Error(res.error || 'Error al actualizar la reunión');
    return res.data;
  },

  async cancelMeeting(
    organizationId: number,
    meetingId: string | number
  ): Promise<Meeting> {
    const res = await apiClient.put<Meeting>(`/api/organizations/${organizationId}/architecture/meetings/${meetingId}`, {
      status: 'Cancelada',
    });
    if (!res.data) throw new Error(res.error || 'Error al cancelar la reunión');
    return res.data;
  },

  // --- DOCUMENTOS ---
  async getDocuments(
    organizationId: number,
    filters?: {
      projectId?: string | number;
      stageId?: string | number;
      status?: string;
      documentType?: string;
      search?: string;
    }
  ): Promise<DocumentMetadata[]> {
    const params = new URLSearchParams();
    if (filters?.projectId && filters.projectId !== 'todos') params.set('projectId', String(filters.projectId));
    if (filters?.stageId && filters.stageId !== 'todos') params.set('stageId', String(filters.stageId));
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.documentType && filters.documentType !== 'todos') params.set('documentType', filters.documentType);
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<DocumentMetadata[]>(
      `/api/organizations/${organizationId}/architecture/documents${query}`
    );
    return res.data || [];
  },

  async getDocumentById(
    organizationId: number,
    documentId: string | number
  ): Promise<DocumentMetadata | null> {
    const res = await apiClient.get<DocumentMetadata>(
      `/api/organizations/${organizationId}/architecture/documents/${documentId}`
    );
    return res.data || null;
  },

  async createDocument(
    organizationId: number,
    data: {
      projectId: string | number;
      stageId?: string | number | null;
      name: string;
      documentType?: string;
      description?: string;
      status?: string;
      notes?: string;
    },
    file?: File | null
  ): Promise<DocumentMetadata> {
    let body: any;
    if (file) {
      const formData = new FormData();
      formData.append('projectId', String(data.projectId));
      if (data.stageId) formData.append('stageId', String(data.stageId));
      formData.append('name', data.name);
      if (data.documentType) formData.append('documentType', data.documentType);
      if (data.description) formData.append('description', data.description);
      if (data.status) formData.append('status', data.status);
      if (data.notes) formData.append('notes', data.notes);
      formData.append('file', file);
      body = formData;
    } else {
      body = data;
    }

    const res = await apiClient.post<DocumentMetadata>(
      `/api/organizations/${organizationId}/architecture/documents`,
      body
    );
    if (!res.data) throw new Error(res.error || 'Error al crear el documento');
    return res.data;
  },

  async updateDocument(
    organizationId: number,
    documentId: string | number,
    data: Partial<DocumentMetadata>
  ): Promise<DocumentMetadata> {
    const res = await apiClient.put<DocumentMetadata>(
      `/api/organizations/${organizationId}/architecture/documents/${documentId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar el documento');
    return res.data;
  },

  async addDocumentVersion(
    organizationId: number,
    documentId: string | number,
    file: File,
    notes?: string,
    projectId?: string | number
  ): Promise<DocumentVersion> {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) formData.append('notes', notes);
    if (projectId) formData.append('projectId', String(projectId));

    const res = await apiClient.post<DocumentVersion>(
      `/api/organizations/${organizationId}/architecture/documents/${documentId}/versions`,
      formData
    );
    if (!res.data) throw new Error(res.error || 'Error al subir nueva versión');
    return res.data;
  },

  async getDocumentVersions(
    organizationId: number,
    documentId: string | number
  ): Promise<DocumentVersion[]> {
    const res = await apiClient.get<DocumentVersion[]>(
      `/api/organizations/${organizationId}/architecture/documents/${documentId}/versions`
    );
    return res.data || [];
  },

  async getDocumentVersion(
    organizationId: number,
    documentId: string | number,
    versionId: string | number
  ): Promise<DocumentVersion | null> {
    const res = await apiClient.get<DocumentVersion>(
      `/api/organizations/${organizationId}/architecture/documents/${documentId}/versions/${versionId}`
    );
    return res.data || null;
  },

  getDownloadUrl(
    organizationId: number,
    documentId: string | number,
    versionId?: string | number
  ): string {
    const base = `/api/organizations/${organizationId}/architecture/documents/${documentId}`;
    return versionId ? `${base}/versions/${versionId}/download` : `${base}/download`;
  },

  // --- PRESUPUESTOS ---
  async getBudgets(
    organizationId: number,
    filters?: { projectId?: string | number; status?: string; search?: string }
  ): Promise<Budget[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.status && filters.status !== 'todos') params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<Budget[]>(
      `/api/organizations/${organizationId}/architecture/budgets${query}`
    );
    return res.data || [];
  },

  async getBudgetById(
    organizationId: number,
    budgetId: string | number
  ): Promise<Budget | null> {
    const res = await apiClient.get<Budget>(
      `/api/organizations/${organizationId}/architecture/budgets/${budgetId}`
    );
    return res.data || null;
  },

  async createBudget(
    organizationId: number,
    data: Partial<Budget>
  ): Promise<Budget> {
    const res = await apiClient.post<Budget>(
      `/api/organizations/${organizationId}/architecture/budgets`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al crear el presupuesto');
    return res.data;
  },

  async updateBudget(
    organizationId: number,
    budgetId: string | number,
    data: Partial<Budget>
  ): Promise<Budget> {
    const res = await apiClient.put<Budget>(
      `/api/organizations/${organizationId}/architecture/budgets/${budgetId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar el presupuesto');
    return res.data;
  },

  async approveBudget(
    organizationId: number,
    budgetId: string | number
  ): Promise<Budget> {
    const res = await apiClient.post<Budget>(
      `/api/organizations/${organizationId}/architecture/budgets/${budgetId}/approve`
    );
    if (!res.data) throw new Error(res.error || 'Error al aprobar el presupuesto');
    return res.data;
  },

  async addBudgetItem(
    organizationId: number,
    budgetId: string | number,
    data: Partial<BudgetItem>
  ): Promise<BudgetItem> {
    const res = await apiClient.post<BudgetItem>(
      `/api/organizations/${organizationId}/architecture/budgets/${budgetId}/items`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al agregar rubro al presupuesto');
    return res.data;
  },

  async updateBudgetItem(
    organizationId: number,
    budgetId: string | number,
    itemId: string | number,
    data: Partial<BudgetItem>
  ): Promise<BudgetItem> {
    const res = await apiClient.put<BudgetItem>(
      `/api/organizations/${organizationId}/architecture/budgets/${budgetId}/items/${itemId}`,
      data
    );
    if (!res.data) throw new Error(res.error || 'Error al actualizar el rubro');
    return res.data;
  },

  // --- READ MODELS DERIVADOS ---
  async getCalendar(
    organizationId: number,
    filters?: { startDate?: string; endDate?: string; projectId?: string | number }
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.projectId) params.set('projectId', String(filters.projectId));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<CalendarEvent[]>(
      `/api/organizations/${organizationId}/architecture/calendar${query}`
    );
    return res.data || [];
  },

  async getDashboard(organizationId: number): Promise<DashboardData> {
    const res = await apiClient.get<DashboardData>(
      `/api/organizations/${organizationId}/architecture/dashboard`
    );
    if (!res.data) throw new Error(res.error || 'Error al obtener datos del dashboard');
    return res.data;
  },

  async getReports(organizationId: number): Promise<ReportsSummary> {
    const res = await apiClient.get<ReportsSummary>(
      `/api/organizations/${organizationId}/architecture/reports/summary`
    );
    if (!res.data) throw new Error(res.error || 'Error al obtener resumen de reportes');
    return res.data;
  },
};


