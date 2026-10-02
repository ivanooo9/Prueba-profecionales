import React, { useState } from 'react';
import { X, User, Phone, Mail, Award, CheckCircle } from 'lucide-react';
import { Activity, AttendanceRecord, Course, Enrollment, GradeItem, Student } from '../../types/teacher';


export interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onEdit: (student: Student) => void;
  courses: Course[];
  enrollments: Enrollment[];
  attendanceHistory: AttendanceRecord[];
  grades: GradeItem[];
  activities: Activity[];
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  onEdit,
  courses,
  enrollments,
  attendanceHistory = [],
  grades = [],
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'enrollments' | 'attendance' | 'grades'>('info');

  if (!isOpen || !student) return null;

  const studentEnrollments = enrollments.filter((enrollment) => enrollment.studentId === student.id);
  const studentAttendance = attendanceHistory.filter((item) => item.studentId === student.id);
  const studentGrades = grades.filter((item) => item.studentId === student.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="student-detail-title" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-sky-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white font-extrabold text-lg flex items-center justify-center border border-white/30">
              {student.firstName[0]}
              {student.lastName[0]}
            </div>
            <div>
              <h2 id="student-detail-title" className="text-lg font-extrabold tracking-tight">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-xs text-indigo-100 font-mono">
                ID: {student.identification || 'Sin ID'} • {student.courseName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar expediente"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-2 overflow-x-auto border-b border-slate-200">
          {[
            ['info', 'Información'],
            ['enrollments', 'Matrículas'],
            ['attendance', 'Asistencia'],
            ['grades', 'Calificaciones'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 ${activeTab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs">
          {activeTab === 'info' && <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Porcentaje Asistencia
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-extrabold font-mono text-slate-900">
                  {studentAttendance.length > 0
                    ? `${Math.round((studentAttendance.filter((a) => a.status === 'present').length / studentAttendance.length) * 100)}%`
                    : 'Sin registros'}
                </span>
                {studentAttendance.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Real
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Promedio simple de notas registradas
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-extrabold font-mono text-indigo-600">
                  {studentGrades.length > 0
                    ? `${(studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length).toFixed(1)}`
                    : 'Sin registros'}
                </span>
                {studentGrades.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Real
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Personal Info Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Información de Contacto
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Correo Institucional</span>
                  <span className="font-semibold text-slate-800">{student.email || 'No registrado'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Teléfono / Representante</span>
                  <span className="font-semibold text-slate-800 font-mono">{student.phone || 'No registrado'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:col-span-2 pt-2 border-t border-slate-200">
                <User className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Estado en la Plataforma</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {student.status === 'active'
                      ? 'Activo (Regular)'
                      : student.status === 'warning'
                      ? 'En Seguimiento Prioritario'
                      : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          </>}

          {activeTab === 'enrollments' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Matrículas</h3>
              {studentEnrollments.length === 0 ? (
                <p className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500">Este estudiante no tiene matrículas activas.</p>
              ) : studentEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">{courses.find((course) => course.id === enrollment.courseId)?.name || 'Curso desconocido'}</span>
                  <span className="text-slate-500">{enrollment.status === 'active' ? 'Activa' : 'Inactiva'}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Historial de asistencia</h3>
              {studentAttendance.length === 0 ? (
                <p className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
                  Sin datos registrados
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {studentAttendance.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-slate-700">{item.date}</span>
                        {item.observation && (
                          <span className="text-slate-400 ml-2">({item.observation})</span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'present'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'late'
                          ? 'bg-amber-50 text-amber-700'
                          : item.status === 'excused'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Calificaciones</h3>
              {studentGrades.length === 0 ? (
                <p className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
                  Sin datos registrados
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {studentGrades.map((grade) => (
                    <div key={grade.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{grade.evaluationName}</div>
                        <div className="text-slate-400 text-[10px]">{grade.subjectName} · {grade.date}</div>
                      </div>
                      <span className="font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-900">
                        {grade.score} / {grade.maxScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs"
            >
              Editar Datos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
