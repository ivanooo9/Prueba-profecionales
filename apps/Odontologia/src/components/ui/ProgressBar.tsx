import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  showLabel?: boolean;
  colorClass?: string;
  size?: 'sm' | 'md';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = true,
  colorClass = 'bg-cyan-600',
  size = 'md'
}) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1">
          <span>Progreso</span>
          <span className="font-mono">{normalizedProgress}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClass}`}>
        <div 
          className={`${heightClass} ${colorClass} transition-all duration-300 rounded-full`}
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
    </div>
  );
};
