// apps/web/src/features/dual-recommendation/ui/dual-list.tsx
// Phase 4 §3.3 — features/dual-recommendation
//
// Server Component (presentational). 데이터는 props로 전달받아 좌/우 분할로
// 과거/신규 레시피를 렌더한다. RSC 페이지에서 RPC 직접 호출 후 결과를 그대로 전달.
//
// FSD: features 슬라이스 (UI primitive only — entities/recipe 직접 의존 X).
// 카드 navigation은 next/link 로 `/recipes/[id]`.
// Skeleton 로딩은 app/(app)/inventory/[ingredientId]/loading.tsx 가 담당.

import Link from 'next/link';

import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';

import type { NewRecipe, PastRecipe } from '../api/queries';

interface Props {
  pastRecipes: PastRecipe[];
  newRecipes: NewRecipe[];
}

export function DualList({ pastRecipes, newRecipes }: Props) {
  return (
    <div className="grid grid-cols-1 gap-32 sm:grid-cols-2">
      <Section title="이 재료로 만들었던 요리" description="과거 요리 기록">
        {pastRecipes.length === 0 ? (
          <EmptyState message="기록이 없습니다" />
        ) : (
          <CardList>
            {pastRecipes.map((r) => (
              <PastRecipeCard key={r.recipe_id} recipe={r} />
            ))}
          </CardList>
        )}
      </Section>

      <Section
        title="이 재료로 새로 시도할 요리"
        description="아직 만들어보지 않은 추천"
      >
        {newRecipes.length === 0 ? (
          <EmptyState message="추천할 새 요리가 없습니다" />
        ) : (
          <CardList>
            {newRecipes.map((r) => (
              <NewRecipeCard key={r.recipe_id} recipe={r} />
            ))}
          </CardList>
        )}
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <h2 className="text-heading-s text-gray-900">{title}</h2>
        <p className="text-body-xs-400 text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CardList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-12">{children}</div>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-s border border-gray-200 bg-gray-50 px-16 py-24 text-center">
      <p className="text-body-s-400 text-gray-500">{message}</p>
    </div>
  );
}

function PastRecipeCard({ recipe }: { recipe: PastRecipe }) {
  return (
    <Link href={`/recipes/${recipe.recipe_id}`} className="block">
      <Card padding="md" className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-12">
          <span className="text-body-m-500 text-gray-900 truncate">
            {recipe.name}
          </span>
          <Badge tone="info">{recipe.cooked_count}회 요리</Badge>
        </div>
        <p className="text-body-xs-400 text-gray-500">
          마지막: {formatDate(recipe.last_cooked_at)}
        </p>
      </Card>
    </Link>
  );
}

function NewRecipeCard({ recipe }: { recipe: NewRecipe }) {
  return (
    <Link href={`/recipes/${recipe.recipe_id}`} className="block">
      <Card padding="md" className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-12">
          <span className="text-body-m-500 text-gray-900 truncate">
            {recipe.name}
          </span>
          <Badge tone="success">{Math.round(recipe.score * 100)}%</Badge>
        </div>
        <p className="text-body-xs-400 text-gray-500">
          {recipe.cook_minutes != null
            ? `조리 ${recipe.cook_minutes}분`
            : '조리 시간 미정'}
        </p>
      </Card>
    </Link>
  );
}

function formatDate(iso: string): string {
  // 안전한 날짜 포맷팅 — locale 의존 없이 YYYY-MM-DD.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
