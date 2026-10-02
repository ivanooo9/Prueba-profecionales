export type ClientType = 'persona_natural' | 'persona_juridica';

export type ClientStatus = 'activo' | 'inactivo' | 'prospecto';

export interface Client {
  id: string;
  name: string;
  identificationType: 'cedula' | 'ruc' | 'pasaporte';
  identification: string;
  email: string;
  phone: string;
  address: string;
  clientType: ClientType;
  companyName?: string;
  companyRuc?: string;
  legalRepresentative?: string;
  status: ClientStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LegalArea =
  | 'Civil'
  | 'Penal'
  | 'Laboral'
  | 'Familia'
  | 'Mercantil'
  | 'Administrativo'
  | 'Constitucional';

export type CaseStatus =
  | 'Nuevo'
  | 'En proceso'
  | 'En espera'
  | 'Audiencia'
  | 'Cerrado'
  | 'Archivado';

export type Priority = 'Baja' | 'Media' | 'Alta' | 'Urgente';

export interface LegalCase {
  id: string;
  caseNumber: string; // ej. 17230-2025-00412
  title: string;
  clientId: string;
  clientName: string;
  processType: string; // ej. Ordonario, Sumario, Ejecutivo, Monitorio, Constitucional
  legalArea: LegalArea;
  status: CaseStatus;
  priority: Priority;
  assignedLawyer: string;
  courtName: string; // ej. Unidad Judicial Civil de Quito
  judgeName?: string;
  startDate: string;
  expectedEndDate?: string;
  closedDate?: string;
  claimAmount?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  closedByUserId?: number | null;
  closureReason?: string | null;
  closureNotes?: string | null;
  archivedAt?: string | null;
  archivedByUserId?: number | null;
  archiveReason?: string | null;
}

export type DeadlineStatus = 'Pendiente' | 'En progreso' | 'Cumplido' | 'Vencido';

export interface ProceduralDeadline {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  description: string; // ej. Contestación de demanda, Recurso de Apelación
  dueDate: string; // ISO date string YYYY-MM-DD
  priority: Priority;
  status: DeadlineStatus;
  responsible: string;
  notes?: string;
  isUrgent?: boolean;
  createdAt: string;
}

export type HearingMode = 'Presencial' | 'Virtual';

export type HearingStatus = 'Programada' | 'Celebrada' | 'Suspendida' | 'Cancelada';

export interface Hearing {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  clientId: string;
  clientName: string;
  title: string; // ej. Audiencia Preliminar, Audiencia de Juicio
  type: string; // Preliminar, Juicio, Conciliación, Testimonial, Medida Cautelar
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string; // ej. Sala 4 - Complejo Judicial Norte
  mode: HearingMode;
  responsible: string;
  status: HearingStatus;
  notes?: string;
  createdAt: string;
}

export type TaskStatus = 'Pendiente' | 'En progreso' | 'Completada' | 'Atrasada';

export interface LegalTask {
  id: string;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  priority: Priority;
  status: TaskStatus;
  assignedTo: string;
  createdAt: string;
}

export type DocumentStatus = 'Borrador' | 'Pendiente' | 'En revisión' | 'Aprobado' | 'Final' | 'Archivado';

export interface LegalDocumentVersion {
  id: string | number;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum?: string | null;
  notes?: string | null;
  fileUrl?: string | null;
  uploadedBy?: string;
  createdAt: string;
}

export interface LegalDocument {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  clientId: string;
  name: string;
  type: 'Demanda' | 'Contestación' | 'Providencia' | 'Prueba' | 'Sentencia' | 'Contrato' | 'Poder' | 'Otro';
  fileExtension?: 'pdf' | 'docx' | 'xlsx' | 'jpg' | string;
  status: DocumentStatus;
  description?: string;
  date: string;
  uploadDate?: string;
  uploadedBy?: string;
  versionRef?: string;
  createdAt: string;
  versions?: LegalDocumentVersion[];
  latestVersion?: LegalDocumentVersion | null;
  versionCount?: number;
  fileUrl?: string | null;
  file?: File | null;
}

export interface CaseActivity {
  id: string;
  caseId: string;
  date: string; // YYYY-MM-DD HH:mm
  type: 'Llamada' | 'Reunión' | 'Presentación Escrito' | 'Notificación' | 'Audiencia' | 'Cambio Estado' | 'Nota Interna';
  title: string;
  description: string;
  performedBy: string;
}

export interface SystemNotification {
  id: string;
  type: 'deadline_overdue' | 'deadline_approaching' | 'hearing_today' | 'task_overdue' | 'doc_pending' | string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  linkTab: NavigationTab;
  targetId?: string;
  legalCaseId?: number;
  caseNumber?: string;
  caseTitle?: string;
  clientName?: string;
  status?: string;
}

export type NavigationTab =
  | 'dashboard'
  | 'clients'
  | 'cases'
  | 'deadlines'
  | 'hearings'
  | 'tasks'
  | 'documents'
  | 'calendar'
  | 'reports';

// --- HONORARIOS PROFESIONALES Y PAGOS (MÓDULO LEGAL) ---
export type FeeAgreementStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type LegalPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface LegalFeeItem {
  id: string | number;
  feeAgreementId?: string | number;
  description: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface LegalPayment {
  id: string | number;
  organizationId?: number;
  feeAgreementId: string | number;
  amount: number;
  method?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  status?: string;
  paidAt: string;
  registeredBy?: string;
  createdAt?: string;
}

export interface LegalFeeAgreement {
  id: string | number;
  organizationId?: number;
  legalCaseId?: string | number;
  caseId: string | number;
  title: string;
  description?: string;
  billingType?: string;
  currency?: string;
  status: FeeAgreementStatus;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentStatus: LegalPaymentStatus;
  notes?: string;
  agreedAt?: string;
  createdAt: string;
  updatedAt?: string;
  items?: LegalFeeItem[];
  payments?: LegalPayment[];
}

// --- CALENDARIO UNIFICADO Y RECORDATORIOS (FASE 5) ---
export type LegalCalendarEntryType = 'TASK' | 'DEADLINE' | 'HEARING';

export interface LegalCalendarEntry {
  id: string; // "TASK-123", "DEADLINE-456", "HEARING-789"
  sourceType: LegalCalendarEntryType;
  sourceId: number;
  title: string;
  description?: string;
  startAt: string; // ISO string
  endAt?: string; // ISO string
  allDay: boolean;
  status: string;
  priority?: string;
  legalCaseId: number;
  legalCaseTitle: string;
  caseNumber?: string;
  clientId: number;
  clientName: string;
  responsibleUserId?: number | null;
  responsibleUserName?: string | null;
  location?: string;
  isOverdue?: boolean;
}

export type LegalReminderSourceType = 'TASK' | 'DEADLINE' | 'HEARING';
export type LegalReminderStatus = 'PENDING' | 'DISMISSED';

export interface LegalReminder {
  id: number;
  organizationId: number;
  legalCaseId: number;
  sourceType: LegalReminderSourceType;
  sourceId: number;
  remindAt: string;
  status: LegalReminderStatus;
  message?: string;
  userId?: number | null;
  createdByUserId?: number | null;
  createdAt: string;
  updatedAt: string;
}

// --- NOTIFICACIONES INTERNAS (FASE 6) ---
export type LegalNotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED';

export interface LegalNotification {
  id: number;
  organizationId: number;
  userId: number;
  legalCaseId: number;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  reminderId?: number | null;
  type: string;
  title: string;
  message: string;
  status: LegalNotificationStatus;
  createdAt: string;
  readAt?: string | null;
  dismissedAt?: string | null;
  sourceType?: string;
  sourceId?: number | null;
}

// --- DASHBOARD EJECUTIVO & REPORTES (FASE 7) ---
export interface LegalDashboardDTO {
  cases: {
    total: number;
    open: number;
    closed: number;
    byStatus: Array<{ status: string; count: number }>;
    byLegalArea: Array<{ legalArea: string; count: number }>;
  };
  workload: {
    pendingTasks: number;
    overdueTasks: number;
    upcomingDeadlines: number;
    overdueDeadlines: number;
    upcomingHearings: number;
  };
  finances: {
    agreedFees: number;
    collected: number;
    outstanding: number;
  };
  clients: {
    total: number;
    active: number;
  };
  upcoming: Array<{
    type: 'TASK' | 'DEADLINE' | 'HEARING';
    id: number;
    legalCaseId: number;
    caseNumber: string;
    title: string;
    date: string;
    priority?: string;
  }>;
}

export interface LegalReportsDTO {
  period: {
    from: string | null;
    to: string | null;
  };
  cases: {
    totalStock: number;
    activeStock: number;
    closedStock: number;
    createdInPeriod: number;
    byStatus: Array<{ status: string; count: number }>;
    byLegalArea: Array<{ legalArea: string; count: number }>;
  };
  workload: {
    pendingTasks: number;
    overdueTasks: number;
    completedInPeriodTasks: number;
    pendingDeadlines: number;
    overdueDeadlines: number;
    totalHearingsInPeriod: number;
  };
  finances: {
    agreedInPeriod: number;
    collectedInPeriod: number;
    totalAgreedStock: number;
    totalCollectedStock: number;
    totalOutstandingStock: number;
  };
  clients: {
    totalStock: number;
    activeStock: number;
    createdInPeriod: number;
  };
  activitiesInPeriod: number;
}

// -------------------------------------------------------------
// CIERRE FORMAL Y ARCHIVADO (FASE 8)
// -------------------------------------------------------------

export interface ClosureCheckSummary {
  pendingTasksCount: number;
  pendingDeadlinesCount: number;
  upcomingHearingsCount: number;
  totalAgreedFees: number;
  totalPaidFees: number;
  outstandingBalance: number;
  hasPendingItems: boolean;
  hasFinancialBalance: boolean;
}

export interface ClosureCheckDTO {
  legalCaseId: number;
  caseNumber: string;
  title: string;
  currentStatus: string;
  canClose: boolean;
  canArchive: boolean;
  isClosed: boolean;
  isArchived: boolean;
  closedAt: string | null;
  closedByUserId: number | null;
  closureReason: string | null;
  closureNotes: string | null;
  archivedAt: string | null;
  archivedByUserId: number | null;
  archiveReason: string | null;
  summary: ClosureCheckSummary;
  warnings: string[];
  pendingTasks: Array<{
    id: number;
    title: string;
    status: string;
    dueDate: string;
    priority: string;
  }>;
  pendingDeadlines: Array<{
    id: number;
    title: string;
    status: string;
    deadlineAt: string;
    priority: string;
  }>;
  upcomingHearings: Array<{
    id: number;
    title: string;
    scheduledAt: string;
    hearingType: string;
    status: string;
  }>;
}

export interface CloseCaseInput {
  reason?: string;
  notes?: string;
}

export interface ArchiveCaseInput {
  reason?: string;
  notes?: string;
}



