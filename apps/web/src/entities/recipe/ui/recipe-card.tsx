import Link from 'next/link';

import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';

import type { Recommendation } from '../model/types';

import { MatchScore } from './match-score';

interface Props {
  recommendation: Recommendation;
  href: string;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export function RecipeCard({ recommendation: r, href }: Props) {
  const missingCount = r.missing_required.length;

  return (
    <Link href={href} className="block">
      <Card padding="md" className="flex flex-col gap-12">
        {/* Header row: name + compact score */}
        <div className="flex items-start justify-between gap-12">
          <div className="flex flex-col gap-4 min-w-0">
            <span className="text-body-m-500 text-gray-900 truncate">
              {r.name}
            </span>
            {r.description && (
              <span className="text-body-xs-400 text-gray-500 line-clamp-2">
                {r.description}
              </span>
            )}
          </div>
          <div className="shrink-0 pt-2">
            <MatchScore score={r.score} compact />
          </div>
        </div>

        {/* Ingredient availability */}
        <div className="flex flex-wrap items-center gap-8">
          <Badge tone="info">
            필수 {r.required_have}/{r.required_total}
          </Badge>

          {missingCount > 0 && (
            <Badge tone="warning">재료 {missingCount}개 부족</Badge>
          )}

          {r.urgent_have > 0 && (
            <Badge tone="danger">🌡️ 임박 {r.urgent_have}건 활용</Badge>
          )}
        </div>

        {/* Meta: cook time · difficulty · servings */}
        <div className="flex items-center gap-8 text-body-xs-400 text-gray-400">
          {r.cook_minutes != null && <span>{r.cook_minutes}분</span>}
          {r.cook_minutes != null && <span>·</span>}
          <span>{DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty}</span>
          {r.servings != null && (
            <>
              <span>·</span>
              <span>{r.servings}인분</span>
            </>
          )}
        </div>
      </Card>
    </Link>
  );
}
