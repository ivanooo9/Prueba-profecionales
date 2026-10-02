import React, { useState, useEffect } from 'react';
import { Budget, BudgetStatus, DentalBudget, DentalBudgetStatus, DentalPaymentFinancialStatus } from '../../types';
import { dentalService } from '../../services/dentalService';
import { EmptyState } from '../ui/EmptyState';
import { SearchFilter } from '../ui/SearchFilter';
import { Receipt, Plus, Printer, Edit3, DollarSign, CreditCard, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BudgetFormModal } from './BudgetFormModal';
import { RecordPaymentModal } from './RecordPaymentModal';

interface BudgetListProps {
  patientIdFilter?: string;
  onSelectPatient?: (patientId: string) => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({
  patientIdFilter,
  onSelectPatient
}) => {
  const isRealPatient = Boolean(patientIdFilter && !patientIdFilter.startsWith('PAT-'));

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
  const [printingBudgetId, setPrintingBudgetId] = useState<string | number | null>(null);
  const [paymentModalBudget, setPaymentModalBudget] = useState<DentalBudget | null>(null);
  const [expandedPaymentsId, setExpandedPaymentsId] = useState<number | null>(null);

  // Real budgets state
  const [realBudgets, setRealBudgets] = useState<DentalBudget[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [realError, setRealError] = useState<string | null>(null);

  // Mock filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Cargar presupuestos reales si es un paciente real
  useEffect(() => {
    if (!isRealPatient || !patientIdFilter) return;

    let isMounted = true;
    setIsLoadingReal(true);
    setRealError(null);

    dentalService
      .loadRealBudgets(patientIdFilter)
      .then((budgets) => {
        if (!isMounted) return;
        setRealBudgets(budgets);
        setIsLoadingReal(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[BudgetList] Error loading real budgets:', err);
        setRealError('Error al cargar presupuestos del paciente.');
        setIsLoadingReal(false);
      });

    const unsubscribe = dentalService.subscribe(() => {
      if (isMounted) {
        setRealBudgets(dentalService.getRealBudgets(patientIdFilter));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [patientIdFilter, isRealPatient]);

  // Manejo de cambio de estado para presupuestos reales
  const handleRealStatusChange = async (budgetId: number, newStatus: string) => {
    if (!patientIdFilter) return;
    try {
      await dentalService.updateRealBudget(patientIdFilter, budgetId, { status: newStatus });
    } catch (err: any) {
      console.error('[BudgetList] Error updating budget status:', err);
      alert(err.message || 'Error al actualizar estado del presupuesto.');
    }
  };

  // Mock budgets
  const budgets = patientIdFilter
    ? dentalService.getBudgetsByPatient(patientIdFilter)
    : dentalService.getBudgets();

  const filteredBudgets = budgets.filter(b => {
    const matchesQuery = 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.patientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || b.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  const handleStatusChange = (id: string, newStatus: BudgetStatus) => {
    dentalService.updateBudgetStatus(id, newStatus);
  };

  const handlePrint = (budgetId: string | number) => {
    setPrintingBudgetId(budgetId);
    setTimeout(() => {
      window.print();
      setPrintingBudgetId(null);
    }, 200);
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Presupuesto: Borrador</span>;
      case 'ISSUED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Presupuesto: Emitido</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Presupuesto: Aceptado</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">Presupuesto: Rechazado</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-600 border border-slate-300">Presupuesto: Cancelado</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getFinancialStatusBadge = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-xs">Pago: Pagado Total</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Pago: Parcial</span>;
      case 'UNPAID':
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Pago: Sin abonos</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Presupuestos Odontológicos</h2>
          <p className="text-xs text-slate-500 mt-1">
            {isRealPatient
              ? 'Presupuestos formales congelados y registro de pagos / abonos del paciente.'
              : 'Cotizaciones y planes económicos emitidos a pacientes.'}
          </p>
        </div>

        {!isRealPatient && (
          <button
            onClick={() => {
              setEditingBudget(undefined);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Presupuesto</span>
          </button>
        )}
      </div>

      {/* VISTA REAL (Para paciente real con ID numérico en la organización activa) */}
      {isRealPatient ? (
        <div className="space-y-4">
          {realError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{realError}</span>
            </div>
          )}

          {isLoadingReal ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Cargando presupuestos formales del paciente...
            </div>
          ) : realBudgets.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title="Sin presupuestos formales"
              description="Aún no se ha generado ningún presupuesto formal para este paciente. Puede crearlo desde la pestaña 'Tratamientos' a partir de un Plan de Tratamiento."
            />
          ) : (
            <div className="space-y-4">
              {realBudgets.map((b) => {
                const isFinancialPaid = b.paymentStatus === 'PAID' || b.balance <= 0;
                const isExpanded = expandedPaymentsId === b.id;

                return (
                  <div
                    key={b.id}
                    className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 transition-all ${
                      printingBudgetId === b.id ? 'border-2 border-slate-900 shadow-none' : ''
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">#PRE-{b.id}</span>
                          <h4 className="text-base font-bold text-slate-900">{b.title}</h4>
                          {getDocumentStatusBadge(b.status)}
                          {getFinancialStatusBadge(b.paymentStatus)}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {b.treatmentPlanId && (
                            <span className="mr-3 font-semibold text-cyan-700">Plan #{b.treatmentPlanId}</span>
                          )}
                          Fecha: {new Date(b.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 no-print">
                        {/* Selector de estado documental */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[11px] text-slate-400 font-semibold">Estado:</span>
                          <select
                            value={b.status}
                            onChange={(e) => handleRealStatusChange(b.id, e.target.value)}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                          >
                            <option value="DRAFT">Borrador</option>
                            <option value="ISSUED">Emitido</option>
                            <option value="ACCEPTED">Aceptado</option>
                            <option value="REJECTED">Rechazado</option>
                            <option value="CANCELLED">Cancelado</option>
                          </select>
                        </div>

                        {/* Botón registrar abono */}
                        {!isFinancialPaid && b.status !== 'CANCELLED' && b.status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => setPaymentModalBudget(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Registrar Abono</span>
                          </button>
                        )}

                        {/* Botón imprimir */}
                        <button
                          onClick={() => handlePrint(b.id)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Imprimir presupuesto"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Tabla de ítems presupuestados */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200">
                            <th className="py-2 px-3">Procedimiento Odontológico</th>
                            <th className="py-2 px-2 text-center">Pieza</th>
                            <th className="py-2 px-2 text-center">Cant.</th>
                            <th className="py-2 px-3 text-right">Precio Unit.</th>
                            <th className="py-2 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {b.items.map((itm) => (
                            <tr key={itm.id}>
                              <td className="py-2 px-3 font-medium text-slate-900">{itm.procedureName}</td>
                              <td className="py-2 px-2 text-center font-mono">
                                {itm.toothNumber ? `#${itm.toothNumber}` : '--'}
                              </td>
                              <td className="py-2 px-2 text-center font-mono">{itm.quantity}</td>
                              <td className="py-2 px-3 text-right font-mono">${itm.unitPrice.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                ${(itm.totalPrice || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Resumen Financiero: Subtotal, Descuento, Total, Abonado, Saldo */}
                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="text-xs text-slate-500 italic max-w-md">
                        {b.notes || 'Presupuesto formal emitido al paciente. No constituye comprobante fiscal SRI.'}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-6 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Subtotal</span>
                          <span className="font-mono font-bold text-slate-700">${b.subtotal.toFixed(2)}</span>
                        </div>

                        {b.discount > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Descuento</span>
                            <span className="font-mono font-bold text-red-600">-${b.discount.toFixed(2)}</span>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                          <span className="font-mono font-bold text-slate-900">${b.total.toFixed(2)}</span>
                        </div>

                        <div className="pl-4 border-l border-slate-200">
                          <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Abonado</span>
                          <span className="font-mono font-bold text-emerald-700">${b.paidAmount.toFixed(2)}</span>
                        </div>

                        <div className="pl-4 border-l border-slate-200">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saldo Pendiente</span>
                          <span
                            className={`font-mono text-base font-bold ${
                              b.balance <= 0 ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            ${b.balance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Historial de Abonos / Pagos */}
                    {b.payments && b.payments.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedPaymentsId(isExpanded ? null : b.id)}
                          className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                            <span>
                              Historial de Abonos Registrados ({b.payments.length}) · Total Abonado: ${b.paidAmount.toFixed(2)}
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {isExpanded && (
                          <div className="overflow-x-auto p-2 bg-white">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                                  <th className="py-1.5 px-3">Fecha y Hora</th>
                                  <th className="py-1.5 px-3">Método</th>
                                  <th className="py-1.5 px-3">Referencia / Comprobante</th>
                                  <th className="py-1.5 px-3">Notas</th>
                                  <th className="py-1.5 px-3 text-right">Monto</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {b.payments.map((p) => (
                                  <tr key={p.id}>
                                    <td className="py-1.5 px-3 font-mono text-slate-500">
                                      {new Date(p.paidAt).toLocaleString()}
                                    </td>
                                    <td className="py-1.5 px-3 font-semibold text-slate-800">{p.paymentMethod}</td>
                                    <td className="py-1.5 px-3 text-slate-600">{p.reference || '--'}</td>
                                    <td className="py-1.5 px-3 text-slate-500">{p.notes || '--'}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                                      ${p.amount.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VISTA MOCK LEGACY (Para vista global de presupuestos o pacientes PAT-*) */
        <>
          {/* Filter */}
          {!patientIdFilter && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
              <SearchFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder="Buscar presupuesto por título o paciente..."
                filterOptions={[
                  { label: 'Pendiente', value: 'Pendiente' },
                  { label: 'Enviado', value: 'Enviado' },
                  { label: 'Aprobado', value: 'Aprobado' },
                  { label: 'Rechazado', value: 'Rechazado' }
                ]}
                selectedFilter={statusFilter}
                onFilterChange={setStatusFilter}
              />
            </div>
          )}

          {/* Budgets Grid */}
          {filteredBudgets.length > 0 ? (
            <div className="space-y-4">
              {filteredBudgets.map(b => (
                <div 
                  key={b.id}
                  className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 ${
                    printingBudgetId === b.id ? 'border-2 border-slate-900 shadow-none' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">#{b.id}</span>
                        <h4 className="text-base font-bold text-slate-900">{b.title}</h4>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Paciente: <span className="font-semibold text-slate-800">{b.patientName}</span> · Fecha: {b.date}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 no-print">
                      <select
                        value={b.status}
                        onChange={(e) => handleStatusChange(b.id, e.target.value as BudgetStatus)}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Enviado">Enviado</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Rechazado">Rechazado</option>
                        <option value="Completado">Completado</option>
                      </select>

                      <button
                        onClick={() => {
                          setEditingBudget(b);
                          setIsFormModalOpen(true);
                        }}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar presupuesto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handlePrint(b.id)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Imprimir presupuesto"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Items Breakdown Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200">
                          <th className="py-2 px-3">Procedimiento</th>
                          <th className="py-2 px-2 text-center">Pieza(s)</th>
                          <th className="py-2 px-3 text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {b.items.map(itm => (
                          <tr key={itm.id}>
                            <td className="py-2 px-3 font-medium text-slate-900">{itm.description}</td>
                            <td className="py-2 px-2 text-center font-mono">{itm.pieceNumber ? `#${itm.pieceNumber}` : '--'}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">${itm.price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Total & Notes */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 italic">
                      {b.notes || 'Válido por 30 días.'}
                    </p>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-400 uppercase mr-3">Monto Total:</span>
                      <span className="text-xl font-bold font-mono text-emerald-700">${b.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title="Sin presupuestos registrados"
              description="Aún no se han generado presupuestos o cotizaciones."
              actionLabel="Nuevo Presupuesto"
              onAction={() => {
                setEditingBudget(undefined);
                setIsFormModalOpen(true);
              }}
            />
          )}

          {/* Modal Builder Legacy */}
          <BudgetFormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setEditingBudget(undefined);
            }}
            defaultPatientId={patientIdFilter}
            budget={editingBudget}
          />
        </>
      )}

      {/* Modal para Registrar Pago / Abono */}
      {isRealPatient && patientIdFilter && paymentModalBudget && (
        <RecordPaymentModal
          isOpen={paymentModalBudget !== null}
          onClose={() => setPaymentModalBudget(null)}
          patientId={patientIdFilter}
          budget={paymentModalBudget}
          onSuccess={() => {
            dentalService.loadRealBudgets(patientIdFilter);
          }}
        />
      )}
    </div>
  );
};
