import React from 'react';
import { CalendarDays, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { ClassSession } from '../../types/teacher';

export interface ClassScheduleViewProps {
  classes: ClassSession[];
  onOpenQuickAttendance: (session: ClassSession) => void;
  onOpenQuickGrade: () => void;
}

export const ClassScheduleView: React.FC<ClassScheduleViewProps> = ({
  classes,
  onOpenQuickAttendance,
  onOpenQuickGrade,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-indigo-600" />
          Horario y Cronograma de Clases
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Programación de sesiones presenciales, aulas asignadas y acceso directo a lista de clase.
        </p>
      </div>

      {/* Class Schedule Timeline Cards */}
      <div className="space-y-4">
        {classes.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
            <CalendarDays className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No hay sesiones de clase registradas</p>
            <p className="text-[11px] text-slate-500">
              Las sesiones programadas aparecerán aquí para control de asistencia y seguimiento pedagógico.
            </p>
          </div>
        ) : (
          classes.map((session) => (
            <div
              key={session.id}
              className={`p-5 rounded-2xl bg-white border shadow-xs transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                session.status === 'in_progress'
                  ? 'border-indigo-300 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center shrink-0 font-mono">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Horario
                  </span>
                  <span className="text-xs font-extrabold text-indigo-700">
                    {session.time}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900">
                      {session.subjectName}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                      {session.courseName}
                    </span>
                    {session.status === 'in_progress' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 animate-pulse">
                        En Desarrollo Ahora
                      </span>
                    )}
                    {session.status === 'completed' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Finalizada
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {session.room}
                    </span>
                    <span>•</span>
                    <span className="italic text-slate-600">
                      Tema: {session.topic || 'General'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto justify-end">
                <button
                  onClick={() => onOpenQuickAttendance(session)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Tomar Asistencia
                </button>
                <button
                  onClick={onOpenQuickGrade}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1"
                >
                  <span>Calificar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
