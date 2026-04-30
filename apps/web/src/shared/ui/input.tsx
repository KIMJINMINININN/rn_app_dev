'use client';

import { cva } from 'class-variance-authority';
import { type InputHTMLAttributes, type Ref, useId } from 'react';

const inputVariants = cva(
  'h-40 px-12 rounded-xs border bg-white text-body-m-400 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
  {
    variants: {
      state: {
        default: 'border-gray-300 focus:ring-primary-200 focus:border-primary-600',
        error: 'border-red-500 focus:ring-red-200 focus:border-red-600',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  },
);

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  error?: string;
  helper?: string;
  type?: 'text' | 'number' | 'date';
  ref?: Ref<HTMLInputElement>;
};

export function Input({
  label,
  error,
  helper,
  type = 'text',
  id: idProp,
  className,
  ref,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-4">
      {label && (
        <label htmlFor={id} className="text-body-s-500 text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={inputVariants({ state: error ? 'error' : 'default', className })}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-body-xs-400 text-red-600">
          {error}
        </p>
      ) : helper ? (
        <p className="text-body-xs-400 text-gray-500">{helper}</p>
      ) : null}
    </div>
  );
}
