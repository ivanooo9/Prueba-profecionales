import React, { useState } from 'react';
import { Budget, Project } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { MetricCard } from '../ui/MetricCard';
import { EmptyState } from '../ui/EmptyState';
import {
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  TrendingUp,
  Edit
} from 'lucide-react';

interface BudgetListProps {
  budgets: Budget[];
  projects: Project[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateModal: () => void;
  onEditBudget: (budget: Budget) => void;
  onApproveBudget?: (budget: Budget) => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({
  budgets,
  projects,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onEditBudget,
  onApproveBudget
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredBudgets = budgets.filter((b) => {
    const matchesSearch =
      (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.projectName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalEstimated = budgets.reduce((acc, b) => acc + b.estimatedAmount, 0);
  const totalApproved = budgets.reduce((acc, b) => acc + b.approvedAmount, 0);
  const approvedCount = budgets.filter((b) => b.status === 'Aprobado').length;

  return (
    <div className="space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Estimado Portafolio"
          value={`$${totalEstimated.toLocaleString()}`}
          subtitle="Suma de presupuestos proyectados"
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Total Aprobado por Clientes"
          value={`$${totalApproved.toLocaleString()}`}
          subtitle={`${approvedCount} presupuestos contratados`}
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Tasa de Aprobación"
          value={`${budgets.length > 0 ? Math.round((approvedCount / budgets.length) * 100) : 0}%`}
          subtitle={`${budgets.filter((b) => b.status === 'Enviado').length} en espera`}
          icon={DollarSign}
          color="indigo"
        />
      </div>

      {/* Top Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre de proyecto..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="all">Todos los Estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Presentado">Presentado</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Rechazado">Rechazado</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Presupuesto
        </button>
      </div>

      {/* Budget Table */}
      {filteredBudgets.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No hay presupuestos registrados"
          description="Registre propuestas económicas para dar seguimiento a los honorarios de los proyectos."
          actionLabel="Registrar Presupuesto"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Proyecto</th>
                  <th className="py-3 px-4">Presupuesto Estimado</th>
                  <th className="py-3 px-4">Presupuesto Aprobado</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Última Actualización</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBudgets.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{b.name ? `${b.name}` : b.projectName}</p>
                      <p className="text-[11px] text-slate-500 font-medium">Proyecto: {b.projectName}</p>
                      {b.items && b.items.length > 0 && (
                        <p className="text-[10px] text-slate-400 font-mono">{b.items.length} rubros presupuestados</p>
                      )}
                      {b.notes && <p className="text-[11px] text-slate-500 truncate max-w-xs">{b.notes}</p>}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      ${b.estimatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      ${b.approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={b.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{b.lastUpdated}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {b.status !== 'Aprobado' && onApproveBudget && (
                        <button
                          onClick={() => onApproveBudget(b)}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                          title="Aprobar presupuesto"
                        >
                          Aprobar
                        </button>
                      )}
                      <button
                        onClick={() => onEditBudget(b)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
