'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

export { toast };

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      duration={3000}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: 'rounded-m text-body-s-400',
          title: 'text-body-s-500 text-gray-900',
          description: 'text-body-xs-400 text-gray-600',
        },
      }}
    />
  );
}
