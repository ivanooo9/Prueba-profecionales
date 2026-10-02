import React from 'react';
import { ProjectPriority } from '../../types';

interface PriorityBadgeProps {
  priority: ProjectPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  let style = 'bg-slate-100 text-slate-600 border-slate-200';

  if (priority === 'Alta') {
    style = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (priority === 'Media') {
    style = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (priority === 'Baja') {
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  const sizeStyle = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-md border ${sizeStyle} ${style}`}>
      Priority: {priority}
    </span>
  );
};
