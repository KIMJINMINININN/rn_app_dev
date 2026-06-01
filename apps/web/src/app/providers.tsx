'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/shared/ui/theme';

/**
 * Providers — 전역 클라이언트 프로바이더 (Develop §6.4 / §6b).
 *
 * - QueryClientProvider: TanStack Query. 인스턴스를 useState로 1회 생성해
 *   리렌더/HMR 시 캐시 유지(서버 데이터는 Query가 단일 출처, §6b).
 * - ThemeProvider: 마운트 시 localStorage→스토어 hydrate(테마 UI 동기화).
 * - Toaster(sonner): F3에서 도입 — 세션 저장 결과(성공/도먼시 안내/오류) 토스트.
 *   top-center · richColors(상태색) · closeButton.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 상호작용 데이터 위주 — 과도한 자동 refetch 억제(WebView 성능 §10.3).
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
