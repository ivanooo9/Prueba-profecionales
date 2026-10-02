import React, { useEffect, useState } from 'react';
import { Patient } from '../../types';
import { dentalService } from '../../services/dentalService';
import { StatusBadge } from '../ui/StatusBadge';
import { ClinicalHistory } from '../clinical/ClinicalHistory';
import { Odontogram } from '../odontogram/Odontogram';
import { EvolutionTimeline } from '../clinical/EvolutionTimeline';
import { TreatmentList } from '../treatments/TreatmentList';
import { DiagnosisList } from '../clinical/DiagnosisList';
import { PrescriptionPanel } from '../clinical/PrescriptionPanel';
import { BudgetList } from '../budgets/BudgetList';
import { DocumentList } from '../documents/DocumentList';
import { ConsentList } from '../consents/ConsentList';
import { PatientFormModal } from './PatientFormModal';
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  User,
  Stethoscope,
  Activity,
  FileText,
  Clock,
  Edit3,
  CalendarPlus,
  AlertTriangle,
  Receipt,
  FileCheck
} from 'lucide-react';

interface PatientDetailViewProps {
  patientId: string;
  onBack: () => void;
  onOpenEditModal: (patientId: string) => void;
  onOpenNewAppointment: (patientId: string) => void;
}

type PatientTab = 'summary' | 'odontogram' | 'history' | 'treatment' | 'files' | 'consents';

interface PatientTabItem {
  id: PatientTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PatientDetailView: React.FC<PatientDetailViewProps> = ({
  patientId,
  onBack,
  onOpenEditModal,
  onOpenNewAppointment
}) => {
  const [activeTab, setActiveTab] = useState<PatientTab>('summary');
  const [sectionToEdit, setSectionToEdit] = useState<'personal' | 'anamnesis' | 'emergency' | null>(null);
  const [patientOverride, setPatientOverride] = useState<Patient | null>(null);

  useEffect(() => {
    setPatientOverride(null);
  }, [patientId]);

  const patient = patientOverride?.id === patientId
    ? patientOverride
    : dentalService.getPatientById(patientId);
  const appointments = dentalService.getAppointmentsByPatient(patientId);
  const treatments = dentalService.getTreatmentsByPatient(patientId);
  const budgets = dentalService.getBudgetsByPatient(patientId);
  const evolutions = dentalService.getEvolution(patientId);

  if (!patient) {
    return (
      <div className="p-8 text-center text-slate-500">
        Paciente no encontrado.{' '}
        <button onClick={onBack} className="text-cyan-600 font-bold underline">Volver</button>
      </div>
    );
  }

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  };

  const nextAppointment = [...appointments]
    .filter(a => a.status !== 'Cancelada' && a.status !== 'No asistió')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];

  const activeTreatments = treatments.filter(t => t.status === 'En progreso' || t.status === 'Planificado');
  const pendingBudgetTotal = budgets
    .filter(b => b.status === 'Pendiente' || b.status === 'Enviado')
    .reduce((sum, budget) => sum + budget.totalAmount, 0);

  const anamnesis = patient.anamnesis;
  const anamnesisItems = [
    ['Altura', anamnesis?.height ? `${anamnesis.height} cm` : ''],
    ['Peso', anamnesis?.weight ? `${anamnesis.weight} kg` : ''],
    ['Tipo de sangre', anamnesis?.bloodType || ''],
    ['Alergias', anamnesis?.allergies || ''],
    ['Enfermedades actuales', anamnesis?.currentDiseases || ''],
    ['Enfermedades crónicas', anamnesis?.chronicDiseases || ''],
    ['Medicamentos actuales', anamnesis?.currentMedications || ''],
    ['Antecedentes médicos personales', anamnesis?.personalMedicalHistory || ''],
    ['Antecedentes familiares', anamnesis?.familyHistory || ''],
    ['Cirugías previas', anamnesis?.previousSurgeries || ''],
    ['Hospitalizaciones previas', anamnesis?.previousHospitalizations || ''],
    ['Consumo de tabaco', anamnesis?.tobaccoUse || ''],
    ['Consumo de alcohol', anamnesis?.alcoholUse || ''],
    ...(patient.gender === 'Femenino' ? [
      ['Embarazo', anamnesis?.pregnancyStatus || ''],
      ['Semanas de gestación', anamnesis?.gestationWeeks || ''],
      ['Lactancia', anamnesis?.breastfeeding || '']
    ] : [])
  ].filter(([, value]) => Boolean(value));

  const openSectionEditor = (section: 'personal' | 'anamnesis' | 'emergency') => {
    setSectionToEdit(section);
  };

  const handleSectionSaved = (updatedPatient: Patient) => {
    setPatientOverride(updatedPatient);
    setSectionToEdit(null);
  };

  const tabs: PatientTabItem[] = [
    { id: 'summary', label: 'Resumen', icon: User },
    { id: 'odontogram', label: 'Odontograma', icon: Stethoscope },
    { id: 'history', label: 'Historia', icon: FileText },
    { id: 'treatment', label: 'Tratamiento', icon: Activity },
    { id: 'files', label: 'Archivos', icon: FileText },
    { id: 'consents', label: 'Consentimientos', icon: FileCheck }
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a pacientes
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {patient.avatarUrl ? (
              <img
                src={patient.avatarUrl}
                alt={`${patient.names} ${patient.surnames}`}
                className="w-14 h-14 rounded-full object-cover border-2 border-cyan-500/20 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-cyan-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                {patient.names.charAt(0)}{patient.surnames.charAt(0)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 truncate">{patient.names} {patient.surnames}</h2>
                <StatusBadge status={patient.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                <span>{calculateAge(patient.birthDate) !== null ? `${calculateAge(patient.birthDate)} años` : 'Edad no disponible'}</span>
                <span>·</span>
                <span className="font-mono">CI {patient.identification}</span>
                <span>·</span>
                <span>{patient.phone}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenEditModal(patient.id)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar
            </button>
            <button
              onClick={() => onOpenNewAppointment(patient.id)}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
            >
              <CalendarPlus className="w-4 h-4" /> Agendar cita
            </button>
          </div>
        </div>

        {patient.medicalNotes && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Alerta clínica</div>
              <p className="text-xs text-amber-900 mt-0.5">{patient.medicalNotes}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 flex items-center gap-1 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <Calendar className="w-4 h-4 text-cyan-600" />
              <div className="text-[10px] text-slate-400 font-semibold mt-2">PRÓXIMA CITA</div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {nextAppointment ? `${nextAppointment.date} · ${nextAppointment.time}` : 'No programada'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <Activity className="w-4 h-4 text-purple-600" />
              <div className="text-[10px] text-slate-400 font-semibold mt-2">TRATAMIENTOS</div>
              <div className="text-xs font-bold text-slate-900 mt-1">{activeTreatments.length} activos</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <div className="text-[10px] text-slate-400 font-semibold mt-2">PRESUPUESTO PENDIENTE</div>
              <div className="text-xs font-bold text-slate-900 mt-1">${pendingBudgetTotal.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              <div className="text-[10px] text-slate-400 font-semibold mt-2">ÚLTIMA CONSULTA</div>
              <div className="text-xs font-bold text-slate-900 mt-1">{patient.lastVisit || 'Sin registro'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Datos del paciente</h3>
                <button onClick={() => openSectionEditor('personal')} className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-600" /><span>{patient.phone || 'Sin teléfono registrado'}</span></div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-cyan-600" /><span>{patient.email || 'Sin correo registrado'}</span></div>
                <div><span className="font-semibold">Fecha de nacimiento:</span> {patient.birthDate || 'Sin registrar'}</div>
                <div><span className="font-semibold">Edad:</span> {calculateAge(patient.birthDate) !== null ? `${calculateAge(patient.birthDate)} años` : 'No disponible'}</div>
                <div><span className="font-semibold">Sexo / Género:</span> {patient.gender || 'Sin registrar'}</div>
                <div><span className="font-semibold">Dirección:</span> {patient.address || 'Sin registrar'}</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Citas recientes</h3>
                <button onClick={() => onOpenNewAppointment(patient.id)} className="text-xs font-semibold text-cyan-600">+ Nueva</button>
              </div>
              <div className="divide-y divide-slate-100">
                {appointments.slice(0, 4).map(appointment => (
                  <div key={appointment.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{appointment.type}</div>
                      <div className="text-[10px] text-slate-500">{appointment.date} · {appointment.time}</div>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                ))}
                {appointments.length === 0 && <p className="py-4 text-xs text-slate-500">Sin citas registradas.</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Datos anamnésticos</h3>
                <button onClick={() => openSectionEditor('anamnesis')} className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
              {anamnesisItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  {anamnesisItems.map(([label, value]) => (
                    <div key={label}>
                      <div className="font-semibold text-slate-700">{label}</div>
                      <div className="text-slate-600 mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sin datos anamnésticos registrados.</p>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Contacto de emergencia</h3>
                <button onClick={() => openSectionEditor('emergency')} className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
              {patient.emergencyContact?.name || patient.emergencyContact?.phone || patient.emergencyContact?.relationship ? (
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-slate-800">{patient.emergencyContact?.name || 'Nombre no registrado'}</div>
                  <div className="text-slate-600">{patient.emergencyContact?.phone || 'Teléfono no registrado'}</div>
                  <div className="text-slate-600">{patient.emergencyContact?.relationship || 'Parentesco no registrado'}</div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sin contacto de emergencia registrado.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Evolución reciente</h3>
            {evolutions.length > 0 ? <EvolutionTimeline patientId={patient.id} /> : <p className="text-xs text-slate-500">Sin evoluciones registradas.</p>}
          </div>
        </div>
      )}

      {activeTab === 'odontogram' && <Odontogram patientId={patient.id} />}

      {activeTab === 'history' && (
        <div className="space-y-5">
          <ClinicalHistory patientId={patient.id} />
          <DiagnosisList patientId={patient.id} />
          <PrescriptionPanel patientId={patient.id} treatments={treatments} mode="history" />
        </div>
      )}

      {activeTab === 'treatment' && (
        <div className="space-y-6">
          <TreatmentList patientIdFilter={patient.id} />
          <BudgetList patientIdFilter={patient.id} />
          <PrescriptionPanel patientId={patient.id} treatments={treatments} mode="treatment" />
        </div>
      )}

      {activeTab === 'files' && <DocumentList patientIdFilter={patient.id} />}
      {activeTab === 'consents' && <ConsentList patientIdFilter={patient.id} />}

      <PatientFormModal
        isOpen={sectionToEdit !== null}
        onClose={() => setSectionToEdit(null)}
        patientToEdit={patient}
        editSection={sectionToEdit || undefined}
        onSaved={handleSectionSaved}
      />
    </div>
  );
};
