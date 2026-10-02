import React from 'react';
import { User, Phone, Mail, MapPin, AlertOctagon, HeartPulse, FileText, Pill, ArrowLeft } from 'lucide-react';
import type { Patient, Allergy, VitalSigns } from '../../types/clinical.types';
import { calculateAge } from '../../services/clinical/clinicalSelectors';

export interface PatientHeaderProps {
  patient: Patient;
  allergies: Allergy[];
  latestVitals?: VitalSigns;
  onBack?: () => void;
  onOpenSoapModal: (patientId: string) => void;
  onOpenPrescriptionModal: (patientId: string) => void;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  allergies,
  latestVitals,
  onBack,
  onOpenSoapModal,
  onOpenPrescriptionModal,
}) => {
  const activeSevereAllergies = allergies.filter((a) => a.status === 'ACTIVE' && a.severity === 'SEVERE');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Volver al Directorio"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
            <User className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {patient.idNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Expediente Clínico Electrónico #ECE-{patient.id.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenSoapModal(patient.id)}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span> Nueva Consulta SOAP</span>
          </button>
          <button
            onClick={() => onOpenPrescriptionModal(patient.id)}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
          >
            <Pill className="w-4 h-4" />
            <span> Receta SRI</span>
          </button>
        </div>
      </div>

      {/* Critical Allergy Alert Banner */}
      {activeSevereAllergies.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 animate-pulse">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <span className="font-extrabold uppercase tracking-wider text-rose-800 block">
              ¡ALERTA CRÍTICA DE ALERGIA MEDICAMENTOSA!
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {activeSevereAllergies.map((a) => (
                <span
                  key={a.id}
                  className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold"
                >
                  {a.substance} ({a.reaction})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Demographic & Vital Snapshot Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold block">Edad / Género</span>
          <span className="font-bold text-slate-900 font-mono">
            {patient.birthDate ? `${calculateAge(patient.birthDate)} años` : 'Sin información'} ({patient.gender === 'FEMALE' ? 'F' : patient.gender === 'MALE' ? 'M' : 'N/E'})
          </span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold block">Grupo Sanguíneo</span>
            <span className="font-bold text-sky-800 font-mono">{patient.bloodType || 'Sin información'}</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold block flex items-center gap-1">
            <HeartPulse className="w-3 h-3 text-emerald-600" /> Presión (TA)
          </span>
          <span className="font-bold text-emerald-700 font-mono">
            {latestVitals?.bloodPressureSystolic !== undefined && latestVitals.bloodPressureDiastolic !== undefined ? `${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic} mmHg` : 'Sin registrar'}
          </span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold block">Freq. Cardíaca</span>
          <span className="font-bold text-sky-700 font-mono">
            {latestVitals?.heartRate !== undefined ? `${latestVitals.heartRate} bpm` : 'Sin registrar'}
          </span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold block">Contacto</span>
          <span className="font-mono text-slate-800 flex items-center gap-1 truncate">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {patient.phone || 'N/A'}
          </span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 font-semibold block">Estado Clínico</span>
          <span className="font-bold text-amber-800 font-mono">{patient.status}</span>
        </div>
      </div>

      {/* Extra contact details */}
      {(patient.email || patient.address) && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1 font-mono">
          {patient.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {patient.email}
            </span>
          )}
          {patient.address && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {patient.address}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
