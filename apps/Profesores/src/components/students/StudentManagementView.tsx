import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Edit2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  UserRoundPlus,
} from 'lucide-react';
import { DataTable, Column } from '../ui/DataTable';
import { Activity, AttendanceRecord, Course, Enrollment, GradeItem, Student } from '../../types/teacher';
import { EnrollmentModal } from './EnrollmentModal';
import { StudentFormModal } from './StudentFormModal';
import { StudentDetailModal } from './StudentDetailModal';

export interface StudentManagementViewProps {
  students: Student[];
  onAddStudent: (student: Partial<Student>) => Promise<void> | void;
  onUpdateStudent: (id: string, updated: Partial<Student>) => Promise<void> | void;
  courses: Course[];
  enrollments: Enrollment[];
  onAddEnrollment: (studentId: string, courseId: string) => Promise<void>;
  attendanceHistory: AttendanceRecord[];
  grades: GradeItem[];
  activities: Activity[];
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  courses,
  enrollments,
  onAddEnrollment,
  attendanceHistory,
  grades,
  activities,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);

  const getStudentEnrollments = (studentId: string) =>
    enrollments.filter(
      (enrollment) => enrollment.studentId === studentId && enrollment.status === 'active'
    );

  const getStudentCourseNames = (studentId: string) =>
    getStudentEnrollments(studentId)
      .map((enrollment) => courses.find((course) => course.id === enrollment.courseId)?.name)
      .filter((name): name is string => Boolean(name));

  const handleExportStudents = () => {
    const rows = filteredStudents.map((student) => [
      `${student.firstName} ${student.lastName}`,
      student.identification,
      getStudentCourseNames(student.id).join(' | ') || 'Sin matrícula',
      student.email,
      student.phone,
      student.status,
    ]);
    const csv = ['Estudiante,Cédula,Cursos,Correo,Teléfono,Estado', ...rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'estudiantes.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        `${student.firstName} ${student.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        student.identification.includes(searchTerm) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCourse =
        selectedCourseFilter === 'all' || getStudentEnrollments(student.id).some(
          (enrollment) => enrollment.courseId === selectedCourseFilter
        );

      const matchesStatus =
        selectedStatusFilter === 'all' || student.status === selectedStatusFilter;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [students, enrollments, courses, searchTerm, selectedCourseFilter, selectedStatusFilter]);

  const columns: Column<Student>[] = [
    {
      header: 'Estudiante',
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
            {item.firstName[0]}
            {item.lastName[0]}
          </div>
          <div>
            <div className="font-bold text-slate-900">
              {item.firstName} {item.lastName}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">{item.identification}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Curso',
      cell: (item) => (
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
          {getStudentCourseNames(item.id).join(', ') || 'Sin matrícula'}
        </span>
      ),
    },
    {
      header: 'Contacto',
      cell: (item) => (
        <div>
          <div className="text-slate-800">{item.email}</div>
          <div className="text-[11px] text-slate-400 font-mono">{item.phone}</div>
        </div>
      ),
    },
    {
      header: 'Asistencia %',
      cell: (item) => (
        <div className="flex flex-wrap items-center gap-2">
          {item.attendancePercentage > 0 ? (
            <>
              <span
                className={`font-mono font-bold text-xs ${
                  item.attendancePercentage >= 85 ? 'text-emerald-600' : 'text-rose-600 font-extrabold'
                }`}
              >
                {item.attendancePercentage}%
              </span>
              {item.attendancePercentage < 80 && (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              )}
            </>
          ) : (
            <span className="text-slate-400 text-xs font-mono">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Promedio',
      cell: (item) => (
        item.averageGrade > 0 ? (
          <span
            className={`font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-lg border ${
              item.averageGrade >= 8
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : item.averageGrade >= 7
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {item.averageGrade.toFixed(1)}
          </span>
        ) : (
          <span className="text-slate-400 text-xs font-mono">—</span>
        )
      ),
    },
    {
      header: 'Estado',
      cell: (item) =>
        item.status === 'active' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Activo
          </span>
        ) : item.status === 'warning' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Advertencia
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Inactivo
          </span>
        ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setViewingStudent(item);
              setIsDetailModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
            title="Ver Expediente"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditingStudent(item);
              setIsFormModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
            title="Editar Estudiante"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Gestión de Estudiantes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administre la nómina, expedientes, teléfonos y estado académico de sus alumnos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExportStudents} className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-xs flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Lista</span>
          </button>
          <button
            onClick={() => setIsEnrollmentModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-xs flex items-center gap-1.5"
          >
            <UserRoundPlus className="w-4 h-4 text-indigo-600" />
            <span>Matricular</span>
          </button>
          <button
            onClick={() => {
              setEditingStudent(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Estudiante</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            aria-label="Buscar estudiantes por nombre, identificación o correo"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, cédula o correo..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtrar:</span>
          </div>

          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Todos los Cursos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Main Students Table */}
      <DataTable
        columns={columns}
        data={filteredStudents}
        emptyText="No se encontraron estudiantes registrados con los criterios seleccionados."
        onRowClick={(item) => {
          setViewingStudent(item);
          setIsDetailModalOpen(true);
        }}
      />

      {/* Modals */}
      <StudentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={editingStudent}
        onSave={async (data) => {
          if (editingStudent) {
            await onUpdateStudent(editingStudent.id, data);
          } else {
            await onAddStudent(data);
          }
        }}
      />

      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={viewingStudent}
        onEdit={(student) => {
          setEditingStudent(student);
          setIsFormModalOpen(true);
        }}
        courses={courses}
        enrollments={enrollments}
        attendanceHistory={attendanceHistory}
        grades={grades}
        activities={activities}
      />

      <EnrollmentModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => setIsEnrollmentModalOpen(false)}
        students={students}
        courses={courses}
        enrollments={enrollments}
        onSave={onAddEnrollment}
      />
    </div>
  );
};
