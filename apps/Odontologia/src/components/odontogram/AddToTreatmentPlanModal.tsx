import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DentalProcedure, DentalTreatmentPlan } from '../../types';
import { dentalService } from '../../services/dentalService';
import { Loader2, Plus, Check, Info, FilePlus } from 'lucide-react';

interface AddToTreatmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  toothNumber: number;
  initialSuggestedTreatment?: string;
  initialNotes?: string;
  onSuccess?: () => void;
}

export const AddToTreatmentPlanModal: React.FC<AddToTreatmentPlanModalProps> = ({
  isOpen,
  onClose,
  patientId,
  toothNumber,
  initialSuggestedTreatment,
  initialNotes,
  onSuccess
}) => {
  const [plans, setPlans] = useState<DentalTreatmentPlan[]>([]);
  const [procedures, setProcedures] = useState<DentalProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [selectedPlanMode, setSelectedPlanMode] = useState<'existing' | 'new'>('existing');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [newPlanTitle, setNewPlanTitle] = useState('Plan de Tratamiento Integral');

  const [selectedProcedureId, setSelectedProcedureId] = useState<number | 'custom'>('custom');
  const [procedureName, setProcedureName] = useState(initialSuggestedTreatment || '');
  const [unitPrice, setUnitPrice] = useState<string>('50.00');
  const [quantity, setQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState(initialNotes || '');

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setErrorMessage(null);

    Promise.all([
      dentalService.loadRealTreatmentPlans(patientId),
      dentalService.loadProcedures()
    ])
      .then(([loadedPlans, loadedProcedures]) => {
        setPlans(loadedPlans);
        setProcedures(loadedProcedures);

        if (loadedPlans.length > 0) {
          const activeOrDraft = loadedPlans.find(p => p.status === 'ACTIVE' || p.status === 'DRAFT') || loadedPlans[0];
          setSelectedPlanId(activeOrDraft.id);
          setSelectedPlanMode('existing');
        } else {
          setSelectedPlanMode('new');
        }

        // Si hay procedimientos en catálogo y coincide con el sugerido o tomamos el primero
        if (loadedProcedures.length > 0) {
          const match = initialSuggestedTreatment 
            ? loadedProcedures.find(p => p.name.toLowerCase().includes(initialSuggestedTreatment.toLowerCase()))
            : null;
          
          if (match) {
            setSelectedProcedureId(match.id);
            setProcedureName(match.name);
            setUnitPrice(match.defaultPrice.toFixed(2));
          } else {
            setSelectedProcedureId('custom');
            setProcedureName(initialSuggestedTreatment || '');
          }
        }

        setIsLoading(false);
      })
      .catch((err) => {
        console.error('[AddToTreatmentPlanModal] Error loading data:', err);
        setErrorMessage('Error al cargar planes o catálogo de procedimientos.');
        setIsLoading(false);
      });
  }, [isOpen, patientId, initialSuggestedTreatment, initialNotes]);

  const handleProcedureSelect = (procIdStr: string) => {
    if (procIdStr === 'custom') {
      setSelectedProcedureId('custom');
      setProcedureName('');
      return;
    }

    const id = parseInt(procIdStr, 10);
    const proc = procedures.find(p => p.id === id);
    if (proc) {
      setSelectedProcedureId(id);
      setProcedureName(proc.name);
      setUnitPrice(proc.defaultPrice.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedureName.trim()) {
      setErrorMessage('El nombre del procedimiento es requerido.');
      return;
    }

    const priceNum = parseFloat(unitPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMessage('Ingrese un precio unitario válido.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let targetPlanId = selectedPlanId;

      // Si se crea un nuevo plan
      if (selectedPlanMode === 'new' || !targetPlanId) {
        const createdPlan = await dentalService.createRealTreatmentPlan(patientId, {
          title: newPlanTitle.trim() || 'Plan de Tratamiento Odontológico',
          status: 'ACTIVE'
        });
        targetPlanId = createdPlan.id;
      }

      // Agregar ítem al plan seleccionado
      await dentalService.addRealTreatmentItem(patientId, targetPlanId, {
        procedureId: selectedProcedureId === 'custom' ? undefined : selectedProcedureId,
        procedureName: procedureName.trim(),
        toothNumber,
        quantity,
        unitPrice: priceNum,
        notes: itemNotes.trim() || undefined
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[AddToTreatmentPlanModal] Error adding item:', err);
      setErrorMessage(err.message || 'Error al agregar ítem al plan de tratamiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Agregar Pieza #${toothNumber} al Plan de Tratamiento`}
      subtitle="Vincule una intervención odontológica a un plan de tratamiento sin alterar el odontograma."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Banner informativo de aislamiento */}
        <div className="p-3 bg-cyan-50/60 border border-cyan-100 rounded-xl flex items-start gap-2.5 text-xs text-cyan-950">
          <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
          <span>
            <strong>Aislamiento clínico:</strong> Agregar este procedimiento a un plan presupuestado{' '}
            <strong>NO</strong> modifica el estado de la pieza en el odontograma actual ni crea eventos evolutivos.
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
            <span>Cargando planes y catálogo...</span>
          </div>
        ) : (
          <>
            {/* Selección o creación de Plan */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Plan de Tratamiento Destino
              </label>

              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedPlanMode('existing')}
                  disabled={plans.length === 0}
                  className={`flex-1 py-1.5 px-3 rounded-lg border font-semibold transition-all ${
                    selectedPlanMode === 'existing'
                      ? 'bg-white border-cyan-600 text-cyan-700 shadow-xs'
                      : 'bg-slate-100 border-slate-200 text-slate-500 disabled:opacity-40'
                  }`}
                >
                  Plan Existente ({plans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlanMode('new')}
                  className={`flex-1 py-1.5 px-3 rounded-lg border font-semibold transition-all ${
                    selectedPlanMode === 'new'
                      ? 'bg-white border-cyan-600 text-cyan-700 shadow-xs'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                >
                  + Crear Nuevo Plan
                </button>
              </div>

              {selectedPlanMode === 'existing' && plans.length > 0 ? (
                <div>
                  <select
                    value={selectedPlanId || ''}
                    onChange={(e) => setSelectedPlanId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    required
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.status} - Total: ${(p.totalEstimated || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Título del nuevo plan
                  </label>
                  <input
                    type="text"
                    value={newPlanTitle}
                    onChange={(e) => setNewPlanTitle(e.target.value)}
                    placeholder="Ej: Plan de Rehabilitación Oral 2026..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    required
                  />
                </div>
              )}
            </div>

            {/* Procedimiento */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Procedimiento Odontológico *
                </label>
                <select
                  value={selectedProcedureId}
                  onChange={(e) => handleProcedureSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                >
                  <option value="custom">-- Procedimiento manual / libre --</option>
                  {procedures.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      {proc.name} {proc.category ? `[${proc.category}]` : ''} - Ref: ${proc.defaultPrice.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Nombre descriptivo en el plan
                </label>
                <input
                  type="text"
                  value={procedureName}
                  onChange={(e) => setProcedureName(e.target.value)}
                  placeholder="Ej: Resina compuesta oclusal molar 16..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Pieza Dental
                  </label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700">
                    Pieza #{toothNumber}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Precio Unitario ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Notas / Observación del Ítem
                </label>
                <textarea
                  rows={2}
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Instrucciones para el tratamiento o indicaciones específicas..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm shadow-cyan-600/20 inline-flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando ítem...</span>
                  </>
                ) : (
                  <>
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Agregar al Plan</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
