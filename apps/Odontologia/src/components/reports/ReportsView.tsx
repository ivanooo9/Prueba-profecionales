import React, { useEffect, useState } from 'react';
import { dentalService } from '../../services/dentalService';
import { DentalBudget, DentalTreatmentPlan } from '../../types';
import { BarChart3, Printer, Users, CalendarCheck, Activity, Receipt, DollarSign, Wallet } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';

export const ReportsView: React.FC = () => {
  const [realBudgets, setRealBudgets] = useState<DentalBudget[]>(dentalService.getAllRealBudgets());
  const [realPlans, setRealPlans] = useState<DentalTreatmentPlan[]>(dentalService.getAllRealTreatmentPlans());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      dentalService.loadAllRealBudgets(),
      dentalService.loadAllRealTreatmentPlans(),
      dentalService.loadAppointments()
    ])
      .then(([budgets, plans]) => {
        if (!isMounted) return;
        setRealBudgets(budgets);
        setRealPlans(plans);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[ReportsView] Error loading reports data:', err);
        setIsLoading(false);
      });

    const unsubscribe = dentalService.subscribe(() => {
      if (isMounted) {
        setRealBudgets(dentalService.getAllRealBudgets());
        setRealPlans(dentalService.getAllRealTreatmentPlans());
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const metrics = dentalService.getDashboardMetrics();
  const patients = dentalService.getPatients();
  const appointments = dentalService.getAppointments();
  const treatments = dentalService.getTreatments();
  const budgets = dentalService.getBudgets();

  // Métricas reales calculadas desde PostgreSQL
  const hasRealData = realBudgets.length > 0 || realPlans.length > 0;

  const totalBudgetsApproved = hasRealData
    ? realBudgets.filter(b => b.status === 'ACCEPTED').reduce((sum, b) => sum + b.total, 0)
    : metrics.totalBudgetsApproved;

  const totalCollectedPaid = hasRealData
    ? realBudgets.reduce((sum, b) => sum + (b.paidAmount || 0), 0)
    : 0;

  const totalPendingBalance = hasRealData
    ? realBudgets.reduce((sum, b) => sum + (b.balance || 0), 0)
    : 0;

  const activeTreatmentsCount = hasRealData
    ? realPlans.filter(p => p.status === 'ACTIVE').length
    : metrics.activeTreatments;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reportes y Métricas Clínicas</h2>
          <p className="text-xs text-slate-500 mt-1">
            Resumen consolidado de pacientes, agenda, procedimientos clínicos y recaudación financiera.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-cyan-400" />
          <span>Imprimir Reporte</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pacientes"
          value={patients.length || metrics.totalPatients}
          subtitle="Registrados en el sistema"
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Citas de Hoy"
          value={metrics.todayAppointments}
          subtitle="Agendadas para hoy"
          icon={<CalendarCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          title="Tratamientos Activos"
          value={activeTreatmentsCount}
          subtitle={hasRealData ? "Planes en curso en PostgreSQL" : "En progreso clínico"}
          icon={<Activity className="w-5 h-5" />}
          iconBgColor="bg-cyan-50 text-cyan-600"
        />
        <MetricCard
          title="Presupuestos Aprobados"
          value={`$${totalBudgetsApproved.toFixed(2)}`}
          subtitle="Ingresos aceptados"
          icon={<Receipt className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Tarjetas Financieras Adicionales si hay datos de cobranza */}
      {hasRealData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Recaudado en Abonos
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
                ${totalCollectedPaid.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">Pagos formalmente asentados</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Saldo Pendiente por Cobrar
              </span>
              <span className="text-2xl font-bold font-mono text-amber-700 mt-1 block">
                ${totalPendingBalance.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">Cuentas corrientes de presupuestos activos</span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Summary Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Treatments Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Desglose de Planes y Tratamientos
          </h3>
          <div className="space-y-3 text-xs">
            {hasRealData ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Activos en Curso:</span>
                  <span className="font-mono font-bold text-cyan-700">
                    {realPlans.filter(p => p.status === 'ACTIVE').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Completados:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {realPlans.filter(p => p.status === 'COMPLETED').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">En Borrador / Planificación:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {realPlans.filter(p => p.status === 'DRAFT').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Cancelados:</span>
                  <span className="font-mono font-bold text-slate-400">
                    {realPlans.filter(p => p.status === 'CANCELLED').length}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">En progreso:</span>
                  <span className="font-mono font-bold text-cyan-700">
                    {treatments.filter(t => t.status === 'En progreso').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Completados:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {treatments.filter(t => t.status === 'Completado').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Planificados:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {treatments.filter(t => t.status === 'Planificado').length}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Budgets Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Conversión y Estado de Presupuestos
          </h3>
          <div className="space-y-3 text-xs">
            {hasRealData ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Aceptados:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {realBudgets.filter(b => b.status === 'ACCEPTED').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Emitidos a Pacientes:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {realBudgets.filter(b => b.status === 'ISSUED').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">En Borrador:</span>
                  <span className="font-mono font-bold text-slate-600">
                    {realBudgets.filter(b => b.status === 'DRAFT').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Rechazados / Cancelados:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {realBudgets.filter(b => b.status === 'REJECTED' || b.status === 'CANCELLED').length}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Aprobados:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {budgets.filter(b => b.status === 'Aprobado').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Pendientes / Enviados:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {budgets.filter(b => b.status === 'Pendiente' || b.status === 'Enviado').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Rechazados:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {budgets.filter(b => b.status === 'Rechazado').length}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
