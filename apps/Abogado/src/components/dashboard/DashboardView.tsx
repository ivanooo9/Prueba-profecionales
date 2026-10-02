import React from 'react';
import {
  AlertOctagon,
  Calendar,
  Clock,
  CheckSquare,
  Plus,
  ChevronRight,
  Briefcase,
  Scale,
  ArrowRight,
  DollarSign,
  AlertTriangle,
  RotateCw,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { Hearing, LegalCase, LegalTask, ProceduralDeadline, LegalDashboardDTO } from '../../types';

export interface DashboardViewProps {
  cases: LegalCase[];
  deadlines: ProceduralDeadline[];
  hearings: Hearing[];
  tasks: LegalTask[];
  dashboardData?: LegalDashboardDTO | null;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onSelectCase: (caseItem: LegalCase) => void;
  onNavigateToDeadlines: () => void;
  onNavigateToHearings: () => void;
  onNavigateToTasks: () => void;
  onOpenNewCase: () => void;
  onOpenNewTask: () => void;
  onOpenNewHearing: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cases,
  deadlines,
  hearings,
  tasks,
  dashboardData,
  isLoading = false,
  error = null,
  onRefresh,
  onSelectCase,
  onNavigateToDeadlines,
  onNavigateToHearings,
  onNavigateToTasks,
  onOpenNewCase,
  onOpenNewTask,
  onOpenNewHearing,
}) => {
  // Manejo de Estado de Error (Sin fallback a datos simulados)
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-900">Error al cargar datos del Dashboard</h3>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Manejo de Estado de Carga
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse p-4">
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-20 bg-slate-200 rounded-xl" />
          <div className="h-20 bg-slate-200 rounded-xl" />
          <div className="h-20 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-96 bg-slate-200 rounded-2xl" />
          <div className="lg:col-span-5 h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Métricas agregadas gobernadas por Core API si existen, con fallback a arrays locales
  const urgentCount = dashboardData
    ? dashboardData.workload.overdueDeadlines
    : deadlines.filter((d) => d.status === 'Vencido' || d.priority === 'Urgente').length;

  const hearingsCount = dashboardData
    ? dashboardData.workload.upcomingHearings
    : hearings.filter((h) => h.status === 'Programada').length;

  const tasksCount = dashboardData
    ? dashboardData.workload.pendingTasks
    : tasks.filter((t) => t.status !== 'Completada').length;

  const activeCasesCount = dashboardData
    ? dashboardData.cases.open
    : cases.filter((c) => c.status !== 'Cerrado' && c.status !== 'Archivado').length;

  const urgentDeadlinesList = deadlines.filter((d) => d.status === 'Vencido' || d.priority === 'Urgente');
  const criticalCases = cases.filter((c) => c.priority === 'Urgente' || c.priority === 'Alta').slice(0, 4);

  // Próximos eventos (Upcoming) provistos por proyección de F5/F7
  const upcomingEvents = dashboardData && Array.isArray(dashboardData.upcoming) && dashboardData.upcoming.length > 0
    ? dashboardData.upcoming
    : [];

  const isEmpty = (dashboardData ? dashboardData.cases.total === 0 : cases.length === 0) &&
    urgentCount === 0 &&
    hearingsCount === 0 &&
    tasksCount === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Botón de Refrescar sutil */}
      {onRefresh && (
        <div className="flex justify-end">
          <button
            onClick={onRefresh}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            title="Actualizar datos del dashboard desde el servidor"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Actualizar métricas</span>
          </button>
        </div>
      )}

      {/* 1. Alerta de Plazos Críticos */}
      {urgentCount > 0 && urgentDeadlinesList.length > 0 && (
        <section className="bg-rose-50/80 border-2 border-rose-300 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertOctagon className="w-5 h-5 animate-pulse shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider font-mono">
                  Atención Perentoria Requerida ({urgentCount} Plazos)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {urgentDeadlinesList[0].description}
              </h2>
              <p className="text-xs text-slate-600">
                Vence: <strong className="text-rose-700">{urgentDeadlinesList[0].dueDate}</strong> · Caso:{' '}
                <span className="font-semibold text-slate-900">{urgentDeadlinesList[0].caseTitle || 'Expediente vinculado'}</span>
              </p>
            </div>

            <button
              onClick={onNavigateToDeadlines}
              className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Resolver Plazos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* 2. Indicadores Operativos */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={onNavigateToDeadlines}
          className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-rose-300 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{urgentCount} Urgentes</div>
              <div className="text-xs text-slate-500">Plazos procesales críticos</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={onNavigateToHearings}
          className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-amber-300 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{hearingsCount} Audiencias</div>
              <div className="text-xs text-slate-500">Programadas en agenda</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={onNavigateToTasks}
          className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-sky-300 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-sky-50 text-sky-700 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{tasksCount} Tareas</div>
              <div className="text-xs text-slate-500">Actividades pendientes</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{activeCasesCount} Activos</div>
              <div className="text-xs text-slate-500">Expedientes en trámite</div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            En curso
          </span>
        </div>
      </div>

      {/* 3. Resumen Financiero Real de Honorarios (F4 & F7) */}
      {dashboardData && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Métricas Económicas del Despacho</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Proyección Contable USD</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500">Honorarios Acordados</span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                ${dashboardData.finances.agreedFees.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Pactos de honorarios activos</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Total Recaudado</span>
              <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                ${dashboardData.finances.collected.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-600">Cobros registrados válidos</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-800">Saldo por Cobrar</span>
              <div className="text-xl font-extrabold text-amber-700 mt-0.5">
                ${dashboardData.finances.outstanding.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-amber-600">Pendiente de amortización</span>
            </div>
          </div>
        </section>
      )}

      {/* 4. Columnas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">

          {/* Agenda / Próximos Eventos Unificados */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Agenda Próxima Unificada</h3>
              </div>
              <button onClick={onNavigateToHearings} className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer">
                Ver agenda →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono ${
                          item.type === 'HEARING' ? 'bg-amber-100 text-amber-800' :
                          item.type === 'DEADLINE' ? 'bg-rose-100 text-rose-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        Fecha: {item.date ? item.date.replace('T', ' ').slice(0, 16) : 'S/F'} · Caso: {item.caseNumber}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const matched = cases.find((c) => Number(c.id) === item.legalCaseId || c.id === String(item.legalCaseId));
                        if (matched) onSelectCase(matched);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-amber-50 hover:text-amber-800 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      Ver caso
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <Inbox className="w-8 h-8 mx-auto opacity-40 mb-1" />
                  <p className="text-xs font-medium">No hay eventos o audiencias programadas próximamente.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tareas Operativas Pendientes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Tareas Pendientes de Ejecución</h3>
              </div>
              <button onClick={onNavigateToTasks} className="text-xs font-semibold text-sky-600 hover:underline cursor-pointer">
                Ver todas →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.filter((t) => t.status !== 'Completada').slice(0, 4).length > 0 ? (
                tasks.filter((t) => t.status !== 'Completada').slice(0, 4).map((task) => (
                  <div key={task.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                        readOnly
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800 truncate">{task.title}</div>
                        <div className="text-[10px] text-slate-400">Vence: {task.dueDate} · {task.caseTitle}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      task.priority === 'Urgente' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">No hay tareas pendientes asignadas.</p>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Acciones Inmediatas</h3>
            <div className="space-y-2">
              <button
                onClick={onOpenNewCase}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-xs font-semibold text-slate-800 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>Registrar Nuevo Caso</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={onOpenNewHearing}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-xs font-semibold text-slate-800 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Fijar Nueva Audiencia</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={onOpenNewTask}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-xs font-semibold text-slate-800 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                  <span>Crear Tarea Procesal</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Casos Prioritarios */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Casos Prioritarios</h3>
              <span className="text-[11px] font-mono text-slate-400">{cases.length} en despacho</span>
            </div>

            <div className="space-y-2.5">
              {criticalCases.length > 0 ? (
                criticalCases.map((legalCase) => (
                  <div
                    key={legalCase.id}
                    onClick={() => onSelectCase(legalCase)}
                    className="p-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer transition space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-600">{legalCase.caseNumber}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                        legalCase.priority === 'Urgente' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {legalCase.priority}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">{legalCase.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">Cliente: {legalCase.clientName} · {legalCase.legalArea}</div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">No hay casos clasificados como prioritarios.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEmpty && (
        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <Scale className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <h4 className="text-sm font-bold text-slate-700">El despacho aún no tiene causas registradas</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Empieza registrando tu primer expediente jurídico o asociando clientes para activar la proyección ejecutiva.
          </p>
          <button
            onClick={onOpenNewCase}
            className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Registrar Primer Caso
          </button>
        </div>
      )}
    </div>
  );
};