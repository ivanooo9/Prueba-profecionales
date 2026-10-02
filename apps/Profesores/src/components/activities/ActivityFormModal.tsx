import React, { useEffect, useState } from 'react';
import { BookOpen, Save, X } from 'lucide-react';
import { Activity, Course, EvaluationType, Subject } from '../../types/teacher';
import { getLocalDateString } from '../../utils/date';

export interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  subjects: Subject[];
  onSave: (activity: Omit<Activity, 'id'>) => boolean | Promise<boolean>;
}

const evaluationLabels: Record<EvaluationType, string> = {
  homework: 'Tarea',
  exam: 'Examen',
  project: 'Proyecto',
  practice: 'Práctica',
  participation: 'Participación',
};

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  courses,
  subjects,
  onSave,
}) => {
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [subjectId, setSubjectId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<EvaluationType>('homework');
  const [date, setDate] = useState(getLocalDateString);
  const [maxScore, setMaxScore] = useState('10');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSubjects = subjects.filter((subject) => subject.courseId === courseId);

  useEffect(() => {
    if (!isOpen) return;
    const firstCourse = courses[0]?.id || '';
    const firstSubject = subjects.find((subject) => subject.courseId === firstCourse)?.id || '';
    setCourseId(firstCourse);
    setSubjectId(firstSubject);
    setName('');
    setType('homework');
    setDate(getLocalDateString());
    setMaxScore('10');
    setError('');
    setIsSubmitting(false);
  }, [isOpen, courses, subjects]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !courseId || !subjectId || !name.trim()) return;
    const parsedMaxScore = Number(maxScore);
    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0) {
      setError('El puntaje máximo debe ser mayor que cero.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const saved = await onSave({
        courseId,
        subjectId,
        name: name.trim(),
        type,
        date,
        maxScore: parsedMaxScore,
      });
      if (!saved) {
        setError('No se pudo guardar la evaluación. Verifica los datos e inténtalo nuevamente.');
        return;
      }
      onClose();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la evaluación.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="activity-title" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="activity-title" className="text-base font-bold text-slate-900">Crear evaluación</h2>
              <p className="text-xs text-slate-500">Defina la actividad antes de registrar calificaciones.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar formulario" className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="font-bold text-slate-700">
              Curso *
              <select required disabled={isSubmitting} value={courseId} onChange={(event) => {
                const nextCourseId = event.target.value;
                setCourseId(nextCourseId);
                setSubjectId(subjects.find((subject) => subject.courseId === nextCourseId)?.id || '');
              }} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900">
                {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </label>
            <label className="font-bold text-slate-700">
              Materia *
              <select required disabled={isSubmitting || availableSubjects.length === 0} value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900">
                {availableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
          </div>

          <label className="block font-bold text-slate-700">
            Nombre de la evaluación *
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Examen Unidad 1" className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900" />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="font-bold text-slate-700">
              Tipo *
              <select value={type} onChange={(event) => setType(event.target.value as EvaluationType)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                {Object.entries(evaluationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="font-bold text-slate-700">
              Fecha *
              <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900" />
            </label>
            <label className="font-bold text-slate-700">
              Puntaje máximo *
              <input required type="number" min="0.1" step="0.1" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900" />
            </label>
          </div>

          {availableSubjects.length === 0 && <p className="text-xs text-amber-700">Registra una materia en el curso seleccionado antes de crear una evaluación.</p>}
          {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={isSubmitting || !courseId || !subjectId || !name.trim()} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar evaluación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
