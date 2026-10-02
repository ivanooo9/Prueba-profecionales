import React from "react";
import { TrendingUp, TrendingDown, Eye, Users, UserCheck, Calendar } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  variant?: "views" | "visits" | "users" | "active" | "default";
  subtext?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  variant = "views",
  subtext = "vs. jornada anterior",
  icon,
}) => {
  const variantIconStyles = {
    views: "bg-sky-50 text-sky-600 border-sky-100",
    visits: "bg-emerald-50 text-emerald-600 border-emerald-100",
    users: "bg-purple-50 text-purple-600 border-purple-100",
    active: "bg-amber-50 text-amber-600 border-amber-100",
    default: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const defaultIcons = {
    views: <Eye className="w-4 h-4" />,
    visits: <Calendar className="w-4 h-4" />,
    users: <Users className="w-4 h-4" />,
    active: <UserCheck className="w-4 h-4" />,
    default: null,
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
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
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-rose-600" />}
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
