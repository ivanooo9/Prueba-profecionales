import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface AcademicAlertBadgeProps {
  type: 'low_attendance' | 'low_grade' | 'pending_evaluation';
  severity?: 'high' | 'medium' | 'low';
  text?: string;
}

export const AcademicAlertBadge: React.FC<AcademicAlertBadgeProps> = ({
  type,
  severity = 'medium',
  text,
}) => {
  const styles = {
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const icons = {
    high: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
    medium: <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    low: <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
  };

  const defaultText = {
    low_attendance: 'Baja Asistencia',
    low_grade: 'Rendimiento Bajo',
    pending_evaluation: 'Notas Pendientes',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles[severity]}`}
    >
      {icons[severity]}
      <span>{text || defaultText[type]}</span>
    </span>
  );
};
