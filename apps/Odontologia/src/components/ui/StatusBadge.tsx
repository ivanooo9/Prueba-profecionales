import React from 'react';
import { AppointmentStatus, TreatmentStatus, BudgetStatus, ToothState } from '../../types';

interface StatusBadgeProps {
  status: AppointmentStatus | TreatmentStatus | BudgetStatus | ToothState | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-medium' : 'px-2.5 py-1 text-xs font-semibold';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    // Appointment Statuses
    case 'Confirmada':
    case 'Aprobado':
    case 'Completado':
    case 'Atendida':
    case 'Sano':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;

    case 'En progreso':
    case 'En espera':
    case 'Tratamiento':
    case 'Restauracion':
    case 'Restauración':
      colorClasses = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      break;

    case 'Programada':
    case 'Planificado':
    case 'Enviado':
    case 'Pendiente':
    case 'Corona':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      break;

    case 'Caries':
    case 'Extraccion_Indicada':
    case 'Extracción indicada':
    case 'Cancelada':
    case 'No asistió':
    case 'Rechazado':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      break;

    case 'Ausente':
    case 'Suspendido':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-300';
      break;

    case 'Fractura':
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
  }

  return (
    <span className={`inline-flex items-center rounded-full border ${sizeClasses} ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75"></span>
      {status === 'Extraccion_Indicada' ? 'Extracción indic.' : status}
    </span>
  );
};
