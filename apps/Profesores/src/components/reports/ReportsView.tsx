import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileBarChart,
  Printer,
  Users,
  ClipboardCheck,
  GraduationCap,
  FileText,
  Filter,
  Calendar,
  BookOpen,
  User,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import {
  Course,
  Subject,
  Student,
  RosterReportDTO,
  AttendanceReportDTO,
  GradeReportDTO,
  StudentReportDTO,
} from '../../types/teacher';
import { academicApi } from '../../services/api/academicApi';
import { Organization } from '../../services/api/organizationApi';

export type ReportType = 'roster' | 'attendance' | 'grades' | 'student';

export interface ReportsViewProps {
  organization?: Organization | null;
  courses?: Course[];
  subjects?: Subject[];
  students?: Student[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  organization,
  courses = [],
  subjects = [],
  students = [],
}) => {
  const orgId = organization?.id || 0;

  // Estado del tipo de reporte activo
  const [activeReport, setActiveReport] = useState<ReportType>('roster');

  // Filtros interactivos
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Estados de carga y datos de los reportes
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [rosterData, setRosterData] = useState<RosterReportDTO | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceReportDTO | null>(null);
  const [gradeData, setGradeData] = useState<GradeReportDTO | null>(null);
  const [studentData, setStudentData] = useState<StudentReportDTO | null>(null);
  const reportRequestRef = useRef(0);

  // Auto-seleccionar primer estudiante si se pasa a ficha individual
  useEffect(() => {
    if (activeReport === 'student' && !selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [activeReport, selectedStudentId, students]);

  // Cargar datos del reporte actual desde PostgreSQL
  const fetchReport = useCallback(async () => {
    const requestId = ++reportRequestRef.current;
    if (!orgId) {
      setIsLoading(false);
      setRosterData(null);
      setAttendanceData(null);
      setGradeData(null);
      setStudentData(null);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (activeReport === 'roster') {
        const data = await academicApi.getRosterReport(orgId, {
          courseId: selectedCourseId ? Number(selectedCourseId) : undefined,
          status: selectedStatus || undefined,
        });
        if (requestId !== reportRequestRef.current) return;
        setRosterData(data);
      } else if (activeReport === 'attendance') {
        if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
          throw new Error("El rango de fechas es inválido: 'Desde' no puede ser posterior a 'Hasta'.");
        }
        const data = await academicApi.getAttendanceReport(orgId, {
          courseId: selectedCourseId ? Number(selectedCourseId) : undefined,
          subjectId: selectedSubjectId ? Number(selectedSubjectId) : undefined,
          studentId: selectedStudentId ? Number(selectedStudentId) : undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
        });
        if (requestId !== reportRequestRef.current) return;
        setAttendanceData(data);
      } else if (activeReport === 'grades') {
        const data = await academicApi.getGradeReport(orgId, {
          courseId: selectedCourseId ? Number(selectedCourseId) : undefined,
          subjectId: selectedSubjectId ? Number(selectedSubjectId) : undefined,
        });
        if (requestId !== reportRequestRef.current) return;
        setGradeData(data);
      } else if (activeReport === 'student') {
        const targetStudentId = selectedStudentId || (students[0]?.id ? String(students[0].id) : '');
        if (!targetStudentId) {
          setStudentData(null);
          setIsLoading(false);
          return;
        }
        const data = await academicApi.getStudentReport(orgId, targetStudentId);
        if (requestId !== reportRequestRef.current) return;
        setStudentData(data);
      }
    } catch (err: any) {
      if (requestId !== reportRequestRef.current) return;
      console.error('[ReportsView Error]:', err);
      setErrorMsg(err.message || 'Error al generar el reporte.');
    } finally {
      if (requestId === reportRequestRef.current) setIsLoading(false);
    }
  }, [
    orgId,
    activeReport,
    selectedCourseId,
    selectedSubjectId,
    selectedStudentId,
    selectedStatus,
    dateFrom,
    dateTo,
    students,
  ]);

  // Recargar reporte al cambiar dependencias
  useEffect(() => {
    fetchReport();
    return () => {
      reportRequestRef.current += 1;
    };
  }, [fetchReport]);

  // Filtrar materias según curso seleccionado
  const availableSubjects = selectedCourseId
    ? subjects.filter((s) => String(s.courseId) === String(selectedCourseId))
    : subjects;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Estilos para impresión @media print */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          aside, nav, header, .no-print, button, input, select {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 20px !important;
            border-bottom: 2px solid #334155 !important;
            padding-bottom: 12px !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
        @media screen {
          .print-header {
            display: none;
          }
        }
      `}</style>

      {/* Header en pantalla */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-indigo-600" />
            Centro de Reportes Académicos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generación y emisión oficial de nóminas, consolidados de asistencia, sábanas de notas y fichas estudiantiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Reporte</span>
          </button>
        </div>
      </div>

      {/* Selector de tipo de reporte (Tarjetas interactivas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <button
          onClick={() => setActiveReport('roster')}
          className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
            activeReport === 'roster'
              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-indigo-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2.5 rounded-xl ${activeReport === 'roster' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
              <Users className="w-5 h-5" />
            </div>
            {activeReport === 'roster' && <ChevronRight className="w-4 h-4 text-indigo-600" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Nómina de Estudiantes</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Listado oficial por curso y estado de matrícula.</p>
          </div>
        </button>

        <button
          onClick={() => setActiveReport('attendance')}
          className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
            activeReport === 'attendance'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2.5 rounded-xl ${activeReport === 'attendance' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <ClipboardCheck className="w-5 h-5" />
            </div>
            {activeReport === 'attendance' && <ChevronRight className="w-4 h-4 text-emerald-600" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Consolidado de Asistencia</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Porcentajes, asistencias y justificaciones por rango de fechas.</p>
          </div>
        </button>

        <button
          onClick={() => setActiveReport('grades')}
          className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
            activeReport === 'grades'
              ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-purple-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2.5 rounded-xl ${activeReport === 'grades' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'}`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            {activeReport === 'grades' && <ChevronRight className="w-4 h-4 text-purple-600" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Boletín de Calificaciones</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Sábana de notas, evaluaciones y promedios ponderados.</p>
          </div>
        </button>

        <button
          onClick={() => setActiveReport('student')}
          className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
            activeReport === 'student'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2.5 rounded-xl ${activeReport === 'student' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}>
              <FileText className="w-5 h-5" />
            </div>
            {activeReport === 'student' && <ChevronRight className="w-4 h-4 text-amber-600" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Ficha Individual</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Expediente integral del alumno para representantes.</p>
          </div>
        </button>
      </div>

      {/* Barra de Filtros interactivos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 no-print">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Filtros y Parámetros del Reporte</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Filtro: Curso */}
          {activeReport !== 'student' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-slate-400" /> Curso
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedSubjectId('');
                }}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">Todos los cursos</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro: Materia (para Asistencia y Calificaciones) */}
          {(activeReport === 'attendance' || activeReport === 'grades') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-slate-400" /> Materia
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">Todas las materias</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro: Estado de Matrícula (para Nómina) */}
          {activeReport === 'roster' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Estado Matrícula</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
                <option value="WITHDRAWN">Retirados</option>
              </select>
            </div>
          )}

          {/* Filtro: Estudiante (para Ficha Individual o Asistencia) */}
          {(activeReport === 'student' || activeReport === 'attendance') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> Estudiante
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                {activeReport === 'attendance' && <option value="">Todos los estudiantes</option>}
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.lastName} {st.firstName} ({st.identification})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro: Rango de Fechas (Desde / Hasta) para Asistencia */}
          {activeReport === 'attendance' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Fecha Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Fecha Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mensaje de Error si ocurre */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Contenedor Imprimible del Reporte */}
      <div className="print-container bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Cabecera Oficial para Impresión y Pantalla */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 block">
                {organization?.name || 'Sistema Académico Institucional'}
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                {activeReport === 'roster' && 'Nómina Oficial de Estudiantes Matriculados'}
                {activeReport === 'attendance' && 'Reporte Consolidado de Asistencia Estudiantil'}
                {activeReport === 'grades' && 'Boletín General de Calificaciones (Sábana Académica)'}
                {activeReport === 'student' && 'Ficha Académica Individual del Estudiante'}
              </h2>
            </div>
            <div className="text-right text-[11px] text-slate-400 font-mono">
              Fecha de Emisión: {new Date().toLocaleDateString('es-EC')}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
            {selectedCourseId && (
              <div>
                <strong>Curso:</strong> {courses.find((c) => String(c.id) === String(selectedCourseId))?.name || 'Seleccionado'}
              </div>
            )}
            {selectedSubjectId && (
              <div>
                <strong>Materia:</strong> {subjects.find((s) => String(s.id) === String(selectedSubjectId))?.name || 'Seleccionada'}
              </div>
            )}
            {dateFrom && (
              <div>
                <strong>Desde:</strong> {dateFrom}
              </div>
            )}
            {dateTo && (
              <div>
                <strong>Hasta:</strong> {dateTo}
              </div>
            )}
          </div>
        </div>

        {/* Estado de Carga */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Consultando registros en la base de datos institucional...</p>
          </div>
        )}

        {/* ==================================================================== */}
        {/* REPORTE 1: NÓMINA GENERAL DE ESTUDIANTES                            */}
        {/* ==================================================================== */}
        {!isLoading && activeReport === 'roster' && rosterData && (
          <div className="space-y-4">
            {/* Métricas rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold block">Total Registros</span>
                <span className="text-xl font-bold text-slate-900">{rosterData.totalStudents}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 font-semibold block">Estudiantes Activos</span>
                <span className="text-xl font-bold text-emerald-800">{rosterData.activeStudentsCount}</span>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-[11px] text-indigo-700 font-semibold block">Estudiantes Únicos</span>
                <span className="text-xl font-bold text-indigo-800">{rosterData.uniqueStudentsCount}</span>
              </div>
            </div>

            {/* Tabla de Nómina */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Estudiante</th>
                    <th className="py-2.5 px-3 font-mono">Cédula / ID</th>
                    <th className="py-2.5 px-3">Contacto</th>
                    <th className="py-2.5 px-3">Curso Asignado</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rosterData.students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        No se encontraron estudiantes registrados con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    rosterData.students.map((st, idx) => (
                      <tr key={`${st.studentId}-${st.id}`} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{st.fullName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{st.identification}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          <div>{st.email || '—'}</div>
                          <div className="text-[11px] text-slate-400">{st.phone || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{st.courseName || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              st.enrollmentStatus === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : st.enrollmentStatus === 'WITHDRAWN'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {st.enrollmentStatus || st.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* REPORTE 2: CONSOLIDADO DE ASISTENCIA                                */}
        {/* ==================================================================== */}
        {!isLoading && activeReport === 'attendance' && attendanceData && (
          <div className="space-y-6">
            {/* Métricas consolidadas */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold block">Total Registros</span>
                <span className="text-lg font-bold text-slate-900">{attendanceData.summary.totalRecords}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 font-semibold block">Presentes</span>
                <span className="text-lg font-bold text-emerald-800">{attendanceData.summary.presentCount}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100">
                <span className="text-[11px] text-rose-700 font-semibold block">Inasistencias</span>
                <span className="text-lg font-bold text-rose-800">{attendanceData.summary.absentCount}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-[11px] text-amber-700 font-semibold block">Atrasos</span>
                <span className="text-lg font-bold text-amber-800">{attendanceData.summary.lateCount}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-indigo-700 font-semibold block">% Asistencia Global</span>
                <span className="text-lg font-bold text-indigo-800 font-mono">
                  {attendanceData.summary.attendanceRate !== null ? `${attendanceData.summary.attendanceRate}%` : '—'}
                </span>
              </div>
            </div>

            {/* Resumen por estudiante */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Resumen de Asistencia por Estudiante
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="py-2 px-3">Estudiante</th>
                      <th className="py-2 px-3 font-mono">Cédula</th>
                      <th className="py-2 px-3 text-center">Clases</th>
                      <th className="py-2 px-3 text-center text-emerald-600">Presente</th>
                      <th className="py-2 px-3 text-center text-rose-600">Ausente</th>
                      <th className="py-2 px-3 text-center text-amber-600">Atraso</th>
                      <th className="py-2 px-3 text-center text-blue-600">Justificado</th>
                      <th className="py-2 px-3 text-right font-mono">% Asistencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceData.studentSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                          No hay registros de asistencia en el rango de fechas seleccionado.
                        </td>
                      </tr>
                    ) : (
                      attendanceData.studentSummaries.map((st) => (
                        <tr key={st.studentId} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-semibold text-slate-900">{st.fullName}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{st.identification}</td>
                          <td className="py-2 px-3 text-center font-bold">{st.totalRecords}</td>
                          <td className="py-2 px-3 text-center text-emerald-700 font-bold">{st.presentCount}</td>
                          <td className="py-2 px-3 text-center text-rose-700 font-bold">{st.absentCount}</td>
                          <td className="py-2 px-3 text-center text-amber-700 font-bold">{st.lateCount}</td>
                          <td className="py-2 px-3 text-center text-blue-700 font-bold">{st.excusedCount}</td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                                st.attendanceRate !== null && st.attendanceRate >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {st.attendanceRate !== null ? `${st.attendanceRate}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* REPORTE 3: BOLETÍN / SÁBANA DE CALIFICACIONES                       */}
        {/* ==================================================================== */}
        {!isLoading && activeReport === 'grades' && gradeData && (
          <div className="space-y-6">
            {/* Métricas de calificaciones */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold block">Actividades Evaluadas</span>
                <span className="text-lg font-bold text-slate-900">{gradeData.summary.totalActivities}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold block">Estudiantes</span>
                <span className="text-lg font-bold text-slate-900">{gradeData.summary.totalStudents}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100">
                <span className="text-[11px] text-purple-700 font-semibold block">Promedio General</span>
                <span className="text-lg font-bold text-purple-800 font-mono">
                  {gradeData.summary.overallAverage !== null ? gradeData.summary.overallAverage.toFixed(1) : '—'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-[11px] text-indigo-700 font-semibold block">Rendimiento Global</span>
                <span className="text-lg font-bold text-indigo-800 font-mono">
                  {gradeData.summary.overallNormalizedPerformance !== null
                    ? `${gradeData.summary.overallNormalizedPerformance}%`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Matriz Estudiantes x Actividades */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-3 sticky left-0 bg-slate-50">Estudiante</th>
                    {gradeData.activities.map((act) => (
                      <th key={act.id} className="py-2.5 px-2 text-center">
                        <div className="truncate max-w-[100px] font-bold" title={act.name}>
                          {act.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal font-mono">/{act.maxScore}</div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right bg-slate-100 font-mono">Promedio</th>
                    <th className="py-2.5 px-3 text-right bg-indigo-50 text-indigo-800 font-mono">% Rend.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeData.students.length === 0 ? (
                    <tr>
                      <td colSpan={gradeData.activities.length + 3} className="py-6 text-center text-slate-400 italic">
                        No hay estudiantes o actividades registradas para este curso.
                      </td>
                    </tr>
                  ) : (
                    gradeData.students.map((st) => (
                      <tr key={st.studentId} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 sticky left-0 bg-white">
                          {st.fullName}
                          <span className="block text-[10px] text-slate-400 font-mono">{st.identification}</span>
                        </td>
                        {st.grades.map((g) => (
                          <td key={g.activityId} className="py-2.5 px-2 text-center font-mono">
                            {g.isGraded && g.score !== null ? (
                              <span
                                className={`font-bold ${
                                  g.score >= 7.0 ? 'text-slate-800' : 'text-rose-600'
                                }`}
                              >
                                {g.score.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-right font-mono font-bold bg-slate-50 text-slate-900">
                          {st.simpleAverage !== null ? st.simpleAverage.toFixed(1) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold bg-indigo-50/50 text-indigo-700">
                          {st.normalizedPerformance !== null ? `${st.normalizedPerformance}%` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* REPORTE 4: FICHA INDIVIDUAL DEL ALUMNO                              */}
        {/* ==================================================================== */}
        {!isLoading && activeReport === 'student' && studentData && (
          <div className="space-y-6">
            {/* Cabecera del Estudiante */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  {studentData.student.fullName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Cédula: <strong>{studentData.student.identification || 'Sin registrar'}</strong> | Estado: <span className="text-emerald-700 font-bold uppercase">{studentData.student.status}</span>
                </p>
                <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                  <div><strong>Email:</strong> {studentData.student.email || '—'}</div>
                  <div><strong>Teléfono:</strong> {studentData.student.phone || '—'}</div>
                </div>
              </div>

              <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cursos Matriculados</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {studentData.enrollments.map((enr) => (
                    <span key={enr.id} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-semibold border border-indigo-100">
                      {enr.courseName} ({enr.courseLevel})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumen de Asistencia y Calificaciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bloque Asistencia */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" /> Registro de Asistencia
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Porcentaje de Asistencia:</span>
                  <span className="font-bold font-mono text-emerald-700 text-sm">
                    {studentData.attendance.summary.attendanceRate !== null ? `${studentData.attendance.summary.attendanceRate}%` : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <span className="text-[10px] text-emerald-700 block">Pres.</span>
                    <strong className="text-emerald-900">{studentData.attendance.summary.presentCount}</strong>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <span className="text-[10px] text-rose-700 block">Aus.</span>
                    <strong className="text-rose-900">{studentData.attendance.summary.absentCount}</strong>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <span className="text-[10px] text-amber-700 block">Atr.</span>
                    <strong className="text-amber-900">{studentData.attendance.summary.lateCount}</strong>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <span className="text-[10px] text-blue-700 block">Just.</span>
                    <strong className="text-blue-900">{studentData.attendance.summary.excusedCount}</strong>
                  </div>
                </div>
              </div>

              {/* Bloque Rendimiento Académico */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-600" /> Rendimiento Académico
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Promedio General:</span>
                  <span className="font-bold font-mono text-purple-700 text-sm">
                    {studentData.grades.summary.simpleAverage !== null ? studentData.grades.summary.simpleAverage.toFixed(1) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Rendimiento Normalizado:</span>
                  <span className="font-bold font-mono text-indigo-700 text-sm">
                    {studentData.grades.summary.normalizedPerformance !== null ? `${studentData.grades.summary.normalizedPerformance}%` : '—'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Total de evaluaciones rendidas: <strong>{studentData.grades.summary.totalGradesCount}</strong>
                </div>
              </div>
            </div>

            {/* Historial de Calificaciones */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Detalle de Evaluaciones Rendidas
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="py-2 px-3">Actividad / Examen</th>
                      <th className="py-2 px-3">Materia</th>
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3 text-center">Puntaje Obtenido</th>
                      <th className="py-2 px-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentData.grades.history.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                          No existen calificaciones registradas para este estudiante.
                        </td>
                      </tr>
                    ) : (
                      studentData.grades.history.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-semibold text-slate-900">{g.activityName}</td>
                          <td className="py-2 px-3 text-slate-600">{g.subjectName}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{g.gradedAt || '—'}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold">
                            <span className={g.score >= 7.0 ? 'text-emerald-700' : 'text-rose-600'}>
                              {g.score.toFixed(1)}
                            </span>
                            <span className="text-slate-400 font-normal"> / {g.maxScore}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">{g.comments || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
