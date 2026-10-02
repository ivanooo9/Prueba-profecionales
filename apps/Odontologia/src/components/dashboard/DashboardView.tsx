import React from 'react';
import { dentalService } from '../../services/dentalService';
import { MetricCard } from '../ui/MetricCard';
import { StatusBadge } from '../ui/StatusBadge';
import { ActiveView } from '../../types';
import { UserSession } from '../../services/api/organizationApi';
import {
  CalendarCheck,
  Activity,
  Clock,
  UserPlus,
  CalendarPlus,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: ActiveView) => void;
  onSelectPatient: (patientId: string) => void;
  onOpenNewPatient: () => void;
  onOpenNewAppointment: () => void;
  currentUser?: UserSession | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectPatient,
  onOpenNewPatient,
  onOpenNewAppointment,
  currentUser,
}) => {
  const appointments = dentalService.getAppointments();
  const treatments = dentalService.getTreatments();
  const alerts = dentalService.getAlerts();

  const waitingCount = appointments.filter(a => a.status === 'En espera').length;
  const activeTreatments = treatments.filter(t => t.status === 'En progreso').length;
  const pendingAppointments = appointments.filter(a => a.status === 'Programada' || a.status === 'Confirmada').length;

  const upcomingAppointments = [...appointments]
    .filter(a => a.status !== 'Cancelada' && a.status !== 'No asistió')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 5);

  const nextAppointment = upcomingAppointments[0];
  const activeTreatmentPreview = treatments
    .filter(t => t.status === 'En progreso')
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-cyan-700">OdontoCare Pro</p>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Buenos días, {currentUser?.name || 'Doctor(a)'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Tu agenda y pendientes clínicos en un solo lugar.</p>
        </div>

      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Citas pendientes"
          value={pendingAppointments}
          subtitle="Programadas o confirmadas"
          icon={<CalendarCheck className="w-5 h-5" />}
          onClick={() => onNavigate('agenda')}
        />
        <MetricCard
          title="En espera"
          value={waitingCount}
          subtitle="Pacientes por atender"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600"
          onClick={() => onNavigate('agenda')}
        />
        <MetricCard
          title="Tratamientos activos"
          value={activeTreatments}
          subtitle="En progreso clínico"
          icon={<Activity className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600"
          onClick={() => onNavigate('treatments')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-1">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Próximas citas</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Lo siguiente que necesita tu atención.</p>
            </div>
            <button
              onClick={() => onNavigate('agenda')}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              Ver agenda <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingAppointments.length > 0 ? upcomingAppointments.map(appointment => (
              <div key={appointment.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="w-16 shrink-0">
                  <div className="font-mono text-xs font-bold text-cyan-700">{appointment.time}</div>
                  <div className="text-[10px] text-slate-400">{appointment.date}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{appointment.patientName}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{appointment.type}</div>
                </div>
                <StatusBadge status={appointment.status} />
                <button
                  onClick={() => onSelectPatient(appointment.patientId)}
                  className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold text-[11px] rounded-lg transition-colors"
                >
                  Atender
                </button>
              </div>
            )) : (
              <div className="py-8 text-center text-xs text-slate-500">No hay citas pendientes.</div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          {nextAppointment && (
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-bold text-cyan-400">Siguiente paciente</p>
              <h3 className="text-lg font-bold mt-1">{nextAppointment.patientName}</h3>
              <p className="text-xs text-slate-300 mt-1">{nextAppointment.type} · {nextAppointment.time}</p>
              <button
                onClick={() => onSelectPatient(nextAppointment.patientId)}
                className="mt-4 w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Abrir ficha del paciente
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Pendientes</h3>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 4).map(alert => (
                <button
                  key={alert.id}
                  onClick={() => alert.patientId && onSelectPatient(alert.patientId)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors"
                >
                  <div className="text-[11px] font-semibold text-slate-800">{alert.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{alert.description}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {activeTreatmentPreview.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tratamientos en curso</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Solo los casos que requieren seguimiento.</p>
            </div>
            <button onClick={() => onNavigate('treatments')} className="text-xs font-semibold text-cyan-600">
              Ver todos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeTreatmentPreview.map(treatment => (
              <button
                key={treatment.id}
                onClick={() => onSelectPatient(treatment.patientId)}
                className="text-left border border-slate-200 rounded-xl p-3 hover:border-cyan-300 hover:bg-cyan-50/30 transition-colors"
              >
                <div className="text-xs font-bold text-slate-900 truncate">{treatment.patientName}</div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{treatment.title}</div>
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${treatment.progress}%` }} />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{treatment.progress}% completado</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
