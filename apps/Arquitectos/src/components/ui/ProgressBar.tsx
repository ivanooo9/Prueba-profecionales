import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 - 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = true,
  size = 'md'
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  let height = 'h-2';
  if (size === 'sm') height = 'h-1.5';
  if (size === 'lg') height = 'h-3';

  let color = 'bg-arch-600';
  if (clamped >= 100) color = 'bg-emerald-500';
  else if (clamped < 30) color = 'bg-amber-500';

  return (
    <div className="w-full flex items-center gap-3">
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${height}`}>
        <div
          className={`h-full ${color} transition-all duration-300 rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono font-semibold text-slate-700 min-w-[36px] text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
};
