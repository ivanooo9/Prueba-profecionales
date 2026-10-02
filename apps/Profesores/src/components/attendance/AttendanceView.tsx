import React, { useState } from 'react';
import {
  ClipboardCheck,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { DataTable, Column } from '../ui/DataTable';
import { AttendanceRecord, Course, Student } from '../../types/teacher';

export interface AttendanceViewProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  courses: Course[];
  onOpenQuickAttendance: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendanceHistory,
  courses,
  onOpenQuickAttendance,
}) => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  const filteredHistory = attendanceHistory.filter((item) => {
    return selectedCourseFilter === 'all' || item.courseId === selectedCourseFilter;
  });

  const getCourseAttendance = (courseId: string) => {
    const records = attendanceHistory.filter((record) => record.courseId === courseId);
    if (records.length === 0) return null;
    const presentRecords = records.filter((record) => record.status === 'present' || record.status === 'late');
    return Math.round((presentRecords.length / records.length) * 1000) / 10;
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      header: 'Fecha',
      cell: (item) => (
        <span className="font-mono font-bold text-slate-800">{item.date}</span>
      ),
    },
    {
      header: 'Estudiante',
      cell: (item) => (
        <span className="font-bold text-slate-900">{item.studentName}</span>
      ),
    },
    {
      header: 'Estado',
      cell: (item) => {
        switch (item.status) {
          case 'present':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Presente
              </span>
            );
          case 'absent':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle className="w-3 h-3" /> Inasistencia
              </span>
            );
          case 'late':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3" /> Atraso
              </span>
            );
          case 'excused':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <AlertCircle className="w-3 h-3" /> Justificado
              </span>
            );
        }
      },
    },
    {
      header: 'Observación',
      cell: (item) => (
        <span className="text-slate-600 italic">
          {item.observation || 'Sin observaciones'}
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
            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            Registro y Control de Asistencia
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión diaria de asistencia, inasistencias justificadas y porcentajes acumulados por curso.
          </p>
        </div>

        <button
          onClick={onOpenQuickAttendance}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tomar Asistencia del Día</span>
        </button>
      </div>

      {/* Course Attendance % Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {courses.map((course) => {
          const percentage = getCourseAttendance(course.id);
          return (
            <div key={course.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {course.name} - Asistencia Global
                </span>
                <div className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">
                  {percentage === null ? 'Sin datos' : `${percentage}%`}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 font-extrabold text-xs">
                {percentage === null ? 'Pendiente' : percentage >= 80 ? 'Norma OK' : 'Atención'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Toolbar */}
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

      {/* History Table */}
      <DataTable
        columns={columns}
        data={filteredHistory}
        emptyText="No hay registros históricos de asistencia para el filtro seleccionado."
      />
    </div>
  );
};
