import React, { useState } from 'react';
import { X, GraduationCap, Save } from 'lucide-react';
import { Course, EvaluationType, GradeItem, Student, Subject } from '../../types/teacher';
import { getLocalDateString } from '../../utils/date';

export interface GradeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  courses: Course[];
  subjects: Subject[];
  onAddGrade: (grade: Omit<GradeItem, 'id'>) => Promise<void>;
}

export const GradeFormModal: React.FC<GradeFormModalProps> = ({
  isOpen,
  onClose,
  students,
  subjects,
  onAddGrade,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [evaluationName, setEvaluationName] = useState('');
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('homework');
  const [score, setScore] = useState('10.0');
  const [maxScore] = useState(10);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const availableSubjects = subjects.filter((subject) => subject.courseId === selectedStudent?.courseId);

  React.useEffect(() => {
    if (!students.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(students[0]?.id || '');
    }
    if (!availableSubjects.some((subject) => subject.id === selectedSubject)) {
      setSelectedSubject(availableSubjects[0]?.id || '');
    }
  }, [selectedStudentId, selectedSubject, availableSubjects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student || !selectedSubject) {
      setError('Selecciona un estudiante y una materia antes de guardar.');
      return;
    }
    const parsedScore = Number(score);
    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > maxScore) {
      setError(`La nota debe estar entre 0 y ${maxScore}.`);
      return;
    }

    const subject = availableSubjects.find((item) => item.id === selectedSubject);

    setError('');
    setIsSubmitting(true);
    try {
      await onAddGrade({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        courseId: student.courseId,
        subjectId: selectedSubject,
        subjectName: subject?.name || 'Materia',
        evaluationName: evaluationName.trim() || 'Evaluación Continua',
        evaluationType,
        score: parsedScore,
        maxScore,
        date: getLocalDateString(),
        comments: comments.trim(),
      });
      onClose();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la calificación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="grade-form-title" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 id="grade-form-title" className="text-base font-bold text-slate-900">
                Registrar Nueva Calificación
              </h2>
              <p className="text-xs text-slate-500">
                Ingrese el puntaje de la evaluación realizada por el alumno.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar formulario"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs" aria-busy={isSubmitting}>
          {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Estudiante *</label>
            <select
              required
              disabled={isSubmitting || students.length === 0}
              value={selectedStudentId}
              onChange={(e) => {
                const nextStudentId = e.target.value;
                const nextStudent = students.find((student) => student.id === nextStudentId);
                setSelectedStudentId(nextStudentId);
                setSelectedSubject(subjects.find((subject) => subject.courseId === nextStudent?.courseId)?.id || '');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
            >
              {students.map((std) => (
                <option key={std.id} value={std.id}>
                  {std.firstName} {std.lastName} ({std.courseName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Materia *</label>
              <select
                required
                disabled={isSubmitting || availableSubjects.length === 0}
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              >
                {availableSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo de Evaluación *</label>
              <select
                value={evaluationType}
                onChange={(e) => setEvaluationType(e.target.value as EvaluationType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              >
                <option value="homework">Tarea</option>
                <option value="exam">Examen / Prueba</option>
                <option value="project">Proyecto</option>
                <option value="practice">Práctica / Lab</option>
                <option value="participation">Participación</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nombre de la Evaluación *</label>
              <input
                type="text"
                required
                maxLength={120}
                disabled={isSubmitting}
                value={evaluationName}
                onChange={(e) => setEvaluationName(e.target.value)}
                placeholder="Ej. Tarea 2: Ecuaciones"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nota (0 a 10) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                required
                disabled={isSubmitting}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Observaciones / Feedback</label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Opcional: comentarios pedagógicos sobre el desempeño del alumno."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            />
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || students.length === 0 || availableSubjects.length === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Calificación'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
