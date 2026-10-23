import {
  Client,
  Project,
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
  ActivityItem,
  AlertItem,
  Stage
} from '../types';

import { architectureApi } from './api/architectureApi';
import { getTodayCalendarDate } from '../utils/dateUtils';

const STORAGE_KEYS = {
  ORG_ID: 'arquitectos_org_id'
};

type Listener = () => void;

export type ArchitectureSyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ArchitectureSyncState {
  organizationId: number | null;
  status: ArchitectureSyncStatus;
  error: string | null;
}

export function hasActiveArchitectureModule(
  modules: Array<{ status: string; module: { code: string } }>
): boolean {
  return modules.some((item) => item.module.code === 'ARCHITECTURE' && item.status === 'ACTIVE');
}

class ArchitectureService {
  private readonly api: typeof architectureApi;
  private organizationId: number | null = null;
  private syncSequence = 0;
  private syncState: ArchitectureSyncState = {
    organizationId: null,
    status: 'idle',
    error: null,
  };
  private clients: Client[] = [];
  private projects: Project[] = [];
  private tasks: Task[] = [];
  private deliverables: Deliverable[] = [];
  private meetings: Meeting[] = [];
  private documents: DocumentMetadata[] = [];
  private budgets: Budget[] = [];
  private activities: ActivityItem[] = [];
  private alerts: AlertItem[] = [];

  private listeners: Set<Listener> = new Set();
  private isInitialized: boolean = false;

  constructor(api: typeof architectureApi = architectureApi) {
    this.api = api;
    this.initOrgId();
    this.loadState();
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

  public getSyncState(): ArchitectureSyncState {
    return { ...this.syncState };
  }

  public requireOrgId(): number {
    if (!this.organizationId) {
      throw new Error('No hay una organización activa seleccionada para el estudio de arquitectura.');
    }
    return this.organizationId;
  }

  public setOrganizationId(orgId: number | null) {
    if (this.organizationId !== orgId) {
      this.organizationId = orgId;
      this.clients = [];
      this.projects = [];
      this.tasks = [];
      this.deliverables = [];
      this.meetings = [];
      this.documents = [];
      this.budgets = [];
      this.activities = [];
      this.alerts = [];
      this.syncState = { organizationId: orgId, status: orgId ? 'idle' : 'success', error: null };
      this.notify();
    } else {
      this.organizationId = orgId;
    }
    if (typeof localStorage !== 'undefined') {
      if (orgId === null) {
        localStorage.removeItem(STORAGE_KEYS.ORG_ID);
      } else {
        localStorage.setItem(STORAGE_KEYS.ORG_ID, String(orgId));
      }
    }
    return this.syncFromApi();
  }

  private loadState() {
    // Clientes, Proyectos, Tareas, Entregables, Reuniones, Documentos y Presupuestos residen en PostgreSQL y se sincronizan vía API Core.
    // Cero mocks y cero persistencia ficticia en localStorage.
    this.clients = [];
    this.projects = [];
    this.tasks = [];
    this.deliverables = [];
    this.meetings = [];
    this.documents = [];
    this.budgets = [];
    this.activities = [];
    this.alerts = [];
  }

  private saveState() {
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- SINCRONIZACIÓN ASÍNCRONA CON API CORE (POSTGRESQL) ---
  public async syncFromApi(): Promise<{
    clients: Client[];
    projects: Project[];
    tasks: Task[];
    deliverables: Deliverable[];
    meetings: Meeting[];
    documents: DocumentMetadata[];
    budgets: Budget[];
  }> {
    const organizationId = this.organizationId;
    const requestId = ++this.syncSequence;

    if (!organizationId) {
      this.clearOrganizationData();
      this.syncState = { organizationId: null, status: 'success', error: null };
      this.isInitialized = true;
      this.notify();
      return this.getDataSnapshot();
    }

    this.syncState = { organizationId, status: 'loading', error: null };
    this.notify();

    try {
      const [apiClients, apiProjects, apiTasks, apiDeliverables, apiMeetings, apiDocuments, apiBudgets] = await Promise.all([
        this.api.getClients(organizationId),
        this.api.getProjects(organizationId, { includeArchived: true }),
        this.api.getTasks(organizationId),
        this.api.getDeliverables(organizationId),
        this.api.getMeetings(organizationId),
        this.api.getDocuments(organizationId),
        this.api.getBudgets(organizationId),
      ]);

      if (!this.isCurrentSync(requestId, organizationId)) {
        return this.getDataSnapshot();
      }

      if (Array.isArray(apiClients)) {
        this.clients = apiClients;
      }
      if (Array.isArray(apiProjects)) {
        this.projects = apiProjects;
      }
      if (Array.isArray(apiTasks)) {
        this.tasks = apiTasks;
      }
      if (Array.isArray(apiDeliverables)) {
        this.deliverables = apiDeliverables;
      }
      if (Array.isArray(apiMeetings)) {
        this.meetings = apiMeetings;
      }
      if (Array.isArray(apiDocuments)) {
        this.documents = apiDocuments;
      }
      if (Array.isArray(apiBudgets)) {
        this.budgets = apiBudgets;
      }

      this.isInitialized = true;
      this.syncState = { organizationId, status: 'success', error: null };
      this.notify();
      return this.getDataSnapshot();
    } catch (error) {
      if (!this.isCurrentSync(requestId, organizationId)) {
        return this.getDataSnapshot();
      }

      this.syncState = {
        organizationId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Error al sincronizar la organización.',
      };
      this.notify();
      console.error('[architectureService] Error al sincronizar con API Core:', error);
      throw error;
    }
  }

  private isCurrentSync(requestId: number, organizationId: number): boolean {
    return requestId === this.syncSequence && organizationId === this.organizationId;
  }

  private clearOrganizationData(): void {
    this.clients = [];
    this.projects = [];
    this.tasks = [];
    this.deliverables = [];
    this.meetings = [];
    this.documents = [];
    this.budgets = [];
    this.activities = [];
    this.alerts = [];
  }

  private getDataSnapshot() {
    return {
      clients: [...this.clients],
      projects: [...this.projects],
      tasks: [...this.tasks],
      deliverables: [...this.deliverables],
      meetings: [...this.meetings],
      documents: [...this.documents],
      budgets: [...this.budgets],
    };
  }

  // --- CLIENTES (ArchitectureClient) ---
  public getClients(): Client[] {
    return [...this.clients];
  }

  public getClientById(id: string | number): Client | undefined {
    return this.clients.find((c) => String(c.id) === String(id));
  }

  public async saveClient(client: Partial<Client>): Promise<Client> {
    const orgId = this.requireOrgId();
    let saved: Client;
    if (client.id && !String(client.id).startsWith('cli-')) {
      saved = await architectureApi.updateClient(orgId, client.id, client);
      const idx = this.clients.findIndex((c) => String(c.id) === String(client.id));
      if (idx !== -1) {
        this.clients[idx] = saved;
      } else {
        this.clients.unshift(saved);
      }
    } else {
      saved = await architectureApi.createClient(orgId, client);
      this.clients.unshift(saved);
    }

    this.addActivity({
      type: 'client',
      title: client.id ? `Cliente "${saved.name}" actualizado` : `Nuevo cliente "${saved.name}" registrado`,
      description: `Tipo: ${saved.type} | Identificación: ${saved.taxId || 'S/N'}`,
      badgeText: saved.status,
      badgeType: 'info'
    });

    this.saveState();
    return saved;
  }

  public async deleteClient(id: string | number): Promise<void> {
    const orgId = this.requireOrgId();
    await architectureApi.inactivateClient(orgId, id);
    const found = this.clients.find((c) => String(c.id) === String(id));
    if (found) {
      found.status = 'Inactivo';
    }
    this.saveState();
  }

  // --- PROYECTOS (ArchitectureProject) ---
  public getProjects(): Project[] {
    return [...this.projects];
  }

  public getProjectById(id: string | number): Project | undefined {
    return this.projects.find((p) => String(p.id) === String(id));
  }

  public async saveProject(project: Partial<Project>): Promise<Project> {
    const todayStr = getTodayCalendarDate();
    if (project.targetDeliveryDate && project.targetDeliveryDate < todayStr) {
      throw new Error('La fecha estimada de entrega no puede ser anterior a hoy.');
    }
    const orgId = this.requireOrgId();
    let saved: Project;
    const isExisting = Boolean(
      project.id && !String(project.id).startsWith('prj-') && !isNaN(Number(project.id))
    );

    if (isExisting) {
      saved = await architectureApi.updateProject(orgId, project.id!, project);
      const idx = this.projects.findIndex((p) => String(p.id) === String(project.id));
      if (idx !== -1) {
        this.projects[idx] = saved;
      } else {
        this.projects.unshift(saved);
      }
    } else {
      const payload = {
        clientId: Number(project.clientId),
        name: project.name,
        type: project.type || 'Vivienda',
        location: project.location || null,
        approxAreaM2: project.approxAreaM2 ? Number(project.approxAreaM2) : null,
        levelsCount: project.levelsCount ? Number(project.levelsCount) : null,
        leadArchitectUserId: project.leadArchitectUserId,
        startDate: project.startDate || null,
        targetDeliveryDate: project.targetDeliveryDate || null,
        status: project.status || 'Planificación',
        priority: project.priority || 'Media',
        description: project.description || null,
        clientRequirements: project.clientRequirements || null,
        notes: project.notes || null,
      };

      saved = await architectureApi.createProject(orgId, payload);
      this.projects.unshift(saved);
    }

    this.addActivity({
      type: 'project',
      title: isExisting
        ? `Proyecto "${saved.name}" actualizado`
        : `Nuevo proyecto "${saved.name}" creado (${saved.code})`,
      description: `Estado: ${saved.status} | Cliente: ${saved.clientName}`,
      badgeText: saved.status,
      badgeType: 'info'
    });

    this.saveState();
    return saved;
  }

  public async archiveProject(id: string | number, reason?: string): Promise<Project> {
    const orgId = this.requireOrgId();
    const updated = await architectureApi.archiveProject(orgId, id, reason);
    const idx = this.projects.findIndex((p) => String(p.id) === String(id));
    if (idx !== -1) {
      this.projects[idx] = updated;
    }
    this.saveState();
    return updated;
  }

  public async unarchiveProject(id: string | number): Promise<Project> {
    const orgId = this.requireOrgId();
    const updated = await architectureApi.unarchiveProject(orgId, id);
    const idx = this.projects.findIndex((p) => String(p.id) === String(id));
    if (idx !== -1) {
      this.projects[idx] = updated;
    }
    this.saveState();
    return updated;
  }

  public async deleteProject(id: string | number): Promise<void> {
    await this.archiveProject(id, 'Archivado desde panel de control');
  }

  public async createProjectStage(
    projectId: string | number,
    data: { name: string; startDate?: string; dueDate?: string; notes?: string; progress?: number; status?: string }
  ): Promise<Project | undefined> {
    const orgId = this.requireOrgId();
    const updatedProject = await architectureApi.createStage(
      orgId,
      projectId,
      data
    );

    const idx = this.projects.findIndex((p) => String(p.id) === String(projectId));
    if (idx !== -1) {
      this.projects[idx] = updatedProject;
    }
    this.saveState();
    return updatedProject;
  }

  public async updateProjectStage(
    projectId: string | number,
    stageId: string | number,
    updates: Partial<Stage>
  ): Promise<Project | undefined> {
    const orgId = this.requireOrgId();
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.progress !== undefined) payload.progress = updates.progress;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.startDate !== undefined) payload.startDate = updates.startDate;
    if (updates.dueDate !== undefined) payload.dueDate = updates.dueDate;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const updatedProject = await architectureApi.updateStage(
      orgId,
      projectId,
      stageId,
      payload
    );

    const idx = this.projects.findIndex((p) => String(p.id) === String(projectId));
    if (idx !== -1) {
      this.projects[idx] = updatedProject;
    }
    this.saveState();
    return updatedProject;
  }

  public async deleteProjectStage(
    projectId: string | number,
    stageId: string | number
  ): Promise<Project | undefined> {
    const orgId = this.requireOrgId();
    const updatedProject = await architectureApi.deleteStage(
      orgId,
      projectId,
      stageId
    );

    const idx = this.projects.findIndex((p) => String(p.id) === String(projectId));
    if (idx !== -1) {
      this.projects[idx] = updatedProject;
    }
    this.saveState();
    return updatedProject;
  }

  // --- TASKS (ArchitectureTask) ---
  public getTasks(): Task[] {
    return [...this.tasks];
  }

  public getTaskById(id: string | number): Task | undefined {
    return this.tasks.find((t) => String(t.id) === String(id));
  }

  public async saveTask(task: Partial<Task>): Promise<Task> {
    const todayStr = getTodayCalendarDate();
    if (task.dueDate && task.dueDate < todayStr) {
      throw new Error('La fecha límite no puede ser anterior a hoy.');
    }
    const orgId = this.requireOrgId();
    let saved: Task;
    const isExisting = Boolean(
      task.id && !String(task.id).startsWith('tsk-') && !isNaN(Number(task.id))
    );

    if (isExisting) {
      saved = await architectureApi.updateTask(orgId, task.id!, task);
      const idx = this.tasks.findIndex((t) => String(t.id) === String(task.id));
      if (idx !== -1) {
        this.tasks[idx] = saved;
      } else {
        this.tasks.unshift(saved);
      }
    } else {
      const payload: any = {
        projectId: Number(task.projectId),
        title: task.title,
        description: task.description || null,
        priority: task.priority || 'Media',
        status: task.status || 'Pendiente',
        dueDate: task.dueDate || null,
        stageId: task.stageId ? Number(task.stageId) : null,
        assignedToUserId: task.assignedToUserId ? Number(task.assignedToUserId) : null,
      };
      saved = await architectureApi.createTask(orgId, payload);
      this.tasks.unshift(saved);
    }

    this.notify();
    return saved;
  }

  public async toggleTaskStatus(id: string | number): Promise<Task> {
    const orgId = this.requireOrgId();
    const updated = await architectureApi.toggleTaskStatus(orgId, id);
    const idx = this.tasks.findIndex((t) => String(t.id) === String(id));
    if (idx !== -1) {
      this.tasks[idx] = updated;
    }
    this.notify();
    return updated;
  }

  // --- DELIVERABLES (ArchitectureDeliverable) ---
  public getDeliverables(): Deliverable[] {
    return [...this.deliverables];
  }

  public getDeliverableById(id: string | number): Deliverable | undefined {
    return this.deliverables.find((d) => String(d.id) === String(id));
  }

  public async saveDeliverable(deliv: Partial<Deliverable>): Promise<Deliverable> {
    const todayStr = getTodayCalendarDate();
    if (deliv.dueDate && deliv.dueDate < todayStr) {
      throw new Error('La fecha límite no puede ser anterior a hoy.');
    }
    const orgId = this.requireOrgId();
    let saved: Deliverable;
    const isExisting = Boolean(
      deliv.id && !String(deliv.id).startsWith('del-') && !isNaN(Number(deliv.id))
    );

    if (isExisting) {
      saved = await architectureApi.updateDeliverable(orgId, deliv.id!, deliv);
      const idx = this.deliverables.findIndex((d) => String(d.id) === String(deliv.id));
      if (idx !== -1) {
        this.deliverables[idx] = saved;
      } else {
        this.deliverables.unshift(saved);
      }
    } else {
      const payload: any = {
        projectId: Number(deliv.projectId),
        name: deliv.name,
        type: deliv.type || 'Planos',
        dueDate: deliv.dueDate || null,
        status: deliv.status || 'Pendiente',
        notes: deliv.notes || null,
        stageId: deliv.stageId ? Number(deliv.stageId) : null,
        assignedToUserId: deliv.assignedToUserId ? Number(deliv.assignedToUserId) : null,
      };
      saved = await architectureApi.createDeliverable(orgId, payload);
      this.deliverables.unshift(saved);
    }

    this.notify();
    return saved;
  }

  // --- MEETINGS (ArchitectureMeeting) ---
  public getMeetings(): Meeting[] {
    return [...this.meetings];
  }

  public getMeetingById(id: string | number): Meeting | undefined {
    return this.meetings.find((m) => String(m.id) === String(id));
  }

  public async saveMeeting(meeting: Partial<Meeting>): Promise<Meeting> {
    const todayStr = getTodayCalendarDate();
    if (meeting.date && meeting.date < todayStr) {
      throw new Error('La fecha de la reunión no puede ser anterior a hoy.');
    }
    const orgId = this.requireOrgId();
    let saved: Meeting;
    const isExisting = Boolean(
      meeting.id && !String(meeting.id).startsWith('mtg-') && !isNaN(Number(meeting.id))
    );

    if (isExisting) {
      saved = await architectureApi.updateMeeting(orgId, meeting.id!, meeting);
      const idx = this.meetings.findIndex((m) => String(m.id) === String(meeting.id));
      if (idx !== -1) {
        this.meetings[idx] = saved;
      } else {
        this.meetings.unshift(saved);
      }
    } else {
      const payload: any = {
        projectId: Number(meeting.projectId),
        clientId: meeting.clientId ? Number(meeting.clientId) : undefined,
        title: meeting.title,
        date: meeting.date,
        time: meeting.time,
        scheduledAt: meeting.scheduledAt,
        location: meeting.location || null,
        meetingUrl: meeting.meetingUrl || null,
        modality: meeting.modality || 'Presencial',
        meetingType: meeting.meetingType || 'Reunión',
        status: meeting.status || 'Programada',
        notes: meeting.notes || null,
        leadArchitectUserId: meeting.leadArchitectUserId ? Number(meeting.leadArchitectUserId) : null,
      };
      saved = await architectureApi.createMeeting(orgId, payload);
      this.meetings.unshift(saved);
    }

    this.notify();
    return saved;
  }

  public async cancelMeeting(id: string | number): Promise<Meeting> {
    const orgId = this.requireOrgId();
    const updated = await architectureApi.cancelMeeting(orgId, id);
    const idx = this.meetings.findIndex((m) => String(m.id) === String(id));
    if (idx !== -1) {
      this.meetings[idx] = updated;
    }
    this.notify();
    return updated;
  }

  // --- DOCUMENTOS TÉCNICOS (ArchitectureDocument & ArchitectureDocumentVersion) ---
  public getDocuments(): DocumentMetadata[] {
    return [...this.documents];
  }

  public getDocumentById(id: string | number): DocumentMetadata | undefined {
    return this.documents.find((d) => String(d.id) === String(id));
  }

  public async saveDocument(
    doc: Partial<DocumentMetadata>,
    file?: File | null,
    initialNotes?: string
  ): Promise<DocumentMetadata> {
    const orgId = this.requireOrgId();
    let saved: DocumentMetadata;
    if (doc.id && !String(doc.id).startsWith('doc-')) {
      saved = await architectureApi.updateDocument(orgId, doc.id, {
        name: doc.name,
        documentType: (doc.documentType || doc.type) as any,
        description: doc.description,
        status: doc.status,
        stageId: doc.stageId,
      });
      const idx = this.documents.findIndex((d) => String(d.id) === String(saved.id));
      if (idx !== -1) {
        this.documents[idx] = saved;
      } else {
        this.documents.unshift(saved);
      }
    } else {
      if (!doc.projectId) {
        throw new Error('El proyecto es obligatorio para crear un documento.');
      }
      saved = await architectureApi.createDocument(
        orgId,
        {
          projectId: doc.projectId,
          stageId: doc.stageId,
          name: doc.name || 'Documento Técnico',
          documentType: ((doc.documentType || doc.type) as string) || 'Plano',
          description: doc.description,
          status: (doc.status as string) || 'Borrador',
          notes: initialNotes,
        },
        file
      );
      this.documents.unshift(saved);
    }
    this.notify();
    return saved;
  }

  public async uploadDocumentVersion(
    documentId: string | number,
    file: File,
    notes?: string,
    projectId?: string | number
  ): Promise<DocumentVersion> {
    const orgId = this.requireOrgId();
    const version = await architectureApi.addDocumentVersion(
      orgId,
      documentId,
      file,
      notes,
      projectId
    );
    // Sincronizar documento con sus nuevas versiones
    const updatedDoc = await architectureApi.getDocumentById(orgId, documentId);
    if (updatedDoc) {
      const idx = this.documents.findIndex((d) => String(d.id) === String(documentId));
      if (idx !== -1) {
        this.documents[idx] = updatedDoc;
      }
    }
    this.notify();
    return version;
  }

  // --- BUDGETS (Fase 4: PostgreSQL Real) ---
  public getBudgets(): Budget[] {
    return [...this.budgets];
  }

  public async getBudgetsAsync(projectId?: string | number): Promise<Budget[]> {
    const orgId = this.requireOrgId();
    const list = await architectureApi.getBudgets(orgId, { projectId });
    this.budgets = list;
    this.notify();
    return list;
  }

  public async getBudgetById(budgetId: string | number): Promise<Budget | null> {
    const orgId = this.requireOrgId();
    return architectureApi.getBudgetById(orgId, budgetId);
  }

  public async createBudget(data: Partial<Budget>): Promise<Budget> {
    const orgId = this.requireOrgId();
    const created = await architectureApi.createBudget(orgId, data);
    this.budgets.unshift(created);
    this.notify();
    return created;
  }

  public async updateBudget(budgetId: string | number, data: Partial<Budget>): Promise<Budget> {
    const orgId = this.requireOrgId();
    const updated = await architectureApi.updateBudget(orgId, budgetId, data);
    const idx = this.budgets.findIndex((b) => String(b.id) === String(budgetId));
    if (idx !== -1) {
      this.budgets[idx] = updated;
    }
    this.notify();
    return updated;
  }

  public async updateBudgetWithItems(budgetId: string | number, data: Partial<Budget>): Promise<Budget> {
    const orgId = this.requireOrgId();
    const updated = await architectureApi.updateBudgetWithItems(orgId, budgetId, data);
    const idx = this.budgets.findIndex((b) => String(b.id) === String(budgetId));
    if (idx !== -1) {
      this.budgets[idx] = updated;
    } else {
      this.budgets.unshift(updated);
    }
    this.notify();
    return updated;
  }

  public async approveBudget(budgetId: string | number): Promise<Budget> {
    const orgId = this.requireOrgId();
    const approved = await architectureApi.approveBudget(orgId, budgetId);
    const idx = this.budgets.findIndex((b) => String(b.id) === String(budgetId));
    if (idx !== -1) {
      this.budgets[idx] = approved;
    }
    this.notify();
    return approved;
  }

  public async addBudgetItem(budgetId: string | number, data: Partial<BudgetItem>): Promise<BudgetItem> {
    const orgId = this.requireOrgId();
    const item = await architectureApi.addBudgetItem(orgId, budgetId, data);
    await this.syncFromApi();
    return item;
  }

  public async updateBudgetItem(
    budgetId: string | number,
    itemId: string | number,
    data: Partial<BudgetItem>
  ): Promise<BudgetItem> {
    const orgId = this.requireOrgId();
    const item = await architectureApi.updateBudgetItem(orgId, budgetId, itemId, data);
    await this.syncFromApi();
    return item;
  }

  // --- READ MODELS DERIVADOS (Dashboard, Calendario, Reportes) ---
  public async getCalendar(filters?: { startDate?: string; endDate?: string; projectId?: string | number }): Promise<CalendarEvent[]> {
    const orgId = this.requireOrgId();
    return architectureApi.getCalendar(orgId, filters);
  }

  public async getDashboard(): Promise<DashboardData> {
    const orgId = this.requireOrgId();
    return architectureApi.getDashboard(orgId);
  }

  public async getReports(): Promise<ReportsSummary> {
    const orgId = this.requireOrgId();
    return architectureApi.getReports(orgId);
  }

  // --- DASHBOARD HELPERS ---
  public getActivities(): ActivityItem[] {
    return [...this.activities];
  }

  public addActivity(act: Omit<ActivityItem, 'id' | 'timestamp'>) {
    const newAct: ActivityItem = {
      ...act,
      id: `act-${Date.now()}`,
      timestamp: 'Ahora mismo'
    };
    this.activities.unshift(newAct);
    if (this.activities.length > 20) this.activities.pop();
    this.saveState();
  }

  public getAlerts(): AlertItem[] {
    return [...this.alerts];
  }

  // --- SYNC / RELOAD ---
  public async reloadFromApi() {
    this.loadState();
    await this.syncFromApi();
  }

  public resetToMockData() {
    this.reloadFromApi().catch(console.error);
  }
}

export { ArchitectureService };
export const architectureService = new ArchitectureService();
export default architectureService;
