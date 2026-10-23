import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { DentalProcedure } from '../../types';
import { dentalService } from '../../services/dentalService';
import {
  Loader2,
  Plus,
  Edit2,
  Check,
  BookOpen,
  AlertCircle,
  Sparkles,
  Search,
  CheckCircle2,
  Filter,
  DollarSign
} from 'lucide-react';

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
  const [isSeeding, setIsSeeding] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

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
    setSuccessMessage(null);
    setShowSeedConfirm(false);
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

  // Manejar precarga de arancel estándar de Ecuador
  const handleSeedDefaultProcedures = async () => {
    setIsSeeding(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await dentalService.seedDefaultProcedures();
      const reloaded = await dentalService.loadProcedures(true);
      setProcedures(reloaded);
      setShowSeedConfirm(false);

      if (res.createdCount > 0) {
        setSuccessMessage(
          `¡Arancel precargado con éxito! Se incorporaron ${res.createdCount} procedimientos nuevos (Total en clínica: ${res.totalCount}). Todos los precios son 100% editables.`
        );
      } else {
        setSuccessMessage(
          `El catálogo ya cuenta con los procedimientos estándar (${res.totalCount} disponibles). Puedes ajustar cualquier precio con el botón editar.`
        );
      }
    } catch (err: any) {
      console.error('[ProcedureCatalogModal] Error seeding:', err);
      setErrorMessage(err.message || 'Error al precargar arancel de procedimientos.');
    } finally {
      setIsSeeding(false);
    }
  };

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
    setSuccessMessage(null);

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
      setSuccessMessage(`Procedimiento "${created.name}" guardado exitosamente.`);
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
    setSuccessMessage(null);

    try {
      const updated = await dentalService.updateProcedure(procId, {
        defaultPrice: priceNum,
        isActive: editActive
      });

      setProcedures(procedures.map(p => (p.id === procId ? updated : p)));
      setEditingId(null);
      setSuccessMessage(`Precio de "${updated.name}" actualizado a $${priceNum.toFixed(2)}.`);
    } catch (err: any) {
      console.error('[ProcedureCatalogModal] Error updating:', err);
      setErrorMessage(err.message || 'Error al actualizar procedimiento.');
    } finally {
      setIsSaving(false);
    }
  };

  // Categorías únicas para filtro rápido
  const categories = useMemo(() => {
    const cats = new Set<string>();
    procedures.forEach(p => {
      if (p.category) cats.add(p.category.trim());
    });
    return ['Todas', ...Array.from(cats).sort()];
  }, [procedures]);

  // Procedimientos filtrados por búsqueda y categoría
  const filteredProcedures = useMemo(() => {
    return procedures.filter(p => {
      const matchCat = selectedCategory === 'Todas' || (p.category && p.category.trim() === selectedCategory);
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.code && p.code.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [procedures, selectedCategory, searchTerm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catálogo de Procedimientos Odontológicos"
      subtitle="Arancel referencial de la clínica. Puedes ajustar y personalizar los precios de cualquier procedimiento según tu criterio profesional."
      maxWidth="2xl"
    >
      <div className="space-y-4 text-left">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action bar superior */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Procedimientos ({filteredProcedures.length} de {procedures.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSeedConfirm(!showSeedConfirm)}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
              title="Carga procedimientos clínicos estándar con precios sugeridos editables"
            >
              {isSeeding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              )}
              <span>Cargar Arancel Sugerido (Ecuador)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsAddingNew(!isAddingNew);
                setShowSeedConfirm(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingNew ? 'Cancelar' : 'Nuevo Procedimiento'}</span>
            </button>
          </div>
        </div>

        {/* Cuadro de confirmación para precargar arancel */}
        {showSeedConfirm && (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 flex-1">
                <p className="font-bold text-amber-950">¿Deseas precargar el Arancel Odontológico Ecuatoriano?</p>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  Se incorporarán <strong>41 procedimientos clínicos estructurados</strong> (Preventiva, Operatoria, Endodoncia, Cirugía, Periodoncia, Prótesis, Estética y Ortodoncia) con códigos arancelarios y precios sugeridos de referencia en dólares.
                </p>
                <p className="mt-1 font-semibold text-amber-900">
                  Nota: Esta acción <strong>no sobreescribirá</strong> precios que ya hayas personalizado ni duplicará procedimientos existentes. Todos los precios cargados son 100% modificables por ti.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSeedConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSeedDefaultProcedures}
                disabled={isSeeding}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs inline-flex items-center gap-1.5"
              >
                {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirmar y Precargar Arancel</span>
              </button>
            </div>
          </div>
        )}

        {/* Formulario nuevo procedimiento */}
        {isAddingNew && (
          <form onSubmit={handleCreate} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-800">Registrar Nuevo Procedimiento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre del Procedimiento *</label>
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
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Categoría / Especialidad</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej: Preventiva, Operatoria, Endodoncia"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Código Arancelario (Opcional)</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ej: OPER-01"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Precio Referencial ($) *</label>
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

        {/* Barra de Búsqueda y Filtros por Especialidad */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar procedimiento por nombre, código arancelario o categoría..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Chips de filtro por categoría */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <span className="text-slate-400 font-semibold px-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtro:
              </span>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Lista de procedimientos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-400 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
            <span>Cargando catálogo...</span>
          </div>
        ) : filteredProcedures.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">
              {searchTerm || selectedCategory !== 'Todas'
                ? 'No se encontraron procedimientos con los filtros actuales'
                : 'Sin procedimientos registrados'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {procedures.length === 0
                ? 'Haz clic en "Cargar Arancel Sugerido (Ecuador)" para precargar el arancel o en "Nuevo Procedimiento" para registrarlo manualmente.'
                : 'Intenta limpiar el buscador o seleccionar otra especialidad.'}
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
            {filteredProcedures.map((proc) => {
              const isEditing = editingId === proc.id;

              return (
                <div
                  key={proc.id}
                  className="p-3 bg-white hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {proc.code && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                          {proc.code}
                        </span>
                      )}
                      <span className="font-bold text-slate-900">{proc.name}</span>
                      {proc.category && (
                        <span className="text-[10px] px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-100 font-semibold rounded-full">
                          {proc.category}
                        </span>
                      )}
                      {!proc.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {proc.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {proc.description}
                      </p>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24 relative">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full pl-6 pr-2 py-1 border-2 border-cyan-500 rounded-lg text-xs font-mono font-bold focus:outline-hidden"
                          autoFocus
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
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
                        title="Guardar precio"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Cancelar"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ${proc.defaultPrice.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block -mt-0.5">referencial</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingId(proc.id);
                          setEditPrice(proc.defaultPrice.toFixed(2));
                          setEditActive(proc.isActive);
                        }}
                        className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                        title="Modificar precio de este procedimiento"
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <span>
            💡 Todos los precios son referenciales y se pueden editar tanto aquí como al agregarlos a un paciente.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
