import type { Technique } from '@/entities/technique';
import { TechniqueLibrary } from '@/features/technique-library';
import { Button, PlusIcon } from '@/shared/ui';

/**
 * 기술 라이브러리 목록 (F4 / Design §7d).
 *
 * 헤더("기술 라이브러리" + "기술 추가" 스텁) + TechniqueLibrary(필터/정렬 + 카드 그리드).
 * 필터(종목·분류·포지션·벨트)와 정렬(최근·이름)은 **동작**한다(client 아일랜드).
 *
 * 데이터 휴면(infra 전): techniques=[](빈 배열)을 client 아일랜드에 내린다 — 결과는
 * 비어 EmptyState 로 떨어진다(가짜 레코드 금지, calendar-screen 패턴과 동일).
 * page 는 searchParams/Supabase 를 읽지 않아 /techniques 라우트가 정적(static)으로 유지된다.
 *
 * "기술 추가"는 별도 후속(라이브러리 연동 후) — F4 범위 밖이라 비활성 스텁으로 둔다.
 */
export default function TechniquesPage() {
  // TODO(infra): RSC fetch techniques (또는 client query). 지금은 dormant.
  const techniques: Technique[] = [];

  return (
    <section aria-labelledby="techniques-heading" className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 id="techniques-heading" className="text-heading-l text-[var(--text-strong)]">
          기술 라이브러리
        </h1>
        {/* 기술 생성은 별도 후속(라이브러리 연동 후) — 현재 비활성 스텁. */}
        <Button
          size="sm"
          disabled
          aria-label="기술 추가 (준비 중)"
          title="기술 추가는 준비 중 (라이브러리 연동 후)"
          className="gap-1.5"
        >
          <PlusIcon width={16} height={16} />
          기술 추가
        </Button>
      </div>

      <TechniqueLibrary techniques={techniques} />
    </section>
  );
}
