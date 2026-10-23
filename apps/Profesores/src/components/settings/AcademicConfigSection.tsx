import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Layers,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  AcademicYear,
  AcademicYearStatus,
  AcademicPeriod,
  AcademicPeriodType,
  AcademicPeriodStatus,
} from '../../types/teacher';
import { academicApi } from '../../services/api/academicApi';
import { Organization } from '../../services/api/organizationApi';
import { PeriodClosureModal } from './PeriodClosureModal';

export interface AcademicConfigSectionProps {
  organization?: Organization | null;
  isAdminOrOwner?: boolean;
}

const PERIOD_TYPE_LABELS: Record<AcademicPeriodType, string> = {
  YEAR: 'Año Lectivo Completo',
  SEMESTER: 'Semestre',
  QUIMESTER: 'Quimestre',
  TRIMESTER: 'Trimestre',
  BIMESTER: 'Bimestre',
  PARTIAL: 'Parcial',
};

const YEAR_STATUS_COLORS: Record<AcademicYearStatus, string> = {
  PLANNED: 'bg-blue-50 text-blue-700 border-blue-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-200',
  CLOSED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PERIOD_STATUS_COLORS: Record<AcademicPeriodStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOCKED: 'bg-amber-50 text-amber-700 border-amber-200',
  CLOSED: 'bg-rose-50 text-rose-700 border-rose-200',
  ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const AcademicConfigSection: React.FC<AcademicConfigSectionProps> = ({
  organization,
  isAdminOrOwner = false,
}) => {
  const orgId = organization?.id || 0;

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal de Cierre de Periodo
  const [closureModalPeriod, setClosureModalPeriod] = useState<AcademicPeriod | null>(null);

  // Modales / Formularios en línea
  const [isNewYearOpen, setIsNewYearOpen] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [newYearStartDate, setNewYearStartDate] = useState('');
  const [newYearEndDate, setNewYearEndDate] = useState('');
  const [isSubmittingYear, setIsSubmittingYear] = useState(false);

  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodType, setNewPeriodType] = useState<AcademicPeriodType>('TRIMESTER');
  const [newPeriodOrder, setNewPeriodOrder] = useState<number>(1);
  const [newPeriodStartDate, setNewPeriodStartDate] = useState('');
  const [newPeriodEndDate, setNewPeriodEndDate] = useState('');
  const [newPeriodParentId, setNewPeriodParentId] = useState<string>('');
  const [isSubmittingPeriod, setIsSubmittingPeriod] = useState(false);

  // Cargar Años y Periodos
  const loadConfigData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fetchedYears = await academicApi.getAcademicYears(orgId);
      setYears(fetchedYears);

      // Auto-seleccionar primer año lectivo activo o disponible
      const defaultYear = fetchedYears.find((y) => y.status === 'ACTIVE') || fetchedYears.find((y) => y.status === 'PLANNED') || fetchedYears[0];
      const activeYearId = selectedYearId ?? defaultYear?.id ?? null;
      if (defaultYear && !selectedYearId) {
        setSelectedYearId(defaultYear.id);
      }

      if (activeYearId) {
        const fetchedPeriods = await academicApi.getAcademicPeriods(orgId, {
          academicYearId: activeYearId,
        });
        setPeriods(fetchedPeriods);
      } else {
        setPeriods([]);
      }
    } catch (err: any) {
      console.error('[AcademicConfigSection Error]:', err);
      setErrorMsg(err.message || 'Error al cargar la configuración académica.');
    } finally {
      setIsLoading(false);
    }
  }, [orgId, selectedYearId]);

  useEffect(() => {
    loadConfigData();
  }, [loadConfigData]);

  // Manejar cambio de año lectivo seleccionado
  const handleYearChange = async (yearId: number) => {
    setSelectedYearId(yearId);
    setIsLoading(true);
    try {
      const fetchedPeriods = await academicApi.getAcademicPeriods(orgId, {
        academicYearId: yearId,
      });
      setPeriods(fetchedPeriods);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar periodos del año seleccionado.');
    } finally {
      setIsLoading(false);
    }
  };

  // Crear Año Lectivo
  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !newYearName.trim() || !newYearStartDate || !newYearEndDate) return;
    setIsSubmittingYear(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const created = await academicApi.createAcademicYear(orgId, {
        name: newYearName.trim(),
        startDate: newYearStartDate,
        endDate: newYearEndDate,
        status: 'PLANNED',
      });
      setYears((prev) => [created, ...prev]);
      setSelectedYearId(created.id);
      setPeriods([]);
      setIsNewYearOpen(false);
      setNewYearName('');
      setNewYearStartDate('');
      setNewYearEndDate('');
      setSuccessMsg(`Año lectivo "${created.name}" creado con éxito.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo crear el año lectivo.');
    } finally {
      setIsSubmittingYear(false);
    }
  };

  // Cambiar estado de Año Lectivo
  const handleChangeYearStatus = async (yearId: number, status: AcademicYearStatus) => {
    if (!orgId) return;
    try {
      const updated = await academicApi.changeAcademicYearStatus(orgId, yearId, status);
      setYears((prev) => prev.map((y) => (y.id === yearId ? updated : y)));
      setSuccessMsg(`Estado del año lectivo actualizado a ${status}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el estado del año lectivo.');
    }
  };

  // Crear Periodo Académico
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !selectedYearId || !newPeriodName.trim() || !newPeriodStartDate || !newPeriodEndDate) return;
    setIsSubmittingPeriod(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const created = await academicApi.createAcademicPeriod(orgId, {
        academicYearId: selectedYearId,
        name: newPeriodName.trim(),
        type: newPeriodType,
        order: newPeriodOrder,
        startDate: newPeriodStartDate,
        endDate: newPeriodEndDate,
        parentId: newPeriodParentId ? Number(newPeriodParentId) : null,
        status: 'ACTIVE',
      });
      setPeriods((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      setIsNewPeriodOpen(false);
      setNewPeriodName('');
      setNewPeriodStartDate('');
      setNewPeriodEndDate('');
      setNewPeriodParentId('');
      setSuccessMsg(`Periodo "${created.name}" agregado con éxito.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo crear el periodo académico.');
    } finally {
      setIsSubmittingPeriod(false);
    }
  };

  // Cambiar estado de Periodo Académico
  const handleChangePeriodStatus = async (periodId: number, status: AcademicPeriodStatus) => {
    if (!orgId) return;
    try {
      const updated = await academicApi.changeAcademicPeriodStatus(orgId, periodId, status);
      setPeriods((prev) => prev.map((p) => (p.id === periodId ? updated : p)));
      setSuccessMsg(`Estado del periodo actualizado a ${status}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar estado del periodo.');
    }
  };

  const selectedYear = years.find((y) => y.id === selectedYearId);

  return (
    <div className="space-y-6 pt-4 border-t border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Configuración de Años Lectivos y Periodos Académicos
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Estructura temporal oficial de la institución (trimestres, quimestres, parciales y ponderaciones).
          </p>
        </div>

        {isAdminOrOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewYearOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Año Lectivo</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Formulario Modal / Card para Crear Año Lectivo */}
      {isNewYearOpen && (
        <form
          onSubmit={handleCreateYear}
          className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 text-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Registrar Nuevo Año Lectivo
            </span>
            <button
              type="button"
              onClick={() => setIsNewYearOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nombre Oficial *</label>
              <input
                required
                type="text"
                placeholder="Ej. 2026 - 2027"
                value={newYearName}
                onChange={(e) => setNewYearName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fecha de Inicio *</label>
              <input
                required
                type="date"
                value={newYearStartDate}
                onChange={(e) => setNewYearStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fecha de Fin *</label>
              <input
                required
                type="date"
                value={newYearEndDate}
                onChange={(e) => setNewYearEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewYearOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSubmittingYear || !newYearName || !newYearStartDate || !newYearEndDate}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmittingYear ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Crear Año Lectivo</span>
            </button>
          </div>
        </form>
      )}

      {/* Selector de Años Lectivos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {years.map((year) => (
          <div
            key={year.id}
            onClick={() => handleYearChange(year.id)}
            className={`p-4 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between ${
              selectedYearId === year.id
                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-indigo-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                {year.name}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  YEAR_STATUS_COLORS[year.status] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {year.status}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
              <div>Desde: {new Date(year.startDate).toLocaleDateString('es-EC')}</div>
              <div>Hasta: {new Date(year.endDate).toLocaleDateString('es-EC')}</div>
            </div>

            {isAdminOrOwner && (
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Estado:</span>
                <select
                  value={year.status}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleChangeYearStatus(year.id, e.target.value as AcademicYearStatus);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-white font-bold text-slate-700"
                >
                  <option value="PLANNED">PLANNED</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {years.length === 0 && !isLoading && (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
          No hay años lectivos registrados. {isAdminOrOwner && 'Haga clic en "Nuevo Año Lectivo" para configurar el primero.'}
        </div>
      )}

      {/* Subsección: Periodos Académicos del Año Seleccionado */}
      {selectedYear && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Periodos Académicos de {selectedYear.name}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Etapas de evaluación asociadas al año lectivo activo.
              </p>
            </div>

            {isAdminOrOwner && (
              <button
                onClick={() => setIsNewPeriodOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Agregar Periodo</span>
              </button>
            )}
          </div>

          {/* Formulario Modal para Agregar Periodo */}
          {isNewPeriodOpen && (
            <form
              onSubmit={handleCreatePeriod}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Definir Periodo / Término</span>
                <button
                  type="button"
                  onClick={() => setIsNewPeriodOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Primer Trimestre"
                    value={newPeriodName}
                    onChange={(e) => setNewPeriodName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Periodo *</label>
                  <select
                    value={newPeriodType}
                    onChange={(e) => setNewPeriodType(e.target.value as AcademicPeriodType)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="TRIMESTER">Trimestre</option>
                    <option value="QUIMESTER">Quimestre</option>
                    <option value="SEMESTER">Semestre</option>
                    <option value="BIMESTER">Bimestre</option>
                    <option value="PARTIAL">Parcial</option>
                    <option value="YEAR">Año Completo</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Orden Secuencial *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={newPeriodOrder}
                    onChange={(e) => setNewPeriodOrder(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Periodo Padre (Opcional)</label>
                  <select
                    value={newPeriodParentId}
                    onChange={(e) => setNewPeriodParentId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="">Ninguno (Periodo Principal)</option>
                    {periods
                      .filter((p) => p.type !== 'PARTIAL')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.type})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Inicio *</label>
                  <input
                    required
                    type="date"
                    value={newPeriodStartDate}
                    onChange={(e) => setNewPeriodStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Fin *</label>
                  <input
                    required
                    type="date"
                    value={newPeriodEndDate}
                    onChange={(e) => setNewPeriodEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPeriodOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPeriod || !newPeriodName || !newPeriodStartDate || !newPeriodEndDate}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingPeriod ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Guardar Periodo</span>
                </button>
              </div>
            </form>
          )}

          {/* Tabla de Periodos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-2.5 px-3">Orden</th>
                  <th className="py-2.5 px-3">Nombre del Periodo</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 font-mono">Fechas</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  {isAdminOrOwner && <th className="py-2.5 px-3 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrOwner ? 6 : 5} className="py-6 text-center text-slate-400 italic">
                      No hay periodos configurados en este año lectivo.
                    </td>
                  </tr>
                ) : (
                  periods.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#{p.order}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        {p.parentId ? <ChevronRight className="w-3 h-3 text-slate-400" /> : null}
                        {p.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-[10px] border border-indigo-100">
                          {PERIOD_TYPE_LABELS[p.type] || p.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {new Date(p.startDate).toLocaleDateString('es-EC')} — {new Date(p.endDate).toLocaleDateString('es-EC')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            PERIOD_STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      {isAdminOrOwner && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(p.status === 'ACTIVE' || p.status === 'LOCKED') && (
                              <>
                                <select
                                  value={p.status}
                                  onChange={(e) =>
                                    handleChangePeriodStatus(p.id, e.target.value as AcademicPeriodStatus)
                                  }
                                  className="px-2 py-0.5 text-[10px] rounded border border-slate-200 bg-white font-bold text-slate-700"
                                >
                                  <option value="ACTIVE">ACTIVE</option>
                                  <option value="LOCKED">LOCKED</option>
                                </select>

                                <button
                                  onClick={() => setClosureModalPeriod(p)}
                                  className="px-2 py-1 text-[10px] rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold transition flex items-center gap-1"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Cerrar Periodo</span>
                                </button>
                              </>
                            )}

                            {p.status === 'CLOSED' && (
                              <button
                                onClick={() => handleChangePeriodStatus(p.id, 'ARCHIVED')}
                                className="px-2 py-1 text-[10px] rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold transition"
                              >
                                Archivar
                              </button>
                            )}

                            {p.status === 'ARCHIVED' && (
                              <span className="text-[10px] text-slate-400 font-medium">Terminal</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Cierre de Periodo */}
      {closureModalPeriod && (
        <PeriodClosureModal
          isOpen={closureModalPeriod !== null}
          onClose={() => setClosureModalPeriod(null)}
          orgId={orgId}
          period={closureModalPeriod}
          onSuccess={() => {
            loadConfigData();
            setSuccessMsg(`Periodo '${closureModalPeriod.name}' cerrado exitosamente.`);
          }}
        />
      )}
    </div>
  );
};
