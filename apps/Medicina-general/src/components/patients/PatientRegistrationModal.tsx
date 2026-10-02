import React, { useState } from 'react';
import { ChevronDown, ChevronRight, UserPlus, X } from 'lucide-react';
import type { Gender, Patient, PatientAnamnesis } from '../../types/clinical.types';
import { clinicalStore } from '../../services/clinical/clinicalStore';

interface PatientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered?: (patientId: string) => void;
  patient?: Patient | null;
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none';
export const PatientRegistrationModal: React.FC<PatientRegistrationModalProps> = ({ isOpen, onClose, onRegistered, patient }) => {
  const [name, setName] = useState(patient?.name || '');
  const [idNumber, setIdNumber] = useState(patient?.idNumber || '');
  const [birthDate, setBirthDate] = useState(patient?.birthDate || '');
  const [gender, setGender] = useState<Gender>(patient?.gender || 'UNSPECIFIED');
  const [phone, setPhone] = useState(patient?.phone || '');
  const [email, setEmail] = useState(patient?.email || '');
  const [address, setAddress] = useState(patient?.address || '');
  const [anamnesis, setAnamnesis] = useState<PatientAnamnesis>(() => ({ ...patient?.anamnesis }));
  const [emergencyContact, setEmergencyContact] = useState(() => patient?.emergencyContact || { name: '', phone: '', relationship: '' });
  const [isAnamnesisOpen, setIsAnamnesisOpen] = useState(() =>
    Boolean(patient?.anamnesis && Object.values(patient.anamnesis).some((v) => v !== undefined && v !== null && v !== ''))
  );
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(() =>
    Boolean(patient?.emergencyContact && Object.values(patient.emergencyContact).some(Boolean))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const updateAnamnesis = (key: keyof PatientAnamnesis, value: string | number | undefined) => {
    setAnamnesis((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !idNumber.trim() || !phone.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const now = new Date().toISOString();
    const updatedPatient: Patient = {
      id: patient?.id || '',
      name: name.trim(),
      birthDate,
      gender,
      idNumber: idNumber.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      anamnesis,
      emergencyContact: emergencyContact.name.trim() || emergencyContact.phone.trim() || emergencyContact.relationship.trim()
        ? emergencyContact
        : undefined,
      bloodType: anamnesis.bloodType?.trim() || undefined,
      status: patient?.status || 'EN ESPERA',
      createdAt: patient?.createdAt || now,
      updatedAt: now,
    };

    try {
      let saved: Patient;
      if (patient) {
        saved = await clinicalStore.updatePatient(updatedPatient);
      } else {
        saved = await clinicalStore.addPatient(updatedPatient);
      }
      onRegistered?.(saved.id);
      onClose();
    } catch (err: any) {
      console.error('Error al guardar paciente:', err);
      setErrorMessage(err.message || 'Error al registrar paciente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setContact = (key: keyof typeof emergencyContact, value: string) => {
    setEmergencyContact((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6">
      <form onSubmit={handleSubmit} className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-100 p-2 text-sky-700"><UserPlus className="h-5 w-5" /></div><div><h2 className="text-base font-bold text-slate-900">{patient ? 'Editar paciente' : 'Registrar nuevo paciente'}</h2><p className="text-xs text-slate-500">Datos personales y contexto clínico</p></div></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        {errorMessage && (
          <div className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {errorMessage}
          </div>
        )}

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Datos personales</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-700">Nombre completo *</span><input required className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-700">Identificación / Cédula *</span><input required className={inputClass} value={idNumber} onChange={(event) => setIdNumber(event.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-700">Teléfono móvil *</span><input required className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-700">Fecha de nacimiento</span><input type="date" className={inputClass} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-700">Sexo / Género</span><select className={inputClass} value={gender} onChange={(event) => setGender(event.target.value as Gender)}><option value="UNSPECIFIED">Sin especificar</option><option value="FEMALE">Femenino</option><option value="MALE">Masculino</option><option value="OTHER">Otro</option></select></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-700">Correo electrónico</span><input type="email" className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-700">Dirección</span><input className={inputClass} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
          </div></section>

          <section className="rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setIsAnamnesisOpen((open) => !open)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-bold text-slate-900">
                {isAnamnesisOpen ? <ChevronDown className="mr-2 inline h-4 w-4 text-sky-600" /> : <ChevronRight className="mr-2 inline h-4 w-4 text-sky-600" />}
                Datos anamnésticos
              </span>
              <span className="text-[11px] text-slate-500">Opcional</span>
            </button>
            {isAnamnesisOpen && (
              <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-semibold text-slate-700">Altura (cm)</span>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={anamnesis.heightCm ?? ''}
                    onChange={(event) => updateAnamnesis('heightCm', event.target.value !== '' ? Number(event.target.value) : undefined)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold text-slate-700">Peso (kg)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={inputClass}
                    value={anamnesis.weightKg ?? ''}
                    onChange={(event) => updateAnamnesis('weightKg', event.target.value !== '' ? Number(event.target.value) : undefined)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold text-slate-700">Tipo de sangre</span>
                  <input
                    className={inputClass}
                    value={anamnesis.bloodType || ''}
                    onChange={(event) => updateAnamnesis('bloodType', event.target.value)}
                  />
                </label>
                {(['allergies', 'currentIllnesses', 'chronicDiseases', 'currentMedications', 'personalHistory', 'familyHistory', 'previousSurgeries', 'hospitalizations', 'tobaccoUse', 'alcoholUse'] as const).map((key) => (
                  <label key={key}>
                    <span className="mb-1 block text-xs font-semibold capitalize text-slate-700">
                      {key === 'currentMedications' ? 'Medicamentos actuales' : key === 'currentIllnesses' ? 'Enfermedades actuales' : key === 'chronicDiseases' ? 'Enfermedades crónicas' : key === 'personalHistory' ? 'Antecedentes personales' : key === 'familyHistory' ? 'Antecedentes familiares' : key === 'previousSurgeries' ? 'Cirugías previas' : key === 'tobaccoUse' ? 'Consumo de tabaco' : key === 'alcoholUse' ? 'Consumo de alcohol' : key === 'hospitalizations' ? 'Hospitalizaciones' : 'Alergias'}
                    </span>
                    <input
                      className={inputClass}
                      value={(anamnesis[key] as string) || ''}
                      onChange={(event) => updateAnamnesis(key, event.target.value)}
                    />
                  </label>
                ))}
                {gender === 'FEMALE' && (
                  <>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-700">¿Está embarazada?</span>
                      <select
                        className={inputClass}
                        value={anamnesis.pregnancyStatus || ''}
                        onChange={(event) => updateAnamnesis('pregnancyStatus', (event.target.value || undefined) as PatientAnamnesis['pregnancyStatus'])}
                      >
                        <option value="">Sin especificar</option>
                        <option value="YES">Sí</option>
                        <option value="NO">No</option>
                        <option value="UNKNOWN">No sabe</option>
                      </select>
                    </label>
                    {anamnesis.pregnancyStatus === 'YES' && (
                      <label>
                        <span className="mb-1 block text-xs font-semibold text-slate-700">Semanas de gestación</span>
                        <input
                          type="number"
                          min="0"
                          className={inputClass}
                          value={anamnesis.gestationalWeeks ?? ''}
                          onChange={(event) => updateAnamnesis('gestationalWeeks', event.target.value !== '' ? Number(event.target.value) : undefined)}
                        />
                      </label>
                    )}
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-700">¿Está en período de lactancia?</span>
                      <select
                        className={inputClass}
                        value={anamnesis.breastfeeding || ''}
                        onChange={(event) => updateAnamnesis('breastfeeding', (event.target.value || undefined) as PatientAnamnesis['breastfeeding'])}
                      >
                        <option value="">Sin especificar</option>
                        <option value="YES">Sí</option>
                        <option value="NO">No</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200"><button type="button" onClick={() => setIsEmergencyOpen((open) => !open)} className="flex w-full items-center justify-between px-4 py-3 text-left"><span className="text-sm font-bold text-slate-900">{isEmergencyOpen ? <ChevronDown className="mr-2 inline h-4 w-4 text-sky-600" /> : <ChevronRight className="mr-2 inline h-4 w-4 text-sky-600" />}Contacto de emergencia</span><span className="text-[11px] text-slate-500">Opcional</span></button>{isEmergencyOpen && <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-4 sm:grid-cols-3"><label><span className="mb-1 block text-xs font-semibold text-slate-700">Nombre completo</span><input className={inputClass} value={emergencyContact.name} onChange={(event) => setContact('name', event.target.value)} /></label><label><span className="mb-1 block text-xs font-semibold text-slate-700">Teléfono</span><input className={inputClass} value={emergencyContact.phone} onChange={(event) => setContact('phone', event.target.value)} /></label><label><span className="mb-1 block text-xs font-semibold text-slate-700">Parentesco</span><input className={inputClass} value={emergencyContact.relationship} onChange={(event) => setContact('relationship', event.target.value)} /></label></div>}</section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : patient ? 'Guardar cambios' : 'Registrar paciente'}
          </button>
        </div>
      </form>
    </div>
  );
};