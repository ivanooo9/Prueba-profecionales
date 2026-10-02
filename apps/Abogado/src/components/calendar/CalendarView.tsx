import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gavel,
  CheckSquare,
  AlertTriangle,
  Bell,
  Filter,
  RefreshCw,
} from 'lucide-react';
import {
  ProceduralDeadline,
  Hearing,
  LegalTask,
  LegalCalendarEntry,
  LegalCalendarEntryType,
  LegalReminder,
} from '../../types';
import { legalService } from '../../services/legalService';

export interface CalendarViewProps {
  deadlines?: ProceduralDeadline[];
  hearings?: Hearing[];
  tasks?: LegalTask[];
  onSelectCase: (caseId: string) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  deadlines = [],
  hearings = [],
  tasks = [],
  onSelectCase,
}) => {
  // Fecha actual de referencia
  const today = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [entries, setEntries] = useState<LegalCalendarEntry[]>([]);
  const [reminders, setReminders] = useState<LegalReminder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showRemindersPanel, setShowRemindersPanel] = useState<boolean>(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  // Días del mes y desfase inicial
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOffset = firstDayOfMonth.getDay(); // 0=Dom ... 6=Sáb

  // Carga reactiva de eventos del calendario
  const fetchCalendarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStr = String(month + 1).padStart(2, '0');
      const from = `${year}-${monthStr}-01T00:00:00.000Z`;
      const to = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999Z`;

      const typeQuery = selectedTypeFilter !== 'ALL' ? selectedTypeFilter : undefined;
      const data = await legalService.getCalendar({ from, to, type: typeQuery });

      if (data && data.length > 0) {
        setEntries(data);
      } else {
        // Si el backend no devolvió eventos pero existen props locales, proyectarlos
        const localEntries: LegalCalendarEntry[] = [];
        if (selectedTypeFilter === 'ALL' || selectedTypeFilter === 'DEADLINE') {
          for (const d of deadlines) {
            if (!d.dueDate) continue;
            localEntries.push({
              id: `DEADLINE-${d.id}`,
              sourceType: 'DEADLINE',
              sourceId: Number(d.id) || 0,
              title: d.description,
              description: d.notes || d.description,
              startAt: `${d.dueDate}T23:59:00.000Z`,
              allDay: false,
              status: d.status,
              priority: d.priority,
              legalCaseId: Number(d.caseId) || 0,
              legalCaseTitle: d.caseTitle || '',
              clientId: 0,
              clientName: '',
              isOverdue: d.status !== 'Cumplido' && new Date(d.dueDate).getTime() < Date.now(),
            });
          }
        }
        if (selectedTypeFilter === 'ALL' || selectedTypeFilter === 'HEARING') {
          for (const h of hearings) {
            if (!h.date) continue;
            localEntries.push({
              id: `HEARING-${h.id}`,
              sourceType: 'HEARING',
              sourceId: Number(h.id) || 0,
              title: h.title,
              description: h.notes || h.type,
              startAt: `${h.date}T${h.time || '10:00'}:00.000Z`,
              allDay: false,
              status: h.status,
              priority: 'Alta',
              legalCaseId: Number(h.caseId) || 0,
              legalCaseTitle: h.caseTitle || '',
              clientId: 0,
              clientName: h.clientName || '',
              location: h.location,
              isOverdue: false,
            });
          }
        }
        if (selectedTypeFilter === 'ALL' || selectedTypeFilter === 'TASK') {
          for (const t of tasks) {
            if (!t.dueDate) continue;
            localEntries.push({
              id: `TASK-${t.id}`,
              sourceType: 'TASK',
              sourceId: Number(t.id) || 0,
              title: t.title,
              description: t.description,
              startAt: `${t.dueDate}T09:00:00.000Z`,
              allDay: true,
              status: t.status,
              priority: t.priority,
              legalCaseId: Number(t.caseId) || 0,
              legalCaseTitle: '',
              clientId: 0,
              clientName: '',
              isOverdue: t.status !== 'Completada' && new Date(t.dueDate).getTime() < Date.now(),
            });
          }
        }
        setEntries(localEntries);
      }

      // Cargar recordatorios pendientes
      try {
        const rems = await legalService.getReminders({ status: 'PENDING' });
        setReminders(rems || []);
      } catch {
        setReminders([]);
      }
    } catch (err) {
      console.error('[CalendarView] Error loading calendar entries:', err);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, daysInMonth, selectedTypeFilter, deadlines, hearings, tasks]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Navegación de meses
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Mapear eventos a días
  const getEventsForDay = (dayNum: number) => {
    const dayStr = String(dayNum).padStart(2, '0');
    const monthStr = String(month + 1).padStart(2, '0');
    const targetDatePrefix = `${year}-${monthStr}-${dayStr}`;

    const dayEntries = entries.filter((e) => {
      if (!e.startAt) return false;
      const datePart = e.startAt.split('T')[0];
      return datePart === targetDatePrefix;
    });

    return {
      entries: dayEntries,
      deadlines: dayEntries.filter((e) => e.sourceType === 'DEADLINE'),
      hearings: dayEntries.filter((e) => e.sourceType === 'HEARING'),
      tasks: dayEntries.filter((e) => e.sourceType === 'TASK'),
      totalCount: dayEntries.length,
    };
  };

  // Construcción de grilla
  const daysGrid: (number | null)[] = [];
  for (let i = 0; i < startDayOffset; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  // Comprobar si un día es "hoy"
  const isDayToday = (dayNum: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === dayNum
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-slate-800" />
            Agenda y Calendario Unificado de Términos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Proyección en tiempo real de plazos procesales, audiencias y tareas del expediente jurídico
          </p>
        </div>

        {/* Controles de Navegación */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-xs"
          >
            Hoy
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-50 text-slate-600 rounded-l-xl transition"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-sm text-slate-800 px-4 min-w-[140px] text-center select-none">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-50 text-slate-600 rounded-r-xl transition"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchCalendarData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-xs disabled:opacity-50"
            title="Recargar Agenda"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
          </button>

          {reminders.length > 0 && (
            <button
              onClick={() => setShowRemindersPanel(!showRemindersPanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs ${
                showRemindersPanel
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-600" />
              <span>{reminders.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Recordatorios panel si está abierto */}
      {showRemindersPanel && reminders.length > 0 && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-600" />
              Recordatorios Activos del Despacho ({reminders.length})
            </h3>
            <button
              onClick={() => setShowRemindersPanel(false)}
              className="text-xs text-amber-800 hover:underline font-semibold"
            >
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800 text-[10px] uppercase tracking-wide">
                    {rem.sourceType} #{rem.sourceId}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(rem.remindAt).toLocaleDateString('es-EC', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-slate-800 text-xs font-medium line-clamp-2">
                  {rem.message || 'Sin nota de recordatorio'}
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <button
                    onClick={() => onSelectCase(String(rem.legalCaseId))}
                    className="text-[10px] text-slate-600 hover:text-slate-900 font-bold underline"
                  >
                    Ver Expediente
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await legalService.dismissReminder(rem.legalCaseId, rem.id);
                        fetchCalendarData();
                      } catch (err: any) {
                        alert(err.message || 'Error al descartar recordatorio');
                      }
                    }}
                    className="text-[10px] text-amber-700 hover:text-amber-900 font-bold"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Filtros y Leyenda */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Filtros por tipo */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Tipo:
          </span>
          <button
            onClick={() => setSelectedTypeFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              selectedTypeFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({entries.length})
          </button>
          <button
            onClick={() => setSelectedTypeFilter('DEADLINE')}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              selectedTypeFilter === 'DEADLINE'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3 h-3" /> Plazos
          </button>
          <button
            onClick={() => setSelectedTypeFilter('HEARING')}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              selectedTypeFilter === 'HEARING'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            <Gavel className="w-3 h-3" /> Audiencias
          </button>
          <button
            onClick={() => setSelectedTypeFilter('TASK')}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              selectedTypeFilter === 'TASK'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckSquare className="w-3 h-3" /> Tareas
          </button>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-3 font-semibold text-slate-500 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Plazo Procesal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            Audiencia
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            Tarea Operativa
          </span>
          <span className="flex items-center gap-1 text-rose-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            Vencido
          </span>
        </div>
      </div>

      {/* Grilla del Calendario Mensual */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden p-4">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Celdas del mes */}
        <div className="grid grid-cols-7 gap-1.5">
          {daysGrid.map((dayNum, idx) => {
            if (dayNum === null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-24 bg-slate-50/40 rounded-xl border border-dashed border-slate-100"
                />
              );
            }

            const dayData = getEventsForDay(dayNum);
            const isToday = isDayToday(dayNum);

            return (
              <div
                key={`day-${dayNum}`}
                className={`min-h-24 p-2 rounded-xl border flex flex-col justify-between transition ${
                  isToday
                    ? 'bg-slate-50/80 border-slate-900 ring-2 ring-slate-900/10'
                    : dayData.totalCount > 0
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-slate-50/20 border-slate-100 hover:bg-slate-50/50'
                }`}
              >
                {/* Cabecera del día */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayData.totalCount > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {dayData.totalCount}
                    </span>
                  )}
                </div>

                {/* Lista de eventos del día */}
                <div className="space-y-1 overflow-y-auto max-h-28 pr-0.5 scrollbar-thin">
                  {dayData.entries.map((entry) => {
                    const isHearing = entry.sourceType === 'HEARING';
                    const isDeadline = entry.sourceType === 'DEADLINE';
                    const isTask = entry.sourceType === 'TASK';

                    let badgeBg = 'bg-slate-100 text-slate-800 border-slate-200';
                    let icon = <Clock className="w-2.5 h-2.5" />;

                    if (isDeadline) {
                      if (entry.isOverdue) {
                        badgeBg = 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
                        icon = <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />;
                      } else {
                        badgeBg = 'bg-amber-100 text-amber-900 border-amber-200';
                        icon = <Clock className="w-2.5 h-2.5 text-amber-700" />;
                      }
                    } else if (isHearing) {
                      badgeBg = 'bg-slate-800 text-white border-slate-700';
                      icon = <Gavel className="w-2.5 h-2.5 text-slate-200" />;
                    } else if (isTask) {
                      badgeBg = 'bg-emerald-100 text-emerald-900 border-emerald-200';
                      icon = <CheckSquare className="w-2.5 h-2.5 text-emerald-700" />;
                    }

                    // Formatear hora si existe
                    let timeStr = '';
                    if (entry.startAt && !entry.allDay) {
                      const timePart = entry.startAt.split('T')[1];
                      if (timePart) {
                        timeStr = timePart.substring(0, 5);
                      }
                    }

                    return (
                      <div
                        key={entry.id}
                        onClick={() => onSelectCase(String(entry.legalCaseId))}
                        className={`text-[10px] leading-tight px-1.5 py-1 rounded-lg border truncate cursor-pointer hover:opacity-90 flex items-center gap-1 transition ${badgeBg}`}
                        title={`${entry.sourceType}: ${entry.title}${
                          entry.legalCaseTitle ? ` (${entry.legalCaseTitle})` : ''
                        }${entry.isOverdue ? ' [VENCIDO]' : ''}`}
                      >
                        <span className="shrink-0">{icon}</span>
                        {timeStr && (
                          <span className="font-mono text-[9px] font-bold opacity-80 shrink-0">
                            {timeStr}
                          </span>
                        )}
                        <span className="truncate">{entry.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
