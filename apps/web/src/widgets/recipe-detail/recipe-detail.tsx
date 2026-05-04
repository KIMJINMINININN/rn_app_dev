// apps/web/src/widgets/recipe-detail/recipe-detail.tsx
// Phase 3 §3.6 — widgets/recipe-detail
//
// Server Component (presentational). 호출자(RSC page)가 모든 데이터를 미리
// fetch + computeRecipeMatch 후 props로 전달.
//
// FSD: widgets는 entities/* + features/* + shared/* 사용 가능.
// (widgets는 features를 조립하는 레이어)
//
// 외부 라이브러리 추가 금지. instructions_md 는 markdown lib 부재로
// `<pre className="whitespace-pre-wrap">` 로 plain rendering — 줄바꿈/들여쓰기 보존.
// dompurify 적용 대상이 아니다 (HTML이 아닌 plain text).

import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';

import { MatchScore } from '@/entities/recipe/ui/match-score';
import { RecipeYoutubeEmbed } from '@/entities/recipe/ui/recipe-youtube-embed';
import type {
  Recommendation,
  RecipeIngredientRow,
  RecipeMaster,
} from '@/entities/recipe/model/types';
import { ExtractGapButton } from '@/features/extract-recipe-gap/ui/extract-gap-button';
import type { UserIngredientForPayload } from '@/features/log-cooking-session/lib/build-consumed-payload';
import { IngredientMatchBreakdown } from '@/features/view-recipe-match/ui/ingredient-match-breakdown';

import { StartCookingButton } from './start-cooking-button';

interface Props {
  recipe: RecipeMaster;
  recipeIngredients: RecipeIngredientRow[];
  recommendation: Recommendation;
  /** Day 6 — "요리 시작" 다이얼로그 차감 미리보기 + Server Action 입력용. RSC page 가 미리 fetch. */
  userIngredients: UserIngredientForPayload[];
  /**
   * master_id → ingredient name. (Day 6 변경) "요리 시작" 다이얼로그 라벨용으로
   * 항상 필요해 옵셔널 → 필수로 승격. RSC page 가 빈 Map (`new Map()`) 이라도 전달.
   */
  ingredientNames: Map<string, string>;
  youtubeVideoId?: string;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export function RecipeDetail({
  recipe,
  recipeIngredients,
  recommendation,
  userIngredients,
  ingredientNames,
  youtubeVideoId,
}: Props) {
  return (
    <article className="flex flex-col gap-24 px-16 py-16">
      {/* 헤더: 이름 + 설명 + 메타 + "요리 시작" CTA (Day 6) */}
      <header className="flex flex-col gap-12">
        <div className="flex items-start justify-between gap-12">
          <h1 className="text-heading-l text-gray-900">{recipe.name}</h1>
          <div className="flex shrink-0 flex-col items-end gap-8">
            <StartCookingButton
              recipe={recipe}
              recipeIngredients={recipeIngredients}
              userIngredients={userIngredients}
              ingredientNames={ingredientNames}
            />
            <ExtractGapButton recipeId={recipe.id} />
          </div>
        </div>
        {recipe.description && (
          <p className="text-body-s-400 text-gray-600">{recipe.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-8">
          {recipe.cook_minutes != null && (
            <Badge tone="default">{recipe.cook_minutes}분</Badge>
          )}
          <Badge tone="default">
            {DIFFICULTY_LABEL[recipe.difficulty] ?? recipe.difficulty}
          </Badge>
          {recipe.servings != null && (
            <Badge tone="default">{recipe.servings}인분</Badge>
          )}
        </div>
      </header>

      {/* 매칭 점수 (큰 사이즈) */}
      <Card padding="md">
        <MatchScore score={recommendation.score} />
      </Card>

      {/* 재료 매칭 분석 */}
      <section className="flex flex-col gap-12">
        <h2 className="text-heading-s text-gray-900">재료</h2>
        <Card padding="md">
          <IngredientMatchBreakdown
            recommendation={recommendation}
            recipeIngredients={recipeIngredients}
            ingredientNames={ingredientNames}
          />
        </Card>
      </section>

      {/* 조리법 */}
      {recipe.instructions_md && (
        <section className="flex flex-col gap-12">
          <h2 className="text-heading-s text-gray-900">조리법</h2>
          <Card padding="md">
            <pre className="whitespace-pre-wrap text-body-s-400 text-gray-800 font-sans">
              {recipe.instructions_md}
            </pre>
          </Card>
        </section>
      )}

      {/* YouTube 영상 (있을 때만) */}
      {youtubeVideoId && (
        <section className="flex flex-col gap-12">
          <h2 className="text-heading-s text-gray-900">관련 영상</h2>
          <RecipeYoutubeEmbed videoId={youtubeVideoId} title={recipe.name} />
        </section>
      )}
    </article>
  );
}
