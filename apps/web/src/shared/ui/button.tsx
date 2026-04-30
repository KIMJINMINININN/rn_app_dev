'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, type Ref } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-8 transition-colors disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50',
        secondary:
          'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50',
        ghost:
          'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50',
      },
      size: {
        sm: 'h-32 px-12 text-button-s rounded-xs',
        md: 'h-40 px-16 text-button-m rounded-s',
        lg: 'h-48 px-20 text-button-l rounded-m',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    ref?: Ref<HTMLButtonElement>;
  };

export function Button({
  variant,
  size,
  disabled,
  loading = false,
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M14 8a6 6 0 0 0-6-6V0a8 8 0 0 1 8 8h-2z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
