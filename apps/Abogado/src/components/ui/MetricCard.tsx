import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'warning' | 'danger' | 'success' | 'info' | 'slate';
  onClick?: () => void;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'primary',
  onClick,
  badge,
}) => {
  const variantStyles = {
    primary: {
      bgIcon: 'bg-slate-100 text-slate-800 border-slate-200',
      badge: 'bg-slate-100 text-slate-700 font-semibold',
      hover: 'hover:border-slate-300 hover:shadow-slate-500/5',
    },
    warning: {
      bgIcon: 'bg-amber-50 text-amber-700 border-amber-200',
      badge: 'bg-amber-100/70 text-amber-800 font-semibold',
      hover: 'hover:border-amber-300 hover:shadow-amber-500/5',
    },
    danger: {
      bgIcon: 'bg-rose-50 text-rose-700 border-rose-200',
      badge: 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold',
      hover: 'hover:border-rose-300 hover:shadow-rose-500/5',
    },
    success: {
      bgIcon: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700',
      hover: 'hover:border-emerald-300 hover:shadow-emerald-500/5',
    },
    info: {
      bgIcon: 'bg-sky-50 text-sky-600 border-sky-200',
      badge: 'bg-sky-100 text-sky-700',
      hover: 'hover:border-sky-300 hover:shadow-sky-500/5',
    },
    slate: {
      bgIcon: 'bg-slate-100 text-slate-700 border-slate-200',
      badge: 'bg-slate-100 text-slate-700',
      hover: 'hover:border-slate-300 hover:shadow-slate-500/5',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm transition-all duration-200 ${
        onClick ? `cursor-pointer ${style.hover}` : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${style.bgIcon}`}>
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </span>
        {badge && (
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${style.badge}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
