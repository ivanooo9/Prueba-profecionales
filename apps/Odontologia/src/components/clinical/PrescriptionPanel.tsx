import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye, FileText, Plus, Save, Trash2, XCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Patient, Prescription, PrescriptionItem, Treatment } from '../../types';
import { dentalService } from '../../services/dentalService';

interface PrescriptionPanelProps {
  patientId: string;
  treatments: Treatment[];
  mode: 'treatment' | 'history';
}

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  treatments: Treatment[];
  prescription?: Prescription;
  onSaved: () => void;
}

const emptyMedication: PrescriptionItem = {
  id: '',
  genericName: '',
  concentration: '',
  pharmaceuticalForm: '',
  dose: '',
  route: '',
  frequency: '',
  duration: '',
  quantity: '',
  instructions: ''
};

const statusLabel: Record<string, string> = {
  draft: 'BORRADOR',
  DRAFT: 'BORRADOR',
  issued: 'EMITIDA',
  ISSUED: 'EMITIDA',
  cancelled: 'CANCELADA',
  CANCELLED: 'CANCELADA'
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('es-EC', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

export const PrescriptionPanel: React.FC<PrescriptionPanelProps> = ({ patientId, treatments, mode }) => {
  const patient = dentalService.getPatientById(patientId);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(dentalService.getPrescriptionsByPatient(patientId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | undefined>();

  useEffect(() => {
    dentalService.loadRealPrescriptions(patientId).catch(console.error);
    const refresh = () => setPrescriptions(dentalService.getPrescriptionsByPatient(patientId));
    refresh();
    return dentalService.subscribe(refresh);
  }, [patientId]);

  if (!patient) return null;

  const visiblePrescriptions = mode === 'history'
    ? prescriptions.filter(p => p.status === 'issued' || p.status === 'ISSUED')
    : prescriptions;

  const openPrescription = (prescription?: Prescription) => {
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPrescription(undefined);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-600" />
            {mode === 'history' ? 'Recetas anteriores' : 'Recetas'}
          </h3>
          {mode === 'treatment' && <p className="text-xs text-slate-500 mt-1">Recetas asociadas a la atención del paciente.</p>}
        </div>
        {mode === 'treatment' && (
          <button
            type="button"
            onClick={() => openPrescription()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" /> Crear receta
          </button>
        )}
      </div>

      {visiblePrescriptions.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {visiblePrescriptions.map(prescription => (
            <div key={prescription.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-700">{prescription.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    (prescription.status === 'issued' || prescription.status === 'ISSUED')
                      ? 'bg-emerald-50 text-emerald-700'
                      : (prescription.status === 'cancelled' || prescription.status === 'CANCELLED')
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {statusLabel[prescription.status] || prescription.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{formatDate(prescription.issuedAt || prescription.createdAt)}</div>
                <div className="text-xs text-slate-800 mt-1 truncate">
                  {prescription.medications.map(medication => medication.genericName || (medication as any).medicationName).filter(Boolean).join(', ') || 'Sin medicamentos agregados'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openPrescription(prescription)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 rounded-lg shrink-0"
              >
                <Eye className="w-3.5 h-3.5" /> {(prescription.status === 'draft' || prescription.status === 'DRAFT') ? 'Continuar' : 'Ver'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-3 text-xs text-slate-500">
          {mode === 'history' ? 'No se han emitido recetas para este paciente.' : 'No se han emitido recetas en esta atención.'}
        </div>
      )}

      <PrescriptionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        patient={patient}
        treatments={treatments}
        prescription={selectedPrescription}
        onSaved={closeModal}
      />
    </div>
  );
};

const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  patient,
  treatments,
  prescription,
  onSaved
}) => {
  const history = dentalService.getClinicalHistory(patient.id);
  const isIssued = prescription?.status === 'issued' || prescription?.status === 'ISSUED';
  const isCancelled = prescription?.status === 'cancelled' || prescription?.status === 'CANCELLED';
  const isReadOnly = isIssued || isCancelled;
  const [treatmentId, setTreatmentId] = useState('');
  const [medications, setMedications] = useState<PrescriptionItem[]>([]);
  const [medication, setMedication] = useState<PrescriptionItem>(emptyMedication);
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialTreatmentId = prescription?.treatmentId || (prescription?.treatmentPlanId ? String(prescription.treatmentPlanId) : '') || treatments[0]?.id || '';
    setTreatmentId(initialTreatmentId);
    setMedications(prescription?.medications || []);
    setMedication({ ...emptyMedication });
    setInstructions(prescription?.generalInstructions || '');
  }, [isOpen, prescription, treatments]);

  const selectedTreatment = treatments.find(treatment => treatment.id === treatmentId);
  const diagnosis = prescription?.diagnosis || selectedTreatment?.description || history.diagnosisSummary;
  const procedure = prescription?.procedure || selectedTreatment?.title;
  const hasAllergies = history.allergies && !/sin alergias|ninguna|no conocidas/i.test(history.allergies);

  const updateMedication = (field: keyof PrescriptionItem, value: string) => {
    setMedication(current => ({ ...current, [field]: value }));
  };

  const addMedication = () => {
    if (!medication.genericName?.trim() && !medication.medicationName?.trim()) return;
    setMedications(current => [...current, { ...medication, id: String(Date.now()) }]);
    setMedication({ ...emptyMedication });
  };

  const removeMedication = (id?: string | number) => {
    setMedications(current => current.filter(item => item.id !== id));
  };

  const savePrescription = async (status: Prescription['status']) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const itemsPayload = medications.map(m => ({
        medicationName: m.genericName || m.medicationName || 'Medicamento',
        genericName: m.genericName || m.medicationName || null,
        concentration: m.concentration || null,
        pharmaceuticalForm: m.pharmaceuticalForm || null,
        dose: m.dose || '1 unidad',
        route: m.route || 'Vía oral',
        frequency: m.frequency || 'Cada 8 horas',
        duration: m.duration || null,
        quantity: m.quantity || null,
        instructions: m.instructions || null,
      }));

      const prescriptionData = {
        patientId: patient.id,
        treatmentPlanId: treatmentId && !isNaN(parseInt(treatmentId, 10)) ? parseInt(treatmentId, 10) : undefined,
        treatmentId: treatmentId || undefined,
        diagnosis: diagnosis || undefined,
        procedure: procedure || undefined,
        items: itemsPayload,
        medications,
        generalInstructions: instructions,
        status: status.toUpperCase(),
        createdAt: prescription?.createdAt || new Date().toISOString(),
        issuedAt: (status === 'issued' || status === 'ISSUED') ? new Date().toISOString() : prescription?.issuedAt
      };

      if (prescription) {
        await dentalService.updateRealPrescription(patient.id, prescription.id, prescriptionData);
      } else {
        await dentalService.createRealPrescription(patient.id, prescriptionData);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Error al guardar la receta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelIssuedPrescription = async () => {
    if (!prescription || isSubmitting) return;
    const reason = window.prompt('Ingrese el motivo de anulación de la receta:');
    if (!reason || !reason.trim()) return;
    setIsSubmitting(true);
    try {
      await dentalService.cancelRealPrescription(patient.id, prescription.id, reason.trim());
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Error al anular la receta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReadOnly ? 'Detalle de receta' : prescription ? 'Continuar receta' : 'Nueva receta'}
      subtitle={isReadOnly ? 'Receta emitida en modo lectura.' : 'Complete los medicamentos e indicaciones de la atención.'}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Paciente</div>
            <div className="text-xs font-semibold text-slate-900 mt-1">{patient.names} {patient.surnames}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Identificación</div>
            <div className="text-xs font-mono text-slate-800 mt-1">{patient.identification}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-[10px] font-bold uppercase text-slate-400">Diagnóstico / Procedimiento</div>
            <div className="text-xs text-slate-800 mt-1">{diagnosis || 'Sin diagnóstico asociado'}{procedure ? ` · ${procedure}` : ''}</div>
          </div>
        </div>

        <div className={`p-3 rounded-xl border flex items-start gap-2 ${hasAllergies ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
          {hasAllergies ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <span className="text-sm">✓</span>}
          <div>
            <div className="text-[10px] font-bold uppercase">Alergias</div>
            <div className="text-xs mt-0.5">{hasAllergies ? history.allergies : 'Sin alergias medicamentosas registradas'}</div>
          </div>
        </div>

        {!isReadOnly && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tratamiento / procedimiento</label>
            <select
              value={treatmentId}
              onChange={event => setTreatmentId(event.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            >
              <option value="">Sin tratamiento asociado</option>
              {treatments.map(treatment => <option key={treatment.id} value={treatment.id}>{treatment.title}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Medicamentos</h4>
            {!isReadOnly && <span className="text-[10px] text-slate-400">Agregue uno por uno</span>}
          </div>

          {medications.map((item, index) => (
            <div key={item.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">#{index + 1} {item.genericName}</span>
                {!isReadOnly && <button type="button" onClick={() => removeMedication(item.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <div className="text-[11px] text-slate-600">{item.concentration} · {item.pharmaceuticalForm} · {item.route}</div>
              <div className="text-[11px] text-slate-600">{item.dose} cada {item.frequency} durante {item.duration} · Cantidad: {item.quantity}</div>
              {item.instructions && <div className="text-[11px] text-slate-500">Indicaciones: {item.instructions}</div>}
            </div>
          ))}

          {!isReadOnly && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                ['genericName', 'Medicamento / principio activo'],
                ['concentration', 'Concentración'],
                ['pharmaceuticalForm', 'Forma farmacéutica'],
                ['dose', 'Dosis'],
                ['route', 'Vía'],
                ['frequency', 'Frecuencia'],
                ['duration', 'Duración'],
                ['quantity', 'Cantidad'],
                ['instructions', 'Indicaciones adicionales']
              ] as Array<[keyof PrescriptionItem, string]>).map(([field, label]) => (
                <input
                  key={field}
                  type="text"
                  value={medication[field] || ''}
                  onChange={event => updateMedication(field, event.target.value)}
                  placeholder={label}
                  className={`px-3 py-2 border border-slate-200 rounded-lg text-xs ${field === 'instructions' ? 'sm:col-span-2' : ''}`}
                />
              ))}
              <button type="button" onClick={addMedication} className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Agregar medicamento
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Indicaciones postoperatorias</label>
          {isReadOnly ? <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-line">{instructions || 'Sin indicaciones registradas.'}</p> : (
            <textarea
              rows={3}
              value={instructions}
              onChange={event => setInstructions(event.target.value)}
              placeholder="No fumar durante 24 horas. Evitar alimentos calientes..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-xl disabled:opacity-50">Cerrar</button>
          {isReadOnly ? (prescription?.status === 'issued' || prescription?.status === 'ISSUED') && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={cancelIssuedPrescription}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl"
            >
              <XCircle className="w-3.5 h-3.5" /> {isSubmitting ? 'Cancelando...' : 'Cancelar receta'}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => savePrescription('draft')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl"
              >
                <Save className="w-3.5 h-3.5" /> {isSubmitting ? 'Guardando...' : 'Guardar borrador'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => savePrescription('issued')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl"
              >
                {isSubmitting ? 'Emitiendo...' : 'Emitir receta'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
