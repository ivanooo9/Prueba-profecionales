import React from 'react';
import { TrendingUp, TrendingDown, Users, BookOpen, ClipboardCheck, GraduationCap, CalendarDays } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  variant?: 'students' | 'courses' | 'attendance' | 'grades' | 'classes' | 'default';
  subtext?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  variant = 'students',
  subtext = 'vs. periodo anterior',
  icon,
  onClick,
}) => {
  const variantIconStyles = {
    students: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    courses: 'bg-blue-50 text-blue-600 border-blue-100',
    attendance: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    grades: 'bg-purple-50 text-purple-600 border-purple-100',
    classes: 'bg-amber-50 text-amber-600 border-amber-100',
    default: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const defaultIcons = {
    students: <Users className="w-4 h-4" />,
    courses: <BookOpen className="w-4 h-4" />,
    attendance: <ClipboardCheck className="w-4 h-4" />,
    grades: <GraduationCap className="w-4 h-4" />,
    classes: <CalendarDays className="w-4 h-4" />,
    default: null,
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${title}: ${value}${subtext ? `. ${subtext}` : ''}` : undefined}
      className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-xs transition-all duration-200 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="tracking-wide uppercase text-[11px] font-bold text-slate-500">
          {title}
        </span>
        <div className={`p-2 rounded-xl border ${variantIconStyles[variant]}`}>
          {icon || defaultIcons[variant]}
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-3 mb-1">
        <span className="text-2xl font-extrabold tracking-tight font-sans text-slate-900">
          {value}
        </span>

        {change && (
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-600" />
            )}
            <span>{change}</span>
          </div>
        )}
      </div>

      {subtext && (
        <span className="text-[11px] font-medium text-slate-500">
          {subtext}
        </span>
      )}
    </div>
  );
};
