import React from 'react';
import { Priority } from '../../types';
import { AlertCircle, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

export interface PriorityBadgeProps {
  priority: Priority;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true }) => {
  const getBadgeConfig = () => {
    switch (priority) {
      case 'Urgente':
        return {
          style: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
          icon: AlertCircle,
        };
      case 'Alta':
        return {
          style: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
          icon: AlertTriangle,
        };
      case 'Media':
        return {
          style: 'bg-sky-50 text-sky-700 border-sky-200 font-medium',
          icon: ArrowUp,
        };
      case 'Baja':
        return {
          style: 'bg-slate-100 text-slate-600 border-slate-200 font-normal',
          icon: ArrowDown,
        };
      default:
        return {
          style: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: ArrowDown,
        };
    }
  };

  const { style, icon: Icon } = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] border tracking-wide uppercase ${style}`}
    >
      {showIcon && <Icon className="w-3 h-3 stroke-[2.5]" />}
      {priority}
    </span>
  );
};
