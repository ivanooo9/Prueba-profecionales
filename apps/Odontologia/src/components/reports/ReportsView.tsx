import React from 'react';
import { dentalService } from '../../services/dentalService';
import { BarChart3, Printer, Users, CalendarCheck, Activity, Receipt, ShieldCheck } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';

export const ReportsView: React.FC = () => {
  const metrics = dentalService.getDashboardMetrics();
  const patients = dentalService.getPatients();
  const appointments = dentalService.getAppointments();
  const treatments = dentalService.getTreatments();
  const budgets = dentalService.getBudgets();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reportes</h2>
          <p className="text-xs text-slate-500 mt-1">
            Resumen simple de citas, tratamientos y presupuestos.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-cyan-400" />
          <span>Imprimir</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pacientes"
          value={metrics.totalPatients}
          subtitle="Registrados en sistema"
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Citas Atendidas / Hoy"
          value={metrics.todayAppointments}
          subtitle="Agendadas para hoy"
          icon={<CalendarCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          title="Tratamientos Activos"
          value={metrics.activeTreatments}
          subtitle="En progreso clínico"
          icon={<Activity className="w-5 h-5" />}
          iconBgColor="bg-cyan-50 text-cyan-600"
        />
        <MetricCard
          title="Presupuestos Aprobados"
          value={`$${metrics.totalBudgetsApproved.toFixed(2)}`}
          subtitle="Ingresos proyectados"
          icon={<Receipt className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Summary Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Treatments Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Desglose de Tratamientos Clínicos
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">En progreso:</span>
              <span className="font-mono font-bold text-cyan-700">{treatments.filter(t => t.status === 'En progreso').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Completados:</span>
              <span className="font-mono font-bold text-emerald-700">{treatments.filter(t => t.status === 'Completado').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Planificados:</span>
              <span className="font-mono font-bold text-amber-700">{treatments.filter(t => t.status === 'Planificado').length}</span>
            </div>
          </div>
        </div>

        {/* Budgets Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Conversión de Presupuestos
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Aprobados:</span>
              <span className="font-mono font-bold text-emerald-700">{budgets.filter(b => b.status === 'Aprobado').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Pendientes / Enviados:</span>
              <span className="font-mono font-bold text-amber-700">{budgets.filter(b => b.status === 'Pendiente' || b.status === 'Enviado').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Rechazados:</span>
              <span className="font-mono font-bold text-rose-700">{budgets.filter(b => b.status === 'Rechazado').length}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
