// apps/web/src/widgets/cooking-history-list/cooking-history-list.tsx
// Phase 4 §3.4 — widgets/cooking-history-list
//
// Server Component (presentational). RSC page 가 cooking_history 정렬(`cooked_at desc`)
// + consumed/recipe_master/ingredient_master fetch 를 마치고 props 로 전달.
//
// 빈 상태: 사용자에게 시작 동선을 안내 (Phase 0a 톤).
// Skeleton: app/(app)/cooking-history/loading.tsx 가 담당 (본 widget은 데이터 받은 후
//           렌더만 책임).
//
// FSD: widgets 는 entities/* + shared/* 만 의존. features 직접 의존 X.

import { HistoryRow } from '@/entities/cooking-history/ui/history-row';
import type { CookingSession } from '@/entities/cooking-history/model/types';

interface Props {
  sessions: CookingSession[];
  ingredientNames?: Map<string, string>;
}

export function CookingHistoryList({ sessions, ingredientNames }: Props) {
  if (sessions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-12 px-16 py-16">
      {sessions.map((session) => (
        <HistoryRow
          key={session.id}
          session={session}
          ingredientNames={ingredientNames}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-12 px-16 py-32">
      <p className="text-heading-s text-gray-700">아직 기록된 요리가 없어요</p>
      <p className="text-body-s-400 text-gray-500 text-center">
        레시피 상세에서 &lsquo;요리 시작&rsquo; 버튼을 눌러
        <br />
        첫 요리를 기록해 보세요.
      </p>
    </div>
  );
}
