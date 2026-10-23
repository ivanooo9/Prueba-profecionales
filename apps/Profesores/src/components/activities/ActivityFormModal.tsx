import React, { useEffect, useState } from 'react';
import { BookOpen, Save, X, Calendar, GraduationCap, Layers } from 'lucide-react';
import {
  Activity,
  Course,
  EvaluationType,
  Subject,
  AcademicPeriod,
  AcademicEvaluationCategory,
} from '../../types/teacher';
import { getLocalDateString } from '../../utils/date';

export interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  subjects: Subject[];
  periods?: AcademicPeriod[];
  categories?: AcademicEvaluationCategory[];
  initialCourseId?: string;
  initialSubjectId?: string;
  initialPeriodId?: string;
  initialCategoryId?: string;
  courseName?: string;
  subjectName?: string;
  periodName?: string;
  selectedPeriod?: AcademicPeriod | null;
  hasExamActivity?: boolean;
  onSave: (activity: Omit<Activity, 'id'>) => boolean | Promise<boolean>;
}

const baseActivityTypeOptions: { value: EvaluationType; label: string; description?: string }[] = [
  { value: 'activity', label: 'Actividad / Tarea' },
  { value: 'practice', label: 'Práctica' },
  { value: 'lesson', label: 'Lección' },
  { value: 'exam', label: 'Evaluación Parcial (30%)' },
];

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  courses,
  subjects,
  periods = [],
  categories = [],
  initialCourseId,
  initialSubjectId,
  initialPeriodId,
  initialCategoryId,
  courseName,
  subjectName,
  periodName,
  selectedPeriod,
  hasExamActivity = false,
  onSave,
}) => {
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<EvaluationType>('activity');
  const [date, setDate] = useState(getLocalDateString);
  const [maxScore, setMaxScore] = useState('10');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPeriod =
    selectedPeriod ||
    periods.find((p) => String(p.id) === String(periodId)) ||
    (periods[0] ? periods[0] : null);

  const periodStartStr = currentPeriod?.startDate
    ? new Date(currentPeriod.startDate).toISOString().split('T')[0]
    : '';
  const periodEndStr = currentPeriod?.endDate
    ? new Date(currentPeriod.endDate).toISOString().split('T')[0]
    : '';

  useEffect(() => {
    if (!isOpen) return;
    const selectedCourse = initialCourseId || courses[0]?.id || '';
    const selectedSubject =
      initialSubjectId ||
      subjects.find((subject) => subject.courseId === selectedCourse)?.id ||
      '';
    const selectedPeriodIdVal = initialPeriodId || (periods[0] ? String(periods[0].id) : '');
    const selectedCategory = initialCategoryId || (categories[0] ? String(categories[0].id) : '');

    setCourseId(selectedCourse);
    setSubjectId(selectedSubject);
    setPeriodId(selectedPeriodIdVal);
    setCategoryId(selectedCategory);
    setName('');
    setType('activity');

    const resolvedP =
      selectedPeriod ||
      periods.find((p) => String(p.id) === String(selectedPeriodIdVal));
    const pStart = resolvedP?.startDate
      ? new Date(resolvedP.startDate).toISOString().split('T')[0]
      : '';
    const pEnd = resolvedP?.endDate
      ? new Date(resolvedP.endDate).toISOString().split('T')[0]
      : '';

    const todayStr = getLocalDateString();
    let initialDate = todayStr;
    if (pStart && todayStr < pStart) {
      initialDate = pStart;
    } else if (pEnd && todayStr > pEnd) {
      initialDate = pEnd;
    }
    setDate(initialDate);

    setMaxScore('10');
    setError('');
    setIsSubmitting(false);
  }, [
    isOpen,
    courses,
    subjects,
    periods,
    categories,
    initialCourseId,
    initialSubjectId,
    initialPeriodId,
    initialCategoryId,
    selectedPeriod,
  ]);

  if (!isOpen) return null;

  const displayCourseName =
    courseName || courses.find((c) => c.id === courseId)?.name || courseId || 'Curso no seleccionado';
  const displaySubjectName =
    subjectName || subjects.find((s) => s.id === subjectId)?.name || subjectId || 'Materia no seleccionada';
  const displayPeriodName =
    periodName ||
    (periodId
      ? periods.find((p) => String(p.id) === String(periodId))?.name.replace(/\s*\([^)]*\)$/, '') || periodId
      : 'Periodo activo');

  const isDuplicateExam = type === 'exam' && hasExamActivity;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !courseId || !subjectId || !name.trim()) return;

    if (!categoryId) {
      setError('CATEGORY_REQUIRED: Debe seleccionar la categoría de evaluación (ponderación) a la que pertenece la actividad.');
      return;
    }

    if (periodStartStr && date < periodStartStr) {
      setError(`La fecha de la actividad no puede ser anterior al inicio del periodo (${periodStartStr}).`);
      return;
    }
    if (periodEndStr && date > periodEndStr) {
      setError(`La fecha de la actividad no puede ser posterior al fin del periodo (${periodEndStr}).`);
      return;
    }
    if (currentPeriod?.status === 'CLOSED' || currentPeriod?.status === 'ARCHIVED') {
      setError('ACADEMIC_PERIOD_IMMUTABLE: No se pueden crear actividades en un periodo cerrado o archivado.');
      return;
    }
    if (currentPeriod?.status === 'LOCKED') {
      setError('ACADEMIC_PERIOD_LOCKED: No se pueden crear actividades en un periodo con estructura bloqueada (LOCKED).');
      return;
    }

    const parsedMaxScore = Number(maxScore);
    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0) {
      setError('El puntaje máximo debe ser mayor que cero.');
      return;
    }

    const trimmedName = name.trim();

    if (type === 'exam' && hasExamActivity) {
      setError('Ya existe una Evaluación Parcial registrada para este periodo. Solo se permite 1 por parcial.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const saved = await onSave({
        courseId,
        subjectId,
        name: trimmedName,
        type,
        date,
        maxScore: parsedMaxScore,
        academicPeriodId: periodId || undefined,
        categoryId: categoryId,
      });
      if (!saved) {
        setError('No se pudo guardar la actividad. Verifica los datos e inténtalo nuevamente.');
        return;
      }
      onClose();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la actividad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-title"
        className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden"
      >
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="activity-title" className="text-base font-bold text-slate-900">
                Crear actividad
              </h2>
              <p className="text-xs text-slate-500">
                Defina la actividad y asígnela a un componente ponderado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar formulario"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 disabled:opacity-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de Contexto de Sólo Lectura (Heredado de la vista principal) */}
        <div className="px-6 pt-4 pb-1">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-slate-400 font-medium">Curso:</span>
              <span className="text-slate-900 font-bold">{displayCourseName}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-slate-400 font-medium">Materia:</span>
              <span className="text-slate-900 font-bold">{displaySubjectName}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-slate-400 font-medium">Periodo:</span>
              <span className="text-slate-900 font-bold">{displayPeriodName}</span>
            </div>
          </div>
        </div>

        {/* Formulario con Campos Editables Exclusivos */}
        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4 text-xs">
          <label className="block font-bold text-slate-700">
            Nombre de la actividad *
            <input
              required
              autoFocus
              value={name}
              onChange={(event) => {
                setError('');
                setName(event.target.value);
              }}
              placeholder="Ej. Taller grupal, Lección escrita, Trabajo de investigación"
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="font-bold text-slate-700">
              Categoría de evaluación (Ponderación) *
              <select
                required
                value={categoryId}
                onChange={(event) => {
                  setError('');
                  setCategoryId(event.target.value);
                }}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="" disabled>Seleccione categoría ponderada ▼</option>
                {categories.map((opt) => (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.name} ({opt.weightPercentage}%)
                  </option>
                ))}
              </select>
            </label>

            <label className="font-bold text-slate-700">
              Tipo de actividad *
              <select
                value={type}
                onChange={(event) => {
                  setError('');
                  const newType = event.target.value as EvaluationType;
                  setType(newType);
                }}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
              >
                {baseActivityTypeOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.value === 'exam' && hasExamActivity}
                  >
                    {opt.value === 'exam' && hasExamActivity
                      ? `${opt.label} — (Ya registrada)`
                      : opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="font-bold text-slate-700">
              Fecha *
              <input
                required
                type="date"
                min={periodStartStr || undefined}
                max={periodEndStr || undefined}
                value={date}
                onChange={(event) => {
                  setError('');
                  setDate(event.target.value);
                }}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </label>

            <label className="font-bold text-slate-700">
              Puntaje máximo *
              <input
                required
                type="number"
                min="0.1"
                step="0.1"
                value={maxScore}
                onChange={(event) => {
                  setError('');
                  setMaxScore(event.target.value);
                }}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </label>
          </div>

          {categories.length === 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] leading-relaxed">
              <span className="font-bold block mb-0.5">⚠️ Materia sin ponderaciones configuradas</span>
              Esta materia no tiene un esquema de evaluación válido para este periodo. Debe configurar las ponderaciones antes de crear actividades.
            </div>
          )}

          {isDuplicateExam && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
              <span className="font-bold block mb-0.5">⚠️ Evaluación Parcial ya registrada</span>
              Este periodo ya cuenta con una Evaluación Parcial. El modelo de calificación permite un máximo de 1 evaluación única por parcial (30%).
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
              {error}
            </p>
          )}

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold disabled:opacity-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !courseId || !subjectId || !name.trim() || isDuplicateExam || categories.length === 0 || !categoryId}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


