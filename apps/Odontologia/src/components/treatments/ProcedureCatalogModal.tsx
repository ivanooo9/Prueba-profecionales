import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DentalProcedure } from '../../types';
import { dentalService } from '../../services/dentalService';
import { Loader2, Plus, Edit2, Check, BookOpen, AlertCircle } from 'lucide-react';

interface ProcedureCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcedureSelected?: (procedure: DentalProcedure) => void;
}

export const ProcedureCatalogModal: React.FC<ProcedureCatalogModalProps> = ({
  isOpen,
  onClose,
  onProcedureSelected
}) => {
  const [procedures, setProcedures] = useState<DentalProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New procedure form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('45.00');
  const [duration, setDuration] = useState('30');

  // Editing existing procedure
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editActive, setEditActive] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setErrorMessage(null);
    dentalService
      .loadProcedures(true)
      .then((data) => {
        setProcedures(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('[ProcedureCatalogModal] Error loading:', err);
        setErrorMessage('Error al cargar catálogo de procedimientos.');
        setIsLoading(false);
      });
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('El nombre del procedimiento es requerido.');
      return;
    }

    const priceNum = parseFloat(defaultPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMessage('Precio referencial inválido.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const created = await dentalService.createProcedure({
        code: code.trim() || undefined,
        name: name.trim(),
        category: category.trim() || undefined,
        defaultPrice: priceNum,
        estimatedDurationMin: parseInt(duration, 10) || undefined
      });

      setProcedures([created, ...procedures]);
      setName('');
      setCode('');
      setCategory('');
      setDefaultPrice('45.00');
      setDuration('30');
      setIsAddingNew(false);
    } catch (err: any) {
      console.error('[ProcedureCatalogModal] Error creating:', err);
      setErrorMessage(err.message || 'Error al guardar procedimiento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (procId: number) => {
    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMessage('Precio referencial inválido.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated = await dentalService.updateProcedure(procId, {
        defaultPrice: priceNum,
        isActive: editActive
      });

      setProcedures(procedures.map(p => (p.id === procId ? updated : p)));
      setEditingId(null);
    } catch (err: any) {
      console.error('[ProcedureCatalogModal] Error updating:', err);
      setErrorMessage(err.message || 'Error al actualizar procedimiento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catálogo de Procedimientos Odontológicos"
      subtitle="Arancel referencial y procedimientos configurados para esta organización."
      maxWidth="xl"
    >
      <div className="space-y-4 text-left">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-700">
            Procedimientos registrados ({procedures.length})
          </span>
          <button
            type="button"
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingNew ? 'Cancelar' : 'Nuevo Procedimiento'}</span>
          </button>
        </div>

        {/* Formulario nuevo procedimiento */}
        {isAddingNew && (
          <form onSubmit={handleCreate} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Registrar Procedimiento en Catálogo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Profilaxis y Destartraje"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Categoría</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej: Preventiva, Operatoria, Endodoncia"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Código (Opcional)</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ej: OD-01"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Precio Ref ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Duración (min)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Guardar en Catálogo</span>
              </button>
            </div>
          </form>
        )}

        {/* Lista de procedimientos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
            <span>Cargando catálogo...</span>
          </div>
        ) : procedures.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Sin procedimientos registrados</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Haga clic en "Nuevo Procedimiento" para registrar su arancel clínico dental.
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
            {procedures.map((proc) => {
              const isEditing = editingId === proc.id;

              return (
                <div key={proc.id} className="p-3 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {proc.code && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {proc.code}
                        </span>
                      )}
                      <span className="font-bold text-slate-900 truncate">{proc.name}</span>
                      {proc.category && (
                        <span className="text-[10px] px-2 py-0.5 bg-cyan-50 text-cyan-700 font-semibold rounded-full">
                          {proc.category}
                        </span>
                      )}
                      {!proc.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {proc.estimatedDurationMin && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Duración aprox: {proc.estimatedDurationMin} min
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full px-2 py-1 border border-cyan-500 rounded text-xs font-mono font-bold"
                        />
                      </div>
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                          className="rounded text-cyan-600"
                        />
                        Activo
                      </label>
                      <button
                        onClick={() => handleSaveEdit(proc.id)}
                        disabled={isSaving}
                        className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ${proc.defaultPrice.toFixed(2)}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(proc.id);
                          setEditPrice(proc.defaultPrice.toFixed(2));
                          setEditActive(proc.isActive);
                        }}
                        className="p-1 text-slate-400 hover:text-cyan-600 rounded"
                        title="Modificar precio"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
