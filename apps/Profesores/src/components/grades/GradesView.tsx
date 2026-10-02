import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Plus,
  Filter,
  FileSpreadsheet,
  Award,
  BookOpen,
} from 'lucide-react';
import { DataTable, Column } from '../ui/DataTable';
import { Activity, Course, Enrollment, GradeDraft, GradeItem, Student, Subject } from '../../types/teacher';
import { GradeFormModal } from '../modals/GradeFormModal';
import { ActivityFormModal } from '../activities/ActivityFormModal';

export interface GradesViewProps {
  students: Student[];
  grades: GradeItem[];
  onAddGrade: (grade: Omit<GradeItem, 'id'>) => Promise<void>;
  activities: Activity[];
  courses: Course[];
  subjects: Subject[];
  onAddActivity: (activity: Omit<Activity, 'id'>) => boolean | Promise<boolean>;
  enrollments: Enrollment[];
  onSaveGrades: (drafts: GradeDraft[]) => Promise<void>;
}

export const GradesView: React.FC<GradesViewProps> = ({
  students,
  grades,
  onAddGrade,
  activities,
  courses,
  subjects,
  onAddActivity,
  enrollments,
  onSaveGrades,
}) => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(activities[0]?.id || '');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [gradeSaveError, setGradeSaveError] = useState('');

  const filteredGrades = grades.filter((g) => {
    return selectedCourseFilter === 'all' || g.courseId === selectedCourseFilter;
  });

  const averageGrade = filteredGrades.length > 0
    ? filteredGrades.reduce((sum, grade) => sum + grade.score, 0) / filteredGrades.length
    : null;
  const passingRate = filteredGrades.length > 0
    ? (filteredGrades.filter((grade) => grade.score >= 7).length / filteredGrades.length) * 100
    : null;

  const filteredActivities = activities.filter(
    (activity) => selectedCourseFilter === 'all' || activity.courseId === selectedCourseFilter
  );
  const selectedActivity = filteredActivities.find((activity) => activity.id === selectedActivityId) || filteredActivities[0];
  const activityStudents = selectedActivity
    ? enrollments
        .filter((enrollment) => enrollment.courseId === selectedActivity.courseId && enrollment.status === 'active')
        .map((enrollment) => students.find((student) => student.id === enrollment.studentId))
        .filter((student): student is Student => Boolean(student))
    : [];

  useEffect(() => {
    if (!selectedActivity) {
      setSelectedActivityId(filteredActivities[0]?.id || '');
      setScores({});
      return;
    }

    setSelectedActivityId(selectedActivity.id);
    setScores(
      activityStudents.reduce<Record<string, string>>((result, student) => {
        const existingGrade = grades.find(
          (grade) => grade.evaluationId === selectedActivity.id && grade.studentId === student.id
        );
        result[student.id] = existingGrade ? String(existingGrade.score) : '';
        return result;
      }, {})
    );
  }, [selectedActivityId, selectedActivity, grades, students, enrollments]);

  const evaluationTypeLabels = {
    homework: 'Tarea',
    exam: 'Examen',
    project: 'Proyecto',
    practice: 'Práctica',
    participation: 'Participación',
  };

  const evaluationTypeBadgeStyles = {
    homework: 'bg-blue-50 text-blue-700 border-blue-200',
    exam: 'bg-rose-50 text-rose-700 border-rose-200',
    project: 'bg-purple-50 text-purple-700 border-purple-200',
    practice: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    participation: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const columns: Column<GradeItem>[] = [
    {
      header: 'Estudiante',
      cell: (item) => (
        <span className="font-bold text-slate-900">{item.studentName}</span>
      ),
    },
    {
      header: 'Materia',
      cell: (item) => (
        <span className="font-semibold text-slate-700">{item.subjectName}</span>
      ),
    },
    {
      header: 'Evaluación',
      cell: (item) => (
        <div>
          <div className="font-bold text-slate-800">{item.evaluationName}</div>
          <div className="text-[11px] text-slate-400 font-mono">{item.date}</div>
        </div>
      ),
    },
    {
      header: 'Tipo',
      cell: (item) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            evaluationTypeBadgeStyles[item.evaluationType]
          }`}
        >
          {evaluationTypeLabels[item.evaluationType]}
        </span>
      ),
    },
    {
      header: 'Nota Ponderada',
      cell: (item) => (
        <span
          className={`font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-lg border ${
            item.score >= 8
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : item.score >= 7
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {item.score.toFixed(1)} / {item.maxScore}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
            Libro de Calificaciones y Evaluaciones
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de notas por parciales, ponderación automática y cuadro de honor estudiantil.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-xs flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Imprimir Libreta</span>
          </button>
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-xs flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Nueva Evaluación</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Calificación</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Evaluaciones disponibles</h2>
            <p className="text-[11px] text-slate-500">Actividades definidas por curso y materia.</p>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-500">{activities.length} actividades</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredActivities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => setSelectedActivityId(activity.id)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${selectedActivity?.id === activity.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              >
                {activity.name} · {activity.date}
              </button>
            ))}
        </div>
      </div>

      {selectedActivity && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (isSavingGrades) return;
            const enteredStudents = activityStudents.filter((student) => scores[student.id] !== '');
            if (enteredStudents.length === 0) {
              setGradeSaveError('Ingresa al menos una nota antes de guardar.');
              return;
            }
            const invalidScore = enteredStudents.some((student) => {
              const score = Number(scores[student.id]);
              return !Number.isFinite(score) || score < 0 || score > selectedActivity.maxScore;
            });
            if (invalidScore) {
              setGradeSaveError(`Cada nota debe estar entre 0 y ${selectedActivity.maxScore}.`);
              return;
            }
            const drafts = enteredStudents.map((student) => ({
              evaluationId: selectedActivity.id,
              studentId: student.id,
              score: Number(scores[student.id]),
            }));
            setIsSavingGrades(true);
            setGradeSaveError('');
            try {
              await onSaveGrades(drafts);
            } catch (error: unknown) {
              setGradeSaveError(error instanceof Error ? error.message : 'No se pudieron guardar las calificaciones.');
            } finally {
              setIsSavingGrades(false);
            }
          }}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Calificar grupo: {selectedActivity.name}</h2>
              <p className="text-[11px] text-slate-500">Puntaje máximo: {selectedActivity.maxScore}</p>
            </div>
            <button type="submit" disabled={isSavingGrades || activityStudents.length === 0} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50">{isSavingGrades ? 'Guardando...' : 'Guardar calificaciones'}</button>
          </div>
          {gradeSaveError && <p role="alert" className="mb-3 text-xs font-semibold text-rose-700">{gradeSaveError}</p>}
          {activityStudents.length === 0 ? (
            <p className="text-xs text-slate-500">No hay estudiantes matriculados en el curso de esta evaluación.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {activityStudents.map((student) => (
                <label key={student.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <span className="font-bold text-slate-900">{student.firstName} {student.lastName}</span>
                  <input
                    type="number"
                    min="0"
                    max={selectedActivity.maxScore}
                    step="0.1"
                    value={scores[student.id] || ''}
                    onChange={(event) => setScores((previous) => ({ ...previous, [student.id]: event.target.value }))}
                    className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right font-mono font-bold text-slate-900"
                  />
                </label>
              ))}
            </div>
          )}
        </form>
      )}

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Promedio simple de notas registradas
            </span>
            <div className="text-2xl font-extrabold font-mono text-indigo-600 mt-1">
              {averageGrade === null ? 'Sin datos' : `${averageGrade.toFixed(1)} / 10`}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Evaluaciones Registradas
            </span>
            <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
              {grades.length} actividades
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tasa de Aprobación
            </span>
            <div className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">
              {passingRate === null ? 'Sin datos' : `${passingRate.toFixed(1)}%`}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-extrabold text-xs">
            Aprobados
          </div>
        </div>
      </div>

      {/* Toolbar Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filtrar por Curso:</span>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Todos los Cursos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredGrades}
        emptyText="No hay calificaciones registradas para el filtro seleccionado."
      />

      {/* Modal */}
      <GradeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        students={students}
        courses={courses}
        subjects={subjects}
        onAddGrade={onAddGrade}
      />

      <ActivityFormModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        courses={courses}
        subjects={subjects}
        onSave={onAddActivity}
      />
    </div>
  );
};
