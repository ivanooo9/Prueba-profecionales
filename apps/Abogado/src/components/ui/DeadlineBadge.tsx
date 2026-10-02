import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { DeadlineStatus } from '../../types';

export interface DeadlineBadgeProps {
  dueDate: string; // YYYY-MM-DD
  status: DeadlineStatus;
}

export const DeadlineBadge: React.FC<DeadlineBadgeProps> = ({ dueDate, status }) => {
  if (status === 'Cumplido') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
        <CheckCircle className="w-3.5 h-3.5" />
        Cumplido
      </span>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dueDate.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0 || status === 'Vencido') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        VENCIDO ({Math.abs(diffDays)}d)
      </span>
    );
  }

  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        ¡VENCE HOY!
      </span>
    );
  }

  if (diffDays <= 2) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/70 text-amber-800 border border-amber-200/80 font-medium text-xs">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        En {diffDays} días ({dueDate})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
      <Clock className="w-3.5 h-3.5 text-slate-400" />
      {diffDays} días ({dueDate})
    </span>
  );
};
