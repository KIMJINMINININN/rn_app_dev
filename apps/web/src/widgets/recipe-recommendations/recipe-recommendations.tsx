// apps/web/src/widgets/recipe-recommendations/recipe-recommendations.tsx
// Phase 3 §3.5 — widgets/recipe-recommendations
//
// Server Component (presentational). 데이터는 props로 전달받고, 점수 임계값으로
// "지금 만들 수 있는 요리" / "재료 1-2개 부족" 두 섹션으로 분리한다.
// Skeleton 로딩은 app/(app)/recipes/loading.tsx 가 담당하므로 본 widget은
// 데이터를 받았다는 가정 하에 그리드를 렌더한다.
//
// FSD: widgets는 entities/* + shared/* 만 사용 가능 (features 직접 의존 X).
// 호출자(page)가 RPC 응답을 그대로 전달.

import Link from 'next/link';

import { SCORE_READY_THRESHOLD } from '@/entities/recipe/lib/scoring-constants';
import type { Recommendation } from '@/entities/recipe/model/types';
import { RecipeCard } from '@/entities/recipe/ui/recipe-card';

interface Props {
  recommendations: Recommendation[];
}

export function RecipeRecommendations({ recommendations }: Props) {
  const ready: Recommendation[] = [];
  const partial: Recommendation[] = [];
  for (const r of recommendations) {
    if (r.score >= SCORE_READY_THRESHOLD) ready.push(r);
    else partial.push(r);
  }

  if (ready.length === 0 && partial.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-32 px-16 py-16">
      {ready.length > 0 && (
        <Section
          title="지금 만들 수 있는 요리"
          description="필수 재료가 모두 준비됐어요"
          tone="ready"
        >
          <RecipeGrid recommendations={ready} />
        </Section>
      )}

      {partial.length > 0 && (
        <Section
          title="재료 1-2개 부족"
          description="조금만 더 채우면 만들 수 있어요"
          tone="partial"
        >
          <RecipeGrid recommendations={partial} />
        </Section>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  description: string;
  tone: 'ready' | 'partial';
  children: React.ReactNode;
}

function Section({ title, description, tone, children }: SectionProps) {
  const accentClass =
    tone === 'ready' ? 'text-emerald-700' : 'text-amber-700';

  return (
    <section className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <h2 className={`text-heading-s ${accentClass}`}>{title}</h2>
        <p className="text-body-xs-400 text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function RecipeGrid({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
      {recommendations.map((r) => (
        <RecipeCard
          key={r.recipe_id}
          recommendation={r}
          href={`/recipes/${r.recipe_id}`}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-12 px-16 py-32">
      <p className="text-heading-s text-gray-700">재료가 부족해요</p>
      <p className="text-body-s-400 text-gray-500 text-center">
        냉장고에 재료를 추가하면 추천 레시피를 받아볼 수 있어요.
      </p>
      <Link
        href="/inventory"
        className="text-button-s text-primary-600 hover:underline"
      >
        인벤토리로 이동
      </Link>
    </div>
  );
}
