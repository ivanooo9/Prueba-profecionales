import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Pill, Plus, Printer, X, ShieldAlert, Check } from 'lucide-react';
import { clinicalStore, useClinicalStore } from '../../services/clinical/clinicalStore';
import type { Patient, Prescription, PrescriptionItem } from '../../types/clinical.types';

export interface SriPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  consultationId?: string | null;
  prescriptionId?: string | null;
}

type DraftMedication = Omit<PrescriptionItem, 'id' | 'prescriptionId' | 'medicationName'>;

const emptyMedication: DraftMedication = {
  genericName: '',
  concentration: '',
  pharmaceuticalForm: '',
  dose: '',
  route: 'Vía oral',
  frequency: '',
  duration: '',
  quantity: '',
  instructions: '',
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none transition';

export const SriPrescriptionModal: React.FC<SriPrescriptionModalProps> = ({
  isOpen,
  onClose,
  patient,
  consultationId,
  prescriptionId,
}) => {
  const {
    allergies,
    diagnoses,
    consultations,
    prescriptions,
    prescriptionItems,
    currentUser,
  } = useClinicalStore((state) => state);

  // Buscar si se abrió una receta preexistente
  const existingPrescription = prescriptionId
    ? prescriptions.find((p) => p.id === prescriptionId)
    : null;

  const [savedPrescription, setSavedPrescription] = useState<Prescription | null>(
    existingPrescription || null
  );

  const [items, setItems] = useState<PrescriptionItem[]>(() => {
    if (existingPrescription) {
      return prescriptionItems.filter((it) => it.prescriptionId === existingPrescription.id);
    }
    return [];
  });

  const [newMedication, setNewMedication] = useState<DraftMedication>(emptyMedication);

  const [generalInstructions, setGeneralInstructions] = useState<string>(() => {
    return existingPrescription?.generalInstructions || '';
  });

  // Pre-cargar diagnóstico del contexto clínico (receta previa -> consulta activa -> diagnóstico reciente)
  const [diagnosis, setDiagnosis] = useState<string>(() => {
    if (existingPrescription?.diagnosis) return existingPrescription.diagnosis;
    if (consultationId) {
      const c = consultations.find((item) => item.id === consultationId);
      if (c?.assessment) return c.assessment;
      if (c?.cie10Description) return `${c.cie10Code ? c.cie10Code + ' - ' : ''}${c.cie10Description}`;
      if (c?.reason) return c.reason;
    }
    if (patient) {
      const latestDiag = diagnoses
        .filter((item) => item.patientId === patient.id)
        .sort((a, b) => new Date(b.diagnosedAt).getTime() - new Date(a.diagnosedAt).getTime())[0];
      if (latestDiag) return `${latestDiag.cie10Code ? latestDiag.cie10Code + ' - ' : ''}${latestDiag.description}`;
      const latestCons = consultations
        .filter((item) => item.patientId === patient.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      if (latestCons?.assessment) return latestCons.assessment;
      if (latestCons?.cie10Description) return `${latestCons.cie10Code ? latestCons.cie10Code + ' - ' : ''}${latestCons.cie10Description}`;
    }
    return '';
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extracción unificada y robusta de alergias del paciente
  const directAllergies = patient?.anamnesis?.allergies
    ? patient.anamnesis.allergies.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
    : [];
  const storeAllergies = patient
    ? allergies.filter((item) => item.patientId === patient.id && item.status === 'ACTIVE').map((a) => a.substance)
    : [];
  const combinedAllergies = Array.from(new Set([...storeAllergies, ...directAllergies]));

  const isReadOnly = savedPrescription?.status === 'SIGNED' || savedPrescription?.status === 'CANCELLED';

  const updateMedication = (key: keyof DraftMedication, value: string) => {
    setNewMedication((current) => ({ ...current, [key]: value }));
  };

  const addMedication = () => {
    const genericName = newMedication.genericName?.trim() || '';
    if (!genericName) {
      setErrorMessage('Por favor ingrese el nombre del medicamento o principio activo.');
      return;
    }
    if (!newMedication.dose.trim() || !newMedication.frequency.trim()) {
      setErrorMessage('Por favor complete al menos la dosis y la frecuencia del medicamento.');
      return;
    }
    setErrorMessage(null);
    setItems((current) => [
      ...current,
      {
        ...newMedication,
        id: `rxitem-${Date.now()}`,
        prescriptionId: savedPrescription?.id || 'draft',
        medicationName: genericName,
      },
    ]);
    setNewMedication(emptyMedication);
  };

  const removeMedication = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const savePrescription = async (status: Prescription['status']) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isSaving) return;

    if (isReadOnly) {
      setErrorMessage('Esta receta se encuentra firmada o cancelada y no puede ser modificada.');
      return;
    }

    if (!patient) {
      setErrorMessage('No hay un paciente seleccionado para asociar a la receta médica.');
      return;
    }

    // Auto-capturar medicación pendiente si el usuario la escribió en los campos pero no pulsó "Agregar"
    let currentItems = [...items];
    const pendingGeneric = newMedication.genericName?.trim();
    if (pendingGeneric && newMedication.dose.trim() && newMedication.frequency.trim()) {
      const pendingItem: PrescriptionItem = {
        ...newMedication,
        id: `rxitem-${Date.now()}`,
        prescriptionId: savedPrescription?.id || 'draft',
        medicationName: pendingGeneric,
      };
      currentItems.push(pendingItem);
      setItems(currentItems);
      setNewMedication(emptyMedication);
    }

    if (currentItems.length === 0) {
      setErrorMessage('Debe agregar al menos un medicamento a la receta (con nombre, dosis y frecuencia).');
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const doctorName = currentUser?.name || 'Dr. Roberto Silva';

    try {
      if (savedPrescription) {
        // Receta existente en base de datos -> actualizar estado
        await clinicalStore.updatePrescriptionStatus(savedPrescription.id, status, doctorName);
        const updatedPrescription: Prescription = {
          ...savedPrescription,
          status,
          signedAt: status === 'SIGNED' ? now : savedPrescription.signedAt,
          signedBy: status === 'SIGNED' ? doctorName : savedPrescription.signedBy,
          issuedAt: status === 'SIGNED' ? (savedPrescription.issuedAt || now) : savedPrescription.issuedAt,
        };
        setSavedPrescription(updatedPrescription);
        setSuccessMessage(status === 'SIGNED' ? 'Receta emitida y firmada con éxito.' : 'Estado de receta actualizado.');
      } else {
        // Nueva receta en base de datos
        const newPrescriptionPayload: Prescription = {
          id: `rx-${Date.now()}`,
          patientId: patient.id,
          consultationId: consultationId || undefined,
          diagnosis: diagnosis.trim() || undefined,
          status,
          generalInstructions: generalInstructions.trim() || undefined,
          itemIds: currentItems.map((item) => item.id),
          createdAt: now,
          issuedAt: status === 'SIGNED' ? now : undefined,
          signedAt: status === 'SIGNED' ? now : undefined,
          signedBy: status === 'SIGNED' ? doctorName : undefined,
        };

        const created = await clinicalStore.addPrescription(newPrescriptionPayload, currentItems);
        // Guardar la entidad real creada con ID de PostgreSQL en el estado
        setSavedPrescription(created);
        setItems(currentItems.map((item) => ({ ...item, prescriptionId: created.id })));
        setSuccessMessage(status === 'SIGNED' ? 'Receta emitida y firmada con éxito.' : 'Borrador de receta guardado correctamente.');
      }
    } catch (err: any) {
      console.error('Error al guardar receta:', err);
      setErrorMessage(err.message || 'Error al procesar la receta médica.');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelIssuedPrescription = async () => {
    if (savedPrescription?.status === 'SIGNED' && !isSaving) {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        await clinicalStore.updatePrescriptionStatus(savedPrescription.id, 'CANCELLED');
        setSavedPrescription({ ...savedPrescription, status: 'CANCELLED' });
        setSuccessMessage('Receta cancelada con éxito.');
      } catch (err: any) {
        setErrorMessage(err.message || 'Error al cancelar la receta.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const printPrescription = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-600">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isReadOnly ? 'RECETA MÉDICA ELECTRÓNICA' : 'NUEVA RECETA MÉDICA'}
              </h3>
              <p className="text-xs text-slate-500">
                Prescripción clínica conforme a normativa técnica y SRI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                savedPrescription?.status === 'SIGNED'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : savedPrescription?.status === 'CANCELLED'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {savedPrescription?.status === 'SIGNED'
                ? 'EMITIDA / FIRMADA'
                : savedPrescription?.status === 'CANCELLED'
                ? 'CANCELADA'
                : 'BORRADOR'}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              title="Cerrar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notificaciones de error o éxito */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Cuerpo con Scroll */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Identificación del Paciente */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Paciente
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {patient ? patient.name : 'Paciente no seleccionado'}
              </p>
              {!patient && (
                <p className="text-[10px] text-rose-600 mt-0.5">
                  Seleccione un paciente para vincular esta receta médica.
                </p>
              )}
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Identificación
              </span>
              <p className="mt-1 font-mono text-sm text-slate-900">
                {patient?.idNumber || 'No registrada'}
              </p>
            </div>
          </div>

          {/* Sección Alergias */}
          <div
            className={`rounded-xl border p-3.5 ${
              combinedAllergies.length > 0
                ? 'border-rose-200 bg-rose-50/80'
                : 'border-emerald-200 bg-emerald-50/80'
            }`}
          >
            <div
              className={`flex items-center gap-2 text-xs font-bold ${
                combinedAllergies.length > 0 ? 'text-rose-800' : 'text-emerald-800'
              }`}
            >
              {combinedAllergies.length > 0 ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <span>
                {combinedAllergies.length > 0
                  ? 'Alergias Conocidas del Paciente'
                  : 'Sin Alergias Conocidas'}
              </span>
            </div>
            {combinedAllergies.length > 0 ? (
              <div className="mt-1.5 space-y-1">
                <p className="text-xs font-semibold text-rose-700">
                  {combinedAllergies.join(', ')}
                </p>
                <p className="text-[10px] text-rose-600/90 italic">
                  Precaución: Verifique posibles contraindicaciones antes de prescribir medicamentos.
                </p>
              </div>
            ) : (
              <p className="mt-0.5 text-[11px] text-emerald-700">
                No se registran antecedentes alérgicos en la historia clínica del paciente.
              </p>
            )}
          </div>

          {/* Diagnóstico Asociado */}
          <div>
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Diagnóstico / Motivo de Prescripción
            </h4>
            {isReadOnly ? (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                {diagnosis || 'Sin diagnóstico especificado'}
              </p>
            ) : (
              <input
                className={fieldClass}
                placeholder="Ej. J03 - Amigdalitis aguda, no especificada"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            )}
          </div>

          {/* Lista de Medicamentos Prescritos */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Medicamentos Prescritos ({items.length})
              </h4>
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 bg-slate-50/50">
                No se han agregado medicamentos a la receta aún.
                {!isReadOnly && ' Complete el formulario a continuación para agregar el primero.'}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-xs"
                  >
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-900">
                        <span className="mr-2 font-mono text-amber-600">#{index + 1}</span>
                        {item.genericName || item.medicationName}
                      </p>
                      <p className="text-slate-600">
                        {[item.concentration, item.pharmaceuticalForm, item.route]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="font-medium text-slate-800">
                        {item.dose} {item.frequency} durante {item.duration || 'tiempo indicado'}
                      </p>
                      <p className="text-slate-600">
                        Cantidad: {item.quantity || 'No especificada'}
                      </p>
                      {item.instructions && (
                        <p className="text-slate-500 text-[11px] italic">
                          Indicaciones: {item.instructions}
                        </p>
                      )}
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => removeMedication(item.id)}
                        className="px-2 py-1 text-xs font-semibold text-slate-400 hover:text-rose-600 transition"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Formulario Agregar Medicamento */}
          {!isReadOnly && (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Plus className="h-4 w-4 text-amber-600" />
                Agregar medicamento
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  className={fieldClass}
                  placeholder="Medicamento / principio activo *"
                  value={newMedication.genericName}
                  onChange={(e) => updateMedication('genericName', e.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder="Concentración (ej. 500 mg)"
                  value={newMedication.concentration}
                  onChange={(e) => updateMedication('concentration', e.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder="Forma farmacéutica (ej. Tabletas, Jarabe)"
                  value={newMedication.pharmaceuticalForm}
                  onChange={(e) => updateMedication('pharmaceuticalForm', e.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder="Dosis (ej. 1 tableta) *"
                  value={newMedication.dose}
                  onChange={(e) => updateMedication('dose', e.target.value)}
                />
                <select
                  className={fieldClass}
                  value={newMedication.route}
                  onChange={(e) => updateMedication('route', e.target.value)}
                >
                  <option>Vía oral</option>
                  <option>Vía tópica</option>
                  <option>Vía intramuscular</option>
                  <option>Vía intravenosa</option>
                  <option>Vía oftálmica</option>
                  <option>Vía ótica</option>
                  <option>Vía sublingual</option>
                  <option>Vía inhalatoria</option>
                </select>
                <input
                  className={fieldClass}
                  placeholder="Frecuencia (ej. Cada 8 horas) *"
                  value={newMedication.frequency}
                  onChange={(e) => updateMedication('frequency', e.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder="Duración (ej. 3 días, 7 días)"
                  value={newMedication.duration}
                  onChange={(e) => updateMedication('duration', e.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder="Cantidad total (ej. 10 tabletas)"
                  value={newMedication.quantity}
                  onChange={(e) => updateMedication('quantity', e.target.value)}
                />
              </div>
              <input
                className={fieldClass}
                placeholder="Indicaciones adicionales (ej. Tomar después de alimentos)"
                value={newMedication.instructions}
                onChange={(e) => updateMedication('instructions', e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addMedication}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
                >
                  Agregar a la receta
                </button>
              </div>
            </section>
          )}

          {/* Indicaciones Generales */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              Indicaciones Generales para el Paciente
            </h4>
            <textarea
              className={`${fieldClass} min-h-20 resize-y`}
              disabled={isReadOnly}
              value={generalInstructions}
              onChange={(e) => setGeneralInstructions(e.target.value)}
              placeholder="Recomendaciones generales, pautas de alarma o precauciones..."
            />
          </section>
        </div>

        {/* Barra de Acciones / Pie */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex gap-2">
            {isReadOnly && (
              <>
                <button
                  onClick={printPrescription}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </button>
                <button
                  onClick={printPrescription}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </>
            )}
            {savedPrescription?.status === 'SIGNED' && (
              <button
                onClick={cancelIssuedPrescription}
                disabled={isSaving}
                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition"
              >
                Cancelar receta
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </button>
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={() => savePrescription('DRAFT')}
                  disabled={isSaving}
                  className="rounded-lg border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition"
                >
                  {isSaving ? 'Guardando...' : 'Guardar borrador'}
                </button>
                <button
                  type="button"
                  onClick={() => savePrescription('SIGNED')}
                  disabled={isSaving}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition"
                >
                  {isSaving ? 'Emitiendo...' : 'Emitir receta'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
