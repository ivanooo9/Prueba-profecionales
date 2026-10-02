import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Appointment, AppointmentType, AppointmentStatus, DentistryProfessional, DentalTreatmentPlan, DentalTreatmentItem } from '../../types';
import { dentalService } from '../../services/dentalService';
import { dentistryApi } from '../../services/api/dentistryApi';
import { AlertCircle, Loader2 } from 'lucide-react';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: string;
  appointmentToEdit?: Appointment | null;
}

const getTodayDate = () => {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');
};

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen,
  onClose,
  defaultPatientId,
  appointmentToEdit
}) => {
  const patients = dentalService.getPatients();
  const currentOrgId = dentalService.getOrganizationId();

  const [patientId, setPatientId] = useState(defaultPatientId || patients[0]?.id || '');
  const [date, setDate] = useState(getTodayDate);
  const [time, setTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [type, setType] = useState<AppointmentType>('Consulta');
  const [professionalUserId, setProfessionalUserId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<AppointmentStatus>('Programada');
  const [notes, setNotes] = useState('');

  // Vinculación opcional con Plan de Tratamiento e Item
  const [treatmentPlans, setTreatmentPlans] = useState<DentalTreatmentPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(undefined);
  const [selectedItemId, setSelectedItemId] = useState<number | undefined>(undefined);

  // Profesionales de la organización
  const [professionals, setProfessionals] = useState<DentistryProfessional[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar profesionales al abrir
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);

    const loadProf = async () => {
      if (currentOrgId) {
        setIsLoading(true);
        try {
          const list = await dentalService.getProfessionals(currentOrgId);
          setProfessionals(list);
          if (list.length > 0 && !professionalUserId && !appointmentToEdit) {
            setProfessionalUserId(list[0].userId);
          }
        } catch (err: any) {
          console.error('[AppointmentFormModal] Error loading professionals:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadProf();
  }, [isOpen, currentOrgId]);

  // Cargar planes de tratamiento para el paciente seleccionado
  useEffect(() => {
    if (!isOpen || !currentOrgId || !patientId || patientId.startsWith('PAT-')) {
      setTreatmentPlans([]);
      setSelectedPlanId(undefined);
      setSelectedItemId(undefined);
      return;
    }

    const loadPlans = async () => {
      try {
        const plans = await dentistryApi.getTreatmentPlans(currentOrgId, patientId);
        setTreatmentPlans(plans || []);
      } catch (err) {
        console.error('[AppointmentFormModal] Error loading treatment plans:', err);
      }
    };

    loadPlans();
  }, [isOpen, currentOrgId, patientId]);

  useEffect(() => {
    if (appointmentToEdit) {
      setPatientId(appointmentToEdit.patientId);
      setDate(appointmentToEdit.date);
      setTime(appointmentToEdit.time);
      setDurationMinutes(appointmentToEdit.durationMinutes);
      setType(appointmentToEdit.type);
      if (appointmentToEdit.professionalUserId) {
        setProfessionalUserId(appointmentToEdit.professionalUserId);
      }
      setStatus(appointmentToEdit.status);
      setNotes(appointmentToEdit.notes || '');
      setSelectedPlanId(appointmentToEdit.treatmentPlanId);
      setSelectedItemId(appointmentToEdit.treatmentItemId);
    } else {
      setPatientId(defaultPatientId || patients[0]?.id || '');
      setDate(getTodayDate());
      setTime('09:00');
      setDurationMinutes(45);
      setType('Consulta');
      setStatus('Programada');
      setNotes('');
      setSelectedPlanId(undefined);
      setSelectedItemId(undefined);
      if (professionals.length > 0) {
        setProfessionalUserId(professionals[0].userId);
      }
    }
  }, [appointmentToEdit, defaultPatientId, isOpen, professionals]);

  const selectedPlan = treatmentPlans.find(p => p.id === selectedPlanId);
  const planItems = selectedPlan?.items || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!patientId) {
      setErrorMessage('Seleccione un paciente para la cita.');
      return;
    }

    if (!professionalUserId) {
      setErrorMessage('Debe seleccionar el odontólogo responsable de la cita.');
      return;
    }

    const patient = dentalService.getPatientById(patientId);
    const patientName = patient ? `${patient.names} ${patient.surnames}` : 'Paciente';
    const prof = professionals.find(p => p.userId === professionalUserId);
    const dentistName = prof ? prof.name : 'Odontólogo';

    setIsSubmitting(true);
    try {
      await dentalService.addAppointment({
        patientId,
        patientName,
        date,
        time,
        durationMinutes,
        type,
        dentist: dentistName,
        professionalUserId,
        status,
        notes,
        treatmentPlanId: selectedPlanId,
        treatmentItemId: selectedItemId,
      });

      onClose();
    } catch (error: any) {
      console.error('[AppointmentFormModal] Error saving appointment:', error);
      const msg = error.response?.data?.error || error.message || 'Error al agendar la cita. Verifique el horario.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={appointmentToEdit ? 'Editar Cita Odontológica' : 'Agendar Nueva Cita'}
      subtitle="Seleccione la fecha, hora, odontólogo y procedimiento para la cita."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Paciente */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente *</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            disabled={!!appointmentToEdit}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 disabled:bg-slate-100"
            required
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.names} {p.surnames} (CI: {p.identification})
              </option>
            ))}
          </select>
        </div>

        {/* Odontólogo Responsable (Obligatorio) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Odontólogo Tratante *</label>
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Cargando profesionales...</span>
            </div>
          ) : professionals.length > 0 ? (
            <select
              value={professionalUserId || ''}
              onChange={(e) => setProfessionalUserId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
              required
            >
              {professionals.map(p => (
                <option key={p.userId} value={p.userId}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              No se detectaron profesionales activos registrados en la organización.
            </div>
          )}
        </div>

        {/* Fecha, Hora, Duración */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hora *</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Duración</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min (1 hr)</option>
              <option value={90}>90 min (1.5 hrs)</option>
              <option value={120}>120 min (2 hrs)</option>
            </select>
          </div>
        </div>

        {/* Tipo y Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Consulta *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AppointmentType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
            >
              <option value="Consulta">Consulta / Evaluación</option>
              <option value="Limpieza">Limpieza Dental / Profilaxis</option>
              <option value="Evaluación">Evaluación Diagnóstica</option>
              <option value="Restauración">Restauración en Resina</option>
              <option value="Endodoncia">Endodoncia / Conducto</option>
              <option value="Ortodoncia">Control de Ortodoncia</option>
              <option value="Extracción">Extracción Dental</option>
              <option value="Control">Control Post-Tratamiento</option>
              <option value="Otro">Otro Procedimiento</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de Cita</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
            >
              <option value="Programada">Programada</option>
              <option value="Confirmada">Confirmada</option>
              <option value="En espera">En sala de espera</option>
              <option value="Atendida">Atendida</option>
              <option value="Cancelada">Cancelada</option>
              <option value="No asistió">No asistió</option>
            </select>
          </div>
        </div>

        {/* Vinculación opcional con Plan de Tratamiento */}
        {treatmentPlans.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Vinculación Clínica con Tratamiento (Opcional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Plan de Tratamiento</label>
                <select
                  value={selectedPlanId || ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : undefined;
                    setSelectedPlanId(id);
                    setSelectedItemId(undefined);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">(Ninguno / Consulta General)</option>
                  {treatmentPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} ({plan.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlanId && planItems.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Procedimiento Específico</label>
                  <select
                    value={selectedItemId || ''}
                    onChange={(e) => setSelectedItemId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">(Todo el plan / Sesión general)</option>
                    {planItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.toothNumber ? `Pieza ${item.toothNumber}: ` : ''}{item.procedureName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Observaciones */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones o Instrucciones</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Piezas a tratar, indicación de ayuno, anestesia..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-xl hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Guardar Cita</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
