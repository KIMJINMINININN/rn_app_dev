'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black-30 z-50" />
        <DialogPrimitive.Content
          className={
            className ??
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-l p-24 shadow-xl'
          }
        >
          <DialogPrimitive.Title className="text-heading-m text-gray-900">
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="text-body-m-400 text-gray-600 mt-8">
              {description}
            </DialogPrimitive.Description>
          )}
          <div className="mt-16">{children}</div>
          <DialogPrimitive.Close
            className="absolute top-16 right-16 inline-flex h-32 w-32 items-center justify-center rounded-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
