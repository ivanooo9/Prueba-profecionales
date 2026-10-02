import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Patient, PatientAnamnesis } from '../../types';
import { dentalService } from '../../services/dentalService';
import { ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientToEdit?: Patient | null;
  onSaved?: (patient: Patient) => void;
  editSection?: 'personal' | 'anamnesis' | 'emergency';
}

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  isOpen,
  onClose,
  patientToEdit,
  onSaved,
  editSection
}) => {
  const emptyAnamnesis: PatientAnamnesis = {};
  const [fullName, setFullName] = useState('');
  const [names, setNames] = useState('');
  const [surnames, setSurnames] = useState('');
  const [identification, setIdentification] = useState('');
  const [birthDate, setBirthDate] = useState('1995-01-01');
  const [gender, setGender] = useState<'Femenino' | 'Masculino' | 'Otro'>('Femenino');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Familiar');
  const [anamnesis, setAnamnesis] = useState<PatientAnamnesis>(emptyAnamnesis);
  const [isAnamnesisOpen, setIsAnamnesisOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const showPersonalFields = !editSection || editSection === 'personal';
  const showAnamnesis = !editSection || editSection === 'anamnesis';
  const showEmergency = !editSection || editSection === 'emergency';

  useEffect(() => {
    if (patientToEdit) {
      setNames(patientToEdit.names);
      setSurnames(patientToEdit.surnames);
      setFullName(`${patientToEdit.names} ${patientToEdit.surnames}`.trim());
      setIdentification(patientToEdit.identification);
      setBirthDate(patientToEdit.birthDate);
      setGender(patientToEdit.gender || 'Otro');
      setPhone(patientToEdit.phone);
      setEmail(patientToEdit.email);
      setAddress(patientToEdit.address);
      setEmergencyName(patientToEdit.emergencyContact?.name || '');
      setEmergencyPhone(patientToEdit.emergencyContact?.phone || '');
      setEmergencyRelation(patientToEdit.emergencyContact?.relationship || 'Familiar');
      setAnamnesis(patientToEdit.anamnesis || {});
    } else {
      setFullName('');
      setNames('');
      setSurnames('');
      setIdentification('');
      setBirthDate('');
      setGender('Femenino');
      setPhone('');
      setEmail('');
      setAddress('');
      setEmergencyName('');
      setEmergencyPhone('');
      setEmergencyRelation('');
      setAnamnesis({});
    }
    setIsAnamnesisOpen(false);
    setIsEmergencyOpen(false);
    setSubmitError(null);
    setIsSubmitting(false);
    setErrors({});
  }, [patientToEdit, isOpen]);

  const getNameParts = () => {
    const normalizedFullName = fullName.trim();
    if (normalizedFullName === `${names} ${surnames}`.trim()) {
      return { names, surnames };
    }

    const nameParts = normalizedFullName.split(/\s+/);
    return {
      names: nameParts[0] || '',
      surnames: nameParts.slice(1).join(' ')
    };
  };

  const calculateAge = () => {
    if (!birthDate) return '';
    const date = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const hasBirthdayPassed =
      today.getMonth() > date.getMonth() ||
      (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());
    if (!hasBirthdayPassed) age -= 1;
    return age >= 0 ? String(age) : '';
  };

  const updateAnamnesis = (field: keyof PatientAnamnesis, value: string) => {
    setAnamnesis(current => ({ ...current, [field]: value || undefined }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'El nombre completo es obligatorio';
    if (!identification.trim()) {
      errs.identification = 'La cédula es obligatoria';
    } else if (!/^\d+$/.test(identification.trim())) {
      errs.identification = 'La cédula debe contener solo números';
    }
    if (!phone.trim()) {
      errs.phone = 'El teléfono es obligatorio';
    } else if (!/^\d+$/.test(phone.trim())) {
      errs.phone = 'El teléfono debe contener solo números';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const nameParts = getNameParts();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (patientToEdit) {
        const updates: Partial<Patient> = {};

        if (showPersonalFields) {
          Object.assign(updates, {
            ...nameParts,
            identification,
            birthDate,
            gender,
            phone,
            email,
            address
          });
        }

        if (showAnamnesis) {
          updates.anamnesis = anamnesis;
        }

        if (showEmergency) {
          updates.emergencyContact = {
            name: emergencyName,
            phone: emergencyPhone,
            relationship: emergencyRelation
          };
        }

        const updated = await dentalService.updatePatient(patientToEdit.id, updates);
        if (updated && onSaved) onSaved(updated);
      } else {
        const created = await dentalService.addPatient({
          ...nameParts,
          identification,
          birthDate,
          gender,
          phone,
          email,
          address,
          emergencyContact: {
            name: emergencyName,
            phone: emergencyPhone,
            relationship: emergencyRelation
          },
          anamnesis,
          status: 'Activo'
        });
        if (onSaved) onSaved(created);
      }

      onClose();
    } catch (err: any) {
      console.error('[PatientFormModal] Error saving patient:', err);
      setSubmitError(err.message || 'Error al guardar los datos del paciente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={patientToEdit ? (
        editSection === 'anamnesis'
          ? 'Editar Datos Anamnésticos'
          : editSection === 'emergency'
            ? 'Editar Contacto de Emergencia'
            : 'Editar Datos del Paciente'
      ) : 'Registrar Nuevo Paciente'}
      subtitle={editSection === 'anamnesis' ? 'Actualice los antecedentes y datos médicos del paciente.' : editSection === 'emergency' ? 'Actualice la información del contacto de emergencia.' : 'Complete los campos principales para la ficha médica odontológica.'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{submitError}</span>
          </div>
        )}
        {showPersonalFields && <>
        <div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre completo *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: María Belén González Aguirre"
              className={`w-full px-3 py-2 border rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${
                errors.fullName ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.fullName && <span className="text-[10px] text-rose-500 mt-0.5 block">{errors.fullName}</span>}
          </div>
        </div>

        {/* Cédula, Fecha Nacimiento, Género */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Identificación (Cédula/CI) *</label>
            <input
              type="text"
              value={identification}
              onChange={(e) => setIdentification(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 1104829104"
              className={`w-full px-3 py-2 border font-mono rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${
                errors.identification ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.identification && <span className="text-[10px] text-rose-500 mt-0.5 block">{errors.identification}</span>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Nacimiento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo / Género</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Patient['gender'])}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        {/* Teléfono y Correo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono Móvil *</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 0992834102"
              className={`w-full px-3 py-2 border font-mono rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${
                errors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.phone && <span className="text-[10px] text-rose-500 mt-0.5 block">{errors.phone}</span>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="paciente@ejemplo.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección de Domicilio</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Av. 10 de Agosto N24-102 y Orellana, Quito"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
        </div>
          </>}

          {showAnamnesis && <DisclosureSection
          title="Datos anamnésticos"
          isOpen={isAnamnesisOpen}
          onToggle={() => setIsAnamnesisOpen(current => !current)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="Altura (cm)" value={anamnesis.height || ''} onChange={(value) => updateAnamnesis('height', value)} />
            <TextField label="Peso (kg)" value={anamnesis.weight || ''} onChange={(value) => updateAnamnesis('weight', value)} />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Edad</label>
              <input type="text" value={calculateAge()} readOnly placeholder="Se calcula con la fecha de nacimiento" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de sangre</label>
              <select value={anamnesis.bloodType || ''} onChange={(e) => updateAnamnesis('bloodType', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800">
                <option value="">No especificado</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <TextField label="Alergias" value={anamnesis.allergies || ''} onChange={(value) => updateAnamnesis('allergies', value)} />
            <TextField label="Enfermedades actuales" value={anamnesis.currentDiseases || ''} onChange={(value) => updateAnamnesis('currentDiseases', value)} />
            <TextField label="Enfermedades crónicas" value={anamnesis.chronicDiseases || ''} onChange={(value) => updateAnamnesis('chronicDiseases', value)} />
            <TextField label="Medicamentos actuales" value={anamnesis.currentMedications || ''} onChange={(value) => updateAnamnesis('currentMedications', value)} />
            <TextField label="Antecedentes médicos personales" value={anamnesis.personalMedicalHistory || ''} onChange={(value) => updateAnamnesis('personalMedicalHistory', value)} />
            <TextField label="Antecedentes familiares" value={anamnesis.familyHistory || ''} onChange={(value) => updateAnamnesis('familyHistory', value)} />
            <TextField label="Cirugías previas" value={anamnesis.previousSurgeries || ''} onChange={(value) => updateAnamnesis('previousSurgeries', value)} />
            <TextField label="Hospitalizaciones previas" value={anamnesis.previousHospitalizations || ''} onChange={(value) => updateAnamnesis('previousHospitalizations', value)} />
            <TextField label="Consumo de tabaco" value={anamnesis.tobaccoUse || ''} onChange={(value) => updateAnamnesis('tobaccoUse', value)} />
            <TextField label="Consumo de alcohol" value={anamnesis.alcoholUse || ''} onChange={(value) => updateAnamnesis('alcoholUse', value)} />
          </div>
          {gender === 'Femenino' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">¿Está embarazada?</label>
                <select value={anamnesis.pregnancyStatus || ''} onChange={(e) => updateAnamnesis('pregnancyStatus', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800">
                  <option value="">Seleccionar</option><option value="Sí">Sí</option><option value="No">No</option><option value="No sabe">No sabe</option>
                </select>
              </div>
              {anamnesis.pregnancyStatus === 'Sí' && <TextField label="Semanas de gestación" type="number" value={anamnesis.gestationWeeks || ''} onChange={(value) => updateAnamnesis('gestationWeeks', value)} />}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">¿Está en período de lactancia?</label>
                <select value={anamnesis.breastfeeding || ''} onChange={(e) => updateAnamnesis('breastfeeding', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800">
                  <option value="">Seleccionar</option><option value="Sí">Sí</option><option value="No">No</option>
                </select>
              </div>
            </div>
          )}
        </DisclosureSection>}

        {showEmergency && <DisclosureSection
          title="Contacto de emergencia"
          isOpen={isEmergencyOpen}
          onToggle={() => setIsEmergencyOpen(current => !current)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <TextField label="Nombre completo del contacto" value={emergencyName} onChange={setEmergencyName} />
            <TextField label="Teléfono" value={emergencyPhone} onChange={(value) => setEmergencyPhone(value.replace(/\D/g, ''))} />
            <TextField label="Parentesco" value={emergencyRelation} onChange={setEmergencyRelation} />
          </div>
        </DisclosureSection>}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>{patientToEdit ? 'Guardar Cambios' : 'Registrar Paciente'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

const TextField: React.FC<TextFieldProps> = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800" />
  </div>
);

interface DisclosureSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const DisclosureSection: React.FC<DisclosureSectionProps> = ({ title, isOpen, onToggle, children }) => (
  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
    <button type="button" onClick={onToggle} aria-expanded={isOpen} className="w-full flex items-center gap-2 p-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
      {isOpen ? <ChevronDown className="w-4 h-4 text-cyan-600" /> : <ChevronRight className="w-4 h-4 text-cyan-600" />}
      {title}
    </button>
    <div className={`grid transition-all duration-200 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
      <div className="overflow-hidden">
        <div className="p-3 pt-0">{children}</div>
      </div>
    </div>
  </div>
);
