import React, { useState, useEffect } from 'react';
import { Treatment, DentalTreatmentPlan, DentalTreatmentItem, DentalTreatmentPlanStatus, DentalTreatmentItemStatus } from '../../types';
import { dentalService } from '../../services/dentalService';
import { StatusBadge } from '../ui/StatusBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { EmptyState } from '../ui/EmptyState';
import { SearchFilter } from '../ui/SearchFilter';
import { Activity, Plus, CheckCircle2, User, Calendar, BookOpen, Trash2, Check, Clock, AlertCircle, FilePlus, ChevronRight, Receipt, Stethoscope, ChevronDown } from 'lucide-react';
import { TreatmentFormModal } from './TreatmentFormModal';
import { ProcedureCatalogModal } from './ProcedureCatalogModal';
import { CreatePlanModal } from './CreatePlanModal';
import { AddTreatmentItemModal } from './AddTreatmentItemModal';
import { GenerateBudgetModal } from '../budgets/GenerateBudgetModal';
import { RecordExecutionModal } from './RecordExecutionModal';

interface TreatmentListProps {
  patientIdFilter?: string;
  onSelectPatient?: (patientId: string) => void;
}

export const TreatmentList: React.FC<TreatmentListProps> = ({
  patientIdFilter,
  onSelectPatient
}) => {
  const isMockPatient = Boolean(patientIdFilter && patientIdFilter.startsWith('PAT-'));
  const isRealMode = !isMockPatient;
  const isRealPatient = Boolean(patientIdFilter && !patientIdFilter.startsWith('PAT-'));

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [activePlanForNewItem, setActivePlanForNewItem] = useState<{ planId: number; patientId?: number | string } | null>(null);
  const [activePlanForBudget, setActivePlanForBudget] = useState<DentalTreatmentPlan | null>(null);
  const [executionTarget, setExecutionTarget] = useState<{ planId: number; item: DentalTreatmentItem; patientId?: number | string } | null>(null);
  const [expandedExecutionsItemId, setExpandedExecutionsItemId] = useState<number | null>(null);

  // Real plans state
  const [realPlans, setRealPlans] = useState<DentalTreatmentPlan[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [realError, setRealError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);

  // Filters and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Cargar planes reales (modo paciente o vista global de la organización)
  useEffect(() => {
    if (isMockPatient) return;

    let isMounted = true;
    setIsLoadingReal(true);
    setRealError(null);

    const loadPromise = patientIdFilter
      ? dentalService.loadRealTreatmentPlans(patientIdFilter)
      : dentalService.loadAllRealTreatmentPlans();

    loadPromise
      .then((plans) => {
        if (!isMounted) return;
        setRealPlans(plans);
        setIsLoadingReal(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[TreatmentList] Error loading real plans:', err);
        setRealError('Error al cargar planes de tratamiento desde la base de datos.');
        setIsLoadingReal(false);
      });

    const unsubscribe = dentalService.subscribe(() => {
      if (isMounted) {
        if (patientIdFilter) {
          setRealPlans(dentalService.getRealTreatmentPlans(patientIdFilter));
        } else {
          setRealPlans(dentalService.getAllRealTreatmentPlans());
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [patientIdFilter, isMockPatient]);

  // Legacy mock treatments handling
  const treatments = patientIdFilter 
    ? dentalService.getTreatmentsByPatient(patientIdFilter)
    : dentalService.getTreatments();

  const filteredTreatments = (treatments || []).filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      (t.title || '').toLowerCase().includes(q) ||
      (t.patientName || '').toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q));

    const matchesStatus = !statusFilter || t.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  const handleUpdateProgress = (id: string, newProgress: number) => {
    const newStatus = newProgress === 100 ? 'Completado' : 'En progreso';
    dentalService.updateTreatmentProgress(id, newProgress, newStatus);
  };

  // Real plan item status toggler
  const handleCycleItemStatus = async (planId: number, item: DentalTreatmentItem, planPatientId?: number | string) => {
    const targetPatientId = patientIdFilter || (planPatientId ? String(planPatientId) : undefined);
    if (!targetPatientId) return;
    setUpdatingItemId(item.id);

    const nextStatus: Record<DentalTreatmentItemStatus, DentalTreatmentItemStatus> = {
      PLANNED: 'IN_PROGRESS',
      IN_PROGRESS: 'COMPLETED',
      COMPLETED: 'PLANNED',
      CANCELLED: 'PLANNED'
    };

    try {
      await dentalService.updateRealTreatmentItem(targetPatientId, planId, item.id, {
        status: nextStatus[item.status]
      });
      if (!patientIdFilter) {
        await dentalService.loadAllRealTreatmentPlans();
      }
    } catch (err: any) {
      console.error('[TreatmentList] Error cycling item status:', err);
      alert(err.message || 'Error al actualizar estado del procedimiento.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleDeleteItem = async (planId: number, itemId: number, planPatientId?: number | string) => {
    const targetPatientId = patientIdFilter || (planPatientId ? String(planPatientId) : undefined);
    if (!targetPatientId) return;
    if (!window.confirm('¿Está seguro de eliminar este procedimiento del plan de tratamiento?')) return;

    setUpdatingItemId(itemId);
    try {
      await dentalService.deleteRealTreatmentItem(targetPatientId, planId, itemId);
      if (!patientIdFilter) {
        await dentalService.loadAllRealTreatmentPlans();
      }
    } catch (err: any) {
      console.error('[TreatmentList] Error deleting item:', err);
      alert(err.message || 'Error al eliminar procedimiento.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handlePlanStatusChange = async (planId: number, newStatus: string, planPatientId?: number | string) => {
    const targetPatientId = patientIdFilter || (planPatientId ? String(planPatientId) : undefined);
    if (!targetPatientId) return;
    try {
      await dentalService.updateRealTreatmentPlan(targetPatientId, planId, {
        status: newStatus
      });
      if (!patientIdFilter) {
        await dentalService.loadAllRealTreatmentPlans();
      }
    } catch (err: any) {
      console.error('[TreatmentList] Error updating plan status:', err);
      alert(err.message || 'Error al actualizar estado del plan.');
    }
  };

  const getPlanStatusBadge = (status: DentalTreatmentPlanStatus) => {
    const map: Record<DentalTreatmentPlanStatus, { label: string; bg: string; text: string }> = {
      DRAFT: { label: 'Borrador', bg: 'bg-slate-100', text: 'text-slate-700' },
      ACTIVE: { label: 'Activo', bg: 'bg-cyan-100', text: 'text-cyan-800' },
      COMPLETED: { label: 'Completado', bg: 'bg-emerald-100', text: 'text-emerald-800' },
      CANCELLED: { label: 'Cancelado', bg: 'bg-rose-100', text: 'text-rose-800' }
    };
    const s = map[status] || map.DRAFT;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  const getItemStatusBadge = (status: DentalTreatmentItemStatus) => {
    const map: Record<DentalTreatmentItemStatus, { label: string; bg: string; text: string }> = {
      PLANNED: { label: 'Planificado', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
      IN_PROGRESS: { label: 'En Curso', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
      COMPLETED: { label: 'Realizado', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
      CANCELLED: { label: 'Cancelado', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' }
    };
    const s = map[status] || map.PLANNED;
    return (
      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Planes de Tratamiento Odontológico</h2>
          <p className="text-xs text-slate-500 mt-1">
            Seguimiento activo del presupuesto, piezas intervenidas y estado por procedimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Botón Catálogo de Procedimientos */}
          <button
            type="button"
            onClick={() => setIsCatalogModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Catálogo de Procedimientos</span>
          </button>

          {/* Botón Nuevo Plan */}
          {isRealPatient ? (
            <button
              type="button"
              onClick={() => setIsCreatePlanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-cyan-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Plan de Tratamiento</span>
            </button>
          ) : (
            <button
              onClick={() => setIsFormModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-cyan-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Tratamiento</span>
            </button>
          )}
        </div>
      </div>

      {/* VISTA PARA PACIENTES REALES O VISTA GLOBAL ORGANIZACIONAL (PERSISTENCIA CORE POSTGRESQL) */}
      {isRealMode ? (
        <div className="space-y-6">
          {/* Barra de búsqueda y filtros */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
            <SearchFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Buscar plan por título, procedimiento o paciente..."
              filterOptions={[
                { label: 'Borrador', value: 'DRAFT' },
                { label: 'Activo', value: 'ACTIVE' },
                { label: 'Completado', value: 'COMPLETED' },
                { label: 'Cancelado', value: 'CANCELLED' }
              ]}
              selectedFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />
          </div>

          {realError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {realError}
            </div>
          )}

          {isLoadingReal ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Activity className="w-6 h-6 animate-spin text-cyan-600 mx-auto mb-2" />
              <p className="text-xs">Cargando planes de tratamiento...</p>
            </div>
          ) : realPlans.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-8 h-8" />}
              title="Sin planes de tratamiento"
              description={
                patientIdFilter
                  ? "No existen planes de tratamiento creados para este paciente en PostgreSQL. Puede crear un nuevo plan aquí o agregar piezas desde el Odontograma."
                  : "No existen planes de tratamiento registrados en la organización clínica. Cree un nuevo plan dentro de la ficha de un paciente o agréguelos desde su Odontograma."
              }
              actionLabel={patientIdFilter ? "+ Crear Primer Plan" : undefined}
              onAction={patientIdFilter ? () => setIsCreatePlanModalOpen(true) : undefined}
            />
          ) : (() => {
            const filteredRealPlans = (realPlans || []).filter((plan) => {
              const planTitle = plan.title || 'Plan de Tratamiento';
              const planPatientName = plan.patientName || '';
              const planItems = plan.items || [];
              const q = searchQuery.toLowerCase();
              const matchesQuery =
                planTitle.toLowerCase().includes(q) ||
                planPatientName.toLowerCase().includes(q) ||
                planItems.some(
                  (it) =>
                    (it.procedureName || '').toLowerCase().includes(q) ||
                    (it.notes && it.notes.toLowerCase().includes(q))
                );
              const matchesStatus = !statusFilter || plan.status === statusFilter;
              return matchesQuery && matchesStatus;
            });
            const totalRealPages = Math.ceil(filteredRealPlans.length / PAGE_SIZE) || 1;
            const paginatedRealPlans = filteredRealPlans.slice(
              (currentPage - 1) * PAGE_SIZE,
              currentPage * PAGE_SIZE
            );

            return (
              <div className="space-y-6">
                {paginatedRealPlans.map((plan) => {
                const planItems = plan.items || [];
                const completedItems = planItems.filter(i => i.status === 'COMPLETED').length;
                const totalItems = planItems.length;
                const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-cyan-200 transition-colors"
                  >
                    {/* Header del Plan */}
                    <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{plan.title}</h3>
                          {getPlanStatusBadge(plan.status)}
                          {plan.patientName && (
                            <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <User className="w-3 h-3 text-cyan-600" />
                              <span className="font-semibold text-slate-700">Paciente:</span>
                              {onSelectPatient && plan.patientId ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectPatient(String(plan.patientId))}
                                  className="text-cyan-700 hover:text-cyan-900 font-bold hover:underline"
                                >
                                  {plan.patientName}
                                </button>
                              ) : (
                                <span className="font-semibold text-slate-800">{plan.patientName}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {plan.notes && (
                          <p className="text-xs text-slate-500 max-w-xl">{plan.notes}</p>
                        )}
                        <div className="text-[11px] text-slate-400">
                          Creado: {new Date(plan.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        {/* Selector de estado del plan */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[11px] text-slate-400 font-semibold">Estado:</span>
                          <select
                            value={plan.status}
                            onChange={(e) => handlePlanStatusChange(plan.id, e.target.value, plan.patientId)}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                          >
                            <option value="DRAFT">Borrador</option>
                            <option value="ACTIVE">Activo</option>
                            <option value="COMPLETED">Completado</option>
                            <option value="CANCELLED">Cancelado</option>
                          </select>
                        </div>

                        {/* Presupuesto Total Estimado */}
                        <div className="text-right pl-4 border-l border-slate-200">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                            Total Estimado
                          </span>
                          <span className="text-lg font-mono font-bold text-slate-900">
                            ${(Number(plan.totalEstimated ?? (plan as any).totalAmount) || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso de procedimientos completados */}
                    {totalItems > 0 && (
                      <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-[11px] font-semibold">Avance clínico:</span>
                          <span className="font-mono text-cyan-700 font-bold">{completedItems} de {totalItems} procedimientos realizados ({progressPct}%)</span>
                        </div>
                        <div className="w-48 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tabla de Procedimientos / Ítems */}
                    <div className="overflow-x-auto">
                      {planItems.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Sin procedimientos asociados a este plan. Utilice el botón inferior o agréguelos desde el Odontograma.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200/60">
                            <tr>
                              <th className="py-2.5 px-4">Pieza</th>
                              <th className="py-2.5 px-4">Procedimiento</th>
                              <th className="py-2.5 px-4 text-center">Cant.</th>
                              <th className="py-2.5 px-4 text-right">Precio Unit.</th>
                              <th className="py-2.5 px-4 text-right">Total</th>
                              <th className="py-2.5 px-4 text-center">Estado</th>
                              <th className="py-2.5 px-4 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {planItems.map((item) => (
                              <React.Fragment key={item.id}>
                                <tr className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                                    {item.toothNumber ? (
                                      <span className="px-2 py-0.5 bg-slate-100 rounded text-cyan-800">
                                        #{item.toothNumber}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-sans font-medium text-[11px]">
                                        General (Boca)
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-900">{item.procedureName}</div>
                                    {item.notes && (
                                      <div className="text-[11px] text-slate-500 italic mt-0.5">{item.notes}</div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                                    {item.quantity ?? 1}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                                    ${(Number(item.unitPrice) || 0).toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                    ${(Number(item.totalPrice ?? item.unitPrice) || 0).toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {getItemStatusBadge(item.status)}
                                  </td>
                                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                                    {/* Botón Registrar Evolución / Sesión */}
                                    {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
                                      <button
                                        type="button"
                                        onClick={() => setExecutionTarget({ planId: plan.id, item, patientId: plan.patientId })}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-cyan-800 font-bold text-[11px] rounded-lg transition-colors shadow-2xs"
                                        title="Registrar evolución clínica o sesión"
                                      >
                                        <Stethoscope className="w-3 h-3 text-cyan-600" />
                                        <span>Evolución</span>
                                      </button>
                                    )}

                                    {/* Contador de sesiones y toggle historial */}
                                    {item.executions && item.executions.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedExecutionsItemId(expandedExecutionsItemId === item.id ? null : item.id)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg transition-colors"
                                        title="Ver historial de sesiones clínicas"
                                      >
                                        <span>{item.executions.length} {item.executions.length === 1 ? 'sesión' : 'sesiones'}</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedExecutionsItemId === item.id ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleCycleItemStatus(plan.id, item, plan.patientId)}
                                      disabled={updatingItemId === item.id}
                                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] rounded transition-colors"
                                      title="Avanzar estado del procedimiento"
                                    >
                                      Cambiar Estado
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(plan.id, item.id, plan.patientId)}
                                      disabled={updatingItemId === item.id}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                      title="Eliminar procedimiento del plan"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                                {/* Subfila desplegable con historial de ejecuciones */}
                                {expandedExecutionsItemId === item.id && item.executions && item.executions.length > 0 && (
                                  <tr className="bg-slate-50/90 border-b border-slate-100">
                                    <td colSpan={7} className="px-6 py-3">
                                      <div className="space-y-2">
                                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                          <Clock className="w-3 h-3 text-cyan-600" />
                                          <span>Historial de Sesiones Clínicas ({item.executions.length})</span>
                                        </div>
                                        <div className="divide-y divide-slate-200/60 rounded-xl bg-white border border-slate-200/80 overflow-hidden text-xs">
                                          {item.executions.map((ex, idx) => (
                                            <div key={ex.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-cyan-900 bg-cyan-50 px-1.5 py-0.5 rounded text-[10px]">
                                                    Sesión #{item.executions!.length - idx}
                                                  </span>
                                                  <span className="text-slate-500 font-mono text-[11px]">
                                                    {new Date(ex.performedAt).toLocaleDateString()} {new Date(ex.performedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                  </span>
                                                  {ex.performedByUser && (
                                                    <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                                      <User className="w-3 h-3 text-slate-400" />
                                                      {ex.performedByUser.name}
                                                    </span>
                                                  )}
                                                </div>
                                                {ex.clinicalNotes && (
                                                  <p className="text-slate-700 text-xs italic bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                                    "{ex.clinicalNotes}"
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Footer del plan con botón agregar ítem */}
                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {plan.items.length} {plan.items.length === 1 ? 'ítem presupuestado' : 'ítems presupuestados'}
                      </span>
                      <div className="flex items-center gap-2">
                        {plan.items.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActivePlanForBudget(plan)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 font-semibold text-xs rounded-xl shadow-xs transition-colors"
                            title="Generar Presupuesto formal a partir de este plan"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Generar Presupuesto</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActivePlanForNewItem({ planId: plan.id, patientId: plan.patientId })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-cyan-50 border border-cyan-600/70 text-cyan-700 font-semibold text-xs rounded-xl shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Agregar Procedimiento</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Barra de Paginación */}
              {totalRealPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 no-print">
                  <span>
                    Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, filteredRealPlans.length)} de {filteredRealPlans.length} planes de tratamiento
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 font-medium transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="font-semibold text-slate-800">
                      Página {currentPage} de {totalRealPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalRealPages, p + 1))}
                      disabled={currentPage === totalRealPages}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 font-medium transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        </div>
      ) : (
        /* VISTA MOCK LEGACY (Para vista global de tratamientos sin paciente seleccionado o PAT-*) */
        <>
          {/* Search Filter */}
          {!patientIdFilter && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <SearchFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder="Buscar por tratamiento o paciente..."
                filterOptions={[
                  { label: 'Planificado', value: 'Planificado' },
                  { label: 'En progreso', value: 'En progreso' },
                  { label: 'Completado', value: 'Completado' },
                  { label: 'Suspendido', value: 'Suspendido' }
                ]}
                selectedFilter={statusFilter}
                onFilterChange={setStatusFilter}
              />
            </div>
          )}

          {/* Grid of Treatments */}
          {filteredTreatments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTreatments.map(t => (
                <div 
                  key={t.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-cyan-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                      {!patientIdFilter && onSelectPatient && (
                        <button
                          onClick={() => onSelectPatient(t.patientId)}
                          className="text-xs text-cyan-600 font-semibold hover:underline mt-0.5 block text-left"
                        >
                          Paciente: {t.patientName}
                        </button>
                      )}
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Piezas Dentales</span>
                      {t.pieceNumbers && t.pieceNumbers.length > 0 ? (
                        <div className="flex gap-1 mt-0.5">
                          {t.pieceNumbers.map(p => (
                            <span key={p} className="font-mono bg-white border px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-800">
                              #{p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-medium">General</span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Costo Estimado</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">${(Number(t.estimatedCost) || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <ProgressBar progress={t.progress} />
                    
                    <div className="flex items-center justify-between gap-2 text-xs pt-1">
                      <span className="text-[10px] text-slate-500">Actualizar avance:</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={t.progress}
                        onChange={(e) => handleUpdateProgress(t.id, parseInt(e.target.value, 10))}
                        className="w-36 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
                    <span>Inicio: {t.startDate}</span>
                    <span>Objetivo: {t.targetDate || 'Sin fecha'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity className="w-8 h-8" />}
              title="Sin tratamientos encontrados"
              description="No existen planes de tratamiento con los criterios seleccionados."
              actionLabel="Crear Tratamiento"
              onAction={() => setIsFormModalOpen(true)}
            />
          )}

          {/* Legacy Modal Form */}
          <TreatmentFormModal
            isOpen={isFormModalOpen}
            onClose={() => setIsFormModalOpen(false)}
            defaultPatientId={patientIdFilter}
          />
        </>
      )}

      {/* Catálogo de Procedimientos Modal */}
      <ProcedureCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
      />

      {/* Crear Plan Real Modal */}
      {isRealPatient && patientIdFilter && (
        <CreatePlanModal
          isOpen={isCreatePlanModalOpen}
          onClose={() => setIsCreatePlanModalOpen(false)}
          patientId={patientIdFilter}
          onSuccess={() => {
            dentalService.loadRealTreatmentPlans(patientIdFilter);
          }}
        />
      )}

      {/* Agregar Ítem al Plan Modal */}
      {isRealMode && activePlanForNewItem !== null && (
        <AddTreatmentItemModal
          isOpen={activePlanForNewItem !== null}
          onClose={() => setActivePlanForNewItem(null)}
          planId={activePlanForNewItem.planId}
          patientId={patientIdFilter || String(activePlanForNewItem.patientId || '')}
          onSuccess={() => {
            if (patientIdFilter) {
              dentalService.loadRealTreatmentPlans(patientIdFilter);
            } else {
              dentalService.loadAllRealTreatmentPlans();
            }
          }}
        />
      )}

      {/* Generar Presupuesto Modal */}
      {isRealMode && activePlanForBudget !== null && (
        <GenerateBudgetModal
          isOpen={activePlanForBudget !== null}
          onClose={() => setActivePlanForBudget(null)}
          patientId={patientIdFilter || String(activePlanForBudget.patientId || '')}
          plan={activePlanForBudget}
        />
      )}

      {/* Registrar Ejecución Clínica / Evolución Modal */}
      {isRealMode && executionTarget !== null && (
        <RecordExecutionModal
          isOpen={executionTarget !== null}
          onClose={() => setExecutionTarget(null)}
          planId={executionTarget.planId}
          item={executionTarget.item}
          patientId={patientIdFilter || String(executionTarget.patientId || '')}
          onSuccess={() => {
            if (patientIdFilter) {
              dentalService.loadRealTreatmentPlans(patientIdFilter);
            } else {
              dentalService.loadAllRealTreatmentPlans();
            }
          }}
        />
      )}
    </div>
  );
};
