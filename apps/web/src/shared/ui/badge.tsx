// Primitive badge — CVA-driven; all tokens from tailwind-theme.css only

import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes, type Ref } from 'react';

const badgeVariants = cva(
  'inline-flex items-center px-8 py-4 rounded-xs text-button-xxs whitespace-nowrap',
  {
    variants: {
      tone: {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-green-100 text-green-600',
        warning: 'bg-yellow-100 text-yellow-600',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-teal-100 text-teal-600',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    ref?: Ref<HTMLSpanElement>;
  };

export function Badge({ tone, className, children, ref, ...props }: BadgeProps) {
  return (
    <span ref={ref} className={badgeVariants({ tone, className })} {...props}>
      {children}
    </span>
  );
}
