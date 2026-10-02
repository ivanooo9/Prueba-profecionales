import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    // Project & Stage statuses
    case 'Planificación':
      badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
      break;
    case 'Diseño':
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'En desarrollo':
    case 'En progreso':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'En revisión':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'En construcción':
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'Finalizado':
    case 'Completada':
    case 'Aprobado':
    case 'Entregado':
    case 'Realizada':
    case 'Activo':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'Pendiente':
    case 'Programada':
    case 'Borrador':
    case 'Enviado':
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      break;
    case 'Atrasada':
    case 'Cancelada':
    case 'Rechazado':
    case 'Inactivo':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'Archivado':
      badgeStyle = 'bg-gray-100 text-gray-500 border-gray-200';
      break;
    default:
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      break;
  }

  const sizeStyle = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizeStyle} ${badgeStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {status}
    </span>
  );
};
