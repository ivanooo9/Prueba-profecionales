import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  MapPin,
  Plus,
  Users,
  MoreVertical,
  Edit2,
  Archive,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { AttendanceRecord, Course, Enrollment, GradeItem, Student, Subject, AcademicYear } from '../../types/teacher';
import { CourseFormData, CourseFormModal } from './CourseFormModal';
import { SubjectFormModal } from './SubjectFormModal';
import type { SubjectFormData } from './SubjectFormModal';
import { SubjectScheduleModal } from './SubjectScheduleModal';
import { StudentSearchInput } from '../ui/StudentSearchInput';
import { matchesStudentQuery } from '../../utils/studentFilter';
import {
  ArchiveCourseModal,
  DeleteCourseModal,
  ReactivateCourseModal,
} from './CourseActionModals';
import { CalendarDays, AlertTriangle, AlertCircle } from 'lucide-react';

export interface CoursesViewProps {
  courses: Course[];
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  attendanceHistory: AttendanceRecord[];
  grades: GradeItem[];
  academicYears?: AcademicYear[];
  orgId?: number;
  onAddCourse: (course: CourseFormData) => Promise<void>;
  onUpdateCourse?: (courseId: string, course: CourseFormData) => Promise<void>;
  onArchiveCourse?: (courseId: string) => Promise<void>;
  onReactivateCourse?: (courseId: string) => Promise<void>;
  onDeleteCourse?: (courseId: string) => Promise<void>;
  onAddSubject: (courseId: string, subject: SubjectFormData) => Promise<void>;
  onScheduleUpdated?: () => void;
}

type CourseDetailTab = 'summary' | 'students' | 'subjects' | 'attendance' | 'grades';
type CourseStatusFilter = 'all' | 'active' | 'archived';

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  subjects,
  students,
  enrollments,
  attendanceHistory = [],
  grades = [],
  academicYears = [],
  orgId = 11,
  onAddCourse,
  onUpdateCourse,
  onArchiveCourse,
  onReactivateCourse,
  onDeleteCourse,
  onAddSubject,
  onScheduleUpdated,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<CourseDetailTab>('summary');
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>('active');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [archivingCourse, setArchivingCourse] = useState<Course | null>(null);
  const [reactivatingCourse, setReactivatingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [isCreateSubjectModalOpen, setIsCreateSubjectModalOpen] = useState(false);
  const [schedulingSubject, setSchedulingSubject] = useState<Subject | null>(null);

  // Active open menu dropdown
  const [openMenuCourseId, setOpenMenuCourseId] = useState<string | null>(null);

  // Search in detail tabs
  const [courseStudentSearchQuery, setCourseStudentSearchQuery] = useState('');
  const [courseGradeSearchQuery, setCourseGradeSearchQuery] = useState('');

  useEffect(() => {
    setCourseStudentSearchQuery('');
    setCourseGradeSearchQuery('');
  }, [selectedCourseId]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuCourseId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || null;

  // Filtered courses
  const filteredCourses = courses.filter((course) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return course.status === 'active';
    if (statusFilter === 'archived') return course.status === 'archived';
    return true;
  });

  const activeCount = courses.filter((c) => c.status === 'active').length;
  const archivedCount = courses.filter((c) => c.status === 'archived').length;

  if (selectedCourse) {
    const courseSubjects = subjects.filter((subject) => subject.courseId === selectedCourse.id);
    const courseEnrollments = enrollments.filter(
      (enrollment) => enrollment.courseId === selectedCourse.id && enrollment.status === 'active'
    );
    const courseStudents = courseEnrollments
      .map((enrollment) => students.find((student) => student.id === enrollment.studentId))
      .filter((student): student is Student => Boolean(student));
    const visibleCourseStudents = courseStudents.filter((student) =>
      matchesStudentQuery(student, courseStudentSearchQuery)
    );
    const courseAttendance = attendanceHistory.filter(
      (item) => item.courseId === selectedCourse.id
    );
    const courseGrades = grades.filter(
      (item) => item.courseId === selectedCourse.id
    );
    const visibleCourseGrades = courseGrades.filter((grade) => {
      const studentObj = students.find((s) => s.id === grade.studentId);
      return (
        matchesStudentQuery({ studentName: grade.studentName }, courseGradeSearchQuery) ||
        (studentObj ? matchesStudentQuery(studentObj, courseGradeSearchQuery) : false)
      );
    });
    const detailTabs: { id: CourseDetailTab; label: string }[] = [
      { id: 'summary', label: 'Resumen' },
      { id: 'students', label: 'Estudiantes' },
      { id: 'subjects', label: 'Materias' },
      { id: 'attendance', label: 'Asistencia' },
      { id: 'grades', label: 'Calificaciones' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => setSelectedCourseId(null)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-3 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a cursos
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                {selectedCourse.name}
              </h1>
              {selectedCourse.status === 'archived' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1">
                  <Archive className="w-3 h-3" /> Archivado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedCourse.level} · {selectedCourse.classroom || 'Sin aula'} · Tutor: {selectedCourse.tutorName}
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
          {detailTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDetailTab(tab.id)}
              className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition cursor-pointer ${
                activeDetailTab === tab.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeDetailTab === 'summary' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estudiantes matriculados</span>
              <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">{courseStudents.length}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Materias</span>
              <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">{courseSubjects.length}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aula / Espacio</span>
              <div className="text-lg font-extrabold text-slate-900 mt-1">{selectedCourse.classroom || 'Sin asignar'}</div>
            </div>
          </div>
        )}

        {activeDetailTab === 'students' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Nómina del Curso ({courseStudents.length} {courseStudents.length === 1 ? 'estudiante' : 'estudiantes'})
                </h2>
                <p className="text-[11px] text-slate-500">Alumnos con matrícula activa en este curso.</p>
              </div>
              {courseStudents.length > 0 && (
                <StudentSearchInput
                  value={courseStudentSearchQuery}
                  onChange={setCourseStudentSearchQuery}
                  placeholder="Buscar estudiante..."
                  className="w-full sm:w-60"
                />
              )}
            </div>
            {courseStudents.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">Este curso no tiene estudiantes matriculados.</p>
            ) : visibleCourseStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50">
                No se encontraron estudiantes para "{courseStudentSearchQuery}".
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleCourseStudents.map((student) => (
                  <div key={student.id} className="px-5 py-3 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{student.firstName} {student.lastName}</span>
                    <span className="font-mono text-slate-500">{student.identification || 'Sin identificación'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeDetailTab === 'subjects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-800">Materias del curso ({courseSubjects.length})</h2>
              {selectedCourse.status === 'active' && (
                <button
                  type="button"
                  onClick={() => setIsCreateSubjectModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Nueva materia
                </button>
              )}
            </div>

            {courseSubjects.length === 0 ? (
              <div className="min-h-40 flex flex-col items-center justify-center text-center border-t border-slate-200 px-4 py-8">
                <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Este curso aún no tiene materias</p>
                <p className="text-xs text-slate-500 mt-1">Usa “Nueva materia” para registrar la primera asignatura.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {courseSubjects.map((subject) => {
                  const reqHours = subject.hoursPerWeek || 0;
                  const totalConfigured = subject.totalPedagogicalHours || 0;
                  const status = subject.scheduleStatus || (totalConfigured === 0 ? 'no_schedule' : totalConfigured === reqHours ? 'complete' : totalConfigured < reqHours ? 'incomplete' : 'excess');

                  return (
                    <div key={subject.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900">{subject.name}</div>
                          <div className="text-[11px] text-slate-500">{subject.code ? `${subject.code} · ` : ''}{subject.teacherName}</div>
                        </div>
                        {subject.hoursPerWeek ? (
                          <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">{subject.hoursPerWeek} hrs/sem</span>
                        ) : null}
                      </div>

                      {/* Schedule status and action */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          {status === 'no_schedule' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Sin horario
                            </span>
                          )}
                          {status === 'incomplete' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Incompleto ({totalConfigured}/{reqHours} hrs)
                            </span>
                          )}
                          {status === 'complete' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Completo ({totalConfigured} hrs)
                            </span>
                          )}
                          {status === 'excess' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Exceso ({totalConfigured}/{reqHours} hrs)
                            </span>
                          )}
                        </div>

                        {selectedCourse.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => setSchedulingSubject(subject)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>Configurar horario</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <SubjectFormModal
              isOpen={isCreateSubjectModalOpen}
              onClose={() => setIsCreateSubjectModalOpen(false)}
              onSave={(subject) => onAddSubject(selectedCourse.id, subject)}
              academicYears={academicYears || []}
              courseName={selectedCourse.name}
            />

            <SubjectScheduleModal
              isOpen={Boolean(schedulingSubject)}
              onClose={() => setSchedulingSubject(null)}
              orgId={orgId}
              subject={schedulingSubject}
              academicYears={academicYears || []}
              onSaved={() => onScheduleUpdated?.()}
            />
          </div>
        )}

        {activeDetailTab === 'attendance' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="text-sm font-bold text-slate-900 mb-3">Asistencia del curso ({courseAttendance.length} registros)</div>
            {courseAttendance.length === 0 ? (
              <p className="text-xs text-slate-500">Sin datos registrados.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {courseAttendance.slice(0, 30).map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <span className="text-slate-700 font-mono">{item.date || 'Fecha'}</span>
                    <span className="capitalize px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">{item.status || 'Registrado'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeDetailTab === 'grades' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Calificaciones del curso ({courseGrades.length} {courseGrades.length === 1 ? 'registro' : 'registros'})
                </h2>
                <p className="text-[11px] text-slate-500">Historial de notas de evaluaciones para este grupo.</p>
              </div>
              {courseGrades.length > 0 && (
                <StudentSearchInput
                  value={courseGradeSearchQuery}
                  onChange={setCourseGradeSearchQuery}
                  placeholder="Buscar estudiante..."
                  className="w-full sm:w-60"
                />
              )}
            </div>
            {courseGrades.length === 0 ? (
              <p className="text-xs text-slate-500">Sin datos registrados.</p>
            ) : visibleCourseGrades.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No se encontraron calificaciones para "{courseGradeSearchQuery}".
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {visibleCourseGrades.map((grade) => (
                  <div key={grade.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{grade.studentName} — {grade.evaluationName}</div>
                      <div className="text-[10px] text-slate-400">{grade.subjectName} · {grade.date}</div>
                    </div>
                    <span className="font-mono font-extrabold px-2.5 py-0.5 rounded bg-slate-100 text-slate-900">
                      {grade.score} / {grade.maxScore}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Cursos y Materias Asignadas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Vista general de los grupos escolares y asignaturas bajo la dirección del docente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activos ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'archived'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Archivados ({archivedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({courses.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingCourse(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo curso
          </button>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="min-h-64 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-3xl bg-white px-4 py-12">
          <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
          <h2 className="text-base font-bold text-slate-800">
            {statusFilter === 'archived' ? 'No hay cursos archivados' : 'Aún no hay cursos registrados'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            {statusFilter === 'archived'
              ? 'Los cursos que archives para retirarlos de la vista activa aparecerán en esta sección.'
              : 'Registra el primer curso de esta institución para empezar a organizar estudiantes y materias.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const courseSubjects = subjects.filter((s) => s.courseId === course.id);
            const activeEnrollmentCount = enrollments.filter(
              (enrollment) => enrollment.courseId === course.id && enrollment.status === 'active'
            ).length;
            const isArchived = course.status === 'archived';
            const isMenuOpen = openMenuCourseId === course.id;

            return (
              <div
                key={course.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles del curso ${course.name}`}
                onClick={() => {
                  setSelectedCourseId(course.id);
                  setActiveDetailTab('summary');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedCourseId(course.id);
                    setActiveDetailTab('summary');
                  }
                }}
                className={`border rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 cursor-pointer relative ${
                  isArchived
                    ? 'bg-slate-50/70 border-slate-200 hover:border-slate-300 opacity-90'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Banner */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                          {course.name}
                        </span>
                        {isArchived && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1 border border-slate-300">
                            <Archive className="w-2.5 h-2.5" /> Archivado
                          </span>
                        )}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block mt-1">
                        {course.level}
                      </span>
                    </div>

                    {/* Menú de Tres Puntos (⋯) */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label={`Opciones del curso ${course.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuCourseId(isMenuOpen ? null : course.id);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150"
                        >
                          {/* 1. Editar curso */}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuCourseId(null);
                              setEditingCourse(course);
                              setIsCreateModalOpen(true);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                            Editar curso
                          </button>

                          {/* 2. Archivar curso (si está activo) */}
                          {!isArchived && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuCourseId(null);
                                setArchivingCourse(course);
                              }}
                              className="w-full px-3.5 py-2 text-left text-amber-800 hover:bg-amber-50 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5 text-amber-600" />
                              Archivar curso
                            </button>
                          )}

                          {/* 3. Reactivar curso (si está archivado) */}
                          {isArchived && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuCourseId(null);
                                setReactivatingCourse(course);
                              }}
                              className="w-full px-3.5 py-2 text-left text-emerald-800 hover:bg-emerald-50 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                              Reactivar curso
                            </button>
                          )}

                          <div className="my-1 border-t border-slate-100" />

                          {/* 4. Eliminar definitivamente (Rojo tenue) */}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuCourseId(null);
                              setDeletingCourse(course);
                            }}
                            className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50/80 font-bold flex items-center gap-2.5 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            Eliminar definitivamente
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Tutor: {course.tutorName}</span>
                  </div>
                </div>

                {/* Course Specs */}
                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Alumnos
                      </span>
                      <span className="font-extrabold text-slate-900 font-mono">
                        {activeEnrollmentCount} matriculados
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Ubicación
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {course.classroom || 'Sin asignar'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subjects breakdown */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Materias Dictadas ({courseSubjects.length})
                  </span>
                  <div className="space-y-1.5">
                    {courseSubjects.map((subj) => (
                      <div
                        key={subj.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-medium"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="font-bold text-slate-800">{subj.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {subj.hoursPerWeek} hrs/sem
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR CURSO */}
      <CourseFormModal
        isOpen={isCreateModalOpen}
        initialCourse={editingCourse}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingCourse(null);
        }}
        onSave={async (formData) => {
          if (editingCourse && onUpdateCourse) {
            await onUpdateCourse(editingCourse.id, formData);
          } else {
            await onAddCourse(formData);
          }
        }}
      />

      {/* MODAL: ARCHIVAR CURSO */}
      <ArchiveCourseModal
        isOpen={Boolean(archivingCourse)}
        course={archivingCourse}
        onClose={() => setArchivingCourse(null)}
        onConfirm={async (courseId) => {
          if (onArchiveCourse) {
            await onArchiveCourse(courseId);
          }
        }}
      />

      {/* MODAL: REACTIVAR CURSO */}
      <ReactivateCourseModal
        isOpen={Boolean(reactivatingCourse)}
        course={reactivatingCourse}
        onClose={() => setReactivatingCourse(null)}
        onConfirm={async (courseId) => {
          if (onReactivateCourse) {
            await onReactivateCourse(courseId);
          }
        }}
      />

      {/* MODAL: ELIMINAR DEFINITIVAMENTE (CON DEPENDENCIAS) */}
      <DeleteCourseModal
        isOpen={Boolean(deletingCourse)}
        course={deletingCourse}
        orgId={orgId}
        onClose={() => setDeletingCourse(null)}
        onConfirm={async (courseId) => {
          if (onDeleteCourse) {
            await onDeleteCourse(courseId);
          }
        }}
        onSwitchToArchive={(course) => {
          setDeletingCourse(null);
          setArchivingCourse(course);
        }}
      />
    </div>
  );
};
