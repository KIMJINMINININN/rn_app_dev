import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1_000,       // 30초
        gcTime: 5 * 60 * 1_000,      // 5분
        retry: 1,
      },
    },
  });
}
