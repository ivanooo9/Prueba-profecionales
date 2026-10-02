import React from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  CheckSquare,
  Plus,
  ChevronRight,
  Compass,
  ArrowRight
} from 'lucide-react';
import type { Project, Task, Deliverable, Meeting } from '../types';

interface DashboardViewProps {
  projects?: Project[];
  tasks?: Task[];
  deliverables?: Deliverable[];
  meetings?: Meeting[];
  onSelectProject?: (project: Project) => void;
  onNavigateToProjects?: () => void;
  onNavigateToAgenda?: () => void;
  onNavigateToTasks?: () => void;
  onOpenNewProject?: () => void;
  onOpenNewTask?: () => void;
  onOpenNewMeeting?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects = [],
  tasks = [],
  deliverables = [],
  meetings = [],
  onSelectProject = () => { },
  onNavigateToProjects = () => { },
  onNavigateToAgenda = () => { },
  onNavigateToTasks = () => { },
  onOpenNewProject = () => { },
  onOpenNewTask = () => { },
  onOpenNewMeeting = () => { },
}) => {
  // Proyectos activos seguros
  const activeProjects = (projects || []).filter(p => {
    if (!p || !p.status) return false;
    const s = String(p.status).toLowerCase();
    return s.includes('progreso') || s.includes('activo') || s.includes('revision') || s.includes('diseno') || s.includes('progress');
  });

  // Tareas prioritarias seguras
  const urgentTasks = (tasks || []).filter(t => {
    if (!t || !t.priority) return false;
    const pr = String(t.priority).toLowerCase();
    return pr.includes('urgente') || pr.includes('alta') || pr.includes('high');
  });

  const upcomingMeetings = (meetings || []).slice(0, 3);

  const isTaskCompleted = (t: Task): boolean => {
    if (!t || !t.status) return false;
    const s = String(t.status).toLowerCase();
    return s === 'completada' || s === 'completed' || s === 'finalizada' || s === 'done';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* 1. ALERTA DE TAREAS URGENTES */}
      {urgentTasks.length > 0 && urgentTasks[0] && (
        <section className="bg-rose-50/80 border-2 border-rose-300 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 animate-pulse shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider font-mono">
                  Atención Prioritaria ({urgentTasks.length} Tareas Críticas)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {urgentTasks[0].title}
              </h2>
              <p className="text-xs text-slate-600">
                Proyecto vinculante: <strong className="text-slate-900">{urgentTasks[0].projectName || 'En Taller'}</strong> · Vence:{' '}
                <span className="font-semibold text-rose-700">{urgentTasks[0].dueDate || 'Próximamente'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onNavigateToTasks}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Resolver Tareas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. INDICADORES DE TRABAJO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={onNavigateToTasks}
          className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-amber-300 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{urgentTasks.length} Urgentes</div>
              <div className="text-xs text-slate-500">Correcciones y entregas</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={onNavigateToAgenda}
          className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-amber-300 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{(meetings || []).length} Citas</div>
              <div className="text-xs text-slate-500">Reuniones y visitas de obra</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={onNavigateToProjects}
          className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-amber-300 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-sky-50 text-sky-700 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{activeProjects.length} Activos</div>
              <div className="text-xs text-slate-500">Proyectos en diseño / obra</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* 3. COLUMNAS PRINCIPALES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Columna Izquierda: Proyectos con Próxima Acción */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Proyectos con Próxima Acción</h3>
              </div>
              <button onClick={onNavigateToProjects} className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer">
                Ver todos ({(projects || []).length}) →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {(projects || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 italic">
                  No hay proyectos activos ni registrados en el estudio.
                </div>
              ) : (
                (activeProjects.length > 0 ? activeProjects : (projects || []).slice(0, 3)).map((project) => {
                  const nextTask = (tasks || []).find(t => t && t.projectId === project.id && !isTaskCompleted(t));
                  const projectName = project.name || 'Proyecto';
                  const projectStage = project.stages.find(stage => stage.status === 'En progreso')?.name || 'En taller';

                  return (
                    <div key={project.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {project.code || 'PRJ'}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {projectName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Cliente: <span className="font-semibold text-slate-700">{project.clientName || 'General'}</span> · Etapa: {projectStage}
                        </p>

                        <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200/60 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 mt-1">
                          <span className="font-bold text-[10px] uppercase text-amber-700">Próxima acción:</span>
                          <span>{nextTask ? nextTask.title : 'Revisión y avance de planos'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectProject(project)}
                        className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-amber-50 hover:text-amber-800 rounded-xl transition shrink-0 cursor-pointer self-start sm:self-center"
                      >
                        Abrir →
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Tareas inmediatas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Mis Pendientes Inmediatos</h3>
              </div>
              <button onClick={onNavigateToTasks} className="text-xs font-semibold text-sky-600 hover:underline cursor-pointer">
                Ver todas →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {(tasks || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 italic">
                  No hay tareas pendientes en este momento.
                </div>
              ) : (
                (tasks || []).slice(0, 4).map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 cursor-pointer"
                        checked={isTaskCompleted(t)}
                        readOnly
                      />
                      <div className="truncate">
                        <div className={`text-xs font-semibold ${isTaskCompleted(t) ? 'line-through text-slate-400' : 'text-slate-800'} truncate`}>
                          {t.title}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t.projectName || 'Proyecto'} · Vence: {t.dueDate || 'Hoy'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600">
                      {t.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Acciones Inmediatas</h3>
            <div className="space-y-2">
              <button
                onClick={onOpenNewProject}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-xs font-semibold text-slate-800 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-amber-600" />
                  <span>Nuevo Proyecto Arquitectónico</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={onOpenNewTask}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-xs font-semibold text-slate-800 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                  <span>Crear Tarea de Diseño</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={onOpenNewMeeting}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-xs font-semibold text-slate-800 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Programar Cita / Visita de Obra</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Próximos Eventos</h3>
              </div>
              <button onClick={onNavigateToAgenda} className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer">
                Ver agenda →
              </button>
            </div>

            <div className="space-y-3">
              {upcomingMeetings.length > 0 ? (
                upcomingMeetings.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {m.date} · {m.time}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{m.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{m.projectName || 'Proyecto'} · {m.location || 'Oficina'}</div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">No hay reuniones próximas programadas.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};