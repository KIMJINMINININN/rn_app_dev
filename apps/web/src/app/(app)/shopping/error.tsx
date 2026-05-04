'use client';

// apps/web/src/app/(app)/shopping/error.tsx
// Phase 5 §3.1 — RSC error boundary (Next.js convention).

import { useEffect } from 'react';

import { Button } from '@/shared/ui/button';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ShoppingError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[shopping] page error', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-12 px-16 py-32">
      <h2 className="text-heading-s text-gray-900">
        장바구니를 불러오지 못했어요
      </h2>
      <p className="text-body-s-400 text-gray-600">
        잠시 후 다시 시도해 주세요.
      </p>
      <Button variant="primary" size="md" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
