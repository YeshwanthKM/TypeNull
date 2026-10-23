import React from 'react';

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  name,
  label,
  error,
  helperText,
  isRequired = false,
  rows = 3,
  className = '',
  disabled,
  ...props
}) => {
  const textareaId = id || name;

  return (
    <div className="w-full space-y-1.5">
      <label
        htmlFor={textareaId}
        className="block text-xs font-semibold text-slate-800 uppercase tracking-wider"
      >
        {label}
        {isRequired && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
      </label>

      <div className="relative">
        <textarea
          id={textareaId}
          name={name}
          rows={rows}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-desc` : undefined}
          className={`block w-full rounded-lg border text-sm px-3.5 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50/20'
              : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600 bg-white'
          } ${className}`}
          {...props}
        />
      </div>

      {error ? (
        <p id={`${textareaId}-error`} className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
          <span className="w-1 h-1 rounded-full bg-red-600 flex-shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <p id={`${textareaId}-desc`} className="text-xs text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
