import React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  note?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderSearch,
  title,
  description,
  action,
  note,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4 border border-slate-200">
        <Icon className="w-6 h-6 text-slate-600" aria-hidden="true" />
      </div>

      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>

      <p className="text-sm text-slate-600 max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {action && <div className="flex items-center gap-3">{action}</div>}

      {note && (
        <p className="text-xs text-slate-400 mt-4 max-w-sm">
          {note}
        </p>
      )}
    </div>
  );
};
