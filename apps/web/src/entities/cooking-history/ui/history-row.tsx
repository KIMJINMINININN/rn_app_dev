// apps/web/src/entities/cooking-history/ui/history-row.tsx
// Phase 4 §3.1 — entities/cooking-history 슬라이스 — 1개 요리 기록 카드.
//
// Server Component (presentational). 호출자(widget)가 미리 fetch + join 한
// CookingSession 1개 + ingredient 이름 Map 을 props 로 전달한다.
//
// 표시 요소:
//   - 헤더: 요리명 (recipe_name 또는 custom_recipe_name) + cooked_at (KST YYYY-MM-DD HH:mm)
//   - 평점 (rating != null) — 텍스트 ⭐ 1개 + 숫자 (이모지 1개만 사용)
//   - 메모 (memo != null) — 2줄 클램프
//   - consumed 재료 — ingredientNames Map graceful fallback (master_id 그대로)
//
// recipe_id 가 있으면 헤더가 Link 로 /recipes/[id] 이동.
// recipe_id 가 null 이고 custom_recipe_name 도 비어있으면 "제목 없음" fallback.
//
// FSD: entities 는 shared/* + 본 슬라이스 model 만 의존. features 의존 X.

import Link from 'next/link';

import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';

import type { CookingSession } from '../model/types';

interface Props {
  session: CookingSession;
  ingredientNames?: Map<string, string>;
}

const FALLBACK_TITLE = '제목 없음';

export function HistoryRow({ session, ingredientNames }: Props) {
  const title =
    session.recipe_name ??
    session.custom_recipe_name ??
    FALLBACK_TITLE;
  const cookedLabel = formatCookedAt(session.cooked_at);

  return (
    <Card padding="md" className="flex flex-col gap-12">
      {/* 헤더: 요리명(+ Link) + 날짜 + 평점 */}
      <header className="flex items-start justify-between gap-12">
        <div className="flex flex-col gap-4 min-w-0">
          {session.recipe_id ? (
            <Link
              href={`/recipes/${session.recipe_id}`}
              className="text-body-m-500 text-gray-900 truncate hover:underline"
            >
              {title}
            </Link>
          ) : (
            <span className="text-body-m-500 text-gray-900 truncate">
              {title}
            </span>
          )}
          <span className="text-body-xs-400 text-gray-500">{cookedLabel}</span>
        </div>
        {session.rating != null && (
          <Badge tone="warning" aria-label={`평점 ${session.rating}점`}>
            ⭐ {session.rating}
          </Badge>
        )}
      </header>

      {/* 메모 (선택) */}
      {session.memo && (
        <p className="text-body-s-400 text-gray-700 line-clamp-2">
          {session.memo}
        </p>
      )}

      {/* 차감 재료 (선택) */}
      {session.consumed.length > 0 && (
        <ul className="flex flex-wrap gap-8">
          {session.consumed.map((c) => (
            <li
              key={`${c.history_id}-${c.ingredient_master_id}`}
              className="rounded-xs bg-gray-50 px-8 py-4 text-body-xs-400 text-gray-700"
            >
              <span>
                {ingredientNames?.get(c.ingredient_master_id) ??
                  c.ingredient_master_id}
              </span>
              {c.quantity != null && (
                <span className="ml-4 text-gray-500">
                  {c.quantity}
                  {c.unit ?? ''}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * cooked_at(ISO timestamptz) → KST 표기 'YYYY-MM-DD HH:mm'.
 * 파싱 실패 시 원본 문자열 그대로 fallback.
 *
 * Intl.DateTimeFormat 의 timeZone:'Asia/Seoul' 사용 — 서버/클라이언트 어느 쪽에서
 * 렌더해도 동일 결과 (Server Component이므로 hydration mismatch 위험 없음).
 */
function formatCookedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    const fmt = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    // ko-KR formatToParts 결과를 ISO-like "YYYY-MM-DD HH:mm" 으로 재조립.
    const parts = fmt.formatToParts(d);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '';
    const y = get('year');
    const m = get('month');
    const day = get('day');
    const h = get('hour');
    const min = get('minute');
    if (!y || !m || !day || !h || !min) return iso;
    return `${y}-${m}-${day} ${h}:${min}`;
  } catch {
    return iso;
  }
}
