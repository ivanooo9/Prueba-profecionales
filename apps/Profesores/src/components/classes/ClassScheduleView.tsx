import React, { useState } from 'react';
import { CalendarDays, MapPin, CheckCircle2, ArrowRight, Grid, ListFilter, Clock } from 'lucide-react';
import { ClassSession, Course, Subject, ScheduleSlot } from '../../types/teacher';

export interface ClassScheduleViewProps {
  classes: ClassSession[];
  courses?: Course[];
  subjects?: Subject[];
  onOpenQuickAttendance: (session: ClassSession) => void;
  onOpenQuickGrade: () => void;
}

const DAYS_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const ClassScheduleView: React.FC<ClassScheduleViewProps> = ({
  classes,
  courses = [],
  subjects = [],
  onOpenQuickAttendance,
  onOpenQuickGrade,
}) => {
  const [viewMode, setViewMode] = useState<'sessions' | 'weekly'>('weekly');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  const currentDayOfWeek = (() => {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
  })();

  const filteredSubjects = subjects.filter((s) =>
    selectedCourseFilter === 'all' ? true : String(s.courseId) === String(selectedCourseFilter)
  );

  return (
    <div className="space-y-6">
      {/* Header with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600" />
            Horario y Cronograma de Clases
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Programación de sesiones presenciales, aulas asignadas y matriz de horarios recurrentes por materia.
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'weekly'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Malla Semanal Recurrente</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('sessions')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'sessions'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Sesiones del Día ({classes.length})</span>
          </button>
        </div>
      </div>

      {viewMode === 'weekly' ? (
        <div className="space-y-5">
          {/* Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <ListFilter className="w-4 h-4 text-slate-400" />
              <span>Filtrar por Curso:</span>
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">Todos los cursos ({courses.length})</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-slate-500 text-[11px]">
              Mostrando materias con horarios activos versionados (Lunes a Domingo)
            </div>
          </div>

          {/* Weekly Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
              const dayName = DAYS_NAMES[dayNum - 1];

              // Encontrar todos los slots de materias correspondientes a este día
              const daySlots: Array<{
                subject: Subject;
                slot: ScheduleSlot;
              }> = [];

              filteredSubjects.forEach((sub) => {
                if (sub.activeSlots) {
                  sub.activeSlots
                    .filter((sl) => {
                      const normalizedDay = Number(sl.dayOfWeek) === 0 ? 7 : Number(sl.dayOfWeek);
                      return normalizedDay === dayNum;
                    })
                    .forEach((sl) => {
                      daySlots.push({ subject: sub, slot: sl });
                    });
                }
              });

              daySlots.sort((a, b) => (a.slot.startTime || '').localeCompare(b.slot.startTime || ''));

              const isToday = dayNum === currentDayOfWeek;

              return (
                <div
                  key={dayNum}
                  className={`border rounded-2xl p-3.5 flex flex-col space-y-3 min-h-64 transition ${
                    isToday
                      ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="font-extrabold text-xs text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{dayName}</span>
                      {isToday && (
                        <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded-md lowercase tracking-normal">
                          hoy
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {daySlots.length}
                    </span>
                  </div>

                  {daySlots.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-center text-[11px] text-slate-400 py-6">
                      Sin clases
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1">
                      {daySlots.map(({ subject, slot }, idx) => {
                        const resolvedCourseName =
                          subject.courseName ||
                          courses.find((c) => String(c.id) === String(subject.courseId))?.name ||
                          'Curso';

                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs space-y-1 hover:border-indigo-300 transition"
                          >
                            <div className="font-mono text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded inline-block">
                              {slot.startTime} – {slot.endTime}
                            </div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {subject.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {resolvedCourseName} · {slot.room || 'Aula general'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
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
      )}
    </div>
  );
};
