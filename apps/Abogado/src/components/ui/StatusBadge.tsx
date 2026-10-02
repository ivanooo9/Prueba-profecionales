import React from 'react';
import { CaseStatus, DeadlineStatus, HearingStatus, TaskStatus, DocumentStatus } from '../../types';

export interface StatusBadgeProps {
  status: CaseStatus | DeadlineStatus | HearingStatus | TaskStatus | DocumentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStyles = () => {
    switch (status) {
      // Case / Deadline / Task statuses
      case 'Nuevo':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'En proceso':
      case 'En progreso':
      case 'En revisión':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Audiencia':
      case 'Programada':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
      case 'En espera':
      case 'Pendiente':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Cerrado':
      case 'Cumplido':
      case 'Celebrada':
      case 'Completada':
      case 'Aprobado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Vencido':
      case 'Atrasada':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      case 'Archivado':
      case 'Suspendida':
      case 'Cancelada':
        return 'bg-slate-200 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${px} ${getStyles()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {status}
    </span>
  );
};
