import React, { useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, MapPin, Plus, Users } from 'lucide-react';
import { AttendanceRecord, Course, Enrollment, GradeItem, Student, Subject } from '../../types/teacher';
import { CourseFormData, CourseFormModal } from './CourseFormModal';
import { SubjectFormModal } from './SubjectFormModal';
import type { SubjectFormData } from './SubjectFormModal';

export interface CoursesViewProps {
  courses: Course[];
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  attendanceHistory: AttendanceRecord[];
  grades: GradeItem[];
  onAddCourse: (course: CourseFormData) => Promise<void>;
  onAddSubject: (courseId: string, subject: SubjectFormData) => Promise<void>;
}


type CourseDetailTab = 'summary' | 'students' | 'subjects' | 'attendance' | 'grades';

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  subjects,
  students,
  enrollments,
  attendanceHistory = [],
  grades = [],
  onAddCourse,
  onAddSubject,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<CourseDetailTab>('summary');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateSubjectModalOpen, setIsCreateSubjectModalOpen] = useState(false);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || null;

  if (selectedCourse) {
    const courseSubjects = subjects.filter((subject) => subject.courseId === selectedCourse.id);
    const courseEnrollments = enrollments.filter(
      (enrollment) => enrollment.courseId === selectedCourse.id && enrollment.status === 'active'
    );
    const courseStudents = courseEnrollments
      .map((enrollment) => students.find((student) => student.id === enrollment.studentId))
      .filter((student): student is Student => Boolean(student));
    const courseAttendance = attendanceHistory.filter(
      (item) => item.courseId === selectedCourse.id
    );
    const courseGrades = grades.filter(
      (item) => item.courseId === selectedCourse.id
    );
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
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a cursos
            </button>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              {selectedCourse.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedCourse.level} · {selectedCourse.classroom} · Tutor: {selectedCourse.tutorName}
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
          {detailTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDetailTab(tab.id)}
              className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition ${
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
            {courseStudents.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">Este curso no tiene estudiantes matriculados.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {courseStudents.map((student) => (
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
              <button
                type="button"
                onClick={() => setIsCreateSubjectModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" /> Nueva materia
              </button>
            </div>

            {courseSubjects.length === 0 ? (
              <div className="min-h-40 flex flex-col items-center justify-center text-center border-t border-slate-200 px-4 py-8">
                <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Este curso aún no tiene materias</p>
                <p className="text-xs text-slate-500 mt-1">Usa “Nueva materia” para registrar la primera asignatura.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {courseSubjects.map((subject) => (
                  <div key={subject.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{subject.name}</div>
                      <div className="text-[11px] text-slate-500">{subject.code ? `${subject.code} · ` : ''}{subject.teacherName}</div>
                    </div>
                    {subject.hoursPerWeek ? (
                      <span className="text-[10px] font-mono font-bold text-slate-500">{subject.hoursPerWeek} hrs/sem</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <SubjectFormModal
              isOpen={isCreateSubjectModalOpen}
              onClose={() => setIsCreateSubjectModalOpen(false)}
              onSave={(subject) => onAddSubject(selectedCourse.id, subject)}
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
            <div className="text-sm font-bold text-slate-900 mb-3">Calificaciones del curso ({courseGrades.length} registros)</div>
            {courseGrades.length === 0 ? (
              <p className="text-xs text-slate-500">Sin datos registrados.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {courseGrades.map((grade) => (
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
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          Cursos y Materias Asignadas
        </h1>
        <div className="flex flex-col sm:items-end gap-2">
          <p className="text-xs text-slate-500">
            Vista general de los grupos escolares y asignaturas bajo la dirección del docente.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" /> Nuevo curso
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="min-h-64 flex flex-col items-center justify-center text-center border-t border-slate-200 px-4 py-12">
          <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
          <h2 className="text-base font-bold text-slate-800">Aún no hay cursos registrados</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Registra el primer curso de esta institución para empezar a organizar estudiantes y materias.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((course) => {
          const courseSubjects = subjects.filter((s) => s.courseId === course.id);

          const activeEnrollmentCount = enrollments.filter(
            (enrollment) => enrollment.courseId === course.id && enrollment.status === 'active'
          ).length;

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
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-5 cursor-pointer"
            >
              {/* Top Banner */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                    {course.name}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {course.level}
                  </span>
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

      <CourseFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={onAddCourse}
      />
    </div>
  );
};
