import React from 'react';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  id,
  name,
  label,
  error,
  helperText,
  isRequired = false,
  className = '',
  disabled,
  ...props
}) => {
  const inputId = id || name;

  return (
    <div className="w-full space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold text-slate-800 uppercase tracking-wider"
      >
        {label}
        {isRequired && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
      </label>

      <div className="relative">
        <input
          id={inputId}
          name={name}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-desc` : undefined}
          className={`block w-full rounded-lg border text-base md:text-sm px-3.5 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50/20'
              : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600 bg-white'
          } ${className}`}
          {...props}
        />
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
          <span className="w-1 h-1 rounded-full bg-red-600 flex-shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-desc`} className="text-xs text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
