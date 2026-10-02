import React, { useState } from 'react';
import {
  Project,
  Task,
  Deliverable,
  Meeting,
  DocumentMetadata,
  Budget,
  Stage,
  StageStatus
} from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { ProgressBar } from '../ui/ProgressBar';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  DollarSign,
  Maximize2,
  Layers,
  CheckSquare,
  PackageCheck,
  CalendarDays,
  FileText,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
  FileSpreadsheet
} from 'lucide-react';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  onEditProject: (project: Project) => void;
  onUpdateStage: (projectId: string | number, stageId: string | number, updates: Partial<Stage>) => void;
  tasks: Task[];
  deliverables: Deliverable[];
  meetings: Meeting[];
  documents: DocumentMetadata[];
  budget?: Budget;
  onToggleTask: (taskId: string | number) => void;
  onOpenNewTask: (projectId: string | number) => void;
  onOpenNewDeliverable: (projectId: string | number) => void;
  onOpenNewMeeting: (projectId: string | number) => void;
  onOpenNewDocument: (projectId: string | number) => void;
}

type TabType =
  | 'resumen'
  | 'etapas'
  | 'tareas'
  | 'entregables'
  | 'reuniones'
  | 'documentos'
  | 'presupuesto'
  | 'cronologia';

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onBack,
  onEditProject,
  onUpdateStage,
  tasks,
  deliverables,
  meetings,
  documents,
  budget,
  onToggleTask,
  onOpenNewTask,
  onOpenNewDeliverable,
  onOpenNewMeeting,
  onOpenNewDocument
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');

  const projectTasks = tasks.filter((t) => String(t.projectId) === String(project.id));
  const projectDeliverables = deliverables.filter((d) => String(d.projectId) === String(project.id));
  const projectMeetings = meetings.filter((m) => String(m.projectId) === String(project.id));
  const projectDocs = documents.filter((doc) => String(doc.projectId) === String(project.id));

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'etapas', label: 'Etapas', count: project.stages.length },
    { id: 'tareas', label: 'Tareas', count: projectTasks.length },
    { id: 'entregables', label: 'Entregables', count: projectDeliverables.length },
    { id: 'reuniones', label: 'Reuniones', count: projectMeetings.length },
    { id: 'documentos', label: 'Documentos', count: projectDocs.length },
    { id: 'presupuesto', label: 'Presupuesto' },
    { id: 'cronologia', label: 'Cronología' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Volver a lista de proyectos"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
                {project.code}
              </span>
              <StatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
            </div>

            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mt-2">{project.name}</h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <strong className="text-slate-800">Cliente:</strong> {project.clientName}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <strong className="text-slate-800">Ubicación:</strong> {project.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <strong className="text-slate-800">Inicio / Entrega:</strong>{' '}
                <span className="font-mono">{project.startDate}</span> →{' '}
                <span className="font-mono">{project.targetDeliveryDate || 'Sin fecha'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              onClick={() => onEditProject(project)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Editar Proyecto
            </button>
          </div>
        </div>

        {/* Progress & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Progreso Global del Proyecto</span>
              <span className="font-mono font-bold text-arch-700">{project.progress}%</span>
            </div>
            <ProgressBar progress={project.progress} showLabel={false} size="lg" />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500 font-medium">Presupuesto Estimado</p>
              <p className="text-base font-bold font-mono text-slate-900">
                ${project.estimatedBudget.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-5 h-5 text-slate-400" />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500 font-medium">Presupuesto Aprobado</p>
              <p className="text-base font-bold font-mono text-emerald-700">
                ${project.approvedBudget.toLocaleString()}
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'border-arch-600 text-arch-600 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono ${
                    isActive ? 'bg-arch-100 text-arch-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}

      {/* 1. RESUMEN */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Información General del Proyecto
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 font-medium">Tipo de Proyecto</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{project.type}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Área Aproximada</p>
                  <p className="font-semibold font-mono text-slate-800 mt-0.5">
                    {project.approxAreaM2 || 0} m²
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Número de Niveles</p>
                  <p className="font-semibold font-mono text-slate-800 mt-0.5">
                    {project.levelsCount || 1}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Arquitecto Responsable</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{project.leadArchitect}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Fecha Inicio</p>
                  <p className="font-semibold font-mono text-slate-800 mt-0.5">{project.startDate}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Entrega Estimada</p>
                  <p className="font-semibold font-mono text-slate-800 mt-0.5">
                    {project.targetDeliveryDate || 'N/A'}
                  </p>
                </div>
              </div>

              {project.description && (
                <div className="pt-3 border-t border-slate-100 text-xs">
                  <p className="text-slate-500 font-medium">Descripción del Proyecto</p>
                  <p className="text-slate-700 mt-1 leading-relaxed">{project.description}</p>
                </div>
              )}

              {project.clientRequirements && (
                <div className="pt-3 border-t border-slate-100 text-xs">
                  <p className="text-slate-500 font-medium">Requerimientos del Cliente</p>
                  <p className="text-slate-700 mt-1 leading-relaxed bg-amber-50/60 p-3 rounded-lg border border-amber-100">
                    {project.clientRequirements}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Resumen de Operativa
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Tareas Pendientes</span>
                  <span className="font-mono font-bold text-slate-900">
                    {projectTasks.filter((t) => t.status !== 'Completada').length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Entregables Totales</span>
                  <span className="font-mono font-bold text-slate-900">
                    {projectDeliverables.length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Reuniones Registradas</span>
                  <span className="font-mono font-bold text-slate-900 font-mono">
                    {projectMeetings.length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Documentos Metadatos</span>
                  <span className="font-mono font-bold text-slate-900">
                    {projectDocs.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ETAPAS DEL PROYECTO */}
      {activeTab === 'etapas' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Etapas del Proyecto Arquitectónico</h3>
              <p className="text-xs text-slate-500">
                Ajuste el progreso y estado de cada etapa para actualizar el avance global
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {project.stages.map((stage, idx) => (
              <div
                key={stage.id}
                className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800">{stage.name}</h4>
                    <StatusBadge status={stage.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <select
                      value={stage.status}
                      onChange={(e) =>
                        onUpdateStage(project.id, stage.id, {
                          status: e.target.value as StageStatus,
                          progress: e.target.value === 'Completada' ? 100 : stage.progress
                        })
                      }
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En progreso">En progreso</option>
                      <option value="Completada">Completada</option>
                    </select>

                    <span className="text-slate-400 font-mono text-xs hidden sm:inline">
                      {stage.startDate || 'Inicio'} → {stage.dueDate || 'Fin'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Avance de la Etapa</span>
                    <span className="font-mono font-bold text-slate-700">{stage.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stage.progress}
                    onChange={(e) =>
                      onUpdateStage(project.id, stage.id, {
                        progress: Number(e.target.value),
                        status: Number(e.target.value) === 100 ? 'Completada' : 'En progreso'
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-arch-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TAREAS */}
      {activeTab === 'tareas' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Tareas del Proyecto</h3>
            <button
              onClick={() => onOpenNewTask(project.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Tarea
            </button>
          </div>

          {projectTasks.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No hay tareas registradas para este proyecto.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {projectTasks.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleTask(t.id)}
                      className="text-slate-400 hover:text-arch-600 transition-colors"
                    >
                      {t.status === 'Completada' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <p className={`font-semibold ${t.status === 'Completada' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {t.title}
                      </p>
                      {t.stageName && (
                        <span className="text-[10px] text-slate-500 font-mono">Etapa: {t.stageName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PriorityBadge priority={t.priority} size="sm" />
                    <StatusBadge status={t.isOverdue ? 'Atrasada' : t.status} size="sm" />
                    <span className="font-mono text-slate-500 text-[11px] hidden sm:inline">{t.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. ENTREGABLES */}
      {activeTab === 'entregables' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Entregables Requeridos</h3>
            <button
              onClick={() => onOpenNewDeliverable(project.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Entregable
            </button>
          </div>

          {projectDeliverables.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No hay entregables registrados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectDeliverables.map((d) => (
                <div key={d.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900">{d.name}</h4>
                    <StatusBadge status={d.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span>Tipo: <strong className="text-slate-700">{d.type}</strong></span>
                    <span>Fecha Límite: <strong className="font-mono text-slate-700">{d.dueDate}</strong></span>
                  </div>
                  {d.notes && <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">{d.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. REUNIONES */}
      {activeTab === 'reuniones' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Bitácora de Reuniones y Citas</h3>
            <button
              onClick={() => onOpenNewMeeting(project.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Reunión
            </button>
          </div>

          {projectMeetings.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No hay reuniones agendadas.</p>
          ) : (
            <div className="space-y-3">
              {projectMeetings.map((m) => (
                <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{m.title}</h4>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded-md">
                        {m.modality}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-1">{m.location}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-slate-700 font-semibold">{m.date} a las {m.time}</span>
                    <StatusBadge status={m.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. DOCUMENTOS */}
      {activeTab === 'documentos' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Documentos y Planos Registrados</h3>
            <button
              onClick={() => onOpenNewDocument(project.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Documento
            </button>
          </div>

          {projectDocs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No hay metadatos documentales registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Nombre del Archivo</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Versión</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-arch-600" />
                        <span>{doc.name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{doc.type}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{doc.version}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{doc.date}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={doc.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. PRESUPUESTO */}
      {activeTab === 'presupuesto' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Estado Presupuestario</h3>
            <StatusBadge status={project.approvedBudget > 0 ? 'Aprobado' : 'Pendiente'} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Presupuesto Estimado
              </span>
              <p className="text-2xl font-bold font-mono text-slate-900">
                ${project.estimatedBudget.toLocaleString()} USD
              </p>
              <p className="text-xs text-slate-500">Valor proyectado inicial de diseño y consultoría</p>
            </div>

            <div className="p-5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Presupuesto Aprobado
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-700">
                ${project.approvedBudget.toLocaleString()} USD
              </p>
              <p className="text-xs text-emerald-700">Monto pactado formalmente con el cliente</p>
            </div>
          </div>
        </div>
      )}

      {/* 8. CRONOLOGÍA */}
      {activeTab === 'cronologia' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-900">Línea de Tiempo de Etapas</h3>

          <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 my-4">
            {project.stages.map((stg, idx) => (
              <div key={stg.id} className="relative">
                <div
                  className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-white ${
                    stg.status === 'Completada'
                      ? 'border-emerald-600 bg-emerald-600'
                      : stg.status === 'En progreso'
                      ? 'border-arch-600 bg-arch-600'
                      : 'border-slate-300'
                  }`}
                />
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">{stg.name}</h4>
                  <StatusBadge status={stg.status} size="sm" />
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {stg.startDate || 'Sin fecha inicio'} → {stg.dueDate || 'Sin fecha fin'}
                </p>
                <div className="mt-2 max-w-xs">
                  <ProgressBar progress={stg.progress} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
