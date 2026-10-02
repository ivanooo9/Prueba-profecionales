// Types definition for Arquitectos System

export type ClientType = 'Persona' | 'Empresa';
export type ClientStatus = 'Activo' | 'Inactivo';

export interface Client {
  id: string | number;
  organizationId?: number;
  name: string;
  contactPerson?: string;
  taxId: string; // RUC / CEDULA
  taxIdType?: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  type: ClientType;
  status: ClientStatus;
  notes?: string;
  projectsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type ProjectType =
  | 'Vivienda'
  | 'Edificio'
  | 'Remodelación'
  | 'Diseño interior'
  | 'Comercial'
  | 'Urbanismo'
  | 'Otro';

export type ProjectStatus =
  | 'Planificación'
  | 'Diseño'
  | 'En desarrollo'
  | 'En revisión'
  | 'En construcción'
  | 'Finalizado'
  | 'Archivado';

export type ProjectPriority = 'Baja' | 'Media' | 'Alta';

export type StageName =
  | 'Conceptualización'
  | 'Anteproyecto'
  | 'Diseño'
  | 'Planos'
  | 'Revisión'
  | 'Entrega';

export type StageStatus = 'Pendiente' | 'En progreso' | 'Completada';

export interface Stage {
  id: string | number;
  projectId: string | number;
  name: StageName | string;
  order?: number;
  status: StageStatus;
  startDate: string;
  dueDate: string;
  progress: number; // 0 - 100
  notes?: string;
}

export interface Project {
  id: string | number;
  code: string; // e.g. PRJ-2026-001
  name: string;
  organizationId?: number;
  clientId: string | number;
  clientName: string;
  type: ProjectType;
  location: string;
  approxAreaM2?: number;
  levelsCount?: number;
  leadArchitect: string;
  leadArchitectUserId?: number;
  startDate: string;
  targetDeliveryDate: string;
  actualEndDate?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number; // 0 - 100
  estimatedBudget: number;
  approvedBudget: number;
  clientRequirements?: string;
  description: string;
  notes?: string;
  archivedAt?: string;
  archivedByUserId?: number;
  archiveReason?: string;
  tasks?: Task[];
  deliverables?: Deliverable[];
  meetings?: Meeting[];
  documents?: DocumentMetadata[];
  stages: Stage[];
  createdAt?: string;
  updatedAt?: string;
}

export type TaskStatus = 'Pendiente' | 'En progreso' | 'Completada' | 'Atrasada';

export interface Task {
  id: string | number;
  organizationId?: number;
  projectId: string | number;
  projectName: string;
  stageId?: string | number;
  stageName?: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedToUserId?: number;
  priority: ProjectPriority;
  status: TaskStatus;
  dueDate: string;
  isOverdue?: boolean;
  completedAt?: string;
  createdByUserId?: number;
  createdAt: string;
  updatedAt?: string;
}

export type DeliverableType =
  | 'Planos'
  | 'Modelos 3D'
  | 'Renders'
  | 'Memorias'
  | 'Presentaciones'
  | 'Documentación técnica'
  | 'Otro';

export type DeliverableStatus =
  | 'Pendiente'
  | 'En desarrollo'
  | 'En revisión'
  | 'Aprobado'
  | 'Entregado'
  | 'Rechazado';

export interface Deliverable {
  id: string | number;
  organizationId?: number;
  projectId: string | number;
  projectName: string;
  stageId?: string | number;
  stageName?: string;
  name: string;
  type: DeliverableType;
  assignedTo: string;
  assignedToUserId?: number;
  dueDate: string;
  status: DeliverableStatus;
  deliveredAt?: string;
  notes?: string;
  createdByUserId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type MeetingModality = 'Presencial' | 'Virtual';
export type MeetingStatus = 'Programada' | 'Realizada' | 'Cancelada';

export interface Meeting {
  id: string | number;
  organizationId?: number;
  projectId: string | number;
  projectName: string;
  clientId?: string | number;
  clientName: string;
  title: string;
  scheduledAt?: string;
  date: string;
  time: string;
  location: string;
  meetingUrl?: string;
  modality: MeetingModality;
  meetingType?: 'Reunión' | 'Inspección' | string;
  leadArchitect: string;
  leadArchitectUserId?: number;
  status: MeetingStatus;
  notes?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdByUserId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type DocumentType =
  | 'Plano'
  | 'Render'
  | 'Memoria'
  | 'Contrato'
  | 'Presupuesto'
  | 'Informe'
  | 'Presentación'
  | 'Otro';

export type DocumentStatus = 'Borrador' | 'En revisión' | 'Aprobado' | 'Rechazado' | 'Obsoleto' | 'Archivado';

export interface DocumentVersion {
  id: number;
  documentId: number;
  versionNumber: number;
  originalFilename: string;
  storageKey?: string;
  mimeType: string;
  fileSize: number;
  checksumSha256: string;
  notes?: string;
  uploadedByUserId: number;
  uploadedByName?: string;
  createdAt: string;
}

export interface DocumentMetadata {
  id: string | number;
  organizationId?: number;
  projectId: string | number;
  projectName: string;
  stageId?: string | number;
  stageName?: string;
  name: string;
  type: DocumentType | string;
  documentType?: string;
  version: string;
  date: string;
  status: DocumentStatus | string;
  description?: string;
  fileSizeText?: string;
  createdByUserId?: number;
  createdByName?: string;
  versionsCount?: number;
  currentVersion?: DocumentVersion | null;
  versions?: DocumentVersion[];
  createdAt?: string;
  updatedAt?: string;
}

export type BudgetStatus = 'Borrador' | 'Presentado' | 'Aprobado' | 'Rechazado' | 'Pendiente' | 'Enviado';

export interface BudgetItem {
  id?: number | string;
  organizationId?: number;
  budgetId?: number | string;
  description: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Budget {
  id: string | number;
  organizationId?: number;
  projectId: string | number;
  projectName: string;
  projectCode?: string;
  name?: string;
  description?: string;
  total?: number;
  estimatedAmount: number;
  approvedAmount: number;
  status: BudgetStatus | string;
  notes?: string;
  approvedAt?: string;
  approvedByUserId?: number;
  approvedByName?: string;
  createdByUserId?: number;
  createdByName?: string;
  lastUpdated: string;
  createdAt?: string;
  updatedAt?: string;
  items?: BudgetItem[];
}

export interface CalendarEvent {
  id: string;
  sourceId: number;
  sourceType: 'task' | 'deliverable' | 'meeting';
  title: string;
  date: string;
  time?: string;
  status: string;
  priority?: string;
  projectId: number;
  projectName: string;
  projectCode: string;
  assignedToUserId?: number;
  assignedToName?: string;
  location?: string;
  notes?: string;
}

export interface DashboardMetrics {
  activeProjectsCount: number;
  totalProjectsCount: number;
  totalBudgetApproved: number;
  totalBudgetEstimated: number;
  pendingTasksCount: number;
  urgentTasksCount: number;
  pendingDeliverablesCount: number;
  upcomingMeetingsCount: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentProjects: Array<{
    id: number;
    code: string;
    name: string;
    clientName: string;
    status: string;
    progress: number;
    updatedAt: string;
  }>;
  urgentTasks: Array<{
    id: number;
    title: string;
    projectId: number;
    projectName: string;
    priority: string;
    status: string;
    dueDate?: string;
  }>;
  upcomingMeetings: Array<{
    id: number;
    title: string;
    projectId: number;
    projectName: string;
    date: string;
    time?: string;
    location?: string;
    status: string;
  }>;
  budgetSummary: {
    totalEstimated: number;
    totalApproved: number;
    approvedBudgetsCount: number;
    draftBudgetsCount: number;
  };
  nextAction?: {
    type: 'urgent_task' | 'upcoming_meeting' | 'pending_deliverable' | 'info';
    title: string;
    description: string;
    link?: string;
  };
}

export interface ReportsSummary {
  projectsByStatus: Record<string, number>;
  projectsByType: Record<string, number>;
  budgetsByStatus: Record<string, { count: number; totalAmount: number }>;
  tasksByStatus: Record<string, number>;
  deliverablesByStatus: Record<string, number>;
  financialOverview: {
    totalEstimated: number;
    totalApproved: number;
    approvedProjectsCount: number;
    averageBudgetPerProject: number;
  };
  topProjectsByBudget: Array<{
    id: number;
    code: string;
    name: string;
    status: string;
    approvedBudget: number;
    estimatedBudget: number;
  }>;
}

export interface ActivityItem {
  id: string;
  type: 'project' | 'task' | 'deliverable' | 'meeting' | 'budget' | 'client';
  title: string;
  description: string;
  timestamp: string;
  badgeText?: string;
  badgeType?: 'info' | 'warning' | 'success' | 'danger';
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'high' | 'medium' | 'info';
  projectId?: string;
  projectName?: string;
  actionText?: string;
}

