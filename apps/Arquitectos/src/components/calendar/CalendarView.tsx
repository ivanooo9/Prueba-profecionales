import React, { useState } from 'react';
import { Task, Deliverable, Meeting, Project } from '../../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  PackageCheck,
  CalendarDays,
  CheckSquare
} from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  deliverables: Deliverable[];
  meetings: Meeting[];
  projects: Project[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  deliverables,
  meetings,
  projects
}) => {
  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');

  // Combine items with dates
  const events = [
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      title: t.title,
      date: t.dueDate,
      type: 'Tarea',
      project: t.projectName,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: CheckSquare
    })),
    ...deliverables.map((d) => ({
      id: `deliv-${d.id}`,
      title: d.name,
      date: d.dueDate,
      type: 'Entregable',
      project: d.projectName,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: PackageCheck
    })),
    ...meetings.map((m) => ({
      id: `mtg-${m.id}`,
      title: `${m.title} (${m.time})`,
      date: m.date,
      type: 'Reunión',
      project: m.projectName,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: CalendarDays
    }))
  ].sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-arch-50 text-arch-600 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Agenda y Planificador de Estudio</h3>
            <p className="text-xs text-slate-500">Cronograma consolidado de tareas, entregas y citas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              viewMode === 'agenda'
                ? 'bg-arch-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Vista de Agenda
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              viewMode === 'month'
                ? 'bg-arch-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Vista Mensual
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'agenda' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Eventos Programados por Fecha
          </h4>

          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 italic">
                No hay eventos, entregables ni tareas con fecha programada en el calendario.
              </div>
            ) : (
              events.map((evt) => {
                const Icon = evt.icon;
                return (
                  <div
                    key={evt.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
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

                    <div className="flex items-center gap-2 font-mono font-bold text-slate-800 self-end sm:self-center">
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
        /* Simple Month Grid view */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-sm">Septiembre 2026</h4>
            <div className="flex items-center gap-1 text-slate-400">
              <button className="p-1 hover:text-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 hover:text-slate-700">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center font-bold text-slate-400 text-[11px]">
            <div>Dom</div>
            <div>Lun</div>
            <div>Mar</div>
            <div>Mié</div>
            <div>Jue</div>
            <div>Vie</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 30 }).map((_, i) => {
              const dayNum = i + 1;
              const dayStr = `2026-09-${dayNum < 10 ? '0' + dayNum : dayNum}`;
              const dayEvents = events.filter((e) => e.date === dayStr);

              return (
                <div
                  key={i}
                  className="min-h-[80px] p-1.5 bg-slate-50 rounded-lg border border-slate-100 flex flex-col justify-between"
                >
                  <span className="font-mono font-bold text-slate-600 text-[10px]">{dayNum}</span>
                  <div className="space-y-1">
                    {dayEvents.map((e) => (
                      <div
                        key={e.id}
                        className="text-[9px] p-1 bg-arch-100 text-arch-800 rounded font-semibold truncate"
                        title={e.title}
                      >
                        {e.title}
                      </div>
                    ))}
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
