import React, { useEffect, useState } from 'react';
import { X, CheckSquare, Save, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import {
  AttendanceContext,
  AttendanceRecord,
  AttendanceStatus,
  Course,
  Enrollment,
  Student,
  Subject,
} from '../../types/teacher';
import { getLocalDateString } from '../../utils/date';

export interface QuickAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  courses: Course[];
  subjects: Subject[];
  enrollments: Enrollment[];
  attendanceHistory: AttendanceRecord[];
  context?: AttendanceContext | null;
  onSaveAttendance: (
    records: { studentId: string; status: AttendanceStatus; observation?: string }[],
    context: AttendanceContext
  ) => Promise<void>;
}

function getAttendanceStates(
  history: AttendanceRecord[],
  courseId: string,
  subjectId: string,
  date: string,
  sessionId?: string
) {
  return history
    .filter((record) =>
      record.studentId &&
      record.courseId === courseId &&
      record.subjectId === subjectId &&
      record.date === date &&
      (!sessionId || record.sessionId === sessionId)
    )
    .reduce<Record<string, { status: AttendanceStatus; obs: string }>>((states, record) => {
      states[record.studentId] = {
        status: record.status,
        obs: record.observation || '',
      };
      return states;
    }, {});
}

export const QuickAttendanceModal: React.FC<QuickAttendanceModalProps> = ({
  isOpen,
  onClose,
  students,
  courses,
  subjects,
  enrollments,
  attendanceHistory,
  context,
  onSaveAttendance,
}) => {
  const [selectedCourse, setSelectedCourse] = useState(context?.courseId || courses[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState(context?.subjectId || subjects[0]?.id || '');
  const [attendanceDate, setAttendanceDate] = useState(
    context?.date || getLocalDateString()
  );
  const [sessionId, setSessionId] = useState<string | undefined>(context?.sessionId);

  const [studentStates, setStudentStates] = useState<Record<string, { status: AttendanceStatus; obs: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const nextCourse = context?.courseId || selectedCourse || courses[0]?.id || '';
    const availableSubjects = subjects.filter((subject) => subject.courseId === nextCourse);
    const nextSubject = context?.subjectId || availableSubjects[0]?.id || '';
    const nextDate = context?.date || getLocalDateString();
    setSelectedCourse(nextCourse);
    setSelectedSubject(nextSubject);
    setAttendanceDate(nextDate);
    setSessionId(context?.sessionId);
    setStudentStates(getAttendanceStates(attendanceHistory, nextCourse, nextSubject, nextDate, context?.sessionId));
    setSaveError('');
  }, [isOpen, context, attendanceHistory, courses, subjects]);

  if (!isOpen) return null;

  const courseSubjects = subjects.filter((subject) => subject.courseId === selectedCourse);
  const courseStudents = enrollments
    .filter((enrollment) => enrollment.courseId === selectedCourse && enrollment.status === 'active')
    .map((enrollment) => students.find((student) => student.id === enrollment.studentId))
    .filter((student): student is Student => Boolean(student));

  const getStatus = (id: string): AttendanceStatus => {
    return studentStates[id]?.status || 'present';
  };

  const getObs = (id: string): string => {
    return studentStates[id]?.obs || '';
  };

  const handleSetStatus = (id: string, status: AttendanceStatus) => {
    setStudentStates((prev) => ({
      ...prev,
      [id]: { status, obs: prev[id]?.obs || '' },
    }));
  };

  const handleSetObs = (id: string, obs: string) => {
    setStudentStates((prev) => ({
      ...prev,
      [id]: { status: prev[id]?.status || 'present', obs },
    }));
  };

  const handleMarkAllPresent = () => {
    const next: Record<string, { status: AttendanceStatus; obs: string }> = {};
    courseStudents.forEach((s) => {
      next[s.id] = { status: 'present', obs: studentStates[s.id]?.obs || '' };
    });
    setStudentStates(next);
  };

  const refreshStates = (courseId: string, subjectId: string, date: string) => {
    setStudentStates(getAttendanceStates(attendanceHistory, courseId, subjectId, date));
    setSaveError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedCourse || !selectedSubject || courseStudents.length === 0) return;
    const records = courseStudents.map((s) => ({
      studentId: s.id,
      status: getStatus(s.id),
      observation: getObs(s.id),
    }));
    setIsSubmitting(true);
    setSaveError('');
    try {
      await onSaveAttendance(records, {
        courseId: selectedCourse,
        subjectId: selectedSubject,
        date: attendanceDate,
        sessionId,
      });
      onClose();
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo registrar la asistencia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="attendance-title" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 id="attendance-title" className="text-base font-bold text-slate-900">
                Toma Rápida de Asistencia
              </h2>
              <p className="text-xs text-slate-500">
                Seleccione el curso, materia y marque la asistencia del día.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar asistencia"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <label htmlFor="attendance-course" className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Curso
              </label>
              <select
                id="attendance-course"
                value={selectedCourse}
                disabled={Boolean(context)}
                onChange={(e) => {
                  const nextCourseId = e.target.value;
                  const nextSubject = subjects.find((subject) => subject.courseId === nextCourseId);
                  setSelectedCourse(nextCourseId);
                  setSelectedSubject(nextSubject?.id || '');
                  setSessionId(undefined);
                  refreshStates(nextCourseId, nextSubject?.id || '', attendanceDate);
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} - {course.level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="attendance-subject" className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Materia
              </label>
              <select
                id="attendance-subject"
                value={selectedSubject}
                disabled={Boolean(context)}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSessionId(undefined);
                  refreshStates(selectedCourse, e.target.value, attendanceDate);
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {courseSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="attendance-date" className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Fecha
              </label>
              <input
                id="attendance-date"
                type="date"
                value={attendanceDate}
                disabled={Boolean(context)}
                onChange={(e) => {
                  setAttendanceDate(e.target.value);
                  setSessionId(undefined);
                  refreshStates(selectedCourse, selectedSubject, e.target.value);
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Quick All Present Button */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Nómina ({courseStudents.length} estudiantes)
            </span>
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Todos Presentes
            </button>
          </div>

          {/* Student List Grid */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
            {courseStudents.map((std) => {
              const currentStatus = getStatus(std.id);
              return (
                <div key={std.id} className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                      {std.firstName[0]}
                      {std.lastName[0]}
                    </div>
                    <span className="font-bold text-slate-900">
                      {std.firstName} {std.lastName}
                    </span>
                  </div>

                  {/* Status Options */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        aria-pressed={currentStatus === 'present'}
                        onClick={() => handleSetStatus(std.id, 'present')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                          currentStatus === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Presente
                      </button>

                      <button
                        type="button"
                        aria-pressed={currentStatus === 'absent'}
                        onClick={() => handleSetStatus(std.id, 'absent')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <XCircle className="w-3 h-3" /> Falta
                      </button>

                      <button
                        type="button"
                        aria-pressed={currentStatus === 'late'}
                        onClick={() => handleSetStatus(std.id, 'late')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                          currentStatus === 'late'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" /> Atraso
                      </button>

                      <button
                        type="button"
                        aria-pressed={currentStatus === 'excused'}
                        onClick={() => handleSetStatus(std.id, 'excused')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                          currentStatus === 'excused'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <AlertCircle className="w-3 h-3" /> Justificado
                      </button>
                    </div>

                    {currentStatus !== 'present' && (
                      <input
                        type="text"
                        aria-label={`Observación de ${std.firstName} ${std.lastName}`}
                        placeholder="Observación..."
                        value={getObs(std.id)}
                        onChange={(e) => handleSetObs(std.id, e.target.value)}
                        className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 w-36"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Submit */}
          {saveError && <p role="alert" className="text-xs font-semibold text-rose-700">{saveError}</p>}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCourse || !selectedSubject || courseStudents.length === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Registro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
