import React, { useState, useMemo } from 'react';
import { Meeting, Project, Task, Deliverable } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import {
  CalendarDays,
  LayoutGrid,
  Plus,
  Search,
  Clock,
  MapPin,
  User,
  Edit,
  XCircle,
  Video,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckSquare,
  PackageCheck,
  Building2,
  Calendar as CalendarIcon,
  X
} from 'lucide-react';
import {
  getMonthMatrix,
  formatMonthYear,
  formatCalendarDateDisplay,
  addMonths,
  DAY_NAMES_ES
} from '../../utils/dateUtils';

interface MeetingListProps {
  meetings: Meeting[];
  projects: Project[];
  tasks?: Task[];
  deliverables?: Deliverable[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  initialViewMode?: 'cards' | 'calendar';
  onOpenCreateModal: (defaultDate?: string) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onCancelMeeting: (id: string | number) => void;
}

export const MeetingList: React.FC<MeetingListProps> = ({
  meetings,
  projects,
  tasks = [],
  deliverables = [],
  searchQuery,
  onSearchChange,
  initialViewMode = 'cards',
  onOpenCreateModal,
  onEditMeeting,
  onCancelMeeting
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>(initialViewMode);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [includeOtherActivities, setIncludeOtherActivities] = useState<boolean>(false);

  // Estado para modal de detalle y selección de fecha
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Estado de navegación del mes
  const [currentDateState, setCurrentDateState] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth()
    };
  });

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

  const monthMatrix = useMemo(() => {
    return getMonthMatrix(currentDateState.year, currentDateState.month);
  }, [currentDateState.year, currentDateState.month]);

  // Filtrado de reuniones
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        m.title.toLowerCase().includes(q) ||
        m.projectName.toLowerCase().includes(q) ||
        m.clientName.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q);

      const matchesProject = projectFilter === 'all' || String(m.projectId) === String(projectFilter);
      const matchesModality = modalityFilter === 'all' || m.modality === modalityFilter;

      return matchesSearch && matchesProject && matchesModality;
    });
  }, [meetings, searchQuery, projectFilter, modalityFilter]);

  // Tareas y entregables filtrados para la vista de calendario si está habilitado
  const additionalEvents = useMemo(() => {
    if (!includeOtherActivities) return [];

    const taskEvents = tasks
      .filter((t) => Boolean(t.dueDate))
      .filter((t) => projectFilter === 'all' || String(t.projectId) === String(projectFilter))
      .filter((t) => !searchQuery.trim() || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        date: t.dueDate.slice(0, 10),
        type: 'Tarea' as const,
        projectName: t.projectName,
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckSquare
      }));

    const deliverableEvents = deliverables
      .filter((d) => Boolean(d.dueDate))
      .filter((d) => projectFilter === 'all' || String(d.projectId) === String(projectFilter))
      .filter((d) => !searchQuery.trim() || d.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((d) => ({
        id: `deliv-${d.id}`,
        title: d.name,
        date: d.dueDate.slice(0, 10),
        type: 'Entregable' as const,
        projectName: d.projectName,
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: PackageCheck
      }));

    return [...taskEvents, ...deliverableEvents];
  }, [includeOtherActivities, tasks, deliverables, projectFilter, searchQuery]);

  // Mapa de reuniones por fecha para acceso O(1) en la cuadrícula del calendario
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    filteredMeetings.forEach((m) => {
      const dateStr = (m.date || m.scheduledAt || '').slice(0, 10);
      if (!dateStr) return;
      const list = map.get(dateStr) || [];
      list.push(m);
      map.set(dateStr, list);
    });
    return map;
  }, [filteredMeetings]);

  // Mapa de eventos complementarios por fecha
  const extraEventsByDate = useMemo(() => {
    const map = new Map<string, typeof additionalEvents>();
    additionalEvents.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [additionalEvents]);

  // Eventos de la fecha seleccionada
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return { meetings: [], extras: [] };
    return {
      meetings: meetingsByDate.get(selectedDate) || [],
      extras: extraEventsByDate.get(selectedDate) || []
    };
  }, [selectedDate, meetingsByDate, extraEventsByDate]);

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar con Selector de Vista */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Conmutador de Vista (Tarjetas / Calendario) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tarjetas ({filteredMeetings.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-arch-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>
          </div>

          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar reunión, cliente o lugar..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          {/* Filtro por Proyecto */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 max-w-[190px]"
          >
            <option value="all">Todos los Proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Filtro por Modalidad */}
          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="all">Todas las Modalidades</option>
            <option value="Presencial">Presencial</option>
            <option value="Virtual">Virtual</option>
          </select>

          {/* Limpiar filtros */}
          {(searchQuery || projectFilter !== 'all' || modalityFilter !== 'all') && (
            <button
              onClick={() => {
                onSearchChange('');
                setProjectFilter('all');
                setModalityFilter('all');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Restablecer filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
        </div>

        {/* Botón Agendar Reunión */}
        <button
          onClick={() => onOpenCreateModal()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors self-end lg:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Reunión</span>
        </button>
      </div>

      {/* VISTA 1: CALENDARIO */}
      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          {/* Cabecera de navegación de mes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-arch-50 text-arch-600 rounded-lg">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">
                    {formatMonthYear(currentDateState.year, currentDateState.month)}
                  </h3>
                  <button
                    onClick={goToToday}
                    className="px-2.5 py-1 text-[11px] font-semibold text-arch-600 bg-arch-50 hover:bg-arch-100 rounded-md transition cursor-pointer"
                  >
                    Hoy
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {filteredMeetings.length} {filteredMeetings.length === 1 ? 'reunión programada' : 'reuniones programadas'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Opción para incluir tareas y entregables del estudio */}
              {(tasks.length > 0 || deliverables.length > 0) && (
                <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer select-none bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={includeOtherActivities}
                    onChange={(e) => setIncludeOtherActivities(e.target.checked)}
                    className="rounded text-arch-600 focus:ring-arch-500 h-3.5 w-3.5"
                  />
                  <span>Mostrar tareas y entregables</span>
                </label>
              )}

              {/* Botones de navegación de mes */}
              <div className="flex items-center gap-1 text-slate-600 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={goToPreviousMonth}
                  aria-label="Mes anterior"
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-200 rounded-md transition cursor-pointer"
                  title="Mes anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNextMonth}
                  aria-label="Mes siguiente"
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-200 rounded-md transition cursor-pointer"
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Encabezados de días de la semana */}
          <div className="grid grid-cols-7 gap-2 text-center font-bold text-slate-400 text-xs">
            {DAY_NAMES_ES.map((dayName) => (
              <div key={dayName} className="py-1">
                {dayName}
              </div>
            ))}
          </div>

          {/* Cuadrícula de 7 columnas del mes */}
          <div className="grid grid-cols-7 gap-2">
            {monthMatrix.cells.map((cell, idx) => {
              const dayMeetings = meetingsByDate.get(cell.dateString) || [];
              const dayExtras = extraEventsByDate.get(cell.dateString) || [];
              const totalEventsCount = dayMeetings.length + dayExtras.length;
              const isSelected = selectedDate === cell.dateString;

              return (
                <div
                  key={`${cell.dateString}-${idx}`}
                  onClick={() => setSelectedDate(isSelected ? null : cell.dateString)}
                  className={`min-h-[105px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                    cell.isCurrentMonth
                      ? 'bg-slate-50/70 border-slate-200 hover:border-arch-300 hover:bg-slate-50'
                      : 'bg-slate-100/40 border-slate-100 text-slate-400 opacity-60'
                  } ${
                    cell.isToday
                      ? 'ring-2 ring-arch-500/50 border-arch-400 bg-arch-50/20'
                      : ''
                  } ${
                    isSelected ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/30' : ''
                  }`}
                >
                  {/* Cabecera del día */}
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

                    <div className="flex items-center gap-1">
                      {totalEventsCount > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full">
                          {totalEventsCount}
                        </span>
                      )}
                      {/* Botón rápido para agendar en este día */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCreateModal(cell.dateString);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-arch-600 hover:bg-white rounded transition cursor-pointer"
                        title={`Agendar reunión el ${cell.dateString}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Listado de eventos en la celda */}
                  <div className="space-y-1 mt-1 flex-1">
                    {/* Reuniones */}
                    {dayMeetings.slice(0, 2).map((m) => {
                      const isVirtual = m.modality === 'Virtual';
                      const isRealizada = m.status === 'Realizada';
                      const isCancelada = m.status === 'Cancelada';

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMeeting(m);
                          }}
                          className={`w-full text-left text-[10px] px-1.5 py-1 rounded font-medium truncate border flex items-center gap-1 transition cursor-pointer ${
                            isRealizada
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : isCancelada
                              ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                              : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                          }`}
                          title={`${m.title} - ${m.projectName} (${m.time || ''})`}
                        >
                          {isVirtual ? (
                            <Video className="w-2.5 h-2.5 shrink-0 text-purple-600" />
                          ) : (
                            <MapPin className="w-2.5 h-2.5 shrink-0 text-indigo-600" />
                          )}
                          <span className="font-mono text-[9px] font-bold shrink-0">{m.time}</span>
                          <span className="truncate">{m.title}</span>
                        </button>
                      );
                    })}

                    {/* Tareas o entregables si están activos */}
                    {includeOtherActivities &&
                      dayExtras.slice(0, Math.max(0, 2 - dayMeetings.length)).map((ev) => {
                        const Icon = ev.icon;
                        return (
                          <div
                            key={ev.id}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium truncate border flex items-center gap-1 ${ev.badgeColor}`}
                            title={`${ev.type}: ${ev.title} (${ev.projectName})`}
                          >
                            <Icon className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}

                    {totalEventsCount > 2 && (
                      <span className="text-[9px] text-slate-500 font-semibold block text-right">
                        +{totalEventsCount - 2} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel de detalle de la fecha seleccionada */}
          {selectedDate && (
            <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Eventos programados para el {formatCalendarDateDisplay(selectedDate)}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenCreateModal(selectedDate)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agendar en este día</span>
                  </button>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                    title="Cerrar vista diaria"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedDateEvents.meetings.length === 0 && selectedDateEvents.extras.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No hay citas ni eventos para esta fecha.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDateEvents.meetings.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMeeting(m)}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {m.time}
                        </span>
                        <StatusBadge status={m.status} size="sm" />
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 leading-snug">{m.title}</h5>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Proyecto: <span className="font-bold text-slate-800">{m.projectName}</span>
                      </p>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{m.clientName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{m.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedDateEvents.extras.map((ex) => {
                    const Icon = ex.icon;
                    return (
                      <div
                        key={ex.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1 text-xs"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <Icon className="w-3.5 h-3.5 text-slate-500" />
                          <span>{ex.type}</span>
                        </div>
                        <p className="font-semibold text-slate-900">{ex.title}</p>
                        <p className="text-[11px] text-slate-500">Proyecto: {ex.projectName}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* VISTA 2: TARJETAS (VISTA ORIGINAL) */
        filteredMeetings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No hay reuniones agendadas"
            description="Agende citas presenciales o virtuales con clientes e ingenieros."
            actionLabel="Agendar Reunión"
            onAction={() => onOpenCreateModal()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMeetings.map((m) => (
              <div
                key={m.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-mono flex items-center gap-1 ${
                        m.modality === 'Virtual'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {m.modality === 'Virtual' && <Video className="w-3 h-3" />}
                      {m.modality}
                    </span>
                    <StatusBadge status={m.status} size="sm" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{m.title}</h3>

                  <p className="text-xs text-slate-600 font-medium">
                    Proyecto: <span className="text-slate-800 font-bold">{m.projectName}</span>
                  </p>

                  <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Cliente: <strong className="text-slate-700">{m.clientName}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{m.location}</span>
                    </div>
                  </div>

                  {m.notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                      "{m.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-arch-600" />
                    <span>
                      {m.date} a las {m.time}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditMeeting(m)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {m.status !== 'Cancelada' && m.status !== 'Realizada' && (
                      <button
                        onClick={() => onCancelMeeting(m.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                        title="Cancelar reunión"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal de Detalle de Reunión al hacer clic en un evento */}
      {selectedMeeting && (
        <Modal
          isOpen={Boolean(selectedMeeting)}
          onClose={() => setSelectedMeeting(null)}
          title="Detalle de la Cita"
          subtitle={selectedMeeting.title}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-mono flex items-center gap-1 ${
                    selectedMeeting.modality === 'Virtual'
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {selectedMeeting.modality === 'Virtual' && <Video className="w-3 h-3" />}
                  {selectedMeeting.modality}
                </span>
                <StatusBadge status={selectedMeeting.status} size="sm" />
              </div>
              <div className="font-mono font-bold text-slate-800">
                {formatCalendarDateDisplay(selectedMeeting.date)} a las {selectedMeeting.time}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Proyecto</span>
                <p className="font-bold text-slate-900 text-sm">{selectedMeeting.projectName}</p>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Cliente</span>
                <p className="font-bold text-slate-900 text-sm">{selectedMeeting.clientName}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ubicación / Modalidad</span>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{selectedMeeting.location || 'Estudio de Arquitectura'}</span>
              </div>
            </div>

            {selectedMeeting.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Notas de la Cita</span>
                <p className="text-slate-600 italic whitespace-pre-wrap">{selectedMeeting.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
              {selectedMeeting.status !== 'Cancelada' && selectedMeeting.status !== 'Realizada' ? (
                <button
                  type="button"
                  onClick={() => {
                    const meetingToCancel = selectedMeeting;
                    setSelectedMeeting(null);
                    onCancelMeeting(meetingToCancel.id);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                >
                  Cancelar Cita
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const meetingToEdit = selectedMeeting;
                    setSelectedMeeting(null);
                    onEditMeeting(meetingToEdit);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 shadow-xs transition cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar Cita</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMeeting(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
