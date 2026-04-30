import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'bg-white border border-gray-200 rounded-m transition-all hover:-translate-y-1 hover:shadow-lg',
  {
    variants: {
      padding: {
        sm: 'p-12',
        md: 'p-16',
        lg: 'p-24',
      },
    },
    defaultVariants: {
      padding: 'md',
    },
  },
);

type CardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>;

export function Card({ padding, className, children, ...rest }: CardProps) {
  return (
    <div className={cardVariants({ padding, className })} {...rest}>
      {children}
    </div>
  );
}
