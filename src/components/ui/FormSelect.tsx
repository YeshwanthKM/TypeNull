import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  id,
  name,
  label,
  options,
  placeholder = 'Select an option',
  error,
  helperText,
  isRequired = false,
  className = '',
  disabled,
  ...props
}) => {
  const selectId = id || name;

  return (
    <div className="w-full space-y-1.5">
      <label
        htmlFor={selectId}
        className="block text-xs font-semibold text-slate-800 uppercase tracking-wider"
      >
        {label}
        {isRequired && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
      </label>

      <div className="relative">
        <select
          id={selectId}
          name={name}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-desc` : undefined}
          className={`block w-full rounded-lg border text-sm px-3.5 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white ${
            error
              ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500 bg-red-50/20'
              : 'border-slate-300 text-slate-900 focus:border-teal-600 focus:ring-teal-600'
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p id={`${selectId}-error`} className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
          <span className="w-1 h-1 rounded-full bg-red-600 flex-shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <p id={`${selectId}-desc`} className="text-xs text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
