import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import type { LegalNavigationTab } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { DashboardView } from './components/dashboard/DashboardView';

// Vistas
import { CaseList } from './components/cases/CaseList';
import { CaseDetailView } from './components/cases/CaseDetailView';
import { ClientList } from './components/clients/ClientList';
import { DeadlineList } from './components/deadlines/DeadlineList';
import { HearingList } from './components/hearings/HearingList';
import { TaskList } from './components/tasks/TaskList';
import { DocumentList } from './components/documents/DocumentList';
import { ReportsView } from './components/reports/ReportsView';
import { CalendarView } from './components/calendar/CalendarView';

// Modales
import { CaseModal } from './components/cases/CaseModal';
import { ClientModal } from './components/clients/ClientModal';
import { DeadlineModal } from './components/deadlines/DeadlineModal';
import { TaskModal } from './components/tasks/TaskModal';
import { HearingModal } from './components/hearings/HearingModal';
import { DocumentModal } from './components/documents/DocumentModal';

import { legalService } from './services/legalService';
import type {
  Client,
  LegalCase,
  ProceduralDeadline,
  Hearing,
  LegalTask,
  LegalDocument,
  SystemNotification,
  DeadlineStatus,
  HearingStatus,
  LegalDashboardDTO,
  LegalReportsDTO,
} from './types';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<LegalNavigationTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [newlyCreatedClientId, setNewlyCreatedClientId] = useState<string | null>(null);

  // Estados de datos
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [deadlines, setDeadlines] = useState<ProceduralDeadline[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [tasks, setTasks] = useState<LegalTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Estados de Dashboard y Reportes (Fase 7)
  const [dashboardData, setDashboardData] = useState<LegalDashboardDTO | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [reportsData, setReportsData] = useState<LegalReportsDTO | null>(null);
  const [isReportsLoading, setIsReportsLoading] = useState<boolean>(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsFilter, setReportsFilter] = useState<{ from?: string; to?: string }>({});

  // Estados de modales
  const [isCaseModalOpen, setIsCaseModalOpen] = useState<boolean>(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [isHearingModalOpen, setIsHearingModalOpen] = useState<boolean>(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState<boolean>(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [modalCaseId, setModalCaseId] = useState<string | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<LegalTask | Hearing | LegalDocument | null>(null);
  const [editingCase, setEditingCase] = useState<LegalCase | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const loadDashboard = async () => {
    setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await legalService.fetchDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      setDashboardError(err.message || "Error al conectar con el servidor para obtener el dashboard");
    } finally {
      setIsDashboardLoading(false);
    }
  };

  const loadReports = async (filters?: { from?: string; to?: string }) => {
    setIsReportsLoading(true);
    setReportsError(null);
    try {
      const data = await legalService.fetchReports(filters);
      setReportsData(data);
    } catch (err: any) {
      console.error("Error loading reports data:", err);
      setReportsError(err.message || "Error al conectar con el servidor para obtener reportes");
    } finally {
      setIsReportsLoading(false);
    }
  };

  const handleReportsFilterChange = (from?: string, to?: string) => {
    const newFilters = { from, to };
    setReportsFilter(newFilters);
    loadReports(newFilters);
  };

  const loadData = async () => {
    setCases(legalService.getCases());
    setDeadlines(legalService.getDeadlines());
    setHearings(legalService.getHearings());
    setTasks(legalService.getTasks());
    setClients(legalService.getClients());
    setDocuments(legalService.getDocuments());
    setNotifications(legalService.getNotifications ? legalService.getNotifications() : []);
    setUnreadCount(legalService.getUnreadCount());

    try {
      const synced = await legalService.syncFromApi();
      setClients([...synced.clients]);
      setCases([...synced.cases]);
      setTasks([...synced.tasks]);
      setDeadlines([...synced.deadlines]);
      setHearings([...synced.hearings]);
      setDocuments(legalService.getDocuments());
      setNotifications(legalService.getNotifications ? legalService.getNotifications() : []);
      setUnreadCount(legalService.getUnreadCount());
      const currentDashboard = legalService.getDashboardData();
      if (currentDashboard) {
        setDashboardData(currentDashboard);
      }
    } catch (e) {
      console.warn("Could not sync with API Core:", e);
    }

    loadDashboard();
  };

  useEffect(() => {
    loadData();
    const unsubscribe = legalService.subscribe(() => {
      setClients(legalService.getClients());
      setCases(legalService.getCases());
      setTasks(legalService.getTasks());
      setDeadlines(legalService.getDeadlines());
      setHearings(legalService.getHearings());
      setDocuments(legalService.getDocuments());
      setNotifications(legalService.getNotifications ? legalService.getNotifications() : []);
      setUnreadCount(legalService.getUnreadCount());
      const currentDashboard = legalService.getDashboardData();
      if (currentDashboard) {
        setDashboardData(currentDashboard);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentView === 'reports') {
      loadReports(reportsFilter);
    } else if (currentView === 'dashboard') {
      loadDashboard();
    }
  }, [currentView]);

  const handleSelectCase = (caseItem: LegalCase) => {
    setSelectedCase(caseItem);
    setCurrentView('cases');
  };

  const handleSelectCaseById = (caseId: string) => {
    const matched = cases.find((c) => c.id === caseId);
    if (matched) {
      handleSelectCase(matched);
    }
  };

  const handleOpenNewCase = () => {
    setEditingCase(null);
    setNewlyCreatedClientId(null);
    setIsCaseModalOpen(true);
  };

  const handleSaveCase = async (caseData: Omit<LegalCase, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const savedCase = editingCase
        ? await legalService.updateCase(editingCase.id, caseData)
        : await legalService.addCase(caseData);

      if (savedCase) {
        await loadData();
        setSelectedCase(savedCase);
        setCurrentView('cases');
      }
    } catch (err: any) {
      alert(err.message || 'Error al guardar el caso jurídico');
    }
  };

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const savedClient = editingClient
        ? await legalService.updateClient(editingClient.id, clientData)
        : await legalService.addClient(clientData);

      if (savedClient) {
        await loadData();
        setNewlyCreatedClientId(savedClient.id);
      }
    } catch (err: any) {
      console.error('[App] Error al guardar el cliente:', err);
      throw err;
    }
  };

  const handleSaveDeadline = async (deadlineData: Omit<ProceduralDeadline, 'id' | 'createdAt'>) => {
    try {
      await legalService.addDeadline(deadlineData);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar el plazo procesal');
    }
  };

  const handleSaveTask = async (taskData: Omit<LegalTask, 'id' | 'createdAt'>) => {
    try {
      await legalService.addTask(taskData);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al guardar la tarea');
    }
  };

  const handleSaveHearing = async (hearingData: Omit<Hearing, 'id' | 'createdAt'>) => {
    try {
      await legalService.addHearing(hearingData);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al programar la audiencia');
    }
  };

  const handleSaveDocument = async (documentData: Omit<LegalDocument, 'id' | 'createdAt'> & { file?: File | null }) => {
    try {
      await legalService.addDocument(documentData);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar el documento');
    }
  };

  const urgentCount = deadlines.filter((deadline) => deadline.status === 'Vencido' || deadline.priority === 'Urgente').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col lg:flex-row antialiased selection:bg-amber-500 selection:text-slate-950">

      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view: LegalNavigationTab) => {
          if (view === 'cases' && selectedCase) {
            setSelectedCase(null);
          }
          setCurrentView(view);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenNewCase={() => {
          handleOpenNewCase();
        }}
        onOpenNewTask={() => {
          setEditingItem(null);
          setModalCaseId(undefined);
          setIsTaskModalOpen(true);
        }}
        urgentCount={urgentCount}
      />

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
        <TopHeader
          onOpenMobileSidebar={() => setIsSidebarOpen(true)}
          onOpenNotificationDrawer={() => setIsNotificationDrawerOpen(true)}
          notifications={notifications}
          unreadCount={unreadCount}
          onGlobalSearch={handleSelectCaseById}
        />

        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">

          {currentView === 'dashboard' && (
            <DashboardView
              cases={cases}
              deadlines={deadlines}
              hearings={hearings}
              tasks={tasks}
              dashboardData={dashboardData}
              isLoading={isDashboardLoading}
              error={dashboardError}
              onRefresh={loadDashboard}
              onSelectCase={handleSelectCase}
              onNavigateToDeadlines={() => setCurrentView('deadlines')}
              onNavigateToHearings={() => setCurrentView('agenda')}
              onNavigateToTasks={() => setCurrentView('tasks')}
              onOpenNewCase={() => {
                handleOpenNewCase();
              }}
              onOpenNewTask={() => {
                setEditingItem(null);
                setModalCaseId(undefined);
                setIsTaskModalOpen(true);
              }}
              onOpenNewHearing={() => {
                setEditingItem(null);
                setModalCaseId(undefined);
                setIsHearingModalOpen(true);
              }}
            />
          )}

          {currentView === 'cases' && (
            selectedCase ? (
              <CaseDetailView
                caseItem={selectedCase}
                client={clients.find((client) => client.id === selectedCase.clientId)}
                deadlines={deadlines.filter((deadline) => deadline.caseId === selectedCase.id)}
                hearings={hearings.filter((hearing) => hearing.caseId === selectedCase.id)}
                tasks={tasks.filter((task) => task.caseId === selectedCase.id)}
                documents={documents.filter((document) => document.caseId === selectedCase.id)}
                activities={legalService.getCaseActivities(selectedCase.id)}
                onBack={() => setSelectedCase(null)}
                onUpdateStatus={(caseId, status) => {
                  legalService.updateCaseStatus(caseId, status);
                  loadData();
                }}
                onOpenNewDeadline={(caseId) => {
                  setModalCaseId(caseId);
                  setIsDeadlineModalOpen(true);
                }}
                onOpenNewHearing={(caseId) => {
                  setModalCaseId(caseId);
                  setEditingItem(null);
                  setIsHearingModalOpen(true);
                }}
                onOpenNewTask={(caseId) => {
                  setModalCaseId(caseId);
                  setEditingItem(null);
                  setIsTaskModalOpen(true);
                }}
                onOpenNewDocument={(caseId) => {
                  setModalCaseId(caseId);
                  setEditingItem(null);
                  setIsDocumentModalOpen(true);
                }}
                onAddActivity={async (caseId, activity) => {
                  try {
                    await legalService.addCaseActivity(caseId, activity);
                    await loadData();
                  } catch (err: any) {
                    alert(err.message || 'Error al registrar la actuación');
                  }
                }}
                onToggleTask={async (taskId) => {
                  try {
                    await legalService.toggleTaskStatus(taskId);
                    await loadData();
                  } catch (err: any) {
                    alert(err.message || 'Error al actualizar tarea');
                  }
                }}
              />
            ) : (
              <CaseList
                cases={cases}
                onOpenNewCaseModal={handleOpenNewCase}
                onEditCase={(caseItem) => {
                    setEditingCase(caseItem);
                  setNewlyCreatedClientId(null);
                  setIsCaseModalOpen(true);
                }}
                onSelectCaseDetail={handleSelectCaseById}
              />
            )
          )}

          {currentView === 'clients' && (
            <ClientList
              clients={clients}
              cases={cases}
              onOpenNewClientModal={() => {
                setEditingClient(null);
                setIsClientModalOpen(true);
              }}
              onEditClient={(client) => {
                setEditingClient(client);
                setIsClientModalOpen(true);
              }}
              onSelectCase={handleSelectCaseById}
              onSelectClientDetail={() => { }}
            />
          )}

          {(currentView === 'agenda' || currentView === 'hearings') && (
            <HearingList
              hearings={hearings}
              cases={cases}
              onOpenNewHearingModal={() => {
                setEditingItem(null);
                setIsHearingModalOpen(true);
              }}
              onUpdateStatus={async (hearingId, status) => {
                try {
                  await legalService.updateHearingStatus(hearingId, status);
                  await loadData();
                } catch (err: any) {
                  alert(err.message || 'Error al actualizar estado de la audiencia');
                }
              }}
              onSelectCase={handleSelectCaseById}
            />
          )}

          {currentView === 'calendar' && (
            <CalendarView
              deadlines={deadlines}
              hearings={hearings}
              tasks={tasks}
              onSelectCase={handleSelectCaseById}
            />
          )}

          {currentView === 'deadlines' && (
            <DeadlineList
              deadlines={deadlines}
              cases={cases}
              onOpenNewDeadlineModal={() => {
                setModalCaseId(undefined);
                setIsDeadlineModalOpen(true);
              }}
              onUpdateStatus={async (deadlineId, status) => {
                try {
                  await legalService.updateDeadlineStatus(deadlineId, status);
                  await loadData();
                } catch (err: any) {
                  alert(err.message || 'Error al actualizar estado del plazo procesal');
                }
              }}
              onSelectCase={handleSelectCaseById}
            />
          )}

          {currentView === 'tasks' && (
            <TaskList
              tasks={tasks}
              cases={cases}
              onOpenNewTaskModal={() => {
                setEditingItem(null);
                setModalCaseId(undefined);
                setIsTaskModalOpen(true);
              }}
              onToggleTask={async (taskId) => {
                try {
                  await legalService.toggleTaskStatus(taskId);
                  await loadData();
                } catch (err: any) {
                  alert(err.message || 'Error al actualizar tarea');
                }
              }}
              onSelectCase={handleSelectCaseById}
            />
          )}

          {currentView === 'documents' && (
            <DocumentList
              documents={documents}
              cases={cases}
              onOpenNewDocumentModal={() => {
                setEditingItem(null);
                setModalCaseId(undefined);
                setIsDocumentModalOpen(true);
              }}
              onSelectCase={handleSelectCaseById}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView
              cases={cases}
              clients={clients}
              deadlines={deadlines}
              hearings={hearings}
              reportsData={reportsData}
              isLoading={isReportsLoading}
              error={reportsError}
              onFilterChange={handleReportsFilterChange}
              onRefresh={() => loadReports(reportsFilter)}
            />
          )}

        </main>
      </div>

      {/* Modal de Caso */}
      {isCaseModalOpen && (
        <CaseModal
          isOpen={isCaseModalOpen}
          onClose={() => {
            setIsCaseModalOpen(false);
            loadData();
          }}
          clients={clients}
          cases={cases}
          initialCase={editingCase}
          onSave={handleSaveCase}
          onOpenNewClientModal={() => {
            setEditingClient(null);
            setIsClientModalOpen(true);
          }}
          newlyCreatedClientId={newlyCreatedClientId}
        />
      )}

      {isClientModalOpen && (
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => {
            setIsClientModalOpen(false);
            loadData();
          }}
          onSave={handleSaveClient}
          initialClient={editingClient}
        />
      )}

      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            loadData();
          }}
          cases={cases}
          onSave={handleSaveTask}
          defaultCaseId={modalCaseId}
        />
      )}

      {isHearingModalOpen && (
        <HearingModal
          isOpen={isHearingModalOpen}
          onClose={() => {
            setIsHearingModalOpen(false);
            loadData();
          }}
          cases={cases}
          onSave={handleSaveHearing}
          defaultCaseId={modalCaseId}
        />
      )}

      {isDocumentModalOpen && (
        <DocumentModal
          isOpen={isDocumentModalOpen}
          onClose={() => {
            setIsDocumentModalOpen(false);
            loadData();
          }}
          cases={cases}
          onSave={handleSaveDocument}
          defaultCaseId={modalCaseId}
        />
      )}

      {isDeadlineModalOpen && (
        <DeadlineModal
          isOpen={isDeadlineModalOpen}
          onClose={() => setIsDeadlineModalOpen(false)}
          onSave={handleSaveDeadline}
          cases={cases}
          defaultCaseId={modalCaseId}
        />
      )}

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={async (notificationId) => {
          await legalService.markNotificationAsRead(notificationId);
          loadData();
        }}
        onDismiss={async (notificationId) => {
          await legalService.dismissNotification(notificationId);
          loadData();
        }}
        onMarkAllAsRead={async () => {
          await legalService.markAllNotificationsAsRead();
          loadData();
        }}
        onSelectCase={(caseId) => {
          handleSelectCaseById(caseId);
        }}
        onNavigate={(tab) => {
          setCurrentView(tab);
          setIsNotificationDrawerOpen(false);
        }}
      />

    </div>
  );
};

export default App;