import React, { useMemo, useState } from 'react';
import { dentalService } from '../../services/dentalService';
import { StatusBadge } from '../ui/StatusBadge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface CalendarViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenNewAppointmentModal: () => void;
  embedded?: boolean;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const CalendarView: React.FC<CalendarViewProps> = ({
  onSelectPatient,
  onOpenNewAppointmentModal,
  embedded = false
}) => {
  const appointments = dentalService.getAppointments();
  const initialDate = useMemo(() => {
    const latestAppointment = [...appointments].sort((a, b) => b.date.localeCompare(a.date))[0];
    return latestAppointment ? new Date(`${latestAppointment.date}T12:00:00`) : new Date();
  }, [appointments]);

  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(
    () => toDateKey(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate())
  );

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;

  const dayCells: Array<string | null> = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => toDateKey(year, month, index + 1))
  ];

  const appointmentsForSelectedDay = appointments
    .filter(appointment => appointment.date === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const moveMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setVisibleMonth(next);
    setSelectedDay(toDateKey(next.getFullYear(), next.getMonth(), 1));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Calendario</h2>
            <p className="text-xs text-slate-500 mt-1">Vista mensual de las citas del consultorio.</p>
          </div>
          <button
            onClick={onOpenNewAppointmentModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Nueva cita
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-cyan-600" />
              {MONTHS[month]} {year}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveMonth(-1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveMonth(1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dayCells.map((dateKey, index) => {
              if (!dateKey) return <div key={`empty-${index}`} className="min-h-[64px]" />;
              const dayNumber = Number(dateKey.slice(-2));
              const count = appointments.filter(a => a.date === dateKey).length;
              const isSelected = selectedDay === dateKey;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDay(dateKey)}
                  className={`min-h-[64px] p-2 rounded-xl border flex flex-col justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-xs font-bold font-mono ${isSelected ? 'text-cyan-800' : 'text-slate-700'}`}>
                    {dayNumber}
                  </span>
                  {count > 0 ? (
                    <span className="text-[9px] font-bold bg-cyan-600 text-white px-1.5 py-0.5 rounded-md self-start">
                      {count} {count === 1 ? 'cita' : 'citas'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-300">Libre</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{selectedDay}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{appointmentsForSelectedDay.length} citas</p>
            </div>
            <button
              onClick={onOpenNewAppointmentModal}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
            >
              + Cita
            </button>
          </div>

          <div className="space-y-2">
            {appointmentsForSelectedDay.length > 0 ? appointmentsForSelectedDay.map(appointment => (
              <button
                key={appointment.id}
                onClick={() => onSelectPatient(appointment.patientId)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{appointment.time} · {appointment.patientName}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{appointment.type}</div>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
              </button>
            )) : (
              <div className="py-8 text-center text-xs text-slate-500">Día disponible.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
