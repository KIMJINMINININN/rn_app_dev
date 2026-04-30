// Primitive skeleton — CVA-driven; animate-pulse chosen over animate-skeleton
// (animate-skeleton requires background-size: 200% 100% which needs an arbitrary class)

import { cva, type VariantProps } from 'class-variance-authority';
import { type CSSProperties, type HTMLAttributes, type Ref } from 'react';

const skeletonVariants = cva('bg-gray-200 animate-pulse', {
  variants: {
    variant: {
      text: 'rounded-xxs',
      rect: 'rounded-xs',
      circle: 'rounded-full aspect-square',
    },
  },
  defaultVariants: {
    variant: 'rect',
  },
});

type SkeletonProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof skeletonVariants> & {
    ref?: Ref<HTMLDivElement>;
    width?: string | number;
    height?: string | number;
  };

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className,
  style,
  ref,
  ...rest
}: SkeletonProps) {
  const finalWidth = width ?? (variant === 'circle' ? 40 : variant === 'text' ? 120 : '100%');
  const finalHeight = height ?? (variant === 'circle' ? 40 : variant === 'text' ? 16 : 80);

  const resolvedWidth = typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth;
  const resolvedHeight = typeof finalHeight === 'number' ? `${finalHeight}px` : finalHeight;

  return (
    <div
      ref={ref}
      className={skeletonVariants({ variant, className })}
      style={{ width: resolvedWidth, height: resolvedHeight, ...(style as CSSProperties) }}
      {...rest}
    />
  );
}
