import React from 'react';
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  FileWarning,
  FlaskConical,
  Stethoscope,
} from 'lucide-react';
import { useClinicalStore } from '../../services/clinical/clinicalStore';

export interface MedicalGeneralDashboardProps {
  onStartConsultation: (patientId?: string) => void;
  onViewAgenda: () => void;
  onViewPatients: () => void;
}

const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-EC', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const statusLabel: Record<string, string> = {
  ATTENDED: 'Atendida',
  IN_CONSULTATION: 'En consulta',
  WAITING_ROOM: 'En sala',
  PENDING: 'Próxima',
};

const statusClass: Record<string, string> = {
  ATTENDED: 'bg-slate-100 text-slate-600 border-slate-200',
  IN_CONSULTATION: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WAITING_ROOM: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING: 'bg-sky-50 text-sky-700 border-sky-200',
};

export const MedicalGeneralDashboard: React.FC<MedicalGeneralDashboardProps> = ({
  onStartConsultation,
  onViewAgenda,
  onViewPatients,
}) => {
  const { patients, appointments, consultations, medications, labResults, followUpTasks } = useClinicalStore();
  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const todayConsultations = consultations.filter((c) => c.date?.slice(0, 10) === todayKey);
  const todayAppointments = appointments.filter((a) => a.date === todayKey);
  const totalToday = todayConsultations.length + todayAppointments.length;

  const upcomingAppointments = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 5);
  const currentAppointment = upcomingAppointments.find((appointment) => appointment.status === 'IN_CONSULTATION')
    || upcomingAppointments.find((appointment) => appointment.status === 'WAITING_ROOM')
    || upcomingAppointments.find((appointment) => appointment.status === 'PENDING');
  const currentPatient = currentAppointment ? patients.find((patient) => patient.id === currentAppointment.patientId) : undefined;
  const activeTreatments = medications.filter((medication) => medication.status === 'ACTIVE');
  const pendingLabs = labResults.filter((result) => result.status === 'PENDING');
  const pendingTasks = followUpTasks.filter((task) => task.status !== 'COMPLETED');

  const stats = [
    {
      label: 'Consultas de hoy',
      value: totalToday,
      detail: `${todayConsultations.length} atendidas · ${todayAppointments.length} agendadas`,
      icon: Calendar,
      color: 'text-sky-700 bg-sky-50',
    },
    { label: 'En espera', value: appointments.filter((appointment) => appointment.status === 'WAITING_ROOM').length, detail: 'Pacientes por atender', icon: Clock3, color: 'text-amber-700 bg-amber-50' },
    { label: 'Tratamientos activos', value: activeTreatments.length, detail: 'En seguimiento clínico', icon: Activity, color: 'text-emerald-700 bg-emerald-50' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Medicina General</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Buenos días, Dr. Roberto Silva</h1>
        <p className="text-sm text-slate-500">Tu agenda y pacientes en un solo lugar.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, detail, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5" /></div>
            <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p><p className="text-xs text-slate-500">{detail}</p></div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div><h2 className="text-base font-bold text-slate-950">Próximas consultas</h2><p className="mt-1 text-xs text-slate-500">Lo siguiente que necesita tu atención.</p></div>
            <button onClick={onViewAgenda} className="shrink-0 text-xs font-bold text-sky-700 hover:text-sky-900">Ver agenda completa <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => {
                const patient = patients.find((item) => item.id === appointment.patientId);
                if (!patient) return null;
                return (
                  <div key={appointment.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="w-16 shrink-0">
                        <p className="font-mono text-sm font-bold text-slate-900">{appointment.startTime}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{formatDate(appointment.date)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{patient.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{appointment.reason || 'Consulta general'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass[appointment.status] || statusClass.PENDING}`}>
                        {statusLabel[appointment.status] || 'Próxima'}
                      </span>
                      <button onClick={() => onStartConsultation(patient.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50">
                        Atender <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : todayConsultations.length > 0 ? (
              todayConsultations.slice(0, 5).map((consultation) => {
                const patient = patients.find((item) => item.id === consultation.patientId);
                const timeStr = consultation.date && consultation.date.includes('T') ? consultation.date.split('T')[1].slice(0, 5) : 'Hoy';
                return (
                  <div key={consultation.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="w-16 shrink-0">
                        <p className="font-mono text-sm font-bold text-sky-800">{timeStr}</p>
                        <p className="mt-1 text-[10px] text-slate-400">Atendida</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{patient ? patient.name : 'Paciente'}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{consultation.reason || 'Consulta médica'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="rounded-full border px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                        {consultation.status === 'SIGNED' ? 'Firmada' : 'Atendida'}
                      </span>
                      <button onClick={() => onStartConsultation(consultation.patientId)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50">
                        Ver consulta <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-xs text-slate-500">No hay consultas próximas registradas.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-900/10">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300"><Stethoscope className="h-4 w-4" /> Siguiente paciente</div>
            {currentPatient && currentAppointment ? <><h2 className="mt-6 text-xl font-black">{currentPatient.name}</h2><p className="mt-1 text-xs text-slate-400">{currentAppointment.reason} · {currentAppointment.startTime}</p><button onClick={() => onStartConsultation(currentPatient.id)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-cyan-300"><Stethoscope className="h-4 w-4" />{currentAppointment.status === 'IN_CONSULTATION' ? 'Continuar consulta' : 'Iniciar consulta'}</button></> : <p className="mt-6 text-xs text-slate-400">No hay pacientes próximos registrados.</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold text-slate-950">Pendientes</h2><FileWarning className="h-4 w-4 text-amber-600" /></div><div className="space-y-3">{pendingLabs.slice(0, 2).map((result) => <div key={result.id} className="flex gap-3 text-xs"><FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div><p className="font-bold text-slate-800">Resultado de laboratorio</p><p className="text-slate-500">{patients.find((patient) => patient.id === result.patientId)?.name || 'Paciente sin información'}</p></div></div>)}{pendingTasks.slice(0, 3).map((task) => <div key={task.id} className="flex gap-3 text-xs"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /><div><p className="font-bold text-slate-800">Seguimiento clínico</p><p className="text-slate-500">{task.title}</p></div></div>)}{pendingLabs.length === 0 && pendingTasks.length === 0 && <p className="text-xs text-slate-500">No hay pendientes clínicos.</p>}</div></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-bold text-slate-950">Tratamientos en curso</h2><p className="mt-1 text-xs text-slate-500">Pacientes con tratamientos activos.</p></div><button onClick={onViewPatients} className="text-xs font-bold text-sky-700 hover:text-sky-900">Ver pacientes <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div>{activeTreatments.length > 0 ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{activeTreatments.slice(0, 3).map((medication) => <div key={medication.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-900">{medication.name}</p><p className="mt-1 text-xs text-slate-500">{patients.find((patient) => patient.id === medication.patientId)?.name || 'Paciente sin información'}</p><p className="mt-3 text-[11px] font-medium text-emerald-700">{medication.frequency} · {medication.route}</p></div>)}</div> : <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">No hay tratamientos activos registrados.</p>}</section>
    </div>
  );
};
