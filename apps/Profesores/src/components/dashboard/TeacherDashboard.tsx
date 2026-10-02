import React from 'react';
import {
  GraduationCap,
  CalendarDays,
  CheckSquare,
  PlusCircle,
  ArrowRight,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  CalendarX,
  FileText,
} from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';
import { AcademicAlertBadge } from '../ui/AcademicAlertBadge';
import {
  AcademicDashboardDTO,
  ClassSession,
  Course,
  GradeItem,
  NavigationTab,
  Student,
} from '../../types/teacher';

export interface TeacherDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenQuickAttendance: () => void;
  onOpenQuickGrade: () => void;
  onOpenNewStudentModal: () => void;
  students: Student[];
  courses: Course[];
  classSessions: ClassSession[];
  grades: GradeItem[];
  dashboardData?: AcademicDashboardDTO | null;
  currentUser?: { name?: string; email?: string } | null;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onNavigate,
  onOpenQuickAttendance,
  onOpenQuickGrade,
  students,
  courses,
  classSessions,
  grades,
  dashboardData,
  currentUser,
}) => {
  const teacherDisplayName = dashboardData?.teacherName || currentUser?.name || 'Docente';

  const activeStudentsCount = dashboardData?.activeStudentsCount ?? students.filter((s) => s.status === 'active').length;
  const totalStudentsCount = dashboardData?.totalStudentsCount ?? students.length;

  const activeCoursesCount = dashboardData?.activeCoursesCount ?? courses.filter((c) => c.status === 'active').length;
  const todaysClasses = dashboardData?.todaySessions ?? classSessions;
  const recentGrades = dashboardData?.recentGrades ?? grades.slice(0, 4);
  const academicAlerts = dashboardData?.academicAlerts ?? [];

  const attendanceRate = dashboardData?.attendanceSummary?.attendanceRate;
  const attendanceDisplay = attendanceRate !== null && attendanceRate !== undefined ? `${attendanceRate.toFixed(1)}%` : 'Sin datos';
  const attendanceSubtext = dashboardData?.attendanceSummary?.totalRecords
    ? `${dashboardData.attendanceSummary.presentCount} de ${dashboardData.attendanceSummary.totalRecords} asistencias`
    : 'Sin registros de asistencia';

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Card */}
      <div className="dashboard-banner p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Portal del Docente
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            ¡Bienvenido, {teacherDisplayName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-xl">
            Tiene <strong>{todaysClasses.length} {todaysClasses.length === 1 ? 'clase programada hoy' : 'clases programadas hoy'}</strong> y{' '}
            <strong>{academicAlerts.length} {academicAlerts.length === 1 ? 'alerta académica' : 'alertas académicas'}</strong> en seguimiento prioritario.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={onOpenQuickAttendance}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-700 font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Tomar Asistencia</span>
          </button>

          <button
            onClick={onOpenQuickGrade}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ingresar Nota</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Estudiantes Activos"
          value={activeStudentsCount}
          variant="students"
          subtext={`${totalStudentsCount} en total institucional`}
          onClick={() => onNavigate('students')}
        />
        <MetricCard
          title="Cursos Activos"
          value={activeCoursesCount}
          variant="courses"
          onClick={() => onNavigate('courses')}
        />
        <MetricCard
          title="Clases de Hoy"
          value={todaysClasses.length}
          variant="classes"
          onClick={() => onNavigate('classes')}
        />
        <MetricCard
          title="Tasa de Asistencia"
          value={attendanceDisplay}
          variant="attendance"
          subtext={attendanceSubtext}
          onClick={() => onNavigate('attendance')}
        />
      </div>

      {/* Content Grid: Today's Schedule & Academic Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Todays Classes & Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Today's Classes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Horario de Clases para Hoy
                </h2>
              </div>
              <button
                onClick={() => onNavigate('classes')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
              >
                Ver agenda docente <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todaysClasses.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CalendarX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No hay clases programadas para hoy</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Revise la agenda docente para consultar las próximas sesiones.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                      cls.status === 'in_progress'
                        ? 'bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-500/20'
                        : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-center shrink-0">
                        <span className="block text-[11px] font-bold text-slate-400 uppercase">
                          Aula
                        </span>
                        <span className="text-xs font-extrabold text-slate-800">
                          {cls.room.replace('Aula ', '')}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {cls.subjectName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                            {cls.courseName}
                          </span>
                          {cls.status === 'in_progress' && (
                            <span className="animate-pulse px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              En Curso
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {cls.time}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {cls.room}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={onOpenQuickAttendance}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                      >
                        Asistencia
                      </button>
                      <button
                        onClick={onOpenQuickGrade}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition"
                      >
                        Notas
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Recent Grades */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Últimas Calificaciones Ingresadas
                </h2>
              </div>
              <button
                onClick={() => onNavigate('grades')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
              >
                Ir a Calificaciones <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentGrades.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No hay calificaciones registradas recientemente</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Las notas guardadas aparecerán reflejadas aquí automáticamente.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentGrades.slice(0, 4).map((grd) => (
                  <div key={grd.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{grd.studentName}</span>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {grd.subjectName} • {grd.evaluationName} ({grd.date})
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-lg border ${
                          grd.score >= 8
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : grd.score >= 7
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {grd.score.toFixed(1)} / {grd.maxScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Academic Alerts Sidebar Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                Alertas Académicas
              </h2>
              <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                {academicAlerts.length} {academicAlerts.length === 1 ? 'caso' : 'casos'}
              </span>
            </div>

            {academicAlerts.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Sin alertas pendientes</p>
                <p className="text-[11px] text-slate-400 mt-0.5">El rendimiento y asistencia se encuentran al día.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {academicAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        {alert.studentName || alert.courseName || 'Alerta'}
                      </span>
                      <AcademicAlertBadge type={alert.type as any} severity={alert.severity as any} />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {alert.description}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>{alert.courseName ? `Curso: ${alert.courseName}` : 'Académico'}</span>
                      <span>{alert.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
