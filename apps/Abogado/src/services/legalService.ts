import {
  Client,
  LegalCase,
  ProceduralDeadline,
  Hearing,
  LegalTask,
  LegalDocument,
  CaseActivity,
  SystemNotification,
  LegalFeeAgreement,
  LegalPayment,
  LegalCalendarEntry,
  LegalReminder,
  LegalDashboardDTO,
  LegalReportsDTO,
  ClosureCheckDTO,
  CloseCaseInput,
  ArchiveCaseInput,
} from '../types';
import {
  INITIAL_CLIENTS,
  INITIAL_CASES,
  INITIAL_DEADLINES,
  INITIAL_HEARINGS,
  INITIAL_TASKS,
  INITIAL_DOCUMENTS,
  INITIAL_ACTIVITIES,
  INITIAL_NOTIFICATIONS,
} from '../data/mockData';
import { legalApi } from './api/legalApi';

const STORAGE_KEYS = {
  ORG_ID: 'abogado_org_id',
};

type Listener = () => void;

class LegalService {
  private organizationId: number | null = null;
  private clients: Client[] = [];
  private cases: LegalCase[] = [];
  private deadlines: ProceduralDeadline[] = [];
  private hearings: Hearing[] = [];
  private tasks: LegalTask[] = [];
  private documents: LegalDocument[] = [];
  private activities: CaseActivity[] = [];
  private notifications: SystemNotification[] = [];
  private feeAgreements: LegalFeeAgreement[] = [];
  private unreadCount: number = 0;
  private dashboardData: LegalDashboardDTO | null = null;

  private listeners: Set<Listener> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    this.initOrgId();
    this.loadState();
    if (typeof window !== 'undefined') {
      window.addEventListener('legal:notification_received', () => {
        this.unreadCount++;
        this.notify();
        this.getUnreadCountFromApi().catch(() => {});
      });
    }
  }

  private initOrgId() {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const orgParam = urlParams.get('orgId') || urlParams.get('organizationId');
        if (orgParam && !isNaN(Number(orgParam))) {
          this.organizationId = Number(orgParam);
          localStorage.setItem(STORAGE_KEYS.ORG_ID, String(this.organizationId));
        } else {
          const stored = localStorage.getItem(STORAGE_KEYS.ORG_ID);
          if (stored && !isNaN(Number(stored))) {
            this.organizationId = Number(stored);
          }
        }
      }
    } catch {
      this.organizationId = null;
    }
  }

  public getOrganizationId(): number | null {
    return this.organizationId;
  }

  public requireOrgId(): number {
    if (!this.organizationId) {
      throw new Error('No hay una organización activa seleccionada para el despacho jurídico.');
    }
    return this.organizationId;
  }

  public setOrganizationId(orgId: number) {
    this.organizationId = orgId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ORG_ID, String(orgId));
    }
    this.syncFromApi().catch(() => {});
  }

  private loadState() {
    // Las entidades de negocio residen en PostgreSQL y se sincronizan vía API Core.
    // No se almacenan en localStorage para evitar fugas entre organizaciones y persistencia ficticia.
    this.clients = [];
    this.cases = [];
    this.deadlines = [];
    this.hearings = [];
    this.tasks = [];
    this.documents = [];
    this.activities = [];
    this.notifications = [];
    this.feeAgreements = [];
  }

  private saveState() {
    // La persistencia de negocio se realiza en PostgreSQL vía API Core.
    // saveState notifica reactivamente a los componentes de la interfaz.
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- SINCRONIZACIÓN ASÍNCRONA CON API CORE ---
  public async syncFromApi(): Promise<{
    clients: Client[];
    cases: LegalCase[];
    tasks: LegalTask[];
    deadlines: ProceduralDeadline[];
    hearings: Hearing[];
  }> {
    const orgId = this.organizationId;
    if (!orgId) {
      return {
        clients: this.clients,
        cases: this.cases,
        tasks: this.tasks,
        deadlines: this.deadlines,
        hearings: this.hearings,
      };
    }

    try {
      const [apiClients, apiCases, apiTasks, apiDeadlines, apiHearings, apiNotifications, apiUnreadCount, apiDashboard] = await Promise.all([
        legalApi.getClients(orgId),
        legalApi.getCases(orgId),
        legalApi.getTasks(orgId).catch(() => []),
        legalApi.getDeadlines(orgId).catch(() => []),
        legalApi.getHearings(orgId).catch(() => []),
        legalApi.getNotifications(orgId, { status: 'todos' }).catch(() => ({ items: [] })),
        legalApi.getUnreadNotificationsCount(orgId).catch(() => 0),
        legalApi.getDashboard(orgId).catch(() => null),
      ]);

      if (typeof apiUnreadCount === 'number') {
        this.unreadCount = apiUnreadCount;
      }

      if (apiDashboard) {
        this.dashboardData = apiDashboard;
      }

      if (Array.isArray(apiClients)) {
        this.clients = apiClients;
      }
      if (Array.isArray(apiCases)) {
        this.cases = apiCases;
      }
      if (Array.isArray(apiTasks)) {
        this.tasks = apiTasks;
      }
      if (Array.isArray(apiDeadlines)) {
        this.deadlines = apiDeadlines;
      }
      if (Array.isArray(apiHearings)) {
        this.hearings = apiHearings;
      }
      if (apiNotifications && Array.isArray(apiNotifications.items)) {
        this.notifications = apiNotifications.items.map((n) => ({
          id: String(n.id),
          type: n.type.toLowerCase().includes('deadline') ? 'deadline_approaching' : n.type.toLowerCase().includes('hearing') ? 'hearing_today' : n.type.toLowerCase().includes('task') ? 'task_overdue' : 'doc_pending',
          title: n.title,
          message: n.message,
          date: n.createdAt ? n.createdAt.replace('T', ' ').slice(0, 16) : '',
          read: n.status === 'READ',
          linkTab: 'cases' as const,
          targetId: String(n.legalCaseId),
          legalCaseId: n.legalCaseId,
          caseNumber: n.caseNumber,
          caseTitle: n.caseTitle,
          clientName: n.clientName,
          status: n.status,
        }));
      }

      this.isInitialized = true;
      this.saveState();
      this.notify();
      return {
        clients: this.clients,
        cases: this.cases,
        tasks: this.tasks,
        deadlines: this.deadlines,
        hearings: this.hearings,
      };
    } catch (error) {
      console.error('[legalService] Error al sincronizar con API Core:', error);
      throw error;
    }
  }

  // RESET
  public resetToDefault() {
    this.clients = [...INITIAL_CLIENTS];
    this.cases = [...INITIAL_CASES];
    this.deadlines = [...INITIAL_DEADLINES];
    this.hearings = [...INITIAL_HEARINGS];
    this.tasks = [...INITIAL_TASKS];
    this.documents = [...INITIAL_DOCUMENTS];
    this.activities = [...INITIAL_ACTIVITIES];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.saveState();
  }

  // --- CLIENTS ---
  public getClients(): Client[] {
    return [...this.clients];
  }

  public getClientById(id: string): Client | undefined {
    return this.clients.find((c) => String(c.id) === String(id));
  }

  /**
   * Registra un nuevo cliente jurídico.
   * Persiste en PostgreSQL a través de la API Core.
   */
  public async addClient(
    clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Client> {
    try {
      const orgId = this.requireOrgId();
      // 1. Intentar persistencia real en API Core
      const created = await legalApi.createClient(orgId, clientData);
      this.clients.unshift(created);
      this.saveState();
      return created;
    } catch (error: any) {
      // Regla de honestidad y no fallback silencioso para entidades reales
      console.error('[legalService.addClient] Error en API Core:', error);
      throw error;
    }
  }

  /**
   * Actualiza un cliente jurídico existente.
   * Estrategia híbrida: si es numérico, persiste en PostgreSQL; si es mock legacy, actualiza localmente.
   */
  public async updateClient(id: string, clientData: Partial<Client>): Promise<Client | undefined> {
    const isRealEntity = !isNaN(Number(id));

    if (isRealEntity) {
      try {
        const updated = await legalApi.updateClient(this.organizationId, id, clientData);
        const index = this.clients.findIndex((c) => String(c.id) === String(id));
        if (index !== -1) {
          this.clients[index] = updated;
        } else {
          this.clients.unshift(updated);
        }
        this.saveState();
        return updated;
      } catch (error: any) {
        console.error('[legalService.updateClient] Error en API Core:', error);
        throw error;
      }
    }

    // Manejo de compatibilidad con IDs legacy
    const index = this.clients.findIndex((c) => String(c.id) === String(id));
    if (index === -1) return undefined;
    const updated = {
      ...this.clients[index],
      ...clientData,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.clients[index] = updated;
    this.saveState();
    return updated;
  }

  // --- CASES ---
  public getCases(): LegalCase[] {
    return [...this.cases];
  }

  public getCaseById(id: string): LegalCase | undefined {
    return this.cases.find((c) => String(c.id) === String(id));
  }

  public getCasesByClientId(clientId: string): LegalCase[] {
    return this.cases.filter((c) => String(c.clientId) === String(clientId));
  }

  public getCasesByClient(clientId: string): LegalCase[] {
    return this.getCasesByClientId(clientId);
  }

  /**
   * Registra un nuevo caso / expediente jurídico.
   * Regla Canónica: PRIMERO CLIENTE -> DESPUÉS CASO.
   * Persiste en PostgreSQL a través de la API Core.
   */
  public async addCase(
    caseData: Omit<LegalCase, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LegalCase> {
    if (!caseData.clientId) {
      throw new Error('No se puede crear un caso sin cliente asignado.');
    }

    try {
      // 1. Invocar ruta canónica de API Core
      const created = await legalApi.createCaseForClient(
        this.organizationId,
        caseData.clientId,
        caseData
      );

      this.cases.unshift(created);

      // Auto-crear registro de bitácora inicial
      if (!isNaN(Number(created.id))) {
        try {
          const act = await legalApi.createCaseActivity(this.organizationId, created.id, {
            type: 'Cambio Estado',
            title: 'Apertura de Expediente Digital',
            description: `Expediente Aperturado en área ${created.legalArea} bajo el trámite ${created.processType}.`,
            performedBy: created.assignedLawyer || 'Abogado del Despacho',
          });
          this.activities.unshift(act);
        } catch (e) {
          console.warn('[legalService.addCase] Error registrando bitácora inicial en API Core:', e);
        }
      } else {
        this.addActivity({
          caseId: created.id,
          date: `${created.startDate} 09:00`,
          type: 'Cambio Estado',
          title: 'Apertura de Expediente Digital',
          description: `Expediente Aperturado en área ${created.legalArea} bajo el trámite ${created.processType}.`,
          performedBy: created.assignedLawyer || 'Abogado del Despacho',
        });
      }

      this.saveState();
      return created;
    } catch (error: any) {
      console.error('[legalService.addCase] Error en API Core:', error);
      throw error;
    }
  }

  /**
   * Actualiza un caso jurídico.
   * Estrategia híbrida: si es ID numérico real, actualiza en API Core PostgreSQL.
   */
  public async updateCase(id: string, caseData: Partial<LegalCase>): Promise<LegalCase | undefined> {
    const isRealEntity = !isNaN(Number(id));

    if (isRealEntity) {
      try {
        const updated = await legalApi.updateCase(this.organizationId, id, caseData);
        const index = this.cases.findIndex((c) => String(c.id) === String(id));
        if (index !== -1) {
          this.cases[index] = updated;
        } else {
          this.cases.unshift(updated);
        }
        this.saveState();
        return updated;
      } catch (error: any) {
        console.error('[legalService.updateCase] Error en API Core:', error);
        throw error;
      }
    }

    // Manejo de compatibilidad con IDs legacy
    const index = this.cases.findIndex((c) => String(c.id) === String(id));
    if (index === -1) return undefined;
    const updated = {
      ...this.cases[index],
      ...caseData,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.cases[index] = updated;
    this.saveState();
    return updated;
  }

  public async updateCaseStatus(id: string, status: LegalCase['status']): Promise<LegalCase | undefined> {
    return this.updateCase(id, { status });
  }

  // --- PROCEDURAL DEADLINES ---
  public getDeadlines(): ProceduralDeadline[] {
    return [...this.deadlines];
  }

  public getDeadlinesByCaseId(caseId: string): ProceduralDeadline[] {
    return this.deadlines.filter((d) => String(d.caseId) === String(caseId));
  }

  public async addDeadline(
    deadlineData: Omit<ProceduralDeadline, 'id' | 'createdAt'>
  ): Promise<ProceduralDeadline> {
    if (deadlineData.caseId && !isNaN(Number(deadlineData.caseId))) {
      try {
        const created = await legalApi.createCaseDeadline(
          this.organizationId,
          deadlineData.caseId,
          deadlineData
        );
        this.deadlines.unshift(created);
        this.saveState();
        return created;
      } catch (err) {
        console.error('[legalService.addDeadline] Error en API:', err);
        throw err;
      }
    }

    const newDeadline: ProceduralDeadline = {
      ...deadlineData,
      id: `dl-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.deadlines.unshift(newDeadline);

    if (newDeadline.priority === 'Urgente' || newDeadline.status === 'Pendiente') {
      this.addNotification({
        type: 'deadline_approaching',
        title: 'Nuevo Plazo Procesal Registrado',
        message: `Plazo registrado para ${newDeadline.caseNumber}: ${newDeadline.description} (Vence: ${newDeadline.dueDate})`,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        read: false,
        linkTab: 'deadlines',
        targetId: newDeadline.id,
      });
    }

    this.saveState();
    return newDeadline;
  }

  public async updateDeadlineStatus(id: string, status: ProceduralDeadline['status']): Promise<void> {
    const index = this.deadlines.findIndex((d) => d.id === id);
    if (index !== -1) {
      const deadline = this.deadlines[index];
      if (!isNaN(Number(id)) && deadline.caseId && !isNaN(Number(deadline.caseId))) {
        try {
          await legalApi.updateCaseDeadline(this.organizationId, deadline.caseId, id, { status });
        } catch (err) {
          console.error('[legalService.updateDeadlineStatus] Error en API:', err);
          throw err;
        }
      }
      this.deadlines[index].status = status;
      this.saveState();
    }
  }

  // --- HEARINGS ---
  public getHearings(): Hearing[] {
    return [...this.hearings];
  }

  public getHearingsByCaseId(caseId: string): Hearing[] {
    return this.hearings.filter((h) => String(h.caseId) === String(caseId));
  }

  public async addHearing(hearingData: Omit<Hearing, 'id' | 'createdAt'>): Promise<Hearing> {
    if (hearingData.caseId && !isNaN(Number(hearingData.caseId))) {
      try {
        const created = await legalApi.createCaseHearing(
          this.organizationId,
          hearingData.caseId,
          hearingData
        );
        this.hearings.unshift(created);
        this.saveState();
        return created;
      } catch (err) {
        console.error('[legalService.addHearing] Error en API:', err);
        throw err;
      }
    }

    const newHearing: Hearing = {
      ...hearingData,
      id: `hea-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.hearings.unshift(newHearing);
    this.saveState();
    return newHearing;
  }

  public async updateHearingStatus(id: string, status: Hearing['status']): Promise<void> {
    const index = this.hearings.findIndex((h) => h.id === id);
    if (index !== -1) {
      const hearing = this.hearings[index];
      if (!isNaN(Number(id)) && hearing.caseId && !isNaN(Number(hearing.caseId))) {
        try {
          await legalApi.updateCaseHearing(this.organizationId, hearing.caseId, id, { status });
        } catch (err) {
          console.error('[legalService.updateHearingStatus] Error en API:', err);
          throw err;
        }
      }
      this.hearings[index].status = status;
      this.saveState();
    }
  }

  // --- TASKS ---
  public getTasks(): LegalTask[] {
    return [...this.tasks];
  }

  public getTasksByCaseId(caseId: string): LegalTask[] {
    return this.tasks.filter((t) => String(t.caseId) === String(caseId));
  }

  public async addTask(taskData: Omit<LegalTask, 'id' | 'createdAt'>): Promise<LegalTask> {
    if (taskData.caseId && !isNaN(Number(taskData.caseId))) {
      try {
        const created = await legalApi.createCaseTask(
          this.organizationId,
          taskData.caseId,
          taskData
        );
        this.tasks.unshift(created);
        this.saveState();
        return created;
      } catch (err) {
        console.error('[legalService.addTask] Error en API:', err);
        throw err;
      }
    }

    const newTask: LegalTask = {
      ...taskData,
      id: `tsk-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.tasks.unshift(newTask);
    this.saveState();
    return newTask;
  }

  public async updateTaskStatus(id: string, status: LegalTask['status']): Promise<void> {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      const task = this.tasks[index];
      if (!isNaN(Number(id)) && task.caseId && !isNaN(Number(task.caseId))) {
        try {
          await legalApi.updateCaseTask(this.organizationId, task.caseId, id, { status });
        } catch (err) {
          console.error('[legalService.updateTaskStatus] Error en API:', err);
          throw err;
        }
      }
      this.tasks[index].status = status;
      this.saveState();
    }
  }

  public async toggleTaskStatus(taskId: string): Promise<void> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      const newStatus: LegalTask['status'] = task.status === 'Completada' ? 'Pendiente' : 'Completada';
      if (!isNaN(Number(taskId)) && task.caseId && !isNaN(Number(task.caseId))) {
        try {
          await legalApi.updateCaseTask(this.organizationId, task.caseId, taskId, { status: newStatus });
        } catch (err) {
          console.error('[legalService.toggleTaskStatus] Error en API:', err);
          throw err;
        }
      }
      task.status = newStatus;
      this.saveState();
    }
  }

  // --- DOCUMENTS ---
  public getDocuments(): LegalDocument[] {
    return [...this.documents];
  }

  public getDocumentsByCaseId(caseId: string): LegalDocument[] {
    return this.documents.filter((doc) => String(doc.caseId) === String(caseId));
  }

  public async fetchCaseDocuments(caseId: string): Promise<LegalDocument[]> {
    if (!isNaN(Number(caseId))) {
      try {
        const apiDocs = await legalApi.getCaseDocuments(this.organizationId, caseId);
        this.documents = [
          ...this.documents.filter((d) => String(d.caseId) !== String(caseId)),
          ...apiDocs,
        ];
        this.saveState();
        return apiDocs;
      } catch (err) {
        console.error('[legalService.fetchCaseDocuments] Error en API:', err);
        throw err;
      }
    }
    return this.getDocumentsByCaseId(caseId);
  }

  public async addDocument(
    docData: Omit<LegalDocument, 'id' | 'createdAt'> & { file?: File | null }
  ): Promise<LegalDocument> {
    if (docData.caseId && !isNaN(Number(docData.caseId))) {
      try {
        let created: LegalDocument;
        if (docData.file instanceof File) {
          const formData = new FormData();
          formData.append('title', docData.name);
          formData.append('documentType', docData.type);
          if (docData.description) formData.append('description', docData.description);
          if (docData.status) formData.append('status', docData.status);
          formData.append('file', docData.file);
          created = await legalApi.createCaseDocument(this.organizationId, docData.caseId, formData);
        } else {
          const payload = {
            title: docData.name,
            documentType: docData.type,
            description: docData.description,
            status: docData.status,
            fileName: `${docData.name.replace(/\s+/g, '_')}.${docData.fileExtension || 'pdf'}`,
            mimeType: 'application/pdf',
            fileBase64:
              'JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iagp0cmFpbGVyCjw8Ci9Sb290IDEgMCBSCj4+CiUlRU9G',
          };
          created = await legalApi.createCaseDocument(this.organizationId, docData.caseId, payload);
        }
        this.documents.unshift(created);
        this.saveState();
        return created;
      } catch (err) {
        console.error('[legalService.addDocument] Error en API:', err);
        throw err;
      }
    }

    const newDoc: LegalDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.documents.unshift(newDoc);
    this.saveState();
    return newDoc;
  }

  public async addDocumentVersion(
    caseId: string,
    documentId: string,
    file: File | { fileBase64: string; fileName: string; mimeType: string; notes?: string },
    notes?: string
  ): Promise<void> {
    if (!isNaN(Number(caseId)) && !isNaN(Number(documentId))) {
      try {
        let payload: any;
        if (file instanceof File) {
          const fd = new FormData();
          fd.append('file', file);
          if (notes) fd.append('notes', notes);
          payload = fd;
        } else {
          payload = file;
        }
        await legalApi.addDocumentVersion(this.organizationId, caseId, documentId, payload);
        await this.fetchCaseDocuments(caseId);
      } catch (err) {
        console.error('[legalService.addDocumentVersion] Error en API:', err);
        throw err;
      }
    }
  }

  public async archiveDocument(caseId: string, documentId: string): Promise<void> {
    if (!isNaN(Number(caseId)) && !isNaN(Number(documentId))) {
      try {
        await legalApi.archiveDocument(this.organizationId, caseId, documentId);
        await this.fetchCaseDocuments(caseId);
      } catch (err) {
        console.error('[legalService.archiveDocument] Error en API:', err);
        throw err;
      }
    } else {
      const doc = this.documents.find((d) => d.id === documentId);
      if (doc) {
        doc.status = 'Archivado';
        this.saveState();
      }
    }
  }

  // --- ACTIVITIES ---
  public getActivitiesByCaseId(caseId: string): CaseActivity[] {
    return this.activities.filter((a) => String(a.caseId) === String(caseId));
  }

  public async fetchCaseActivities(caseId: string): Promise<CaseActivity[]> {
    if (!isNaN(Number(caseId))) {
      try {
        const apiActs = await legalApi.getCaseActivities(this.organizationId, caseId);
        this.activities = [
          ...this.activities.filter((a) => String(a.caseId) !== String(caseId)),
          ...apiActs,
        ];
        this.saveState();
        return apiActs;
      } catch (err) {
        console.error('[legalService.fetchCaseActivities] Falló fetch API:', err);
        throw err;
      }
    }
    return this.getActivitiesByCaseId(caseId);
  }

  public addActivity(activityData: Omit<CaseActivity, 'id'>): CaseActivity {
    const newActivity: CaseActivity = {
      ...activityData,
      id: `act-${Date.now()}`,
    };
    this.activities.unshift(newActivity);
    this.saveState();
    return newActivity;
  }

  public getCaseActivities(caseId: string): CaseActivity[] {
    return this.getActivitiesByCaseId(caseId);
  }

  public async addCaseActivity(
    caseId: string,
    activity: { type: CaseActivity['type']; title: string; description: string; performedBy: string }
  ): Promise<CaseActivity> {
    if (!isNaN(Number(caseId))) {
      try {
        const created = await legalApi.createCaseActivity(this.organizationId, caseId, activity);
        this.activities.unshift(created);
        this.saveState();
        return created;
      } catch (err) {
        console.error('[legalService.addCaseActivity] Error en API:', err);
        throw err;
      }
    }

    return this.addActivity({
      caseId,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: activity.type,
      title: activity.title,
      description: activity.description,
      performedBy: activity.performedBy,
    });
  }

  // --- NOTIFICATIONS ---
  public getNotifications(): SystemNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.unreadCount;
  }

  public async getUnreadCountFromApi(): Promise<number> {
    try {
      const count = await legalApi.getUnreadNotificationsCount(this.organizationId);
      if (typeof count === 'number') {
        this.unreadCount = count;
        this.notify();
      }
      return this.unreadCount;
    } catch {
      return this.unreadCount;
    }
  }

  public addNotification(notificationData: Omit<SystemNotification, 'id'>): SystemNotification {
    const newNotif: SystemNotification = {
      ...notificationData,
      id: `notif-${Date.now()}`,
    };
    this.notifications.unshift(newNotif);
    if (!newNotif.read) {
      this.unreadCount++;
    }
    this.saveState();
    return newNotif;
  }

  public async markNotificationAsRead(id: string): Promise<void> {
    const notif = this.notifications.find((n) => n.id === id);
    const wasUnread = notif && !notif.read;
    if (notif) {
      notif.read = true;
      notif.status = 'READ';
      if (wasUnread && this.unreadCount > 0) {
        this.unreadCount--;
      }
      this.saveState();
    }
    const numericId = Number(id);
    if (!isNaN(numericId) && numericId > 0) {
      try {
        await legalApi.markNotificationAsRead(this.organizationId, numericId);
        await this.getUnreadCountFromApi();
      } catch (e) {
        console.warn('[legalService] Error marking notification as read in API:', e);
      }
    }
  }

  public async dismissNotification(id: string): Promise<void> {
    const notif = this.notifications.find((n) => n.id === id);
    const wasUnread = notif && !notif.read;
    this.notifications = this.notifications.filter((n) => n.id !== id);
    if (wasUnread && this.unreadCount > 0) {
      this.unreadCount--;
    }
    this.saveState();
    const numericId = Number(id);
    if (!isNaN(numericId) && numericId > 0) {
      try {
        await legalApi.dismissNotification(this.organizationId, numericId);
        await this.getUnreadCountFromApi();
      } catch (e) {
        console.warn('[legalService] Error dismissing notification in API:', e);
      }
    }
  }

  public async markAllNotificationsAsRead(): Promise<void> {
    const unread = this.notifications.filter((n) => !n.read);
    this.notifications = this.notifications.map((n) => ({ ...n, read: true, status: 'READ' }));
    this.unreadCount = 0;
    this.saveState();
    try {
      await Promise.all(
        unread.map((n) => {
          const numId = Number(n.id);
          return !isNaN(numId) && numId > 0
            ? legalApi.markNotificationAsRead(this.organizationId, numId).catch(() => {})
            : Promise.resolve();
        })
      );
      await this.getUnreadCountFromApi();
    } catch {
      // ignore
    }
  }

  // --- FEE AGREEMENTS & PAYMENTS (FASE 4) ---
  public getFeeAgreements(): LegalFeeAgreement[] {
    return [...this.feeAgreements];
  }

  public getFeeAgreementsByCaseId(caseId: string): LegalFeeAgreement[] {
    return this.feeAgreements.filter((fa) => String(fa.legalCaseId) === String(caseId));
  }

  public async fetchCaseFeeAgreements(caseId: string): Promise<LegalFeeAgreement[]> {
    if (!isNaN(Number(caseId))) {
      try {
        const apiAgreements = await legalApi.getFeeAgreements(this.organizationId, caseId);
        this.feeAgreements = [
          ...this.feeAgreements.filter((fa) => String(fa.legalCaseId) !== String(caseId)),
          ...apiAgreements,
        ];
        this.saveState();
        return apiAgreements;
      } catch (err) {
        console.error('[legalService.fetchCaseFeeAgreements] Error en API:', err);
        throw err;
      }
    }
    return this.getFeeAgreementsByCaseId(caseId);
  }

  public async addFeeAgreement(
    caseId: string,
    data: {
      title: string;
      description?: string;
      billingType: string;
      currency?: string;
      notes?: string;
      items: Array<{
        description: string;
        category?: string;
        quantity?: number;
        unitPrice: number;
        notes?: string;
      }>;
    }
  ): Promise<LegalFeeAgreement> {
    if (!isNaN(Number(caseId))) {
      try {
        const created = await legalApi.createFeeAgreement(this.organizationId, caseId, data);
        this.feeAgreements.unshift(created);
        this.saveState();
        return created;
      } catch (err) {
        console.error('[legalService.addFeeAgreement] Error en API:', err);
        throw err;
      }
    }

    const items = (data.items || []).map((it, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      feeAgreementId: `fa-${Date.now()}`,
      description: it.description,
      category: it.category || 'HONORARIOS',
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice,
      totalPrice: (it.quantity || 1) * it.unitPrice,
      notes: it.notes,
    }));
    const subtotal = items.reduce((acc, it) => acc + it.totalPrice, 0);
    const newAgreement: LegalFeeAgreement = {
      id: `fa-${Date.now()}`,
      organizationId: this.organizationId,
      legalCaseId: Number(caseId) || 0,
      caseId: String(caseId),
      title: data.title,
      description: data.description,
      billingType: data.billingType,
      status: 'ACTIVE',
      currency: data.currency || 'USD',
      subtotal,
      discount: 0,
      total: subtotal,
      notes: data.notes,
      items,
      payments: [],
      paidAmount: 0,
      balance: subtotal,
      paymentStatus: 'UNPAID',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.feeAgreements.unshift(newAgreement);
    this.saveState();
    return newAgreement;
  }

  public async recordFeePayment(
    caseId: string,
    agreementId: string,
    paymentData: {
      amount: number;
      method: string;
      notes?: string;
      reference?: string;
      paidAt?: string;
    }
  ): Promise<LegalPayment> {
    if (!isNaN(Number(caseId)) && !isNaN(Number(agreementId))) {
      try {
        const res = await legalApi.recordPayment(this.organizationId, caseId, agreementId, paymentData);
        await this.fetchCaseFeeAgreements(caseId);
        return (res as any)?.payment || res;
      } catch (err) {
        console.error('[legalService.recordFeePayment] Error en API:', err);
        throw err;
      }
    }

    const agIndex = this.feeAgreements.findIndex((fa) => String(fa.id) === String(agreementId));
    if (agIndex === -1) throw new Error('Acuerdo no encontrado');
    const ag = this.feeAgreements[agIndex];
    if (paymentData.amount > ag.balance) {
      throw new Error(`El monto ($${paymentData.amount}) excede el saldo pendiente ($${ag.balance})`);
    }

    const newPayment: LegalPayment = {
      id: `pay-${Date.now()}`,
      organizationId: this.organizationId,
      feeAgreementId: String(agreementId),
      amount: paymentData.amount,
      method: paymentData.method,
      reference: paymentData.reference,
      notes: paymentData.notes,
      paidAt: paymentData.paidAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const newPayments = [...(ag.payments || []), newPayment];
    const newPaidAmount = Math.round((ag.paidAmount + paymentData.amount) * 100) / 100;
    const newBalance = Math.round((ag.total - newPaidAmount) * 100) / 100;
    let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'PARTIALLY_PAID';
    if (newBalance <= 0) paymentStatus = 'PAID';
    else if (newPaidAmount === 0) paymentStatus = 'UNPAID';

    this.feeAgreements[agIndex] = {
      ...ag,
      payments: newPayments,
      paidAmount: newPaidAmount,
      balance: newBalance,
      paymentStatus,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    return newPayment;
  }

  // --- CALENDARIO UNIFICADO (PROYECCIÓN) ---
  public async getCalendar(filters?: {
    from?: string;
    to?: string;
    type?: string;
    legalCaseId?: number | string;
    responsibleUserId?: number | string;
    status?: string;
  }): Promise<LegalCalendarEntry[]> {
    try {
      return await legalApi.getCalendar(this.organizationId, filters);
    } catch (err) {
      console.error('[legalService.getCalendar] Error al cargar calendario:', err);
      throw err;
    }
  }

  // --- RECORDATORIOS PERSISTENTES ---
  public async getReminders(filters?: {
    userId?: number;
    legalCaseId?: number | string;
    status?: string;
    sourceType?: string;
    sourceId?: number;
    from?: string;
    to?: string;
  }): Promise<LegalReminder[]> {
    return await legalApi.getReminders(this.organizationId, filters);
  }

  public async createReminder(
    caseId: number | string,
    data: {
      sourceType: string;
      sourceId: number;
      remindAt: string;
      message?: string;
      userId?: number;
    }
  ): Promise<LegalReminder> {
    return await legalApi.createReminder(this.organizationId, caseId, data);
  }

  public async dismissReminder(
    caseId: number | string,
    reminderId: number | string
  ): Promise<LegalReminder> {
    return await legalApi.dismissReminder(this.organizationId, caseId, reminderId);
  }

  // --- DASHBOARD Y REPORTES (FASE 7) ---
  public getDashboardData(): LegalDashboardDTO | null {
    return this.dashboardData;
  }

  public async fetchDashboard(): Promise<LegalDashboardDTO> {
    const data = await legalApi.getDashboard(this.organizationId);
    this.dashboardData = data;
    this.notify();
    return data;
  }

  public async fetchReports(filters?: { from?: string; to?: string }): Promise<LegalReportsDTO> {
    return await legalApi.getReports(this.organizationId, filters);
  }

  // --- CIERRE FORMAL Y ARCHIVADO (FASE 8) ---
  public async getClosureCheck(caseId: string | number): Promise<ClosureCheckDTO> {
    return await legalApi.getClosureCheck(this.organizationId, caseId);
  }

  public async closeCase(caseId: string | number, data: CloseCaseInput): Promise<any> {
    const res = await legalApi.closeCase(this.organizationId, caseId, data);
    const idx = this.cases.findIndex((c) => String(c.id) === String(caseId));
    if (idx !== -1) {
      this.cases[idx] = {
        ...this.cases[idx],
        status: 'Cerrado',
        closedAt: new Date().toISOString(),
      };
      this.saveState();
    }
    return res;
  }

  public async archiveCase(caseId: string | number, data: ArchiveCaseInput): Promise<any> {
    const res = await legalApi.archiveCase(this.organizationId, caseId, data);
    const idx = this.cases.findIndex((c) => String(c.id) === String(caseId));
    if (idx !== -1) {
      this.cases[idx] = {
        ...this.cases[idx],
        status: 'Archivado',
        archivedAt: new Date().toISOString(),
      };
      this.saveState();
    }
    return res;
  }
}

export const legalService = new LegalService();
