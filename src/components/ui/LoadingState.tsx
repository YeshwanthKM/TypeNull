import React from 'react';

export interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  rows = 3,
}) => {
  return (
    <div
      className="p-6 rounded-xl border border-slate-200 bg-white space-y-4"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <svg
          className="animate-spin h-5 w-5 text-teal-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium text-slate-700">{message}</span>
      </div>

      <div className="space-y-2.5 animate-pulse pt-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-4 bg-slate-100 rounded w-full" />
        ))}
      </div>
    </div>
  );
};
