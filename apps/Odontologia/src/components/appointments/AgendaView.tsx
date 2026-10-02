import React, { useState } from 'react';
import { CalendarDays, ListChecks } from 'lucide-react';
import { AppointmentList } from './AppointmentList';
import { CalendarView } from '../calendar/CalendarView';

interface AgendaViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenNewAppointmentModal: () => void;
}

type AgendaMode = 'list' | 'calendar';

export const AgendaView: React.FC<AgendaViewProps> = ({
  onSelectPatient,
  onOpenNewAppointmentModal
}) => {
  const [mode, setMode] = useState<AgendaMode>('list');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Agenda</h2>
          <p className="text-xs text-slate-500 mt-1">Citas del consultorio en una sola vista.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-sm">
            <button
              onClick={() => setMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" /> Citas
            </button>
            <button
              onClick={() => setMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'calendar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendario
            </button>
          </div>

          <button
            onClick={onOpenNewAppointmentModal}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            + Nueva cita
          </button>
        </div>
      </div>

      {mode === 'list' ? (
        <AppointmentList
          onSelectPatient={onSelectPatient}
          onOpenNewAppointmentModal={onOpenNewAppointmentModal}
          embedded
        />
      ) : (
        <CalendarView
          onSelectPatient={onSelectPatient}
          onOpenNewAppointmentModal={onOpenNewAppointmentModal}
          embedded
        />
      )}
    </div>
  );
};
