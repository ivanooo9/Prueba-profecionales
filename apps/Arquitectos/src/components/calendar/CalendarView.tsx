import React, { useState, useMemo } from 'react';
import { Task, Deliverable, Meeting, Project } from '../../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  PackageCheck,
  CalendarDays,
  CheckSquare,
  Search,
  RotateCcw
} from 'lucide-react';
import {
  getMonthMatrix,
  formatMonthYear,
  addMonths,
  DAY_NAMES_ES
} from '../../utils/dateUtils';

interface CalendarViewProps {
  tasks: Task[];
  deliverables: Deliverable[];
  meetings: Meeting[];
  projects: Project[];
}

export type ActivityTypeFilter = 'all' | 'task' | 'deliverable' | 'meeting';

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  deliverables,
  meetings,
  projects
}) => {
  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');

  // Estado del mes y año visualizados (inicia dinámicamente en la fecha actual)
  const [currentDateState, setCurrentDateState] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() // 0-indexed
    };
  });

  // Filtros interactivos
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>('all');

  // Navegación de calendario
  const goToPreviousMonth = () => {
    setCurrentDateState((prev) => addMonths(prev.year, prev.month, -1));
  };

  const goToNextMonth = () => {
    setCurrentDateState((prev) => addMonths(prev.year, prev.month, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDateState({
      year: now.getFullYear(),
      month: now.getMonth()
    });
  };

  // Matriz de días del mes actual para la cuadrícula
  const monthMatrix = useMemo(() => {
    return getMonthMatrix(currentDateState.year, currentDateState.month);
  }, [currentDateState.year, currentDateState.month]);

  // Consolidación de eventos reales
  const allEvents = useMemo(() => {
    const taskEvents = tasks
      .filter((t) => Boolean(t.dueDate))
      .map((t) => ({
        id: `task-${t.id}`,
        sourceId: t.id,
        sourceType: 'task' as const,
        title: t.title,
        date: t.dueDate.slice(0, 10),
        time: undefined,
        type: 'Tarea',
        projectId: t.projectId,
        project: t.projectName,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dotColor: 'bg-emerald-500',
        icon: CheckSquare
      }));

    const deliverableEvents = deliverables
      .filter((d) => Boolean(d.dueDate))
      .map((d) => ({
        id: `deliv-${d.id}`,
        sourceId: d.id,
        sourceType: 'deliverable' as const,
        title: d.name,
        date: d.dueDate.slice(0, 10),
        time: undefined,
        type: 'Entregable',
        projectId: d.projectId,
        project: d.projectName,
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        dotColor: 'bg-amber-500',
        icon: PackageCheck
      }));

    const meetingEvents = meetings
      .filter((m) => Boolean(m.date || m.scheduledAt))
      .map((m) => {
        const dateStr = (m.date || m.scheduledAt || '').slice(0, 10);
        return {
          id: `mtg-${m.id}`,
          sourceId: m.id,
          sourceType: 'meeting' as const,
          title: m.time ? `${m.title} (${m.time})` : m.title,
          date: dateStr,
          time: m.time,
          type: 'Reunión',
          projectId: m.projectId,
          project: m.projectName,
          location: m.location,
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
          dotColor: 'bg-purple-500',
          icon: CalendarDays
        };
      });

    return [...taskEvents, ...deliverableEvents, ...meetingEvents].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  }, [tasks, deliverables, meetings]);

  // Filtrado reactivo de eventos
  const filteredEvents = useMemo(() => {
    return allEvents.filter((evt) => {
      // 1. Filtro por tipo de actividad
      if (typeFilter !== 'all' && evt.sourceType !== typeFilter) {
        return false;
      }

      // 2. Filtro por proyecto
      if (projectFilter !== 'all' && String(evt.projectId) !== String(projectFilter)) {
        return false;
      }

      // 3. Filtro por búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(query);
        const matchesProject = evt.project.toLowerCase().includes(query);
        const matchesLocation = 'location' in evt && typeof evt.location === 'string'
          ? evt.location.toLowerCase().includes(query)
          : false;
        return matchesTitle || matchesProject || matchesLocation;
      }

      return true;
    });
  }, [allEvents, typeFilter, projectFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-arch-50 text-arch-600 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Agenda y Planificador de Estudio</h3>
            <p className="text-xs text-slate-500">Cronograma consolidado de tareas, entregables y reuniones de arquitectura</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'agenda'
                ? 'bg-arch-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Vista de Agenda
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'month'
                ? 'bg-arch-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Vista Mensual
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar evento, proyecto o lugar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 max-w-[200px]"
          >
            <option value="all">Todos los Proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ActivityTypeFilter)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="all">Todas las Actividades</option>
            <option value="task">Tareas</option>
            <option value="deliverable">Entregables</option>
            <option value="meeting">Reuniones</option>
          </select>
        </div>

        {(searchQuery || projectFilter !== 'all' || typeFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setProjectFilter('all');
              setTypeFilter('all');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition self-end sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* View Content */}
      {viewMode === 'agenda' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Eventos Programados por Fecha ({filteredEvents.length})
            </h4>
          </div>

          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 italic space-y-1">
                <p className="font-semibold text-slate-700">No se encontraron eventos</p>
                <p className="text-slate-400">
                  {allEvents.length === 0
                    ? 'No hay eventos, entregables ni tareas con fecha programada en el calendario.'
                    : 'Ningún evento coincide con los filtros aplicados.'}
                </p>
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const Icon = evt.icon;
                return (
                  <div
                    key={evt.id}
                    className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
                        <Icon className="w-4 h-4 text-arch-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${evt.badgeColor}`}>
                            {evt.type}
                          </span>
                          <h5 className="font-bold text-slate-900">{evt.title}</h5>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Proyecto: <strong className="text-slate-700">{evt.project}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono font-bold text-slate-800 self-end sm:self-center bg-white px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{evt.date}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Dynamic Month Grid View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4 text-xs">
          {/* Calendar Month Navigation Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <h4 className="font-bold text-slate-900 text-base">
                {formatMonthYear(currentDateState.year, currentDateState.month)}
              </h4>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 text-[11px] font-semibold text-arch-600 bg-arch-50 hover:bg-arch-100 rounded-md transition cursor-pointer"
              >
                Hoy
              </button>
            </div>

            <div className="flex items-center gap-1 text-slate-600">
              <button
                onClick={goToPreviousMonth}
                aria-label="Mes anterior"
                className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextMonth}
                aria-label="Mes siguiente"
                className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-2 text-center font-bold text-slate-400 text-[11px]">
            {DAY_NAMES_ES.map((dayName) => (
              <div key={dayName}>{dayName}</div>
            ))}
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 gap-2">
            {monthMatrix.cells.map((cell, idx) => {
              const dayEvents = filteredEvents.filter((e) => e.date === cell.dateString);

              return (
                <div
                  key={`${cell.dateString}-${idx}`}
                  className={`min-h-[85px] p-2 rounded-lg border flex flex-col justify-between transition-colors ${
                    cell.isCurrentMonth
                      ? 'bg-slate-50/60 border-slate-200'
                      : 'bg-slate-100/40 border-slate-100 text-slate-400 opacity-60'
                  } ${cell.isToday ? 'ring-2 ring-arch-500/40 border-arch-400 bg-arch-50/20' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        cell.isToday
                          ? 'bg-arch-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]'
                          : cell.isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold truncate border ${e.badgeColor}`}
                        title={`${e.type}: ${e.title} (${e.project})`}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-slate-500 font-semibold block text-right">
                        +{dayEvents.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
