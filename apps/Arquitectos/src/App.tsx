import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import type { ArchitectNavTab } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { DashboardView } from './pages/DashboardView';

import { ProjectList } from './components/projects/ProjectList';
import { ProjectDetailView } from './components/projects/ProjectDetailView';
import { ClientList } from './components/clients/ClientList';
import { TaskList } from './components/tasks/TaskList';
import { DeliverableList } from './components/deliverables/DeliverableList';
import { MeetingList } from './components/meetings/MeetingList';
import { DocumentList } from './components/documents/DocumentList';
import { BudgetList } from './components/budgets/BudgetList';
import { CalendarView } from './components/calendar/CalendarView';
import { ReportsView } from './components/reports/ReportsView';

import { ProjectFormModal } from './components/projects/ProjectFormModal';
import { TaskFormModal } from './components/tasks/TaskFormModal';
import { MeetingFormModal } from './components/meetings/MeetingFormModal';
import { ClientFormModal } from './components/clients/ClientFormModal';
import { DeliverableFormModal } from './components/deliverables/DeliverableFormModal';
import { DocumentFormModal } from './components/documents/DocumentFormModal';
import { DocumentVersionModal } from './components/documents/DocumentVersionModal';
import { BudgetFormModal } from './components/budgets/BudgetFormModal';

import { architectureService } from './services/architectureService';
import { architectureApi } from './services/api/architectureApi';
import type {
  Project,
  Client,
  Task,
  Deliverable,
  Meeting,
  DocumentMetadata,
  Budget,
  Stage,
} from './types';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ArchitectNavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isDeliverableModalOpen, setIsDeliverableModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [editingDocument, setEditingDocument] = useState<DocumentMetadata | null>(null);
  const [versionModalDoc, setVersionModalDoc] = useState<DocumentMetadata | null>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [defaultTaskProjectId, setDefaultTaskProjectId] = useState<string>();
  const [defaultMeetingProjectId, setDefaultMeetingProjectId] = useState<string>();
  const [defaultDeliverableProjectId, setDefaultDeliverableProjectId] = useState<string>();
  const [defaultDocumentProjectId, setDefaultDocumentProjectId] = useState<string>();
  const [defaultBudgetProjectId, setDefaultBudgetProjectId] = useState<string>();

  const loadAllData = () => {
    try {
      const nextProjects = architectureService.getProjects();
      setProjects(nextProjects);
      setClients(architectureService.getClients());
      setTasks(architectureService.getTasks());
      setDeliverables(architectureService.getDeliverables());
      setMeetings(architectureService.getMeetings());
      setDocuments(architectureService.getDocuments());
      setBudgets(architectureService.getBudgets());

      setSelectedProject((current) => {
        if (!current) return null;
        return nextProjects.find((project) => project.id === current.id) ?? null;
      });
    } catch (error) {
      console.error('Error cargando datos de arquitectura:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = architectureService.subscribe(() => {
      loadAllData();
    });
    architectureService.syncFromApi().catch((err) => {
      console.error('Error sincronizando con API Core:', err);
    });
    loadAllData();
    return unsubscribe;
  }, []);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('projects');
  };

  const openNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const openNewTask = (projectId?: string | number) => {
    setEditingTask(null);
    setDefaultTaskProjectId(projectId !== undefined ? String(projectId) : undefined);
    setIsTaskModalOpen(true);
  };

  const openNewMeeting = (projectId?: string | number) => {
    setEditingMeeting(null);
    setDefaultMeetingProjectId(projectId !== undefined ? String(projectId) : undefined);
    setIsMeetingModalOpen(true);
  };

  const openNewDeliverable = (projectId?: string | number) => {
    setEditingDeliverable(null);
    setDefaultDeliverableProjectId(projectId !== undefined ? String(projectId) : undefined);
    setIsDeliverableModalOpen(true);
  };

  const openNewDocument = (projectId?: string | number) => {
    setEditingDocument(null);
    setDefaultDocumentProjectId(projectId !== undefined ? String(projectId) : undefined);
    setIsDocumentModalOpen(true);
  };

  const openNewBudget = (projectId?: string | number) => {
    setEditingBudget(null);
    setDefaultBudgetProjectId(projectId !== undefined ? String(projectId) : undefined);
    setIsBudgetModalOpen(true);
  };

  const urgentCount = tasks.filter((task) => task.priority === 'Alta' && task.status !== 'Completada').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col lg:flex-row antialiased selection:bg-amber-500 selection:text-slate-950">
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'projects' && selectedProject) {
            setSelectedProject(null);
          }
          setCurrentView(view);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenNewProject={openNewProject}
        onOpenNewTask={() => openNewTask()}
        urgentCount={urgentCount}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
        <TopHeader
          currentSection={currentView}
          onOpenMobileNav={() => setIsSidebarOpen(true)}
          notifications={[]}
          onSelectProject={handleSelectProject}
        />

        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          {currentView === 'dashboard' && (
            <DashboardView
              projects={projects}
              tasks={tasks}
              deliverables={deliverables}
              meetings={meetings}
              onSelectProject={handleSelectProject}
              onNavigateToProjects={() => setCurrentView('projects')}
              onNavigateToAgenda={() => setCurrentView('agenda')}
              onNavigateToTasks={() => setCurrentView('tasks')}
              onOpenNewProject={openNewProject}
              onOpenNewTask={() => openNewTask()}
              onOpenNewMeeting={() => openNewMeeting()}
            />
          )}

          {currentView === 'projects' &&
            (selectedProject ? (
              <ProjectDetailView
                project={selectedProject}
                onBack={() => setSelectedProject(null)}
                onEditProject={(project) => {
                  setEditingProject(project);
                  setIsProjectModalOpen(true);
                }}
                onUpdateStage={async (projectId, stageId, updates) => {
                  try {
                    await architectureService.updateProjectStage(projectId, stageId, updates);
                    loadAllData();
                  } catch (err: any) {
                    alert(err?.message || 'Error al actualizar etapa');
                  }
                }}
                tasks={tasks}
                deliverables={deliverables}
                meetings={meetings}
                documents={documents}
                budget={budgets.find((budget) => budget.projectId === selectedProject.id)}
                onToggleTask={async (taskId) => {
                  try {
                    await architectureService.toggleTaskStatus(taskId);
                    loadAllData();
                  } catch (err: any) {
                    alert(err?.message || 'Error al actualizar estado de tarea');
                  }
                }}
                onOpenNewTask={openNewTask}
                onOpenNewDeliverable={openNewDeliverable}
                onOpenNewMeeting={openNewMeeting}
                onOpenNewDocument={openNewDocument}
              />
            ) : (
              <ProjectList
                projects={projects}
                clients={clients}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectProject={handleSelectProject}
                onOpenCreateModal={openNewProject}
                onEditProject={(project) => {
                  setEditingProject(project);
                  setIsProjectModalOpen(true);
                }}
                onDeleteProject={async (id) => {
                  if (window.confirm('¿Está seguro de archivar este proyecto? Se mantendrá en el histórico.')) {
                    try {
                      await architectureService.deleteProject(id);
                      loadAllData();
                    } catch (err: any) {
                      alert(err?.message || 'Error al archivar el proyecto');
                    }
                  }
                }}
              />
            ))}

          {currentView === 'clients' && (
            <ClientList
              clients={clients}
              projects={projects}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectProject={handleSelectProject}
              onOpenCreateModal={() => {
                setEditingClient(null);
                setIsClientModalOpen(true);
              }}
              onEditClient={(client) => {
                setEditingClient(client);
                setIsClientModalOpen(true);
              }}
              onDeleteClient={async (id) => {
                if (window.confirm('¿Está seguro de inactivar este cliente? Se conservarán sus proyectos e historial.')) {
                  try {
                    await architectureService.deleteClient(id);
                    loadAllData();
                  } catch (err: any) {
                    alert(err?.message || 'Error al inactivar el cliente');
                  }
                }
              }}
            />
          )}

          {currentView === 'agenda' && (
            <MeetingList
              meetings={meetings}
              projects={projects}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenCreateModal={() => openNewMeeting()}
              onEditMeeting={(meeting) => {
                setEditingMeeting(meeting);
                setDefaultMeetingProjectId(undefined);
                setIsMeetingModalOpen(true);
              }}
              onCancelMeeting={async (id) => {
                if (confirm('¿Está seguro de cancelar esta reunión?')) {
                  try {
                    await architectureService.cancelMeeting(id);
                    loadAllData();
                  } catch (err: any) {
                    alert(err?.message || 'Error al cancelar la reunión');
                  }
                }
              }}
            />
          )}

          {currentView === 'files' && (
            <DocumentList
              documents={documents}
              projects={projects}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenCreateModal={() => openNewDocument()}
              onEditDocument={(document) => {
                setEditingDocument(document);
                setDefaultDocumentProjectId(undefined);
                setIsDocumentModalOpen(true);
              }}
              onViewVersions={(document) => {
                setVersionModalDoc(document);
                setIsVersionModalOpen(true);
              }}
              onDownloadDocument={(document) => {
                const orgId = architectureService.getOrganizationId();
                if (!orgId) return;
                const url = architectureApi.getDownloadUrl(
                  orgId,
                  document.id
                );
                window.open(url, '_blank');
              }}
            />
          )}

          {currentView === 'tasks' && (
            <TaskList
              tasks={tasks}
              projects={projects}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleTask={async (id) => {
                try {
                  await architectureService.toggleTaskStatus(id);
                  loadAllData();
                } catch (err: any) {
                  alert(err?.message || 'Error al actualizar estado de tarea');
                }
              }}
              onOpenCreateModal={() => openNewTask()}
              onEditTask={(task) => {
                setEditingTask(task);
                setDefaultTaskProjectId(undefined);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {currentView === 'deliverables' && (
            <DeliverableList
              deliverables={deliverables}
              projects={projects}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenCreateModal={() => openNewDeliverable()}
              onEditDeliverable={(deliverable) => {
                setEditingDeliverable(deliverable);
                setDefaultDeliverableProjectId(undefined);
                setIsDeliverableModalOpen(true);
              }}
            />
          )}

          {currentView === 'calendar' && (
            <CalendarView
              projects={projects}
              tasks={tasks}
              deliverables={deliverables}
              meetings={meetings}
            />
          )}

          {currentView === 'budgets' && (
            <BudgetList
              budgets={budgets}
              projects={projects}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenCreateModal={() => openNewBudget()}
              onEditBudget={(budget) => {
                setEditingBudget(budget);
                setDefaultBudgetProjectId(undefined);
                setIsBudgetModalOpen(true);
              }}
              onApproveBudget={async (budget) => {
                try {
                  await architectureService.approveBudget(budget.id);
                  loadAllData();
                } catch (err: any) {
                  alert(err.message || 'Error al aprobar presupuesto');
                }
              }}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView
              projects={projects}
              clients={clients}
              tasks={tasks}
              deliverables={deliverables}
              budgets={budgets}
            />
          )}
        </main>
      </div>

      {isProjectModalOpen && (
        <ProjectFormModal
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
          clients={clients}
          initialData={editingProject}
          onSave={async (project) => {
            try {
              await architectureService.saveProject(project);
              setIsProjectModalOpen(false);
              setEditingProject(null);
              loadAllData();
            } catch (err: any) {
              alert(err?.message || 'Error al guardar el proyecto');
            }
          }}
        />
      )}

      {isTaskModalOpen && (
        <TaskFormModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
            setDefaultTaskProjectId(undefined);
          }}
          projects={projects}
          defaultProjectId={defaultTaskProjectId}
          initialData={editingTask}
          onSave={async (task) => {
            try {
              await architectureService.saveTask(task);
              setIsTaskModalOpen(false);
              setEditingTask(null);
              setDefaultTaskProjectId(undefined);
              loadAllData();
            } catch (err: any) {
              alert(err?.message || 'Error al guardar la tarea');
            }
          }}
        />
      )}

      {isMeetingModalOpen && (
        <MeetingFormModal
          isOpen={isMeetingModalOpen}
          onClose={() => {
            setIsMeetingModalOpen(false);
            setEditingMeeting(null);
            setDefaultMeetingProjectId(undefined);
          }}
          projects={projects}
          clients={clients}
          defaultProjectId={defaultMeetingProjectId}
          initialData={editingMeeting}
          onSave={async (meeting) => {
            try {
              await architectureService.saveMeeting(meeting);
              setIsMeetingModalOpen(false);
              setEditingMeeting(null);
              setDefaultMeetingProjectId(undefined);
              loadAllData();
            } catch (err: any) {
              alert(err?.message || 'Error al agendar la reunión');
            }
          }}
        />
      )}

      {isClientModalOpen && (
        <ClientFormModal
          isOpen={isClientModalOpen}
          onClose={() => {
            setIsClientModalOpen(false);
            setEditingClient(null);
          }}
          initialData={editingClient}
          onSave={async (client) => {
            try {
              await architectureService.saveClient(client);
              loadAllData();
            } catch (err: any) {
              console.error('[App] Error al guardar cliente:', err);
              throw err;
            }
          }}
        />
      )}

      {isDeliverableModalOpen && (
        <DeliverableFormModal
          isOpen={isDeliverableModalOpen}
          onClose={() => {
            setIsDeliverableModalOpen(false);
            setEditingDeliverable(null);
            setDefaultDeliverableProjectId(undefined);
          }}
          projects={projects}
          defaultProjectId={defaultDeliverableProjectId}
          initialData={editingDeliverable}
          onSave={async (deliverable) => {
            try {
              await architectureService.saveDeliverable(deliverable);
              setIsDeliverableModalOpen(false);
              setEditingDeliverable(null);
              setDefaultDeliverableProjectId(undefined);
              loadAllData();
            } catch (err: any) {
              alert(err?.message || 'Error al guardar el entregable');
            }
          }}
        />
      )}

      {isDocumentModalOpen && (
        <DocumentFormModal
          isOpen={isDocumentModalOpen}
          onClose={() => {
            setIsDocumentModalOpen(false);
            setEditingDocument(null);
            setDefaultDocumentProjectId(undefined);
          }}
          projects={projects}
          defaultProjectId={defaultDocumentProjectId}
          initialData={editingDocument}
          onSave={async (document, file, initialNotes) => {
            try {
              await architectureService.saveDocument(document, file, initialNotes);
              loadAllData();
            } catch (err: any) {
              console.error('Error al guardar documento:', err);
              alert(err.message || 'Error al guardar el documento.');
            }
          }}
        />
      )}

      {isVersionModalOpen && versionModalDoc && (
        <DocumentVersionModal
          isOpen={isVersionModalOpen}
          onClose={() => {
            setIsVersionModalOpen(false);
            setVersionModalDoc(null);
          }}
          document={versionModalDoc}
          organizationId={architectureService.getOrganizationId() || 0}
          onVersionUploaded={() => {
            loadAllData();
          }}
        />
      )}

      {isBudgetModalOpen && (
        <BudgetFormModal
          isOpen={isBudgetModalOpen}
          onClose={() => {
            setIsBudgetModalOpen(false);
            setEditingBudget(null);
            setDefaultBudgetProjectId(undefined);
          }}
          projects={projects}
          defaultProjectId={defaultBudgetProjectId}
          initialData={editingBudget}
          onSave={async (budgetData) => {
            try {
              if (editingBudget?.id) {
                await architectureService.updateBudget(editingBudget.id, budgetData);
              } else {
                await architectureService.createBudget(budgetData);
              }
              loadAllData();
            } catch (err: any) {
              alert(err.message || 'Error al guardar presupuesto');
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
