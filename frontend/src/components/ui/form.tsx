import React from 'react';
import { Input } from './input';

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required = true,
}) => (
  <div className="space-y-2">
    <label htmlFor={name} className="text-sm font-medium text-twilight">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <Input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || `Votre ${label.toLowerCase()}`}
      className={error ? 'border-red-300 focus:border-red-500' : ''}
    />
    {error && (
      <p className="text-sm text-red-600">{error}</p>
    )}
  </div>
); 