import React from 'react';
import { Project, Client, Task, Deliverable, Budget } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Printer, BarChart3, Building2, DollarSign, CheckSquare, PackageCheck } from 'lucide-react';

interface ReportsViewProps {
  projects: Project[];
  clients: Client[];
  tasks: Task[];
  deliverables: Deliverable[];
  budgets: Budget[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  projects,
  clients,
  tasks,
  deliverables,
  budgets
}) => {
  const totalEstimated = projects.reduce((acc, p) => acc + p.estimatedBudget, 0);
  const totalApproved = projects.reduce((acc, p) => acc + p.approvedBudget, 0);
  const completedTasks = tasks.filter((t) => t.status === 'Completada').length;
  const approvedDeliverables = deliverables.filter((d) => d.status === 'Aprobado' || d.status === 'Entregado').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Trigger Header (hidden during print) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-arch-50 text-arch-600 rounded-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Informes y Reportes Ejecutivos</h3>
            <p className="text-xs text-slate-500">Resumen consolidado del estado operativo del estudio</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Exportar PDF
        </button>
      </div>

      {/* Report Sheet Document */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">
              INFORME EJECUTIVO DE OPERACIONES
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-0.5">ESTUDIO DE ARQUITECTURA & URBANISMO</p>
          </div>
          <div className="text-right text-xs font-mono text-slate-500">
            <p><strong>Fecha de emisión:</strong> {new Date().toLocaleDateString('es-ES')}</p>
            <p><strong>Estado del Sistema:</strong> Operativo</p>
          </div>
        </div>

        {/* Global Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Proyectos Totales</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{projects.length}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Clientes Activos</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{clients.length}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Avance Tareas</span>
            <p className="text-2xl font-bold font-mono text-slate-900">
              {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Entregables Listos</span>
            <p className="text-2xl font-bold font-mono text-slate-900">
              {approvedDeliverables}/{deliverables.length}
            </p>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
            Resumen Financiero del Portafolio
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <span>Presupuesto Estimado:</span>
              <strong className="font-mono text-sm text-slate-900">${totalEstimated.toLocaleString()} USD</strong>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-emerald-900">
              <span>Presupuesto Aprobado:</span>
              <strong className="font-mono text-sm text-emerald-800">${totalApproved.toLocaleString()} USD</strong>
            </div>
          </div>
        </div>

        {/* Projects Breakdown Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
            Matriz Resumen de Proyectos
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-2.5">Código</th>
                <th className="p-2.5">Proyecto</th>
                <th className="p-2.5">Cliente</th>
                <th className="p-2.5">Tipo</th>
                <th className="p-2.5">Estado</th>
                <th className="p-2.5 text-right">Progreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="p-2.5 font-mono font-bold">{p.code}</td>
                  <td className="p-2.5 font-bold text-slate-900">{p.name}</td>
                  <td className="p-2.5 text-slate-700">{p.clientName}</td>
                  <td className="p-2.5 text-slate-600">{p.type}</td>
                  <td className="p-2.5">
                    <StatusBadge status={p.status} size="sm" />
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold">{p.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures Footer for Print */}
        <div className="pt-12 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-t border-slate-400 w-48 mx-auto mb-1" />
            <p className="font-bold text-slate-800">Arq. Esteban Guarderas</p>
            <p className="text-slate-500">Director Principal del Estudio</p>
          </div>
          <div>
            <div className="border-t border-slate-400 w-48 mx-auto mb-1" />
            <p className="font-bold text-slate-800">Coordinación de Proyectos</p>
            <p className="text-slate-500">Estudio Arquitectos Quito</p>
          </div>
        </div>
      </div>
    </div>
  );
};
