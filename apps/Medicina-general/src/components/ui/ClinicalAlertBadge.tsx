import React from 'react';
import { AlertOctagon, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import type { AlertSeverity, AlertType } from '../../types/clinical.types';

export interface ClinicalAlertBadgeProps {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
}

export const ClinicalAlertBadge: React.FC<ClinicalAlertBadgeProps> = ({
  type,
  severity,
  title,
  description,
}) => {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-950/60 border-rose-600/80 text-rose-200 animate-pulse';
      case 'HIGH':
        return 'bg-rose-950/40 border-rose-500/50 text-rose-300';
      case 'MEDIUM':
        return 'bg-amber-950/40 border-amber-500/50 text-amber-300';
      case 'LOW':
      default:
        return 'bg-blue-950/40 border-blue-500/50 text-blue-300';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'ALLERGY':
        return <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'VITAL_RISK':
        return <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'CLINICAL_WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'FOLLOW_UP':
      default:
        return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${getSeverityStyles()}`}>
      {getIcon()}
      <div>
        <div className="font-bold flex items-center gap-2">
          <span>{title}</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold bg-black/40">
            {type}
          </span>
        </div>
        {description && <p className="text-[11px] opacity-90 mt-0.5">{description}</p>}
      </div>
    </div>
  );
};
