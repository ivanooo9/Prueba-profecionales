import React, { useEffect, useState } from 'react';
import { Save, UserRoundPlus, X } from 'lucide-react';
import { Course, Enrollment, Student } from '../../types/teacher';

export interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  onSave: (studentId: string, courseId: string) => Promise<void>;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  isOpen,
  onClose,
  students,
  courses,
  enrollments,
  onSave,
}) => {
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStudentId(students[0]?.id || '');
      setCourseId(courses[0]?.id || '');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, students, courses]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !studentId || !courseId) return;
    const alreadyEnrolled = enrollments.some(
      (enrollment) =>
        enrollment.studentId === studentId &&
        enrollment.courseId === courseId &&
        enrollment.status === 'active'
    );

    if (alreadyEnrolled) {
      setError('El estudiante ya está matriculado en este curso.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSave(studentId, courseId);
      onClose();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo procesar la matrícula.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="enrollment-title" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <UserRoundPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="enrollment-title" className="text-base font-bold text-slate-900">Matricular estudiante</h2>
              <p className="text-xs text-slate-500">Asigne un estudiante existente a un curso.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar formulario" className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs" aria-busy={isSubmitting}>
          {(students.length === 0 || courses.length === 0) && (
            <p role="alert" className="text-xs font-semibold text-rose-700">
              Registra al menos un estudiante y un curso antes de matricular.
            </p>
          )}
          <div>
            <label htmlFor="enrollment-student" className="block font-bold text-slate-700 mb-1">Estudiante *</label>
            <select
              id="enrollment-student"
              required
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="enrollment-course" className="block font-bold text-slate-700 mb-1">Curso *</label>
            <select
              id="enrollment-course"
              required
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} - {course.level}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || !studentId || !courseId} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Matricular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
