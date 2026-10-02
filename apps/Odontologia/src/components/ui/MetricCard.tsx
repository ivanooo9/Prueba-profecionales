import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  changeText?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  iconBgColor?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  changeText,
  isPositive = true,
  icon,
  iconBgColor = 'bg-cyan-50 text-cyan-600',
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-cyan-300' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-lg ${iconBgColor}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        
        {(changeText || subtitle) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {changeText && (
              <span className={`font-semibold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {changeText}
              </span>
            )}
            {subtitle && <span className="text-slate-500">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
